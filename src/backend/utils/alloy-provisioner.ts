import { getAdmins, getSuperAdmins } from "./jwt.ts";
import { getAllTenantsWithSubdomains } from "../db.ts";

export function sanitizeRiverIdentifier(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, "_");
}

export function escapeRiverRegex(str: string): string {
  // In River configuration, strings are double-quoted literals ("...").
  // Go/River strings only allow standard escape sequences (\n, \t, \\, \", etc.).
  // Metacharacters with special meaning in regex (\ ^ $ . * + ? ( ) [ ] { } |)
  // must have their backslash escaped as \\ so River parses it as \ for the regex engine.
  // Characters like hyphen (-) and underscore (_) do not need backslash escaping in regex strings.
  return str.replace(/[\\^$.*+?()[\]{}|]/g, "\\\\$&");
}

export type TenantsInput = string[] | Record<string, string[]> | Map<string, string[]>;

export function generateAlloyConfig(tenantsInput: TenantsInput): string {
  const tenantMap = new Map<string, string[]>();

  if (Array.isArray(tenantsInput)) {
    for (const t of tenantsInput) {
      const trimmed = t?.trim();
      if (trimmed && trimmed !== "not verified" && trimmed !== "anonymous") {
        tenantMap.set(trimmed, []);
      }
    }
  } else if (tenantsInput instanceof Map) {
    for (const [t, subdomains] of tenantsInput.entries()) {
      const trimmed = t?.trim();
      if (trimmed && trimmed !== "not verified" && trimmed !== "anonymous") {
        tenantMap.set(trimmed, Array.from(new Set(subdomains || [])));
      }
    }
  } else if (typeof tenantsInput === "object" && tenantsInput !== null) {
    for (const [t, subdomains] of Object.entries(tenantsInput)) {
      const trimmed = t?.trim();
      if (trimmed && trimmed !== "not verified" && trimmed !== "anonymous") {
        tenantMap.set(trimmed, Array.from(new Set(subdomains || [])));
      }
    }
  }

  // If no tenants specified, default to admin
  if (tenantMap.size === 0) {
    tenantMap.set("admin", []);
  }

  const uniqueTenants = Array.from(tenantMap.keys());

  const forwardTargets = uniqueTenants
    .map((t) => `    prometheus.relabel.filter_metrics_${sanitizeRiverIdentifier(t)}.receiver,`)
    .join("\n");

  const tenantPipelineBlocks = uniqueTenants
    .map((tenant) => {
      const sanitized = sanitizeRiverIdentifier(tenant);
      const escapedTenantRegex = escapeRiverRegex(tenant);
      const subdomains = tenantMap.get(tenant) || [];

      let authorFilterBlock: string;
      if (subdomains.length > 0) {
        const subdomainsRegex = subdomains
          .map((s) => escapeRiverRegex(s))
          .join("|");
        authorFilterBlock = `  rule {
    source_labels = ["container_label_df_author", "container_name"]
    regex         = "^${escapedTenantRegex};.*|.*;(${subdomainsRegex})$"
    action        = "keep"
  }`;
      } else {
        authorFilterBlock = `  rule {
    source_labels = ["container_label_df_author"]
    regex         = "^${escapedTenantRegex}$"
    action        = "keep"
  }`;
      }

      return `// Tenant metric ingestion pipeline for '${tenant}'
prometheus.relabel "filter_metrics_${sanitized}" {
  forward_to = [
    prometheus.remote_write.mimir_${sanitized}.receiver,
  ]

  rule {
    source_labels = ["__name__"]
    regex         = "container_(cpu_usage_seconds_total|memory_usage_bytes|memory_max_usage_bytes|network_.*_bytes_total|fs_usage_bytes|fs_limit_bytes)"
    action        = "keep"
  }

  rule {
    source_labels = ["name"]
    regex         = "^/?(.*)$"
    target_label  = "container_name"
  }

  rule {
    source_labels = ["container_name"]
    regex         = "(df_.*|docker[-_]df_.*|domain[-_]forge[-_].*|cadvisor.*|prometheus.*|mimir.*|loki.*|alloy.*|grafana.*|traefik.*|caddy.*)"
    action        = "drop"
  }

${authorFilterBlock}

  rule {
    source_labels = ["container_name"]
    target_label  = "subdomain"
  }
}

prometheus.remote_write "mimir_${sanitized}" {
  endpoint {
    url = "http://mimir:8080/api/v1/push"
    headers = {
      "X-Scope-OrgID" = "${tenant}",
    }
  }
}`;
    })
    .join("\n\n");

  const buildLogBlocks = uniqueTenants
    .filter((tenant) => (tenantMap.get(tenant) || []).length > 0)
    .map((tenant) => {
      const sanitized = sanitizeRiverIdentifier(tenant);
      const subdomains = tenantMap.get(tenant) || [];
      const pathTargets = subdomains
        .map((s) => `    { __path__ = "/hostpipe/logs/${s}.log", subdomain = "${s}", job = "domain-forge-build-logs" },`)
        .join("\n");

      return `// Tenant build logs for '${tenant}'
local.file_match "build_logs_${sanitized}" {
  path_targets = [
${pathTargets}
  ]
}

loki.process "build_logs_process_${sanitized}" {
  forward_to = [loki.write.loki_endpoint.receiver]

  stage.labels {
    values = {
      subdomain = "subdomain",
    }
  }

  stage.tenant {
    value = "${tenant}"
  }
}

loki.source.file "build_logs_${sanitized}" {
  targets    = local.file_match.build_logs_${sanitized}.targets
  forward_to = [loki.process.build_logs_process_${sanitized}.receiver]
}`;
    })
    .join("\n\n");

  return `// Grafana Alloy Configuration for Domain Forge (Tenant-Isolated Ingestion)
// Automatically managed by Alloy Provisioner

// Discover Docker containers from daemon socket
discovery.docker "containers" {
  host = "unix:///var/run/docker.sock"
}

// Strip leading slash and extract tenant metadata for Loki logs
discovery.relabel "docker_logs_filter" {
  targets = discovery.docker.containers.targets

  rule {
    source_labels = ["__meta_docker_container_name"]
    regex         = "^/(.*)$"
    target_label  = "container_name"
  }

  // Drop internal system infrastructure containers
  rule {
    source_labels = ["container_name"]
    regex         = "(df_.*|docker[-_]df_.*|domain[-_]forge[-_].*|cadvisor.*|prometheus.*|mimir.*|loki.*|alloy.*|grafana.*|traefik.*|caddy.*)"
    action        = "drop"
  }

  rule {
    source_labels = ["container_name"]
    target_label  = "subdomain"
  }

  rule {
    source_labels = ["__meta_docker_container_label_df_author"]
    target_label  = "tenant_id"
  }

  // Ensure missing or empty tenant_id falls back to anonymous, never cross-tenant
  rule {
    source_labels = ["tenant_id"]
    regex         = "^$"
    target_label  = "tenant_id"
    replacement   = "anonymous"
  }
}

// Process user container logs and attach dynamic tenant ID
loki.process "docker_logs_process" {
  forward_to = [loki.write.loki_endpoint.receiver]

  stage.labels {
    values = {
      container_name = "container_name",
      subdomain      = "subdomain",
      tenant_id      = "tenant_id",
    }
  }

  stage.tenant {
    label = "tenant_id"
  }
}

// Tail stdout/stderr of discovered Docker containers
loki.source.docker "docker_logs" {
  host       = "unix:///var/run/docker.sock"
  targets    = discovery.relabel.docker_logs_filter.output
  forward_to = [loki.process.docker_logs_process.receiver]
}

${buildLogBlocks ? buildLogBlocks + "\n\n" : ""}// Push logs to multi-tenant Loki endpoint
loki.write "loki_endpoint" {
  endpoint {
    url = "http://loki:3100/loki/api/v1/push"
  }
}

// ==========================================
// METRIC COLLECTION & MIMIR REMOTE WRITE
// ==========================================

// Scrape cAdvisor for container telemetry
prometheus.scrape "cadvisor" {
  targets = [{
    __address__ = "cadvisor:8080",
  }]
  forward_to = [
${forwardTargets}
  ]
  scrape_interval = "15s"
}

${tenantPipelineBlocks}
`;
}

