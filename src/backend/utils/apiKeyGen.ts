
function encodePayload(payload: string): string {
  const encoded = btoa(payload); // Convert payload to Base64
  return encoded;
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
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function generateRandomPart(): string {
  return generateRandomString(16);
}

export function generateApiKey(payload: string): string {
  const datePart = getSimpleDateString();
  const encodedPayload = encodePayload(payload);
  const randomPart = generateRandomPart();
  const apiKey = `${datePart}.${encodedPayload}.${randomPart}`;
  return apiKey;
}
