import { isSuperAdmin, getSuperAdmins, getAdmins } from "./jwt.ts";
import { ensureTenantAlloyPipeline } from "./alloy-provisioner.ts";
import { getAllTenantsWithSubdomains, getSubdomainOwner } from "../db.ts";

const GRAFANA_URL = Deno.env.get("GRAFANA_URL") || "http://grafana:3000";
const GRAFANA_ADMIN_USER = Deno.env.get("GF_SECURITY_ADMIN_USER") || "admin";
const GRAFANA_ADMIN_PASSWORD = Deno.env.get("GF_SECURITY_ADMIN_PASSWORD") || "admin";

function getAdminAuthHeader(): string {
  const token = btoa(`${GRAFANA_ADMIN_USER}:${GRAFANA_ADMIN_PASSWORD}`);
  return `Basic ${token}`;
}

export function getTenantOrgName(userId: string): string {
  if (isSuperAdmin(userId)) {
    return "Main Org.";
  }
  return `org_${userId}`;
}

interface GrafanaOrgResponse {
  id?: number;
  orgId?: number;
  name?: string;
  message?: string;
}

async function upsertDatasource(
  orgHeaders: Record<string, string>,
  ds: Record<string, any>,
): Promise<void> {
  try {
    const getResp = await fetch(`${GRAFANA_URL}/api/datasources/uid/${ds.uid}`, {
      headers: orgHeaders,
      signal: AbortSignal.timeout(3000),
    });
    if (getResp.ok) {
      const existing = await getResp.json();
      if (existing?.id) {
        await fetch(`${GRAFANA_URL}/api/datasources/${existing.id}`, {
          method: "PUT",
          headers: orgHeaders,
          body: JSON.stringify({ ...existing, ...ds, id: existing.id }),
          signal: AbortSignal.timeout(3000),
        });
        return;
      }
    }
    await fetch(`${GRAFANA_URL}/api/datasources`, {
      method: "POST",
      headers: orgHeaders,
      body: JSON.stringify(ds),
      signal: AbortSignal.timeout(3000),
    });
  } catch (_e) {
    // Non-fatal if Grafana temporarily unreachable during initial startup
  }
}

/**
 * Ensures a dedicated Grafana Organization exists with tenant-isolated
 * Mimir & Loki datasources (configured with X-Scope-OrgID HTTP headers) and pre-seeded dashboards.
 */
