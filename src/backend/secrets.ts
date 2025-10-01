import { Context, Sentry } from "./dependencies.ts";
import { checkJWT } from "./utils/jwt.ts";
import { authorizeProjectAccess } from "./utils/authorization.ts";
import {
  getSecretsForProject,
  upsertSecrets,
  deleteSecretsForProject,
} from "./db.ts";
import { getEncryptionService } from "./utils/encryption.ts";

const ADMIN_LIST = Deno.env.get("ADMIN_LIST")?.split("|") || [];

export async function upsertProjectSecrets(ctx: Context) {
  try {
    const subdomain = ctx.params.subdomain;

    if (!subdomain) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Subdomain parameter is required" };
      return;
    }

    if (!ctx.request.hasBody) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Request body is required" };
      return;
    }

    let body;
    const bodyValue = await ctx.request.body().value;
    try {
      body = typeof bodyValue === "string" ? JSON.parse(bodyValue) : bodyValue;
    } catch (e) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Invalid JSON in request body" };
      return;
    }

    const { secrets, token, provider } = body;

    if (!token || !provider) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Authentication required (token and provider)" };
      return;
    }

    if (!secrets || typeof secrets !== "object" || Array.isArray(secrets)) {
      ctx.response.status = 400;
      ctx.response.body = { error: "secrets must be an object with key-value pairs" };
      return;
    }

    const secretsString = JSON.stringify(secrets);
    if (secretsString.length > 50000) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Secrets payload too large (max 50KB)" };
      return;
    }

    for (const key in secrets) {
      if (!key || key.length > 255) {
        ctx.response.status = 400;
        ctx.response.body = { error: `Invalid secret key: ${key}` };
        return;
      }
      if (typeof secrets[key] !== "string") {
        ctx.response.status = 400;
        ctx.response.body = { error: `Secret value for ${key} must be a string` };
        return;
      }
    }

    const userId = await authorizeProjectAccess(
      token,
      provider,
      subdomain,
      ADMIN_LIST,
    );

    if (!userId) {
      ctx.response.status = 403;
      ctx.response.body = { error: "Unauthorized: You don't have access to this project" };
      return;
    }

    const encryptionService = getEncryptionService();
    if (!encryptionService.isInitialized()) {
      ctx.response.status = 500;
      ctx.response.body = { error: "Encryption service not initialized" };
      return;
    }

    const encryptedData = await encryptionService.encryptSecrets(secrets);

    const success = await upsertSecrets(subdomain, encryptedData);

    if (success) {
      ctx.response.headers.set("Access-Control-Allow-Origin", "*");
      ctx.response.body = {
        status: "success",
        message: "Secrets updated successfully",
        keysCount: Object.keys(secrets).length,
      };

      Sentry.captureMessage(
        `User ${userId} updated secrets for ${subdomain}`,
        "info",
      );
    } else {
      ctx.response.status = 500;
      ctx.response.body = { error: "Failed to save secrets" };
    }
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
    Sentry.captureException(error);
    console.error("Error in upsertProjectSecrets:", error);
  }
}

export async function getProjectSecretKeys(ctx: Context) {
  try {
    const subdomain = ctx.params.subdomain;
    const token = ctx.request.url.searchParams.get("token");
    const provider = ctx.request.url.searchParams.get("provider");

    if (!subdomain) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Subdomain parameter is required" };
      return;
    }

    if (!token || !provider) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Authentication required (token and provider)" };
      return;
    }

    const userId = await authorizeProjectAccess(
      token,
      provider,
      subdomain,
      ADMIN_LIST,
    );

    if (!userId) {
      ctx.response.status = 403;
      ctx.response.body = { error: "Unauthorized: You don't have access to this project" };
      return;
    }

    const storedSecret = await getSecretsForProject(subdomain);

    if (!storedSecret) {
      ctx.response.headers.set("Access-Control-Allow-Origin", "*");
      ctx.response.body = { keys: [], hasSecrets: false };
      return;
    }

    const encryptionService = getEncryptionService();
    if (!encryptionService.isInitialized()) {
      ctx.response.status = 500;
      ctx.response.body = { error: "Encryption service not initialized" };
      return;
    }

    const encryptedData = {
      encrypted: storedSecret.encrypted_secrets,
      iv: storedSecret.iv,
      tag: storedSecret.tag,
    };

    const decryptedSecrets = await encryptionService.decryptSecrets(encryptedData);
    const keys = Object.keys(decryptedSecrets);

    ctx.response.headers.set("Access-Control-Allow-Origin", "*");
    ctx.response.body = {
      keys: keys,
      hasSecrets: true,
      keysCount: keys.length,
      lastUpdated: storedSecret.updated_at,
    };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
    Sentry.captureException(error);
    console.error("Error in getProjectSecretKeys:", error);
  }
}
export async function deleteProjectSecrets(ctx: Context) {
  try {
    const subdomain = ctx.params.subdomain;

    if (!subdomain) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Subdomain parameter is required" };
      return;
    }

    if (!ctx.request.hasBody) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Request body is required" };
      return;
    }

    let body;
    const bodyValue = await ctx.request.body().value;
    try {
      body = typeof bodyValue === "string" ? JSON.parse(bodyValue) : bodyValue;
    } catch (e) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Invalid JSON in request body" };
      return;
    }

    const { token, provider } = body;

    if (!token || !provider) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Authentication required (token and provider)" };
      return;
    }

    const userId = await authorizeProjectAccess(
      token,
      provider,
      subdomain,
      ADMIN_LIST,
    );

    if (!userId) {
      ctx.response.status = 403;
      ctx.response.body = { error: "Unauthorized: You don't have access to this project" };
      return;
    }




    const success = await deleteSecretsForProject(subdomain);

    ctx.response.headers.set("Access-Control-Allow-Origin", "*");
    if (success) {
      ctx.response.body = {
        status: "success",
        message: "Secrets deleted successfully",
      };

      Sentry.captureMessage(
        `User ${userId} deleted secrets for ${subdomain}`,
        "info",
      );
    } else {
      ctx.response.body = {
        status: "success",
        message: "No secrets found to delete",
      };
    }
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
    Sentry.captureException(error);
    console.error("Error in deleteProjectSecrets:", error);
  }
}

