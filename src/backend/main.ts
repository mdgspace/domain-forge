import { Context, Sentry } from "./dependencies.ts";
import { addScript, deleteScript } from "./scripts.ts";
import { isSuperAdmin } from "./utils/jwt.ts";
import { addMaps, deleteMaps, getMaps, getDeploymentsByRepo, getSubdomainOwner, getUserToken, verifySubdomainOwnership } from "./db.ts";
import { encryptEnv, decryptEnv } from "./utils/crypto.ts";
import { getBuildLogs, getCombinedLogs, getRuntimeLogs } from "./utils/log-service.ts";
import { logger } from "./utils/logger.ts";
import { authenticateRequest } from "./utils/auth-helper.ts";
import { verifyGitHubSignature } from "./utils/webhook-verify.ts";
import { ensureTenantGrafanaOrg } from "./utils/grafana-provisioner.ts";
import { ensureTenantAlloyPipeline } from "./utils/alloy-provisioner.ts";

function isValidSubdomain(subdomain: string): boolean {
  // Strict allowlist: alphanumeric, dots, and hyphens. Length between 1 and 63.
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i.test(subdomain);
}

async function getSubdomains(ctx: Context) {
  const auth = await authenticateRequest(ctx);
  if (!auth) {
    ctx.throw(401, "Unauthorized");
  }
  const author = auth.user;
  const isSuper = isSuperAdmin(author);
  const data = await getMaps(author, isSuper);

  const decryptedDocs = await Promise.all(data.documents.map(async (doc: any) => {
    if (doc.env_content) {
      doc.env_content = await decryptEnv(doc.env_content);
    }
    
    // Read status from file system if it exists, otherwise use DB or default to READY
    try {
      if (!isValidSubdomain(doc.subdomain)) {
        throw new Error("Invalid subdomain");
      }
      const statusPath = `/hostpipe/status/${doc.subdomain}.status`;
      const status = await Deno.readTextFile(statusPath);
      doc.status = status.trim();
    } catch (_e) {
      // If file doesn't exist, we keep DB status or default to READY for backward compatibility
      if (!doc.status) doc.status = "READY";
    }

    return doc;
  }));

  ctx.response.body = decryptedDocs;
}

async function getLogs(ctx: Context) {
  const subdomain = (ctx as any).params?.subdomain;
  const auth = await authenticateRequest(ctx);
  if (!auth) {
    ctx.throw(401, "Unauthorized");
  }
  const author = auth.user;
  const type = ctx.request.url.searchParams.get("type") || "all";
  const linesParam = ctx.request.url.searchParams.get("lines");
  const lines = linesParam ? parseInt(linesParam, 10) : 200;

  if (!subdomain || !isValidSubdomain(subdomain)) {
    ctx.throw(400, "Invalid subdomain.");
  }

  // Security check: ensure user owns this subdomain or is super admin
  const ownsSubdomain = await verifySubdomainOwnership(author, subdomain);
  
  if (!ownsSubdomain) {
    ctx.throw(403, "You do not have permission to view these logs.");
  }

  const targetTenant = (isSuperAdmin(author) ? await getSubdomainOwner(subdomain) : null) || author;

  try {
    if (type === "build") {
      const logs = await getBuildLogs(subdomain);
      ctx.response.body = { logs, type: "build" };
    } else if (type === "runtime") {
      const logs = await getRuntimeLogs(subdomain, lines, targetTenant);
      ctx.response.body = { logs, type: "runtime" };
    } else {
      const result = await getCombinedLogs(subdomain, lines, targetTenant);
      ctx.response.body = {
        logs: result.all,
        build: result.build,
        runtime: result.runtime,
        type: "all",
      };
    }
  } catch (error) {
    logger.error("Error retrieving logs for subdomain", { subdomain, error: (error as Error)?.message });
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to retrieve logs." };
  }
}

