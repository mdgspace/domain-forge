import { Application, config, Router } from "./dependencies.ts";
import githubAuth from "./auth/github.ts";
import { addMaps, deleteMaps, getMaps } from "./db.ts";

const router = new Router();
const app = new Application();
const PORT = 7000;

const id: string = Deno.env.get("GITHUB_OAUTH_CLIENT_ID")!;
const secret: string = Deno.env.get("GITHUB_OAUTH_CLIENT_SECRET")!;

router
  .get("/auth", (ctx) => githubAuth(ctx, id, secret))
  .get("/map", getMaps)
  .post("/map/:id", addMaps)
  .delete("/maps/:id", deleteMaps);

app.use(router.routes());
app.use(router.allowedMethods());
app.listen({ port: PORT });
console.log("Listening...");
