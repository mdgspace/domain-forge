// WebCrypto AES-GCM Implementation for shielding sensitive .env configurations
// Ensures plaintext secrets are never persisted in MongoDB.

const KEY_STRING = Deno.env.get("ENCRYPTION_KEY") || "debug-key!";

async function getKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  // Ensure the key is exactly 32 bytes for AES-256
  const keyMaterial = enc.encode(KEY_STRING.padEnd(32, "0").slice(0, 32));

  return await crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
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

  return btoa(String.fromCharCode(...payload));
}

export async function decryptEnv(cipherB64: string): Promise<string> {
  if (!cipherB64) return "";
  try {
    const key = await getKey();
    const binaryStr = atob(cipherB64);
    const payload = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      payload[i] = binaryStr.charCodeAt(i);
    }

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
