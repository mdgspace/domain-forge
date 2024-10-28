import { create, verify } from "../dependencies.ts";

const key = await crypto.subtle.generateKey(
  { name: "HMAC", hash: "SHA-512" },
  true,
  ["sign", "verify"],
);

async function createJWT(provider: string, githubId: string) {
  const token = await create({ alg: "HS512", typ: "JWT" }, {
    [`${provider}Id`]: githubId,
  }, key);
  return token;
}

function decodePayload(encodedPayload: string): string {
  const decoded = atob(encodedPayload);
  return decoded;
}

function decodeApiKey(apiKey: string) {
  const parts = apiKey.split(".");
  if (parts.length !== 3) {
    return "not verified";
  }

  const [datePart, encodedPayload, randomPart] = parts;
  const decodedPayload = decodePayload(encodedPayload);
  return decodedPayload
}

async function checkJWT(provider: string, token: string) {
  try {
    if (provider === "CLI"){
      return decodeApiKey(token)
    } else {
      const payload = await verify(token, key);
      return payload[`${provider}Id`]!;
    }
  } catch (error) {
    return "not verified";
  }
}

export { checkJWT, createJWT };
