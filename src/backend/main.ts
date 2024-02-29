import { Context, Sentry } from "./dependencies.ts";
import { addScript, deleteScript } from "./scripts.ts";
import { checkJWT } from "./utils/jwt.ts";
import { addMaps, deleteMaps, getMaps } from "./db.ts";

async function getSubdomains(ctx: Context) {
  const author = ctx.request.url.searchParams.get("user");
  const token = ctx.request.url.searchParams.get("token");
  const provider = ctx.request.url.searchParams.get("provider");
  if (author != await checkJWT(provider!, token!)) {
    ctx.throw(401);
  }
  const data = await getMaps(author);
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
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
  delete document.stack;
  delete document.env_content;
  delete document.static_content;
  if (document.author != await checkJWT(provider, token)) {
    ctx.throw(401);
  }
  const success: boolean = await addMaps(document);
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");

  if (success) {
    await addScript(
      document,
      copy.env_content,
      copy.static_content,
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
  const data = await deleteMaps(document);
  if (data.deletedCount) {
    deleteScript(document);
    Sentry.captureMessage(
      "User " + document.author + " deleted subdomain " + document.subdomain,
      "info",
    );
  }
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  ctx.response.body = data;
}

export { addSubdomain, deleteSubdomain, getSubdomains };
