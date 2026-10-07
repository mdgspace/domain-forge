import {
  assertEquals,
  assertRejects,
  assertMatch,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { isUserContainer } from "../utils/container-health.ts";
import { buildLokiQuery, isValidSubdomain } from "../utils/log-service.ts";
import {
  checkJWT,
  createGrafanaJWT,
  createJWT,
  getAdmins,
  getSuperAdmins,
  getUserRole,
  isSuperAdmin,
  syncGrafanaJwks,
} from "../utils/jwt.ts";
import { generateApiKey } from "../utils/apiKeyGen.ts";
import {
  getRestartCount,
  getStopCount,
  resetContainerActionStatsForTest,
  restartContainer,
  setCommandExecutorForTest,
  stopContainer,
} from "../utils/auto-restart.ts";
import { getLogQueueSizeForTest, logger } from "../utils/logger.ts";
import { verifyGitHubSignature } from "../utils/webhook-verify.ts";
import { encryptEnv, decryptEnv } from "../utils/crypto.ts";
import { getTenantOrgName, ensureTenantGrafanaOrg } from "../utils/grafana-provisioner.ts";
import { authenticateRequest } from "../utils/auth-helper.ts";
import { generateAlloyConfig, sanitizeRiverIdentifier } from "../utils/alloy-provisioner.ts";

// ==========================================
// 1. Exact System Container Matching
// ==========================================
Deno.test("isUserContainer - exact system container matching", () => {
  // System containers to block
  const blocked = [
    "df_backend",
    "df_frontend",
    "df_cadvisor",
    "df_prometheus",
    "df_mimir",
    "df_loki",
    "df_alloy",
    "df_grafana",
    "cadvisor",
    "prometheus",
    "mimir",
    "loki",
    "alloy",
    "grafana",
    "traefik",
    "caddy",
    "k8s_pod123",
    "docker-df_backend-1",
    "loki-1",
    "/df_loki",
    "/prometheus",
    "/mimir",
    "1234567890abcdef1234",
    "",
  ];

  for (const name of blocked) {
    assertEquals(isUserContainer(name), false, `Should block system container: ${name}`);
  }

  // User containers that must be allowed (including names containing system substrings)
  const allowed = [
    "loki-service",
    "alloy-client",
    "mimir-proxy-app",
    "caddyshack",
    "grafana-dashboard-viewer",
    "my-app",
    "production-api",
    "user-site-v2",
  ];

  for (const name of allowed) {
    assertEquals(isUserContainer(name), true, `Should allow user container: ${name}`);
  }
});

// ==========================================
// 2. Exact Loki Query & Subdomain Validation
// ==========================================
Deno.test("buildLokiQuery - exact LogQL label matching", () => {
  assertEquals(buildLokiQuery("my-subdomain"), '{container_name="my-subdomain"}');
  assertEquals(buildLokiQuery("app-123"), '{container_name="app-123"}');
  assertEquals(buildLokiQuery("web.internal"), '{container_name="web.internal"}');
});

Deno.test("isValidSubdomain - rejects dangerous and invalid input", () => {
  assertEquals(isValidSubdomain("valid-subdomain"), true);
  assertEquals(isValidSubdomain("app.domain.com"), true);
  assertEquals(isValidSubdomain("sub-123-test"), true);

  // Invalid / injection attempts
  assertEquals(isValidSubdomain(""), false);
  assertEquals(isValidSubdomain("test; rm -rf /"), false);
  assertEquals(isValidSubdomain("app{name='foo'}"), false);
  assertEquals(isValidSubdomain("app/../etc"), false);
  assertEquals(isValidSubdomain("app\\path"), false);
});

// ==========================================
// 3. Serialized Bounded Logging
// ==========================================
Deno.test("logger - logs and maintains queue bounds", () => {
  logger.info("Test log entry 1", { tag: "test" });
  logger.warn("Test log entry 2", { tag: "test" });
  logger.error("Test log entry 3", { tag: "test" });

  const queueSize = getLogQueueSizeForTest();
  assertEquals(queueSize >= 0 && queueSize <= 1000, true);
});

// ==========================================
// 4. Shell Exec Failure Handling in Auto-Restart
// ==========================================
Deno.test("auto-restart - propagates execution failure and does not increment stats", async () => {
  resetContainerActionStatsForTest();

  // Mock executor that throws on error
  setCommandExecutorForTest(async (_cmd: string) => {
    throw new Error("Command failed with code 1: permission denied");
  });

  await assertRejects(
    async () => {
      await restartContainer("test-app");
    },
    Error,
    "Command failed with code 1",
  );

  assertEquals(getRestartCount("test-app"), 0);

  await assertRejects(
    async () => {
      await stopContainer("test-app");
    },
    Error,
    "Command failed with code 1",
  );

  assertEquals(getStopCount("test-app"), 0);

  // Reset executor to successful mock
  setCommandExecutorForTest(async (_cmd: string) => {});

  await restartContainer("test-app");
  assertEquals(getRestartCount("test-app"), 1);

  await stopContainer("test-app");
  assertEquals(getStopCount("test-app"), 1);

  setCommandExecutorForTest(null);
});

// ==========================================
// 5. JWT & HMAC API Key Cryptographic Security
// ==========================================
Deno.test("jwt - creates and verifies standard tokens", async () => {
  const token = await createJWT("github", "alice");
  const verified = await checkJWT("github", token);
  assertEquals(verified, "alice");

  // Tampered token check
  const tampered = token.slice(0, -5) + "abcde";
  const failed = await checkJWT("github", tampered);
  assertEquals(failed, "not verified");

  // Wrong provider
  const wrongProvider = await checkJWT("gitlab", token);
  assertEquals(wrongProvider, "not verified");
});

Deno.test("jwt - enforces token expiration and rejects expired tokens", async () => {
  // Create token with 1-second lifespan
  const shortLivedToken = await createJWT("github", "alice", 1);
  const immediate = await checkJWT("github", shortLivedToken);
  assertEquals(immediate, "alice");

  // Wait 1.5 seconds for token expiration
  await new Promise((r) => setTimeout(r, 1500));
  const expired = await checkJWT("github", shortLivedToken);
  assertEquals(expired, "not verified");
});

Deno.test("apiKeyGen - generates HMAC-signed keys and rejects forged keys", async () => {
  const apiKey = await generateApiKey("bob");
  const verified = await checkJWT("CLI", apiKey);
  assertEquals(verified, "bob");

  // Tamper with payload (replace base64 bob with base64 admin)
  const parts = apiKey.split(".");
  assertEquals(parts.length, 4);
  const forgedPayload = btoa("superadmin");
  const forgedKey = `${parts[0]}.${forgedPayload}.${parts[2]}.${parts[3]}`;
  const tamperedResult = await checkJWT("CLI", forgedKey);
  assertEquals(tamperedResult, "not verified");

  // Legacy unsigned 3-part key rejection
  const legacyKey = `${parts[0]}.${parts[1]}.${parts[2]}`;
  const legacyResult = await checkJWT("CLI", legacyKey);
  assertEquals(legacyResult, "not verified");
});

Deno.test("createGrafanaJWT - creates RS256 token with short-lived expiry and tenant org", async () => {
  // Tenant token
  const token = await createGrafanaJWT("charlie", "user", "charlie-app");
  const parts = token.split(".");
  assertEquals(parts.length, 3);

  const header = JSON.parse(atob(parts[0]));
  assertEquals(header.alg, "RS256");
  assertEquals(header.kid, "df-key-1");

  const payload = JSON.parse(atob(parts[1]));
  assertEquals(payload.sub, "charlie");
  assertEquals(payload.name, "charlie");
  assertEquals(payload.email, "charlie@domain-forge.local");
  assertEquals(payload.roles, ["user"]);
  assertEquals(payload.org_name, "org_charlie");
  assertEquals(payload.subdomain, "charlie-app");
  assertEquals(payload.iss, "domain-forge");
  assertEquals(typeof payload.exp, "number");
  // Default TTL is 300 seconds
  const now = Math.floor(Date.now() / 1000);
  assertEquals(payload.exp - payload.iat, 300);

  // Superadmin token
  const superToken = await createGrafanaJWT("Weaver1209", "superadmin");
  const superPayload = JSON.parse(atob(superToken.split(".")[1]));
  assertEquals(superPayload.org_name, "Main Org.");
  assertEquals(superPayload.roles, ["superadmin"]);
  assertEquals(superPayload.email, "Weaver1209@domain-forge.local");
});

// ==========================================
// 6. Webhook Signature Verification
// ==========================================
Deno.test("verifyGitHubSignature - validates authentic signature and rejects forgery", async () => {
  const secret = "test-webhook-secret-key-123";
  const payload = new TextEncoder().encode(
    JSON.stringify({ ref: "refs/heads/main", repository: { clone_url: "https://github.com/org/repo" } }),
  );

  // Compute valid HMAC-SHA256 signature
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, payload);
  const validHex = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const validHeader = `sha256=${validHex}`;

  assertEquals(await verifyGitHubSignature(payload, validHeader, secret), true);
  assertEquals(await verifyGitHubSignature(payload, "sha256=invalidhex0000", secret), false);
  assertEquals(await verifyGitHubSignature(payload, null, secret), false);
  assertEquals(await verifyGitHubSignature(payload, validHeader, "wrong-secret"), false);
  assertEquals(await verifyGitHubSignature(payload, validHeader, ""), false);
});

