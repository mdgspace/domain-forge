import { Context, Sentry } from "./dependencies.ts";
import { addScript, deleteScript } from "./scripts.ts";
import { checkJWT } from "./utils/jwt.ts";
import { addMaps, deleteMaps, getMaps, getDeploymentsByRepo, getUserToken } from "./db.ts";

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

  ctx.response.body = data.documents;
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

  // We keep deployment config (port, stack, etc.) in the document to store them in DB for webhook usage
  const success: boolean = await addMaps(document);


  if (success) {
    if (document.enable_ci === true && document.resource_type === 'GITHUB') {
      const match = document.resource.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
      if (match) {
        const owner = match[1];
        const repo = match[2];
        const authToken = await getUserToken(document.author);
        if (authToken) {
          const webhookUrl = Deno.env.get("BACKEND_URL") 
            ? `${Deno.env.get("BACKEND_URL")}/webhook/github` 
            : `http://localhost:7000/webhook/github`;
          
          fetch(`https://api.github.com/repos/${owner}/${repo}/hooks`, {
            method: 'POST',
            headers: {
              'Accept': 'application/vnd.github.v3+json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
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
              Sentry.captureMessage("Github webhook registration error: " + data.message, "error");
            }
          }).catch(e => Sentry.captureException(e));
        } else {
          Sentry.captureMessage("No auth token found for user to setup auto webhook.", "warning");
        }
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
  const body = await ctx.request.body().value;
  let payload;
  try {
    payload = typeof body === "string" ? JSON.parse(body) : body;
  } catch (e) {
    payload = body;
  }

  // We only care about pushes to main or master
  if (payload.ref !== "refs/heads/main" && payload.ref !== "refs/heads/master") {
    ctx.response.status = 200;
    ctx.response.body = "ignored";
    return;
  }

  const cloneUrl = payload.repository?.clone_url;
  if (!cloneUrl) {
    ctx.throw(400, "Missng clone_url");
  }

  // Find subdomains using this repo with enable_ci = true
  const data = await getMaps("system", []); // Or we can query directly
  const documents = data.documents.filter((doc: any) => doc.resource === cloneUrl && doc.enable_ci === true);

  for (const document of documents) {
    console.log(`Webhook auto-redeploying ${document.subdomain}`);
    await deleteScript(document);
    // Redeploy logic wrapper
    await addScript(
      document,
      document.env_content,
      document.static_content,
      document.dockerfile_present,
      document.stack,
      document.port,
      document.build_cmds
    );
    Sentry.captureMessage(
      "Webhook automatically redeployed subdomain " + document.subdomain,
      "info"
    );
  }

  ctx.response.status = 200;
  ctx.response.body = "success";
}
