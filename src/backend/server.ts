import {
  Application,
  Context,
  isHttpError,
  oakCors,
  Router,
  Sentry,
  Session,
  Status,
} from "./dependencies.ts";
import {
  githubAuth,
  gitlabAuth,
  handleJwtAuthentication,
} from "./auth/github.ts";
import { addSubdomain, deleteSubdomain, getLogs, getSubdomains, githubWebhook, redeploySubdomain } from "./main.ts";
import { verifySubdomainOwnership } from "./db.ts";
import {
  getContainerHealth,
  getContainerMetrics,
  getHealthDashboard,
  restartContainerHandler,
  stopContainerHandler,
  triggerHealthCheckHandler,
} from "./health-api.ts";
import { startHealthMonitor } from "./health-monitor.ts";
import { startStatusWatcher, streamStatuses } from "./status-stream.ts";
import { createGrafanaJWT, getUserRole, isSuperAdmin } from "./utils/jwt.ts";
import { logger, requestLoggerMiddleware } from "./utils/logger.ts";
import { getSystemLogs } from "./utils/log-service.ts";
import { authenticateRequest } from "./utils/auth-helper.ts";
import { ensureTenantGrafanaOrg, getTenantOrgName } from "./utils/grafana-provisioner.ts";
import { syncAlloyConfig } from "./utils/alloy-provisioner.ts";

const router = new Router();
const app = new Application();
const PORT = 7000;

const githubClientId: string = Deno.env.get("GITHUB_OAUTH_CLIENT_ID") || "";
const githubClientSecret: string = Deno.env.get("GITHUB_OAUTH_CLIENT_SECRET") || "";
const gitlabClientId: string = Deno.env.get("GITLAB_OAUTH_CLIENT_ID") || "";
const gitlabClientSecret: string = Deno.env.get("GITLAB_OAUTH_CLIENT_SECRET") || "";
const dsn: string = Deno.env.get("SENTRY_DSN") || "";
const frontend: string = Deno.env.get("FRONTEND") || "";

if (dsn) {
  Sentry.init({
    dsn: dsn,
    debug: false,
    tracesSampleRate: 1.0,
  });
}

app.use(async (ctx: Context, next) => {
  try {
    await next();
  } catch (err) {
    if (isHttpError(err)) {
      ctx.response.status = err.status;
      const message = err.expose || err.status < 500 ? err.message : "An unexpected error occurred.";
      ctx.response.body = { error: message };
    } else {
      ctx.response.status = Status.InternalServerError;
      ctx.response.body = { error: "Internal Server Error" };
    }
    if (dsn) Sentry.captureException(err);
    logger.error("Unhandled server error", {
      status: ctx.response.status,
      error: (err as Error)?.message || String(err),
    });
  }
});

app.use(Session.initMiddleware());
app.use(requestLoggerMiddleware);

async function getGrafanaTokenHandler(ctx: Context): Promise<void> {
  const auth = await authenticateRequest(ctx);
  if (!auth) {
    ctx.throw(401, "Unauthorized");
  }
  const author = auth.user;
  const subdomain = ctx.request.url.searchParams.get("subdomain");

  // If a specific subdomain was requested by a non-superadmin, verify ownership
  if (subdomain && !isSuperAdmin(author)) {
    const ownsSubdomain = await verifySubdomainOwnership(author, subdomain);
    if (!ownsSubdomain) {
      ctx.throw(403, "You do not have permission to access telemetry for this container.");
    }
  }

  const role = getUserRole(author);
  const orgName = getTenantOrgName(author);

  // Ensure dedicated Grafana Organization and tenant datasources exist
  await ensureTenantGrafanaOrg(author, subdomain || undefined);

  const grafanaJwt = await createGrafanaJWT(author, role, subdomain || undefined);
  ctx.response.body = {
    token: grafanaJwt,
    role,
    org: orgName,
    user: author,
  };
}

async function getSystemLogsHandler(ctx: Context): Promise<void> {
  const auth = await authenticateRequest(ctx);
  if (!auth) {
    ctx.throw(401, "Unauthorized");
  }
  const author = auth.user;

  if (!isSuperAdmin(author)) {
    ctx.throw(403, "Only super administrators can view system logs.");
  }

  const logs = await getSystemLogs();
  ctx.response.body = { logs };
}

router
  // Auth routes
  .post(
    "/auth/github",
    (ctx) => githubAuth(ctx, githubClientId, githubClientSecret),
  )
  .post(
    "/auth/gitlab",
    (ctx) => gitlabAuth(ctx, gitlabClientId, gitlabClientSecret, frontend),
  )
  .post("/auth/jwt", (ctx) => handleJwtAuthentication(ctx))
  .get("/auth/grafana-token", (ctx) => getGrafanaTokenHandler(ctx))
  // Subdomain routes
  .get("/map", (ctx) => getSubdomains(ctx))
  .get("/map/status-stream", (ctx) => streamStatuses(ctx))
  .get("/map/:subdomain/logs", (ctx) => getLogs(ctx))
  .post("/map", (ctx) => addSubdomain(ctx))
  .post("/map/:subdomain/redeploy", (ctx) => redeploySubdomain(ctx))
  .post("/mapdel", (ctx) => deleteSubdomain(ctx))
  .post("/webhook/github", (ctx) => githubWebhook(ctx))
  // System logs route
  .get("/logs/system", (ctx) => getSystemLogsHandler(ctx))
  // Health monitoring routes
  .get("/health", (ctx) => getContainerHealth(ctx))
  .get("/health/summary", (ctx) => getHealthDashboard(ctx))
  .get("/health/:subdomain/metrics", (ctx) => getContainerMetrics(ctx))
  .post("/health/:subdomain/restart", (ctx) => restartContainerHandler(ctx))
  .post("/health/:subdomain/stop", (ctx) => stopContainerHandler(ctx))
  .post("/health/check", (ctx) => triggerHealthCheckHandler(ctx));

const isProd = Deno.env.get("DENO_ENV") === "production";
const rawFrontend = Deno.env.get("FRONTEND");
const configuredOrigins = rawFrontend
  ? rawFrontend.split(",").map((o) => o.trim()).filter(Boolean)
  : [];
const defaultDevOrigins = [
  "http://localhost:8000",
  "http://localhost:5173",
  "http://127.0.0.1:8000",
  "http://127.0.0.1:5173",
];

if (isProd && configuredOrigins.length === 0) {
  throw new Error("[SECURITY FATAL] FRONTEND must be configured with allowed origins in production!");
}

const grafanaAdminPassword = Deno.env.get("GF_SECURITY_ADMIN_PASSWORD");
if (isProd && (!grafanaAdminPassword || grafanaAdminPassword === "admin")) {
  logger.warn("[SECURITY] GF_SECURITY_ADMIN_PASSWORD is unset or using default 'admin' in production!");
}

const allowedOrigins = isProd
  ? configuredOrigins
  : Array.from(new Set([...configuredOrigins, ...defaultDevOrigins]));

app.use(
  oakCors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With", "X-Auth-Provider"],
    credentials: true,
  }),
);
app.use(router.routes());
app.use(router.allowedMethods());

// Initialize Alloy telemetry pipeline configurations for known tenants
syncAlloyConfig().catch((e) => {
  logger.warn("Initial Alloy config synchronization notice", { error: (e as Error)?.message });
});

// Start health monitoring service
startHealthMonitor();
startStatusWatcher();

console.log(`Listening on port ${PORT}...`);
await app.listen({ port: PORT });
