import { getSubdomainOwner } from "../db.ts";

export function isValidSubdomain(subdomain: string): boolean {
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i.test(subdomain);
}

export function buildLokiQuery(subdomain: string): string {
  if (!isValidSubdomain(subdomain)) {
    throw new Error("Invalid subdomain format");
  }
  return `{container_name="${subdomain}"}`;
}

async function readLastNBytes(filePath: string, n: number): Promise<string> {
  try {
    const file = await Deno.open(filePath, { read: true });
    const fileSize = (await file.stat()).size;
    const start = Math.max(0, fileSize - n);
    await file.seek(start, Deno.SeekMode.Start);
    const buffer = new Uint8Array(n);
    const bytesRead = await file.read(buffer);
    file.close();
    if (bytesRead === null) return "";
    return new TextDecoder().decode(buffer.subarray(0, bytesRead));
  } catch (_e) {
    return "No build logs found or log file does not exist.";
  }
}

async function fetchFromLoki(
  endpoint: string,
  params: URLSearchParams,
  tenantId = "domain-forge-primary",
): Promise<Response> {
  const candidateUrls = [
    Deno.env.get("LOKI_URL"),
    "http://loki:3100",
    "http://df_loki:3100",
    "http://127.0.0.1:3100",
    "http://localhost:3100",
  ].filter(Boolean) as string[];

  let lastError: Error | null = null;

  for (const baseUrl of candidateUrls) {
    try {
      const url = new URL(`${baseUrl.replace(/\/$/, "")}${endpoint}`);
      params.forEach((v, k) => url.searchParams.set(k, v));

      const resp = await fetch(url.toString(), {
        headers: {
          "Accept": "application/json",
          "X-Scope-OrgID": tenantId,
        },
        signal: AbortSignal.timeout(3000),
      });
      return resp;
    } catch (err) {
      lastError = err as Error;
    }
  }

  throw lastError || new Error("Could not connect to Loki");
}

export async function getBuildLogs(subdomain: string, maxBytes = 100 * 1024): Promise<string> {
  if (!isValidSubdomain(subdomain)) {
    throw new Error("Invalid subdomain format");
  }
  const logPath = `/hostpipe/logs/${subdomain}.log`;
  return await readLastNBytes(logPath, maxBytes);
}

export async function getRuntimeLogs(
  subdomain: string,
  lines = 200,
  tenantId?: string,
): Promise<string> {
  if (!isValidSubdomain(subdomain)) {
    throw new Error("Invalid subdomain format");
  }

  // Loki queries must always use the single subdomain owner tenant (never Mimir pipe federation syntax)
  const owner = await getSubdomainOwner(subdomain).catch(() => null);
  let targetTenant: string | undefined = owner || undefined;

  if (!targetTenant && tenantId && tenantId !== "not verified" && !tenantId.includes("|")) {
    targetTenant = tenantId;
  }

  if (!targetTenant || targetTenant === "not verified") {
    return "No runtime container logs found (unauthorized or unknown tenant).";
  }

  try {
    const query = buildLokiQuery(subdomain);
    const nowNs = BigInt(Date.now()) * 1000000n;
    const fourteenDaysAgoNs = nowNs - (14n * 24n * 60n * 60n * 1000n * 1000000n);

    const params = new URLSearchParams({
      query,
      limit: String(lines),
      start: fourteenDaysAgoNs.toString(),
      end: nowNs.toString(),
      direction: "BACKWARD",
    });

    const response = await fetchFromLoki("/loki/api/v1/query_range", params, targetTenant);

    if (!response.ok) {
      return `Loki returned status ${response.status}: ${response.statusText}`;
    }

    const data = await response.json();
    const results = data?.data?.result;

    if (!Array.isArray(results) || results.length === 0) {
      return "No runtime container logs found in Loki yet (logs appear when the container outputs to stdout/stderr).";
    }

    const logEntries: { ts: string; line: string }[] = [];
    for (const stream of results) {
      if (Array.isArray(stream.values)) {
        for (const [ts, line] of stream.values) {
          logEntries.push({ ts, line });
        }
      }
    }

    logEntries.sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));
    return logEntries.map((e) => e.line).join("\n");
  } catch (error) {
    return `Could not fetch runtime logs: ${(error as Error).message}`;
  }
}

export async function getCombinedLogs(
  subdomain: string,
  lines = 200,
  tenantId?: string,
): Promise<{ build: string; runtime: string; all: string }> {
  const [build, runtime] = await Promise.all([
    getBuildLogs(subdomain),
    getRuntimeLogs(subdomain, lines, tenantId),
  ]);

  const all = [
    "=== [BUILD LOGS] ===",
    build,
    "",
    "=== [RUNTIME LOGS] ===",
    runtime,
  ].join("\n");

  return { build, runtime, all };
}

export async function getSystemLogs(maxBytes = 200 * 1024): Promise<string> {
  const logPath = "/hostpipe/logs/df_backend.log";
  return await readLastNBytes(logPath, maxBytes);
}
