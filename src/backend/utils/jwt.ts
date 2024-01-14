import { create, verify } from "../dependencies.ts";

const key = await crypto.subtle.generateKey(
  { name: "HMAC", hash: "SHA-512" },
  true,
  ["sign", "verify"],
);

async function createJWT(githubId: string) {
  const token = await create({ alg: "HS512", typ: "JWT" }, {
    githubId: githubId,
  }, key);
  return token;
}

async function checkJWT(token: string) {
  try {
    const payload = await verify(token, key);
    return payload.githubId!;
  } catch (error) {
    return "not verified";
  }
}

export { checkJWT, createJWT };
