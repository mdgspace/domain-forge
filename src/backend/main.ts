import { Context, Sentry } from "./dependencies.ts";
import { addScript, deleteScript } from "./scripts.ts";
import { checkJWT } from "./utils/jwt.ts";
import { addMaps, deleteMaps, getMaps } from "./db.ts";
import { createDeploymentLog, updateDeploymentLog } from "./deployment-logs.ts";

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
  delete document.token;
  delete document.provider;
  delete document.port;
  delete document.build_cmds;
  delete document.dockerfile_present;
  delete document.stack;
  delete document.env_content;
  delete document.static_content;

  if (document.author != await checkJWT(provider, token)) {
    ctx.throw(401);
  }
  const success: boolean = await addMaps(document);


  if (success) {
    let deploymentLogCreated = false;

    if (document.resource_type === "GITHUB") {
      await createDeploymentLog({
        subdomain: document.subdomain,
        author: document.author,
        status: "pending",
        resourceType: document.resource_type,
        resource: document.resource,
      });
      deploymentLogCreated = true;
    }

    try {
      await addScript(
        document,
        copy.env_content,
        copy.static_content,
        copy.dockerfile_present,
        copy.stack,
        copy.port,
        copy.build_cmds,
      );

      // GITHUB deployments build asynchronously via shell scripts.
      // Create a deployment log before script kickoff so immediate failures are captured.
      // URL and PORT deployments complete immediately, so return "success".
      if (document.resource_type === "GITHUB") {
        ctx.response.body = {
          "status": "pending",
          "message": "Deployment initiated. Check deployment logs for progress.",
        };
      } else {
        ctx.response.body = { "status": "success" };
      }
    } catch (error) {
      console.error(`[deployment] Failed to start deployment for ${document.subdomain}:`, error);

      if (deploymentLogCreated) {
        await updateDeploymentLog(document.subdomain, {
          status: "failed",
          logContent: String(error),
          errorSummary: error instanceof Error ? error.message : String(error),
          completedAt: new Date(),
        });
      }

      ctx.response.status = 500;
      ctx.response.body = {
        "status": "failed",
        "message": error instanceof Error
          ? error.message
          : "Failed to start deployment.",
      };
      return;
    }

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

export { addSubdomain, deleteSubdomain, getSubdomains };