async function addSubdomain(ctx: Context) {
  if (!ctx.request.hasBody) {
    ctx.throw(415);
  }
  let document;
  const body = await ctx.request.body().value;
  try {
    document = typeof body === "string" ? JSON.parse(body) : body;
  } catch (_e) {
    document = body;
  }
  const copy = { ...document };

  // Strict header-based authentication enforcement
  const auth = await authenticateRequest(ctx);
  if (!auth || !auth.user || auth.user === "not verified") {
    ctx.throw(401, "Unauthorized");
  }

  // Non-superadmin users can only create subdomains under their own identity
  if (document.author !== auth.user && !isSuperAdmin(auth.user)) {
    ctx.throw(403, "Forbidden: cannot author subdomains for another user");
  }
  
  // Strip any accidental auth parameters from document payload
  delete document.token;
  delete document.provider;

  if (!isValidSubdomain(document.subdomain)) {
    ctx.throw(400, "Invalid subdomain format.");
  }

  // Encrypt the env_content using AES-GCM before saving it to MongoDB
  if (document.env_content !== undefined) {
    document.env_content = await encryptEnv(document.env_content);
  }

  // Pre-provision tenant Grafana Org & Alloy telemetry pipeline
  await ensureTenantGrafanaOrg(document.author).catch(() => {});
  await ensureTenantAlloyPipeline(document.author).catch(() => {});

  // We keep deployment config (port, stack, etc.) in the document to store them in DB for webhook usage
  const success: boolean = await addMaps(document);

  if (success) {
    if (document.enable_ci === true && document.resource_type === 'GITHUB' && auth.provider === 'github') {
      try {
        const url = new URL(document.resource);
        if (url.hostname === "github.com") {
          const parts = url.pathname.split('/').filter(Boolean);
          if (parts.length >= 2) {
            const owner = parts[0];
            let repo = parts[1];
            if (repo.endsWith('.git')) {
              repo = repo.slice(0, -4);
            }
            const authToken = await getUserToken(document.author);
            if (authToken) {
              const webhookUrl = Deno.env.get("BACKEND_URL") 
                ? `${Deno.env.get("BACKEND_URL")}/webhook/github` 
                : `http://localhost:7000/webhook/github`;
              
              const headers = {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `Bearer ${authToken}`
              };

              const webhookSecret = Deno.env.get("GITHUB_WEBHOOK_SECRET");

              // First, check if webhook already exists to prevent duplicate triggers
              fetch(`https://api.github.com/repos/${owner}/${repo}/hooks`, { headers })
                .then(res => res.json())
                .then(existingHooks => {
                  if (Array.isArray(existingHooks)) {
                    const alreadyExists = existingHooks.some((h: any) => h.config?.url === webhookUrl);
                    if (alreadyExists) {
                      Sentry.captureMessage(`Webhook already exists for ${document.resource}, skipping duplicate creation.`, "info");
                      return;
                    }
                  }

                  fetch(`https://api.github.com/repos/${owner}/${repo}/hooks`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                      name: "web",
                      config: {
                        url: webhookUrl,
                        content_type: 'json',
                        ...(webhookSecret ? { secret: webhookSecret } : {})
                      },
                      events: ['push'],
                      active: true
                    })
                  }).then(res => res.json()).then(data => {
                    if (data.id) {
                      Sentry.captureMessage("Auto registered Github webhook for " + document.resource, "info");
                    } else {
                      Sentry.captureMessage("Github webhook registration error: " + JSON.stringify(data), "error");
                    }
                  }).catch(e => Sentry.captureException(e));
                }).catch(e => {
                  Sentry.captureMessage(`Failed to fetch existing hooks for ${document.resource}: ${e}`, "error");
                });
            } else {
              Sentry.captureMessage("No auth token found for user to setup auto webhook.", "warning");
            }
          }
        }
      } catch (e) {
        console.error("Invalid GitHub URL:", document.resource);
      }
    }

    await addScript(
      document,
      copy.env_content,
      copy.static_content,
      copy.dockerfile_present,
      copy.stack,
      copy.port,
      copy.build_cmds,
    );
    ctx.response.body = { "status": "success" };
    Sentry.captureMessage(
      "User " + document.author + " added subdomain " + document.subdomain,
      "info",
    );
  } else {
    ctx.response.body = { "status": "failed" };
  }
}

