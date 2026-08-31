import { create, verify } from "../dependencies.ts";
import { computeApiKeySignature } from "./apiKeyGen.ts";

const isProd = Deno.env.get("DENO_ENV") === "production";
const rawSecret = Deno.env.get("JWT_SECRET");

if (isProd && (!rawSecret || rawSecret === "df_default_jwt_secret_key_change_me_in_prod")) {
  throw new Error("[SECURITY FATAL] A strong non-default JWT_SECRET must be configured in production environment!");
}

const secretBuffer = new TextEncoder().encode(rawSecret || "df_dev_jwt_secret_key_local_only");

const key = await crypto.subtle.importKey(
  "raw",
  secretBuffer,
  { name: "HMAC", hash: "SHA-512" },
  false,
  ["sign", "verify"],
);

let grafanaRsaKeyPair: CryptoKeyPair;

try {
  let loaded = false;
  for (const dir of ["/hostpipe/jwt", "docker/named_pipe/jwt", "docker/grafana/jwt", "/etc/grafana/jwt", "./named_pipe/jwt", "named_pipe/jwt"]) {
    try {
      const privText = await Deno.readTextFile(`${dir}/private_key.json`);
      const pubText = await Deno.readTextFile(`${dir}/public_key.json`);
      const privJwk = JSON.parse(privText);
      const pubJwk = JSON.parse(pubText);

      const privateKey = await crypto.subtle.importKey(
        "jwk",
        privJwk,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        true,
        ["sign"],
      );
      const publicKey = await crypto.subtle.importKey(
        "jwk",
        pubJwk,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        true,
        ["verify"],
      );
      grafanaRsaKeyPair = { privateKey, publicKey };
      loaded = true;
      break;
    } catch (_e) {
      // Continue searching
    }
  }

  if (!loaded) {
    grafanaRsaKeyPair = await crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"],
    );

    const privJwk = await crypto.subtle.exportKey("jwk", grafanaRsaKeyPair.privateKey);
    const pubJwk = await crypto.subtle.exportKey("jwk", grafanaRsaKeyPair.publicKey);
    for (const dir of ["/hostpipe/jwt", "docker/named_pipe/jwt", "docker/grafana/jwt", "/etc/grafana/jwt", "./named_pipe/jwt", "named_pipe/jwt"]) {
      try {
        await Deno.mkdir(dir, { recursive: true });
        await Deno.writeTextFile(`${dir}/private_key.json`, JSON.stringify(privJwk, null, 2));
        await Deno.writeTextFile(`${dir}/public_key.json`, JSON.stringify(pubJwk, null, 2));
      } catch (_e) {}
    }
  }
} catch (err) {
  console.error("[JWT] Failed to initialize RSA KeyPair:", err);
}

export async function syncGrafanaJwks(): Promise<void> {
  try {
    const publicJwk = await crypto.subtle.exportKey("jwk", grafanaRsaKeyPair.publicKey);
    const jwks = {
      keys: [
        {
          kty: "RSA",
          use: "sig",
          alg: "RS256",
          kid: "df-key-1",
          n: publicJwk.n,
          e: publicJwk.e,
        },
      ],
    };

    const jwksJson = JSON.stringify(jwks, null, 2);
    // Write to all possible mounted and local development paths
    for (const dir of ["/hostpipe/jwt", "docker/named_pipe/jwt", "docker/grafana/jwt", "/etc/grafana/jwt", "./named_pipe/jwt", "named_pipe/jwt"]) {
      try {
        await Deno.mkdir(dir, { recursive: true });
        await Deno.writeTextFile(`${dir}/jwks.json`, jwksJson);
      } catch (_e) {
        // Continue if path is not accessible in current environment
      }
    }
  } catch (error) {
    console.error("[JWT] Failed to write dynamic Grafana JWKS:", error);
  }
}

// Write JWKS on initialization
await syncGrafanaJwks();

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
  const target = userId.toLowerCase();
  return getSuperAdmins().some((admin) => admin.toLowerCase() === target);
}

function getUserRole(userId: string): "superadmin" | "user" {
  return isSuperAdmin(userId) ? "superadmin" : "user";
}

async function createJWT(provider: string, githubId: string, ttlSeconds = 7 * 24 * 3600) {
  const now = Math.floor(Date.now() / 1000);
  const token = await create(
    { alg: "HS512", typ: "JWT" },
    {
      [`${provider}Id`]: githubId,
      sub: githubId,
      provider,
      iss: "domain-forge",
      aud: "domain-forge-api",
      iat: now,
      exp: now + ttlSeconds,
    },
    key,
  );
  return token;
}

// Default Grafana embed JWT expiry reduced to 300 seconds (5 minutes) for short-lived embed security
async function createGrafanaJWT(
  userId: string,
  role: string,
  allowedSubdomain?: string,
  ttlSeconds = 300,
) {
  const now = Math.floor(Date.now() / 1000);
  const isSuper = role === "superadmin" || isSuperAdmin(userId);
  const orgName = isSuper ? "Main Org." : `org_${userId}`;
  const token = await create(
    { alg: "RS256", typ: "JWT", kid: "df-key-1" },
    {
      sub: userId,
      name: userId,
      email: userId.includes("@") ? userId : `${userId}@domain-forge.local`,
      roles: [isSuper ? "superadmin" : "user"],
      org_name: orgName,
      org: orgName,
      ...(allowedSubdomain ? { subdomain: allowedSubdomain } : {}),
      iss: "domain-forge",
      iat: now,
      exp: now + ttlSeconds,
    },
    grafanaRsaKeyPair.privateKey,
  );
  return token;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let match = 0;
  for (let i = 0; i < a.length; i++) {
    match |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return match === 0;
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
  // Require strictly 4 parts with valid HMAC signature (P1-1: No unsigned legacy fallback)
  if (parts.length === 4) {
    const [datePart, encodedPayload, randomPart, signature] = parts;
    const base = `${datePart}.${encodedPayload}.${randomPart}`;
    const expectedSig = await computeApiKeySignature(base);
    if (timingSafeEqual(signature, expectedSig)) {
      return decodePayload(encodedPayload);
    }
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
      const now = Math.floor(Date.now() / 1000);
      if (typeof (payload as any).exp === "number" && (payload as any).exp <= now) {
        return "not verified";
      }
      if (typeof (payload as any).nbf === "number" && (payload as any).nbf > now) {
        return "not verified";
      }
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
