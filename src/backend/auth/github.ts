import { Context, Sentry } from "../dependencies.ts";
import { checkUser } from "../db.ts";
import { checkJWT, createJWT } from "../utils/jwt.ts";

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
    rootUrl.search = provider === "github"? new URLSearchParams({
      client_id: id,
      client_secret: secret,
      code,
    }).toString() : provider === "gitlab"? new URLSearchParams({
      client_id: id,
      client_secret: secret,
      code,
      grant_type: "authorization_code",
      redirect_uri: "http://localhost:7777/login"
    }).toString() : "";

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
      const id_jwt = await createJWT(provider, userId);
      Sentry.captureMessage("User " + userId + " logged in", "info");
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
  const body = await ctx.request.body().value;
  let document;
  try {
    document = JSON.parse(body);
  } catch (e) {
    document = body;
  }
  const jwt_token = document.jwt_token;
  const provider = document.provider;
  ctx.response.body = await checkJWT(provider, jwt_token);
}

export { githubAuth, gitlabAuth, handleJwtAuthentication };
