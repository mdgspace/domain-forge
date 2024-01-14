import { Context } from "../dependencies.ts";
import { checkUser } from "../db.ts";
import { checkJWT, createJWT } from "../utils/jwt.ts";

async function githubAuth(ctx: Context, id: string, secret: string) {
  if (!ctx.request.hasBody) {
    ctx.throw(415);
  }
  const code = await ctx.request.body().value;
  console.log(code);
  const rootUrl = new URL("https://github.com/login/oauth/access_token");

  if (code !== null) {
    rootUrl.search = new URLSearchParams({
      client_id: id,
      client_secret: secret,
      code,
    }).toString();
    const resp = await fetch(rootUrl.toString(), {
      method: "POST",
      headers: {
        "Accept": "application/json",
      },
    });
    const body = await resp.json();
    const { status, githubId } = await checkUser(body.access_token);
    ctx.response.headers.set("Access-Control-Allow-Origin", "*");
    if (status.matchedCount == 1) {
      const id_jwt = await createJWT(githubId);
      ctx.response.body = id_jwt;
    } else {
      ctx.response.body = "not authorized";
    }
  } else {
    ctx.response.body = "not authorized";
  }
}

async function githubId(ctx: Context) {
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  if (!ctx.request.hasBody) {
    ctx.throw(415);
  }
  const jwt_token = await ctx.request.body().value;
  ctx.response.body = await checkJWT(jwt_token);
}

export { githubAuth, githubId };