const knownTenants = new Map<string, string[]>();
let syncPromise: Promise<void> | null = null;

export async function reloadAlloy(): Promise<boolean> {
  const candidateUrls = [
    Deno.env.get("ALLOY_URL") ? `${Deno.env.get("ALLOY_URL")}/-/reload` : null,
    "http://alloy:12345/-/reload",
    "http://df_alloy:12345/-/reload",
    "http://127.0.0.1:12345/-/reload",
    "http://localhost:12345/-/reload",
  ].filter(Boolean) as string[];

  for (const url of candidateUrls) {
    try {
      const resp = await fetch(url, {
        method: "POST",
        signal: AbortSignal.timeout(2000),
      });
      if (resp.ok) {
        return true;
      }
    } catch (_e) {
      // Continue trying candidates
    }
  }
  return false;
}

export function syncAlloyConfig(additionalTenants: string[] = []): Promise<void> {
  if (syncPromise) {
    return syncPromise.then(() => performSyncAlloyConfig(additionalTenants));
  }
  syncPromise = performSyncAlloyConfig(additionalTenants).finally(() => {
    syncPromise = null;
  });
  return syncPromise;
}

async function performSyncAlloyConfig(additionalTenants: string[] = []): Promise<void> {
  const dbTenants = await getAllTenantsWithSubdomains().catch(() => ({}));
  
  for (const [t, subs] of Object.entries(dbTenants)) {
    if (t && t !== "not verified" && t !== "anonymous") {
      const existing = knownTenants.get(t) || [];
      knownTenants.set(t, Array.from(new Set([...existing, ...subs])));
    }
  }

  const staticTenants = [
    ...getAdmins(),
    ...getSuperAdmins(),
    ...additionalTenants,
  ];

  for (const t of staticTenants) {
    if (t && t !== "not verified" && t !== "anonymous" && !knownTenants.has(t)) {
      knownTenants.set(t, []);
    }
  }

  const configContent = generateAlloyConfig(knownTenants);

  const targetPaths = [
    "docker/config.alloy",
    "/etc/alloy/config.alloy",
    "/hostpipe/alloy/config.alloy",
    "docker/named_pipe/alloy/config.alloy",
  ];

  for (const path of targetPaths) {
    try {
      const dir = path.substring(0, path.lastIndexOf("/"));
      if (dir) {
        await Deno.mkdir(dir, { recursive: true }).catch(() => {});
      }
      await Deno.writeTextFile(path, configContent);
    } catch (_e) {
      // Ignore if path not available in current environment
    }
  }

  await reloadAlloy().catch(() => {});
}

export async function ensureTenantAlloyPipeline(tenant: string, subdomain?: string): Promise<void> {
  if (!tenant || tenant === "not verified" || tenant === "anonymous") return;
  const currentSubs = knownTenants.get(tenant) || [];
  const needsSub = subdomain && !currentSubs.includes(subdomain);
  if (!knownTenants.has(tenant) || needsSub) {
    if (subdomain && !currentSubs.includes(subdomain)) {
      currentSubs.push(subdomain);
    }
    knownTenants.set(tenant, currentSubs);
    await syncAlloyConfig([tenant]);
  }
}