// ==========================================
// 7. Database OAuth Token AES-GCM 256 Encryption
// ==========================================
Deno.test("crypto - encrypts and decrypts sensitive data safely", async () => {
  const rawToken = "gho_test_token_secret_123456789";
  const encrypted = await encryptEnv(rawToken);

  // Encrypted string is not plaintext and differs from input
  assertEquals(encrypted.includes("gho_test_token"), false);

  const decrypted = await decryptEnv(encrypted);
  assertEquals(decrypted, rawToken);

  // Tampered ciphertext fails gracefully
  const tampered = encrypted.slice(0, -4) + "AAAA";
  const failed = await decryptEnv(tampered);
  assertEquals(failed, "");
});

Deno.test("crypto - handles large configuration payloads without stack overflow", async () => {
  const largeEnv = "VARIABLE_" + "A".repeat(80_000) + "=VALUE\n";
  const encrypted = await encryptEnv(largeEnv);
  assertEquals(typeof encrypted, "string");
  const decrypted = await decryptEnv(encrypted);
  assertEquals(decrypted, largeEnv);
});

// ==========================================
// 8. Grafana Provisioner Org Resolution
// ==========================================
Deno.test("grafana-provisioner - maps tenant org names correctly", () => {
  assertEquals(getTenantOrgName("alice"), "org_alice");
  assertEquals(getTenantOrgName("bob"), "org_bob");
});