async function deleteSubdomain(ctx: Context) {
  if (!ctx.request.hasBody) {
    ctx.throw(415);
  }
  let document;
  const body = await ctx.request.body().value;
  try {
    document = typeof body === "string" ? JSON.parse(body) : body;
  } catch (_e) {
    document = body;
  }

  const auth = await authenticateRequest(ctx);
  if (!auth || !auth.user || auth.user === "not verified") {
    ctx.throw(401, "Unauthorized");
  }

  const author = auth.user;
  delete document?.token;
  delete document?.provider;

  if (!document?.subdomain || !isValidSubdomain(document.subdomain)) {
    ctx.throw(400, "Invalid subdomain format.");
  }
  document.author = author;

  const isSuper = isSuperAdmin(author);
  const ownsSubdomain = await verifySubdomainOwnership(author, document.subdomain);
  if (!ownsSubdomain) {
    ctx.throw(403, "You do not have permission to delete this subdomain.");
  }

  const data = await deleteMaps(document, isSuper);
  if (data.deletedCount) {
    deleteScript(document);
    
    // Clean up all temporary, log, and status files for this subdomain (P2-5 Remediation)
    if (isValidSubdomain(document.subdomain)) {
      const filesToDelete = [
        `/hostpipe/status/${document.subdomain}.status`,
        `/hostpipe/logs/${document.subdomain}.log`,
        `/hostpipe/.env.${document.subdomain}`,
        `/hostpipe/Dockerfile.${document.subdomain}`,
        `/hostpipe/.dockerignore.${document.subdomain}`,
      ];
      for (const filePath of filesToDelete) {
        try {
          await Deno.remove(filePath);
        } catch (_e) {
          // Ignore if file does not exist
        }
      }
    }

    Sentry.captureMessage(
      "User " + author + " deleted subdomain " + document.subdomain,
      "info",
    );
  }

  ctx.response.body = data;
}

export { addSubdomain, deleteSubdomain, getSubdomains, githubWebhook, getLogs };

async function githubWebhook(ctx: Context) {
  if (!ctx.request.hasBody) {
    ctx.throw(415);
  }

  // Read raw payload for exact HMAC-SHA256 signature verification (P1-7 Remediation)
  const rawBody = await ctx.request.body({ type: "bytes" }).value;
  const signature = ctx.request.headers.get("x-hub-signature-256");
  const webhookSecret = Deno.env.get("GITHUB_WEBHOOK_SECRET") || "";

  // Strictly enforce webhook verification across all environments
  if (!webhookSecret || !(await verifyGitHubSignature(rawBody, signature, webhookSecret))) {
    ctx.throw(401, "Invalid webhook signature");
  }

  const event = ctx.request.headers.get("x-github-event");

  // Ignore non-push events (e.g. ping event when webhook is added)
  if (event !== "push") {
    ctx.response.status = 200;
    ctx.response.body = "ignored";
    return;
  }

  const bodyString = new TextDecoder().decode(rawBody);
  let payload;
  try {
    payload = JSON.parse(bodyString);
  } catch (_e) {
    ctx.throw(400, "Invalid JSON");
  }

  // We only care about pushes to main or master
  if (payload.ref !== "refs/heads/main" && payload.ref !== "refs/heads/master") {
    console.log(`[Webhook] Ignoring event. Ref '${payload.ref}' is not main or master.`);
    ctx.response.status = 200;
    ctx.response.body = "ignored";
    return;
  }

  const cloneUrl = payload.repository?.clone_url;
  if (!cloneUrl) {
    ctx.throw(400, "Missing clone_url");
  }

  // Find subdomains using this repo with enable_ci = true
  const htmlUrl = payload.repository.html_url;

  // Since users might have saved the URL with or without .git, let's check both
  let matchedDeployments = await getDeploymentsByRepo(cloneUrl);
  if (matchedDeployments.length === 0 && htmlUrl) {
    matchedDeployments = await getDeploymentsByRepo(htmlUrl);
  }

  if (matchedDeployments.length > 0) {
    for (const dep of matchedDeployments) {
      console.log(`Webhook automatically redeploying subdomain ${dep.subdomain}`);
      Sentry.captureMessage(`Webhook automatically redeploying subdomain ${dep.subdomain}`, "info");

      // Tear down old deployment securely
      await deleteScript(dep);
      
      // Decrypt env content from DB before deploying
      const decryptedEnv = await decryptEnv(dep.env_content || "");

      // Re-add to trigger fresh pull and container build
      await addScript(
        dep,
        decryptedEnv,
        dep.static_content,
        dep.dockerfile_present,
        dep.stack,
        dep.port,
        dep.build_cmds
      );
    }
  }

  ctx.response.status = 200;
  ctx.response.body = "success";
}
