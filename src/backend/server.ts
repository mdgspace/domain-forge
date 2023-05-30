import { Application, Router } from './dependencies.ts';
import { githubAuth } from './auth/github.ts';
import { getMaps, addMaps, deleteMaps } from './db.ts';

const router = new Router();
const app = new Application();

const PORT = Number(Deno.env.get("PORT"));
console.log('Listening on 127.0.0.1:' + PORT);

router
    .get("/auth", githubAuth)
    .get("/map", getMaps)
    .post("/map/:id", addMaps)
    .delete("/maps/:id", deleteMaps)

app.use(router.routes());
app.use(router.allowedMethods());
app.listen({ port: PORT });