// ==========================================
// 9. Authentication Request Extraction
// ==========================================
Deno.test("authenticateRequest - extracts and verifies Bearer header auth strictly", async () => {
  const token = await createJWT("github", "dave");

  // Query-string only request must be rejected
  const queryOnlyCtx = {
    request: {
      headers: new Headers(),
      url: new URL(`http://localhost:7000/health?token=${token}`),
    },
  } as any;

  assertEquals(await authenticateRequest(queryOnlyCtx), null);

  // Standard Bearer header request must succeed
  const validHeaderCtx = {
    request: {
      headers: new Headers({
        "Authorization": `Bearer ${token}`,
        "X-Auth-Provider": "github",
      }),
      url: new URL("http://localhost:7000/health"),
    },
  } as any;

  const validAuth = await authenticateRequest(validHeaderCtx);
  assertEquals(validAuth?.user, "dave");
  assertEquals(validAuth?.provider, "github");
  assertEquals(validAuth?.token, token);

  // Mismatch query parameter
  const mismatchCtx = {
    request: {
      headers: new Headers({
        "Authorization": `Bearer ${token}`,
      }),
      url: new URL("http://localhost:7000/health?user=eve"),
    },
  } as any;

  const mismatchAuth = await authenticateRequest(mismatchCtx);
  assertEquals(mismatchAuth, null);

  // Superadmin with query parameter should be accepted
  Deno.env.set("SUPER_ADMIN_LIST", "superadmin_user");
  const superToken = await createJWT("github", "superadmin_user");
  const superCtx = {
    request: {
      headers: new Headers({
        "Authorization": `Bearer ${superToken}`,
      }),
      url: new URL("http://localhost:7000/health?user=other_user"),
    },
  } as any;

  const superAuth = await authenticateRequest(superCtx);
  assertEquals(superAuth?.user, "superadmin_user");
});

// ==========================================
// 10. JWKS Key Generation and Synchronization
// ==========================================
Deno.test("jwt - syncGrafanaJwks writes valid RSA JWKS to named pipe jwt directory", async () => {
  await syncGrafanaJwks();
  const jwksPath = "docker/named_pipe/jwt/jwks.json";
  const content = await Deno.readTextFile(jwksPath);
  const parsed = JSON.parse(content);
  assertEquals(Array.isArray(parsed.keys), true);
  assertEquals(parsed.keys.length, 1);
  assertEquals(parsed.keys[0].kty, "RSA");
  assertEquals(parsed.keys[0].alg, "RS256");
  assertEquals(parsed.keys[0].kid, "df-key-1");
  assertEquals(typeof parsed.keys[0].n, "string");
  assertEquals(typeof parsed.keys[0].e, "string");
});

