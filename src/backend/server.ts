import { Application, Router, Session, oakCors } from "./dependencies.ts";
import { addMaps, deleteMaps, getMaps } from "./db.ts";
import { githubAuth, gitlabAuth, handleJwtAuthentication } from "./auth/github.ts";

const router = new Router();
const app = new Application();
const PORT = 8000;

const githubClientId: string = Deno.env.get("GITHUB_OAUTH_CLIENT_ID")!;
const githubClientSecret: string = Deno.env.get("GITHUB_OAUTH_CLIENT_SECRET")!;
const gitlabClientId: string = Deno.env.get("GITLAB_OAUTH_CLIENT_ID")!;
const gitlabClientSecret: string = Deno.env.get("GITLAB_OAUTH_CLIENT_SECRET")!;

app.use(Session.initMiddleware());

router
  .post("/auth/github", (ctx) =>
    githubAuth(ctx, githubClientId, githubClientSecret)
  )
  .post("/auth/gitlab", (ctx) =>
    gitlabAuth(ctx, gitlabClientId, gitlabClientSecret)
  )
  .post("/auth/jwt", (ctx) => handleJwtAuthentication(ctx))
  .get("/map", (ctx) => getMaps(ctx))
  .post("/map", (ctx) => addMaps(ctx))
  .post("/mapdel", (ctx) => deleteMaps(ctx));

app.use(oakCors());
app.use(router.routes());
app.use(router.allowedMethods());
app.listen({ port: PORT });
console.log("Listening...");
