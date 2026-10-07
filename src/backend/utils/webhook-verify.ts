export async function verifyGitHubSignature(
  rawBody: Uint8Array,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=") || !secret) {
    return false;
  }
  const providedHex = signatureHeader.slice(7).toLowerCase();
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const expectedSigBuffer = await crypto.subtle.sign("HMAC", key, rawBody as unknown as BufferSource);
  const expectedHex = Array.from(new Uint8Array(expectedSigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toLowerCase();

  if (providedHex.length !== expectedHex.length) {
    return false;
  }

  // Constant-time string comparison to prevent timing attacks
  let match = 0;
  for (let i = 0; i < providedHex.length; i++) {
    match |= providedHex.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  }
  return match === 0;
}
