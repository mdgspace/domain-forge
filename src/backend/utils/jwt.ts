import { create, verify } from "../dependencies.ts";

const key = await crypto.subtle.generateKey(
  { name: "HMAC", hash: "SHA-512" },
  true,
  ["sign", "verify"],
);

async function createJWT(provider: string, githubId: string) {
  const token = await create({ alg: "HS512", typ: "JWT" }, {
    [`${provider}Id`] : githubId,
  }, key);
  return token;
}

async function checkJWT(provider: string, token: string) {
  try {
    const payload = await verify(token, key);
    return payload[`${provider}Id`]!;
  } catch (error) {
    return "not verified";
  }
}

export { checkJWT, createJWT };
