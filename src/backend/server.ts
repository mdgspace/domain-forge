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
import {
  getContainerHealth,
  getContainerMetrics,
  getHealthDashboard,
  restartContainerHandler,
  stopContainerHandler,
  triggerHealthCheckHandler,
} from "./health-api.ts";
import { startHealthMonitor } from "./health-monitor.ts";

const router = new Router();
const app = new Application();
const PORT = 7000;

const githubClientId: string = Deno.env.get("GITHUB_OAUTH_CLIENT_ID")!;
const githubClientSecret: string = Deno.env.get("GITHUB_OAUTH_CLIENT_SECRET")!;
const gitlabClientId: string = Deno.env.get("GITLAB_OAUTH_CLIENT_ID")!;
const gitlabClientSecret: string = Deno.env.get("GITLAB_OAUTH_CLIENT_SECRET")!;
const dsn: string = Deno.env.get("SENTRY_DSN")!;
const frontend: string = Deno.env.get("FRONTEND")!;

Sentry.init({
  dsn: dsn,
  debug: true,
  tracesSampleRate: 1.0,
});

app.use(async (ctx: Context, next) => {
  try {
    await next();
  } catch (err) {
    if (isHttpError(err)) {
      ctx.response.status = err.status;
    } else {
      ctx.response.status = Status.InternalServerError;
    }
    Sentry.captureException(err);
    ctx.response.body = { error: err.message };
  }
});

app.use(Session.initMiddleware());

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
  // Subdomain routes
  .get("/map", (ctx) => getSubdomains(ctx))
  .get("/map/:subdomain/logs", (ctx) => getLogs(ctx))
  .post("/map", (ctx) => addSubdomain(ctx))
  .post("/map/:subdomain/redeploy", (ctx) => redeploySubdomain(ctx))
  .post("/mapdel", (ctx) => deleteSubdomain(ctx))
  .post("/webhook/github", (ctx) => githubWebhook(ctx))
  // Health monitoring routes
  .get("/health", (ctx) => getContainerHealth(ctx))
  .get("/health/summary", (ctx) => getHealthDashboard(ctx))
  .get("/health/:subdomain/metrics", (ctx) => getContainerMetrics(ctx))
  .post("/health/:subdomain/restart", (ctx) => restartContainerHandler(ctx))
  .post("/health/:subdomain/stop", (ctx) => stopContainerHandler(ctx))
  .post("/health/check", (ctx) => triggerHealthCheckHandler(ctx));

app.use(oakCors({ origin: frontend }));
app.use(router.routes());
app.use(router.allowedMethods());

// Start health monitoring service
startHealthMonitor();

app.listen({ port: PORT });
console.log("Listening...");
