import { Context } from "./dependencies.ts";
import { checkJWT } from "./utils/jwt.ts";
import {
  getDeploymentLogsByAuthor,
  getDeploymentLogBySubdomain,
  type DeploymentLog,
} from "./deployment-logs.ts";

const ADMIN_LIST = Deno.env.get("ADMIN_LIST")?.split("|") || [];

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Standard auth check — shared by all deployment log endpoints.
 * Extracts user/token/provider from query params and validates JWT.
 */
async function authenticateRequest(ctx: Context): Promise<string> {
  const author = ctx.request.url.searchParams.get("user");
  const token = ctx.request.url.searchParams.get("token");
  const provider = ctx.request.url.searchParams.get("provider");

  if (author !== (await checkJWT(provider!, token!))) {
    ctx.throw(401);
  }

  return author!;
}

/**
 * Format a deployment log for the API response.
 * Strips MongoDB internals and normalizes dates.
 */
function formatLog(log: DeploymentLog) {
  return {
    subdomain: log.subdomain,
    author: log.author,
    status: log.status,
    logContent: log.logContent || "",
    errorSummary: log.errorSummary || null,
    startedAt: log.startedAt instanceof Date
      ? log.startedAt.toISOString()
      : log.startedAt,
    completedAt: log.completedAt
      ? log.completedAt instanceof Date
        ? log.completedAt.toISOString()
        : log.completedAt
      : null,
    resourceType: log.resourceType,
    resource: log.resource,
  };
}

// ── Route Handlers ────────────────────────────────────────────────────────────

/**
 * GET /deployments/logs
 * Returns all deployment logs for the authenticated user.
 * Admins see all logs.
 */
export async function getDeploymentLogsHandler(ctx: Context): Promise<void> {
  const author = await authenticateRequest(ctx);

  const logs = await getDeploymentLogsByAuthor(author, ADMIN_LIST);

  ctx.response.body = {
    total: logs.length,
    logs: logs.map(formatLog),
  };
}

/**
 * GET /deployments/logs/:subdomain
 * Returns the latest deployment log for a specific subdomain.
 */
export async function getDeploymentLogHandler(ctx: Context): Promise<void> {
  const author = await authenticateRequest(ctx);
  const subdomain = (ctx as any).params?.subdomain;

  if (!subdomain) {
    ctx.response.status = 400;
    ctx.response.body = { error: "subdomain parameter is required" };
    return;
  }

  const log = await getDeploymentLogBySubdomain(subdomain);

  if (!log) {
    ctx.response.body = {
      subdomain,
      status: "unknown",
      message: "No deployment logs found for this subdomain",
    };
    return;
  }

  // Non-admin users can only see their own logs.
  if (!ADMIN_LIST.includes(author) && log.author !== author && log.author !== "unknown") {
    ctx.throw(403);
  }

  ctx.response.body = formatLog(log);
}

/**
 * GET /deployments/status/:subdomain
 * Lightweight endpoint — returns only the current deployment status.
 */
export async function getDeploymentStatusHandler(ctx: Context): Promise<void> {
  const author = await authenticateRequest(ctx);
  const subdomain = (ctx as any).params?.subdomain;

  if (!subdomain) {
    ctx.response.status = 400;
    ctx.response.body = { error: "subdomain parameter is required" };
    return;
  }

  const log = await getDeploymentLogBySubdomain(subdomain);

  if (!log) {
    ctx.response.body = {
      subdomain,
      status: "unknown",
    };
    return;
  }

  // Non-admin users can only see their own logs.
  if (!ADMIN_LIST.includes(author) && log.author !== author && log.author !== "unknown") {
    ctx.throw(403);
  }

  ctx.response.body = {
    subdomain,
    status: log.status,
    errorSummary: log.errorSummary || null,
  };
}
