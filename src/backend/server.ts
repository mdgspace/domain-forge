import {
  Application,
  Context,
  isHttpError,
  Router,
  Sentry,
  Session,
  Status,
} from "./dependencies.ts";
import { githubAuth, githubId } from "./auth/github.ts";
import { addSubdomain, deleteSubdomain, getSubdomains } from "./main.ts";

const router = new Router();
const app = new Application();
const PORT = 7000;

const id: string = Deno.env.get("GITHUB_OAUTH_CLIENT_ID")!;
const secret: string = Deno.env.get("GITHUB_OAUTH_CLIENT_SECRET")!;
const dsn: string = Deno.env.get("SENTRY_DSN")!;

Sentry.init({
  dsn: dsn,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
  ],
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
  .post("/auth/github", (ctx) => githubAuth(ctx, id, secret))
  .post("/auth/jwt", (ctx) => githubId(ctx))
  .get("/map", (ctx) => getSubdomains(ctx))
  .post("/map", (ctx) => addSubdomain(ctx))
  .post("/mapdel", (ctx) => deleteSubdomain(ctx));

app.use(router.routes());
app.use(router.allowedMethods());
app.listen({ port: PORT });
console.log("Listening...");
