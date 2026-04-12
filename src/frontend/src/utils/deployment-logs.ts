/**
 * Frontend utility for interacting with the deployment logs API.
 */

const backend = import.meta.env.VITE_APP_BACKEND;

function getAuthParams(): string {
  const user = localStorage.getItem("JWTUser") || "";
  const provider = localStorage.getItem("provider") || "";
  // Note: the backend expects the JWT token *and* the username.
  // We'll fetch the username via check_jwt first in the components that need it.
  return `token=${encodeURIComponent(user)}&provider=${encodeURIComponent(provider)}`;
}

/**
 * Get all deployment logs for the authenticated user.
 */
export async function getDeploymentLogs(user: string): Promise<any> {
  const url = `${backend}/deployments/logs?user=${encodeURIComponent(user)}&${getAuthParams()}`;
  try {
    const resp = await fetch(url, {
      method: "GET",
      headers: { "Accept": "application/json" },
    });
    if (!resp.ok) return { total: 0, logs: [] };
    return await resp.json();
  } catch (error) {
    console.error("[deployment-logs] Failed to fetch logs:", error);
    return { total: 0, logs: [] };
  }
}

/**
 * Get the deployment log for a specific subdomain.
 */
export async function getDeploymentLog(user: string, subdomain: string): Promise<any> {
  const url = `${backend}/deployments/logs/${encodeURIComponent(subdomain)}?user=${encodeURIComponent(user)}&${getAuthParams()}`;
  try {
    const resp = await fetch(url, {
      method: "GET",
      headers: { "Accept": "application/json" },
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch (error) {
    console.error(`[deployment-logs] Failed to fetch log for ${subdomain}:`, error);
    return null;
  }
}

/**
 * Get just the deployment status for a specific subdomain (lightweight).
 */
export async function getDeploymentStatus(user: string, subdomain: string): Promise<any> {
  const url = `${backend}/deployments/status/${encodeURIComponent(subdomain)}?user=${encodeURIComponent(user)}&${getAuthParams()}`;
  try {
    const resp = await fetch(url, {
      method: "GET",
      headers: { "Accept": "application/json" },
    });
    if (!resp.ok) return { status: "unknown" };
    return await resp.json();
  } catch (error) {
    console.error(`[deployment-logs] Failed to fetch status for ${subdomain}:`, error);
    return { status: "unknown" };
  }
}
