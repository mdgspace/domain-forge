import { Application, Router } from './dependencies.ts';
import githubAuth from './auth/github.ts';
import { getMaps, addMaps, deleteMaps } from './db.ts';

const router = new Router();
const app = new Application();
const PORT = 7000;

router
    .get("/auth", githubAuth)
    .get("/map", getMaps)
    .post("/map/:id", addMaps)
    .delete("/maps/:id", deleteMaps)

app.use(router.routes());
app.use(router.allowedMethods());
app.listen({ port: PORT });
console.log('Listening...');