// ==========================================
// 10. Dynamic Alloy Config Generation (Option A)
// ==========================================
Deno.test("alloy-provisioner - generates tenant-specific metric relabel and remote_write blocks", () => {
  const config = generateAlloyConfig(["alice", "bob"]);

  // Must forward cAdvisor scrape to both tenant relabel receivers
  assertMatch(config, /prometheus\.relabel\.filter_metrics_alice\.receiver/);
  assertMatch(config, /prometheus\.relabel\.filter_metrics_bob\.receiver/);

  // Must contain tenant-isolated relabeling with container_label_df_author filter
  assertMatch(config, /prometheus\.relabel "filter_metrics_alice"/);
  assertMatch(config, /source_labels = \["container_label_df_author"\]/);
  assertMatch(config, /regex\s+=\s+"\^alice\$"/);

  // Must contain tenant-isolated Mimir push with X-Scope-OrgID header
  assertMatch(config, /prometheus\.remote_write "mimir_alice"/);
  assertMatch(config, /"X-Scope-OrgID" = "alice"/);

  assertMatch(config, /prometheus\.remote_write "mimir_bob"/);
  assertMatch(config, /"X-Scope-OrgID" = "bob"/);
});

Deno.test("alloy-provisioner - generates fallback relabeling for legacy subdomains", () => {
  const config = generateAlloyConfig({
    alice: ["app1", "legacy-app"],
    bob: ["bob-site"],
  });

  // Relabel rules must combine author label with owned subdomains fallback
  assertMatch(config, /source_labels = \["container_label_df_author", "container_name"\]/);
  assertMatch(config, /regex\s+=\s+"\^alice;\.\*\|\.\*;\(app1\|legacy-app\)\$"/);
  assertMatch(config, /regex\s+=\s+"\^bob;\.\*\|\.\*;\(bob-site\)\$"/);

  // Still routes to isolated Mimir tenant partitions
  assertMatch(config, /"X-Scope-OrgID" = "alice"/);
  assertMatch(config, /"X-Scope-OrgID" = "bob"/);
});

Deno.test("alloy-provisioner - sanitizes identifiers safely", () => {
  assertEquals(sanitizeRiverIdentifier("user-123.test"), "user_123_test");
  assertEquals(sanitizeRiverIdentifier("org/app@dev"), "org_app_dev");
});

Deno.test("isSuperAdmin - case-insensitive matching for Weaver1209 and admin", () => {
  const orig = Deno.env.get("SUPER_ADMIN_LIST");
  try {
    Deno.env.set("SUPER_ADMIN_LIST", "Weaver1209|admin");
    assertEquals(isSuperAdmin("Weaver1209"), true);
    assertEquals(isSuperAdmin("weaver1209"), true);
    assertEquals(isSuperAdmin("WEAVER1209"), true);
    assertEquals(isSuperAdmin("admin"), true);
    assertEquals(isSuperAdmin("ADMIN"), true);
    assertEquals(isSuperAdmin("Admin"), true);
    assertEquals(isSuperAdmin("regular_user"), false);
    assertEquals(isSuperAdmin(""), false);
    assertEquals(isSuperAdmin("not verified"), false);
  } finally {
    if (orig !== undefined) Deno.env.set("SUPER_ADMIN_LIST", orig);
    else Deno.env.delete("SUPER_ADMIN_LIST");
  }
});

Deno.test("isUserContainer - normalizes leading slashes from cAdvisor", () => {
  assertEquals(isUserContainer("/df_cadvisor"), false);
  assertEquals(isUserContainer("/df_mimir"), false);
  assertEquals(isUserContainer("/cadvisor"), false);
  assertEquals(isUserContainer("/my-app.domains.pluto.mdgspace.org"), true);
  assertEquals(isUserContainer("my-app.domains.pluto.mdgspace.org"), true);
});

Deno.test("grafana - compose config enforces Grafana 11.2 JWT contract and correct mounts", async () => {
  for (const composeFile of ["docker/docker-compose.yml", "docker/dev.docker-compose.yml"]) {
    const content = await Deno.readTextFile(composeFile);
    // Required non-empty header_name so Grafana 11.2 authn Test() passes for JWT module
    assertMatch(content, /GF_AUTH_JWT_HEADER_NAME=X-JWT-Assertion/);

    // Supported param_name key instead of invalid URL_PARAMETER_NAME
    assertMatch(content, /GF_AUTH_JWT_PARAM_NAME=auth_token/);
    assertEquals(content.includes("GF_AUTH_JWT_URL_PARAMETER_NAME"), false);

    // Email claim mapping
    assertMatch(content, /GF_AUTH_JWT_EMAIL_CLAIM=email/);

    // Appropriate SameSite for HTTP deployment
    assertMatch(content, /GF_SECURITY_COOKIE_SAMESITE=lax/);

    // Compose-relative mounts without broken parent traversal
    assertMatch(content, /\.\/named_pipe\/jwt:\/etc\/grafana\/jwt:ro/);
    assertMatch(content, /\.\/named_pipe\/alloy:\/etc\/alloy:ro/);
    assertEquals(content.includes("../docker/named_pipe"), false);
  }
});
