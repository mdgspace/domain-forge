import { assertEquals, assertNotEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  getEncryptionService,
  initializeEncryption,
  type EncryptedData,
} from "./encryption.ts";

Deno.test("Encryption service initialization", async () => {
  const service = getEncryptionService();
  
  // Should not be initialized without master key
  assertEquals(service.isInitialized(), false);
  
  let threwError = false;
  try {
    await service.init(undefined);
  } catch (error) {
    threwError = true;
    assertEquals(
      error instanceof Error && error.message.includes("SECRET_MASTER_KEY"),
      true,
    );
  }
  assertEquals(threwError, true, "Should have thrown error for undefined key");
  
  threwError = false;
  try {
    await service.init("short");
  } catch (error) {
    threwError = true;
    assertEquals(
      error instanceof Error && error.message.includes("32 characters"),
      true,
    );
  }
  assertEquals(threwError, true, "Should have thrown error for short key");
  
  await service.init("a".repeat(32));
  assertEquals(service.isInitialized(), true);
});

Deno.test("Encryption round-trip", async () => {
  const masterKey = "test-master-key-32-characters-long!!";
  const service = getEncryptionService();
  await service.init(masterKey);
  
  const secrets = {
    API_KEY: "secret-api-key-12345",
    DATABASE_URL: "postgres://user:pass@localhost/db",
    JWT_SECRET: "super-secret-jwt-key",
  };
  
  // Encrypt
  const encrypted = await service.encryptSecrets(secrets);
  
  assertEquals(typeof encrypted.encrypted, "string");
  assertEquals(typeof encrypted.iv, "string");
  assertEquals(typeof encrypted.tag, "string");
  
  assertNotEquals(encrypted.encrypted, JSON.stringify(secrets));
  
  // Decrypt
  const decrypted = await service.decryptSecrets(encrypted);
  
  assertEquals(decrypted, secrets);
});

Deno.test("Different IVs produce different ciphertexts", async () => {
  const masterKey = "test-master-key-32-characters-long!!";
  const service = getEncryptionService();
  await service.init(masterKey);
  
  const secrets = { KEY: "value" };
  
  const encrypted1 = await service.encryptSecrets(secrets);
  const encrypted2 = await service.encryptSecrets(secrets);
  
  assertNotEquals(encrypted1.iv, encrypted2.iv);
  
  assertNotEquals(encrypted1.encrypted, encrypted2.encrypted);
  
  const decrypted1 = await service.decryptSecrets(encrypted1);
  const decrypted2 = await service.decryptSecrets(encrypted2);
  assertEquals(decrypted1, decrypted2);
  assertEquals(decrypted1, secrets);
});

Deno.test("Decryption fails with wrong key", async () => {
  const service1 = getEncryptionService();
  await service1.init("master-key-1-32-characters-long!!!");
  
  const secrets = { SECRET: "value" };
  const encrypted = await service1.encryptSecrets(secrets);
  
  const service2 = getEncryptionService();
  await service2.init("master-key-2-32-characters-long!!!");
  
  let threwError = false;
  try {
    await service2.decryptSecrets(encrypted);
  } catch (error) {
    threwError = true;
    assertEquals(
      error instanceof Error && error.message.includes("decrypt"),
      true,
    );
  }
  assertEquals(threwError, true, "Should have thrown decryption error with wrong key");
});

Deno.test("Decryption fails with tampered data", async () => {
  const masterKey = "test-master-key-32-characters-long!!";
  const service = getEncryptionService();
  await service.init(masterKey);
  
  const secrets = { KEY: "value" };
  const encrypted = await service.encryptSecrets(secrets);
  
  const tampered: EncryptedData = {
    ...encrypted,
    encrypted: encrypted.encrypted.slice(0, -10) + "XXXXXXXXXX",
  };
  
  let threwError = false;
  try {
    await service.decryptSecrets(tampered);
  } catch (error) {
    threwError = true;
    assertEquals(
      error instanceof Error && error.message.includes("decrypt"),
      true,
    );
  }
  assertEquals(threwError, true, "Should have thrown decryption error for tampered data");
});

Deno.test("Empty secrets object", async () => {
  const masterKey = "test-master-key-32-characters-long!!";
  const service = getEncryptionService();
  await service.init(masterKey);
  
  const secrets = {};
  const encrypted = await service.encryptSecrets(secrets);
  const decrypted = await service.decryptSecrets(encrypted);
  
  assertEquals(decrypted, secrets);
});

Deno.test("Large secrets object", async () => {
  const masterKey = "test-master-key-32-characters-long!!";
  const service = getEncryptionService();
  await service.init(masterKey);
  
  const secrets: Record<string, string> = {};
  for (let i = 0; i < 100; i++) {
    secrets[`KEY_${i}`] = `value-${i}-`.repeat(10);
  }
  
  const encrypted = await service.encryptSecrets(secrets);
  const decrypted = await service.decryptSecrets(encrypted);
  
  assertEquals(Object.keys(decrypted).length, 100);
  assertEquals(decrypted, secrets);
});

Deno.test("Special characters in secrets", async () => {
  const masterKey = "test-master-key-32-characters-long!!";
  const service = getEncryptionService();
  await service.init(masterKey);
  
  const secrets = {
    KEY1: "value with spaces",
    KEY2: "value\nwith\nnewlines",
    KEY3: 'value with "quotes"',
    KEY4: "value with $special$ chars",
    KEY5: "value with unicode: ",
  };
  
  const encrypted = await service.encryptSecrets(secrets);
  const decrypted = await service.decryptSecrets(encrypted);
  
  assertEquals(decrypted, secrets);
});

