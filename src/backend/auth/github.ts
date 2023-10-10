import { Context, create, verify } from "../dependencies.ts";
import { checkUser } from "../db.ts";

const key = await crypto.subtle.generateKey(
  { name: "HMAC", hash: "SHA-512" },
  true,
  ["sign", "verify"],
);

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
      const id_jwt = await create({ alg: "HS512", typ: "JWT" }, {
        githubId: githubId,
      }, key);
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
  try {
    const payload = await verify(jwt_token, key);
    ctx.response.body = payload.githubId!;
  } catch (error) {
    ctx.response.body = "not verified";
  }
}

export { githubAuth, githubId };
