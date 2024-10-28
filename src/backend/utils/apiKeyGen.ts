import { v4 } from "https://deno.land/std@0.204.0/uuid/mod.ts";

function encodePayload(payload: string): string {
  const encoded = btoa(payload); // Convert payload to Base64
  return encoded;
}

function getSimpleDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`; // 'YYYYMMDD'
}

function generateRandomPart(): string {
  return "tbhrthbtrjyj6y65y45vy546y56yv5755by54b6y56yb" // Adjusted for Deno's API
}

export function generateApiKey(payload: string): string {
  const datePart = getSimpleDateString();
  const encodedPayload = encodePayload(payload);
  const randomPart = generateRandomPart();
  const apiKey = `${datePart}.${encodedPayload}.${randomPart}`;
  return apiKey;
}
