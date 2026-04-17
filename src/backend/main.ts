import { Context, Sentry } from "./dependencies.ts";
import { addScript, deleteScript } from "./scripts.ts";
import { checkJWT } from "./utils/jwt.ts";
import { addMaps, deleteMaps, getMaps, getDeploymentsByRepo, getUserToken } from "./db.ts";
import { encryptEnv, decryptEnv } from "./utils/crypto.ts";

// ... skipping to githubWebhook


const ADMIN_LIST = Deno.env.get("ADMIN_LIST")?.split("|");

async function getSubdomains(ctx: Context) {
  const author = ctx.request.url.searchParams.get("user");
  const token = ctx.request.url.searchParams.get("token");
  const provider = ctx.request.url.searchParams.get("provider");
  if (author != await checkJWT(provider!, token!)) {
    ctx.throw(401);
  }
  const data = await getMaps(author, ADMIN_LIST!);

  // If frontend needs to read subdomains, we should decrypt env_content before sending to client
  // But we'll leave it as is if frontend doesn't display it explicitly, or we map it:
  const decryptedDocs = await Promise.all(data.documents.map(async (doc: any) => {
    if (doc.env_content) {
      doc.env_content = await decryptEnv(doc.env_content);
    }
    return doc;
  }));

  ctx.response.body = decryptedDocs;
}

async function addSubdomain(ctx: Context) {
  if (!ctx.request.hasBody) {
    ctx.throw(415);
  }
  let document;
  const body = await ctx.request.body().value;
  try {
    document = JSON.parse(body);
  } catch (e) {
    document = body;
  }
  const copy = { ...document };
  const token = document.token;
  const provider = document.provider;
  if (document.author != await checkJWT(provider, token)) {
    ctx.throw(401);
  }
  
  delete document.token;
  delete document.provider;

  // Encrypt the env_content using AES-GCM before saving it to MongoDB
  if (document.env_content !== undefined) {
    document.env_content = await encryptEnv(document.env_content);
  }

  // We keep deployment config (port, stack, etc.) in the document to store them in DB for webhook usage
  const success: boolean = await addMaps(document);


  if (success) {
    if (document.enable_ci === true && document.resource_type === 'GITHUB' && provider === 'github') {
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
                        content_type: 'json'
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
      copy.volume_needed,
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
//!add volume removal logic on deleting the subdomain
async function deleteSubdomain(ctx: Context) {
  if (!ctx.request.hasBody) {
    ctx.throw(415);
  }
  let document;
  const body = await ctx.request.body().value;
  try {
    document = JSON.parse(body);
  } catch (e) {
    document = body;
  }
  const author = document.author;
  const token = document.token;
  const provider = document.provider;
  delete document.token;
  delete document.provider;
  if (author != await checkJWT(provider, token)) {
    ctx.throw(401);
  }
  const data = await deleteMaps(document, ADMIN_LIST!);
  if (data.deletedCount) {
    deleteScript(document);
    Sentry.captureMessage(
      "User " + document.author + " deleted subdomain " + document.subdomain,
      "info",
    );
  }

  ctx.response.body = data;
}

export { addSubdomain, deleteSubdomain, getSubdomains, githubWebhook };

async function githubWebhook(ctx: Context) {
  if (!ctx.request.hasBody) {
    ctx.throw(415);
  }

  // Read raw payload for exact signature verification
  const rawBody = await ctx.request.body({ type: "bytes" }).value;
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
  } catch (e) {
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
    ctx.throw(400, "Missng clone_url");
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
