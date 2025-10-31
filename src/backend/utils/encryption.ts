interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
}

class SecretEncryptionService {
  private masterKey: CryptoKey | null = null;
  private masterKeyEnv: string | null = null;

  /**
   * Initialize the encryption service with master key from environment
   * @param masterKeyEnv
   */
  async init(masterKeyEnv: string | undefined): Promise<void> {
    if (!masterKeyEnv) {
      throw new Error(
        "SECRET_MASTER_KEY environment variable is required for secret encryption",
      );
    }

    if (masterKeyEnv.length < 32) {
      throw new Error(
        "SECRET_MASTER_KEY must be at least 32 characters long for security",
      );
    }

    this.masterKeyEnv = masterKeyEnv;
    this.masterKey = await this.deriveKey(masterKeyEnv);
  }

  /////Derive a 256-bit AES key from the master key using PBKDF2
  private async deriveKey(masterKey: string): Promise<CryptoKey> {
    const keyData = new TextEncoder().encode(masterKey);
    
    const baseKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      "PBKDF2",
      false,
      ["deriveBits", "deriveKey"],
    );

    const salt = new TextEncoder().encode("DomainForge-Secret-Encryption-Salt-v1");

    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      baseKey,
      {
        name: "AES-GCM",
        length: 256,
      },
      false, 
      ["encrypt", "decrypt"],
    );

    return derivedKey;
  }

  /**
   * Encrypt a secrets object (key-value pairs)
   * @param secrets
   * @returns
   */
  async encryptSecrets(secrets: Record<string, string>): Promise<EncryptedData> {
    if (!this.masterKey) {
      throw new Error("Encryption service not initialized. Call init() first.");
    }

    const plaintext = JSON.stringify(secrets);
    const plaintextBytes = new TextEncoder().encode(plaintext);

    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encryptedData = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
        tagLength: 128,
      },
      this.masterKey,
      plaintextBytes,
    );

    const tagLength = 16;
    const ciphertext = encryptedData.slice(0, encryptedData.byteLength - tagLength);
    const tag = encryptedData.slice(encryptedData.byteLength - tagLength);

    return {
      encrypted: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
      iv: btoa(String.fromCharCode(...iv)),
      tag: btoa(String.fromCharCode(...new Uint8Array(tag))),
    };
  }

  /**
   * Decrypt encrypted secrets data
   * @param encryptedData
   * @returns
   */
  async decryptSecrets(encryptedData: EncryptedData): Promise<Record<string, string>> {
    if (!this.masterKey) {
      throw new Error("Encryption service not initialized. Call init() first.");
    }

    try {
      const iv = Uint8Array.from(atob(encryptedData.iv), (c) => c.charCodeAt(0));
      const tag = Uint8Array.from(atob(encryptedData.tag), (c) => c.charCodeAt(0));
      const ciphertext = Uint8Array.from(
        atob(encryptedData.encrypted),
        (c) => c.charCodeAt(0),
      );

      const encryptedBuffer = new Uint8Array(ciphertext.length + tag.length);
      encryptedBuffer.set(ciphertext, 0);
      encryptedBuffer.set(tag, ciphertext.length);

      const decryptedData = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: iv,
          tagLength: 128,
        },
        this.masterKey,
        encryptedBuffer,
      );

      const plaintext = new TextDecoder().decode(decryptedData);
      const secrets = JSON.parse(plaintext) as Record<string, string>;

      return secrets;
    } catch (error) {
      throw new Error(
        `Failed to decrypt secrets: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  isInitialized(): boolean {
    return this.masterKey !== null;
  }
}

let encryptionServiceInstance: SecretEncryptionService | null = null;

export function getEncryptionService(): SecretEncryptionService {
  if (!encryptionServiceInstance) {
    encryptionServiceInstance = new SecretEncryptionService();
  }
  return encryptionServiceInstance;
}

export async function initializeEncryption(): Promise<void> {
  const service = getEncryptionService();
  const masterKey = Deno.env.get("SECRET_MASTER_KEY");
  await service.init(masterKey);
}

export type { EncryptedData };

