import { Context, Sentry } from "../dependencies.ts";
import { checkUser } from "../db.ts";
import { checkJWT, createJWT, getUserRole, isSuperAdmin } from "../utils/jwt.ts";
import { generateApiKey } from "../utils/apiKeyGen.ts";

async function githubAuth(ctx: Context, id: string, secret: string) {
  await authenticateAndCreateJWT(ctx, id, secret, "github");
}

async function gitlabAuth(
  ctx: Context,
  id: string,
  secret: string,
  frontend: string,
) {
  await authenticateAndCreateJWT(ctx, id, secret, "gitlab", frontend);
}

async function authenticateAndCreateJWT(
  ctx: Context,
  id: string,
  secret: string,
  provider: string,
  frontend = "",
) {
  if (!ctx.request.hasBody) {
    ctx.throw(415);
  }
  const code = await ctx.request.body().value;
  const oauthUrl = provider === "github"
    ? "https://github.com/login/oauth/access_token"
    : provider === "gitlab"
      ? "https://gitlab.com/oauth/token"
      : null;

  if (oauthUrl === null) {
    ctx.response.body = "Unsupported provider";
    return;
  }

  if (code !== null) {
    // Send OAuth credentials in request body, not URL query string (P2-1 Remediation)
    const payload = provider === "github"
      ? { client_id: id, client_secret: secret, code }
      : {
        client_id: id,
        client_secret: secret,
        code,
        grant_type: "authorization_code",
        redirect_uri: `${frontend}/login`,
      };

    const resp = await fetch(oauthUrl, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const body = await resp.json();

    if (body.error) {
      console.error("OAuth Error:", body.error_description || body.error);
      ctx.response.body = "not authorized";
      return;
    }

    // Pass the access token to checkUser
    const { status, userId } = await checkUser(body.access_token, provider);

    if (status.matchedCount === 1 || status.upsertedId !== undefined) {
      const id_jwt = await createJWT(provider, userId);
      Sentry.captureMessage("User " + userId + " logged in", "info");
      ctx.response.body = id_jwt;
    } else {
      console.error("Authorization failed based on DB status");
      ctx.response.body = "not authorized";
    }
  } else {
    console.error("Code was null");
    ctx.response.body = "not authorized";
  }
}

async function handleJwtAuthentication(ctx: Context) {
  if (!ctx.request.hasBody) {
    ctx.throw(415);
  }
  const body = await ctx.request.body().value;
  let document;
  try {
    document = typeof body === "string" ? JSON.parse(body) : body;
  } catch (_e) {
    document = body;
  }
  const jwt_token = document?.jwt_token;
  const provider = document?.provider;
  const user = await checkJWT(provider, jwt_token);
  if (!user || user === "not verified") {
    ctx.throw(401, "Invalid token");
  }
  const apiKey = await generateApiKey(user);
  const role = getUserRole(user);
  const isSuper = isSuperAdmin(user);
  ctx.response.body = { user, apiKey, role, isSuperAdmin: isSuper };
}

export { githubAuth, gitlabAuth, handleJwtAuthentication };
