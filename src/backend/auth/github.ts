import { Context, create, verify } from "../dependencies.ts";
import { checkUser } from "../db.ts";

const key = await crypto.subtle.generateKey(
  { name: "HMAC", hash: "SHA-512" },
  true,
  ["sign", "verify"]
);

async function githubAuth(ctx: Context, id: string, secret: string) {
  await authenticateAndCreateJWT(ctx, id, secret, "github");
}

async function gitlabAuth(ctx: Context, id: string, secret: string) {
  await authenticateAndCreateJWT(ctx, id, secret, "gitlab");
}

async function authenticateAndCreateJWT(
  ctx: Context,
  id: string,
  secret: string,
  provider: string
) {
  if (!ctx.request.hasBody) {
    ctx.throw(415);
  }
  const code = await ctx.request.body().value;
  console.log(code);
  const oauthUrl =
    provider === "github"
      ? "https://github.com/login/oauth/access_token"
      : provider === "gitlab"
      ? "https://gitlab.com/oauth/token"
      : null;

  if (oauthUrl === null) {
    ctx.response.body = "Unsupported provider";
    return;
  }

  if (code !== null) {
    const rootUrl = new URL(oauthUrl);
    rootUrl.search = new URLSearchParams({
      client_id: id,
      client_secret: secret,
      code,
    }).toString();

    const resp = await fetch(rootUrl.toString(), {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    });

    const body = await resp.json();
    const { status, userId } = await checkUser(body.access_token, provider);

    ctx.response.headers.set("Access-Control-Allow-Origin", "*");

    if (status.matchedCount == 1) {
      const id_jwt = await create(
        { alg: "HS512", typ: "JWT" },
        {
          [`${provider}Id`]: userId,
        },
        key
      );
      ctx.response.body = id_jwt;
    } else {
      ctx.response.body = "not authorized";
    }
  } else {
    ctx.response.body = "not authorized";
  }
}

async function handleJwtAuthentication(ctx: Context) {
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  if (!ctx.request.hasBody) {
    ctx.throw(415);
  }
  const jwt_token = await ctx.request.body().value;
  const provider = jwt_token.startsWith("github") ? "github" : "gitlab";
  try {
    const payload = await verify(jwt_token, key);
    ctx.response.body = payload[`${provider}Id`]!;
  } catch (error) {
    ctx.response.body = "not verified";
  }
}

export { githubAuth, gitlabAuth, handleJwtAuthentication };
