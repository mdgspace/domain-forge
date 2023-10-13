import { Application, Router, Session } from "./dependencies.ts";
import { githubAuth, githubId } from "./auth/github.ts";
import { addMaps, deleteMaps, getMaps } from "./db.ts";

const router = new Router();
const app = new Application();
const PORT = 7000;

const id: string = Deno.env.get("GITHUB_OAUTH_CLIENT_ID")!;
const secret: string = Deno.env.get("GITHUB_OAUTH_CLIENT_SECRET")!;

app.use(Session.initMiddleware());

router
  .post("/auth/github", (ctx) => githubAuth(ctx, id, secret))
  .post("/auth/jwt", (ctx) => githubId(ctx))
  .get("/map", (ctx) => getMaps(ctx))
  .post("/map", (ctx) => addMaps(ctx))
  .post("/mapdel", (ctx) => deleteMaps(ctx));

app.use(router.routes());
app.use(router.allowedMethods());
app.listen({ port: PORT });
console.log("Listening...");