export async function ensureTenantGrafanaOrg(userId: string, subdomain?: string): Promise<number | null> {
  const orgName = getTenantOrgName(userId);
  const authHeader = getAdminAuthHeader();

  // Also ensure the Alloy metrics pipeline exists for this tenant
  if (userId && userId !== "not verified") {
    await ensureTenantAlloyPipeline(userId).catch(() => {});
  }

  try {
    // If Main Org. (superadmin), update Org 1 datasources with federated Mimir & target Loki tenant
    if (orgName === "Main Org.") {
      const orgHeaders = {
        "Content-Type": "application/json",
        "Authorization": authHeader,
        "X-Grafana-Org-Id": "1",
        "Accept": "application/json",
      };

      let mimirTenant = "admin";
      try {
        const dbTenants = await getAllTenantsWithSubdomains().catch(() => ({}));
        const allTenants = Array.from(
          new Set([
            ...Object.keys(dbTenants),
            ...getAdmins(),
            ...getSuperAdmins(),
          ]),
        ).filter((t) => t && t !== "not verified" && t !== "anonymous");
        if (allTenants.length > 0) {
          mimirTenant = allTenants.join("|");
        }
      } catch (_e) {}

      let lokiTenant = userId;
      if (subdomain) {
        const owner = await getSubdomainOwner(subdomain).catch(() => null);
        if (owner) {
          lokiTenant = owner;
        }
      }

      await upsertDatasource(orgHeaders, {
        name: "Mimir",
        uid: "Mimir",
        type: "prometheus",
        access: "proxy",
        url: "http://mimir:8080/prometheus",
        isDefault: true,
        jsonData: {
          timeInterval: "5s",
          httpHeaderName1: "X-Scope-OrgID",
        },
        secureJsonData: {
          httpHeaderValue1: mimirTenant,
        },
        editable: false,
      });

      await upsertDatasource(orgHeaders, {
        name: "Loki",
        uid: "Loki",
        type: "loki",
        access: "proxy",
        url: "http://loki:3100",
        jsonData: {
          maxLines: 1000,
          httpHeaderName1: "X-Scope-OrgID",
        },
        secureJsonData: {
          httpHeaderValue1: lokiTenant,
        },
        editable: false,
      });

      return 1;
    }

    // 1. Check if organization already exists
    let orgId: number | null = null;
    try {
      const getOrgResp = await fetch(
        `${GRAFANA_URL}/api/orgs/name/${encodeURIComponent(orgName)}`,
        {
          headers: {
            "Authorization": authHeader,
            "Accept": "application/json",
          },
          signal: AbortSignal.timeout(3000),
        },
      );

      if (getOrgResp.ok) {
        const orgData: GrafanaOrgResponse = await getOrgResp.json();
        orgId = orgData.id || orgData.orgId || null;
      }
    } catch (_e) {
      // If Grafana is unreachable, fail gracefully
      return null;
    }

    // 2. Create organization if missing
    if (!orgId) {
      const createOrgResp = await fetch(`${GRAFANA_URL}/api/orgs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader,
          "Accept": "application/json",
        },
        body: JSON.stringify({ name: orgName }),
        signal: AbortSignal.timeout(3000),
      });

      if (createOrgResp.ok) {
        const createOrgData: GrafanaOrgResponse = await createOrgResp.json();
        orgId = createOrgData.orgId || createOrgData.id || null;
      } else {
        console.warn(`[GrafanaProvisioner] Failed to create org for ${orgName}: ${createOrgResp.statusText}`);
      }
    }

    if (!orgId) {
      return null;
    }

    const orgHeaders = {
      "Content-Type": "application/json",
      "Authorization": authHeader,
      "X-Grafana-Org-Id": String(orgId),
      "Accept": "application/json",
    };

    // 3. Provision Loki datasource with tenant X-Scope-OrgID
    await upsertDatasource(orgHeaders, {
      name: "Loki",
      uid: "Loki",
      type: "loki",
      access: "proxy",
      url: "http://loki:3100",
      jsonData: {
        maxLines: 1000,
        httpHeaderName1: "X-Scope-OrgID",
      },
      secureJsonData: {
        httpHeaderValue1: userId,
      },
      editable: false,
    });

    // 4. Provision Mimir datasource with tenant X-Scope-OrgID (strictly isolated to userId)
    await upsertDatasource(orgHeaders, {
      name: "Mimir",
      uid: "Mimir",
      type: "prometheus",
      access: "proxy",
      url: "http://mimir:8080/prometheus",
      isDefault: true,
      jsonData: {
        timeInterval: "5s",
        httpHeaderName1: "X-Scope-OrgID",
      },
      secureJsonData: {
        httpHeaderValue1: userId,
      },
      editable: false,
    });

    // 5. Seed default Container Telemetry Dashboard into new Org
    try {
      const dashboardJson = await Deno.readTextFile(
        "docker/grafana/dashboards/container-dashboard.json",
      ).catch(async () => {
        return await Deno.readTextFile(
          "/var/lib/grafana/dashboards/container-dashboard.json",
        );
      });

      if (dashboardJson) {
        const parsed = JSON.parse(dashboardJson);
        parsed.id = null; // Reset id for fresh import
        await fetch(`${GRAFANA_URL}/api/dashboards/db`, {
          method: "POST",
          headers: orgHeaders,
          body: JSON.stringify({
            dashboard: parsed,
            overwrite: true,
          }),
          signal: AbortSignal.timeout(3000),
        });
      }
    } catch (_e) {
      // Non-fatal if dashboard file not found in current path
    }

    return orgId;
  } catch (error) {
    console.warn(`[GrafanaProvisioner] Error ensuring tenant org for ${userId}:`, error);
    return null;
  }
}
