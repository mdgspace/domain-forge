import { create, verify } from "../dependencies.ts";
import { computeApiKeySignature } from "./apiKeyGen.ts";

const rawSecret = Deno.env.get("JWT_SECRET") || "df_default_jwt_secret_key_change_me_in_prod";
const secretBuffer = new TextEncoder().encode(rawSecret);

const key = await crypto.subtle.importKey(
  "raw",
  secretBuffer,
  { name: "HMAC", hash: "SHA-512" },
  false,
  ["sign", "verify"],
);

const grafanaSecret = Deno.env.get("GRAFANA_JWT_SECRET") || "df_secret_key_123";
const grafanaSecretBuffer = new TextEncoder().encode(grafanaSecret);

const grafanaKey = await crypto.subtle.importKey(
  "raw",
  grafanaSecretBuffer,
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign", "verify"],
);

function getSuperAdmins(): string[] {
  const list = Deno.env.get("SUPER_ADMIN_LIST") || "";
  return list.split("|").map((s) => s.trim()).filter(Boolean);
}

function getAdmins(): string[] {
  const list = Deno.env.get("ADMIN_LIST") || "";
  return list.split("|").map((s) => s.trim()).filter(Boolean);
}

function isSuperAdmin(userId: string): boolean {
  if (!userId || userId === "not verified") return false;
  return getSuperAdmins().includes(userId);
}

function getUserRole(userId: string): "superadmin" | "user" {
  return isSuperAdmin(userId) ? "superadmin" : "user";
}

async function createJWT(provider: string, githubId: string) {
  const token = await create(
    { alg: "HS512", typ: "JWT" },
    {
      [`${provider}Id`]: githubId,
    },
    key,
  );
  return token;
}

async function createGrafanaJWT(userId: string, role: string) {
  const now = Math.floor(Date.now() / 1000);
  const token = await create(
    { alg: "HS256", typ: "JWT", kid: "df-key-1" },
    {
      sub: userId,
      roles: [role === "superadmin" ? "superadmin" : "user"],
      iss: "domain-forge",
      iat: now,
      exp: now + 7200,
    },
    grafanaKey,
  );
  return token;
}

function decodePayload(encodedPayload: string): string {
  try {
    return atob(encodedPayload);
  } catch {
    return "not verified";
  }
}

async function decodeApiKey(apiKey: string): Promise<string> {
  const parts = apiKey.split(".");
  if (parts.length === 4) {
    const [datePart, encodedPayload, randomPart, signature] = parts;
    const base = `${datePart}.${encodedPayload}.${randomPart}`;
    const expectedSig = await computeApiKeySignature(base);
    if (signature === expectedSig) {
      return decodePayload(encodedPayload);
    }
    return "not verified";
  } else if (parts.length === 3) {
    // Legacy 3-part format support for transition period
    const [_datePart, encodedPayload, _randomPart] = parts;
    return decodePayload(encodedPayload);
  }

  return "not verified";
}

async function checkJWT(provider: string, token: string): Promise<string> {
  try {
    if (!token) return "not verified";
    if (provider === "CLI") {
      return await decodeApiKey(token);
    } else {
      const payload = await verify(token, key);
      return (payload as Record<string, string>)[`${provider}Id`] || "not verified";
    }
  } catch (_error) {
    return "not verified";
  }
}

export {
  checkJWT,
  createGrafanaJWT,
  createJWT,
  getAdmins,
  getSuperAdmins,
  getUserRole,
  isSuperAdmin,
};
