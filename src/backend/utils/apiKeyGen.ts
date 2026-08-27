function encodePayload(payload: string): string {
  return btoa(payload);
}

function generateRandomString(length: number): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

function getSimpleDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function generateRandomPart(): string {
  return generateRandomString(16);
}

export async function computeApiKeySignature(data: string, secret?: string): Promise<string> {
  const keySecret = secret || Deno.env.get("JWT_SECRET") || "df_default_jwt_secret_key_change_me_in_prod";
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(keySecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function generateApiKey(payload: string): Promise<string> {
  const datePart = getSimpleDateString();
  const encodedPayload = encodePayload(payload);
  const randomPart = generateRandomPart();
  const base = `${datePart}.${encodedPayload}.${randomPart}`;
  const signature = await computeApiKeySignature(base);
  return `${base}.${signature}`;
}
