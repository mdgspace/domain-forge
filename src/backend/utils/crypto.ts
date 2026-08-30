// WebCrypto AES-GCM Implementation for shielding sensitive .env configurations
// Ensures plaintext secrets are never persisted in MongoDB.

const isProd = Deno.env.get("DENO_ENV") === "production";
const rawKey = Deno.env.get("ENCRYPTION_KEY");

if (isProd && (!rawKey || rawKey === "df_default_debug_encryption_key_change_in_prod")) {
  throw new Error("[SECURITY FATAL] A strong non-default ENCRYPTION_KEY must be configured in production environment!");
}

const KEY_STRING = rawKey || "df_dev_encryption_key_local_only";

async function getKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  // Deterministically derive 256-bit key material via SHA-256 digest
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(KEY_STRING));

  return await crypto.subtle.importKey(
    "raw",
    hash,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

function bufferToBase64(bytes: Uint8Array): string {
  // Chunked base64 encoding to prevent "Maximum call stack size exceeded" on large strings
  let binary = "";
  const chunkSize = 8192;
  const len = bytes.byteLength;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function encryptEnv(plainText: string): Promise<string> {
  if (!plainText) return "";
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plainText)
  );

  // Combine IV and Ciphertext for storage
  const payload = new Uint8Array(iv.length + cipherBuffer.byteLength);
  payload.set(iv, 0);
  payload.set(new Uint8Array(cipherBuffer), iv.length);

  return bufferToBase64(payload);
}

export async function decryptEnv(cipherB64: string): Promise<string> {
  if (!cipherB64) return "";
  try {
    const key = await getKey();
    const payload = base64ToBuffer(cipherB64);
    if (payload.length < 13) return "";

    const iv = payload.slice(0, 12);
    const cipherBuffer = payload.slice(12);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      cipherBuffer
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (error) {
    console.error("[crypto] Failed to decrypt env content, returning empty string", error);
    return "";
  }
}
