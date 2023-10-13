import getGithubUser from "./utils/github-user.ts";
import { Context } from "./dependencies.ts";

const DATA_API_KEY = Deno.env.get("MONGO_API_KEY")!;
const APP_ID = Deno.env.get("MONGO_APP_ID");
const BASE_URI =
  `https://ap-south-1.aws.data.mongodb-api.com/app/${APP_ID}/endpoint/data/v1`;
const DATA_SOURCE = "domain-forge-demo-db";
const DATABASE = "df_test";
const options = {
  method: "POST",
  headers: {
    "Accept": "*/*",
    "Content-Type": "application/json",
    "Access-Control-Request-Headers": "*",
    "api-key": DATA_API_KEY,
  },
  body: "",
};

async function checkUser(accessToken: string) {
  const auth_query = {
    collection: "user_auth",
    database: DATABASE,
    dataSource: DATA_SOURCE,
    filter: {},
    update: {},
  };
  const githubId = await getGithubUser(accessToken);
  auth_query.filter = { "githubId": githubId };
  auth_query.update = {
    $set: {
      "githubId": githubId,
      "authToken": accessToken,
    },
  };
  const update_url = new URL(`${BASE_URI}/action/updateOne`);
  options.body = JSON.stringify(auth_query);
  const status_resp = await fetch(update_url.toString(), options);
  const status = await status_resp.json();
  return { status, githubId };
}

async function getMaps(ctx: Context) {
  const author = ctx.request.url.searchParams.get("user");
  const query = {
    collection: "content_maps",
    database: DATABASE,
    dataSource: DATA_SOURCE,
    filter: { "author": author },
  };
  options.body = JSON.stringify(query);
  const url = new URL(`${BASE_URI}/action/find`);
  const resp = await fetch(url.toString(), options);
  const data = await resp.json();
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  ctx.response.body = data.documents;
}
async function addMaps(ctx: Context) {
  if (!ctx.request.hasBody) {
    ctx.throw(415);
  }
  let document;
  const body = await ctx.request.body().value;
  try{
   document = JSON.parse(body);
  }catch(e){
   document = body;
  }
  const query = {
    collection: "content_maps",
    database: DATABASE,
    dataSource: DATA_SOURCE,
    document: document,
  };
  options.body = JSON.stringify(query);
  const url = new URL(`${BASE_URI}/action/insertOne`);
  const resp = await fetch(url.toString(), options);
  const data = await resp.json();
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  (data.insertedId !== undefined)
    ? ctx.response.body = data
    : ctx.response.body = { "status": "failed" };
}
async function deleteMaps(ctx: Context) {
  if (!ctx.request.hasBody) {
    ctx.throw(415);
  }
  const filter = await ctx.request.body().value;
  const query = {
    collection: "content_maps",
    database: DATABASE,
    dataSource: DATA_SOURCE,
    filter: filter,
  };
  options.body = JSON.stringify(query);
  const url = new URL(`${BASE_URI}/action/deleteOne`);
  const resp = await fetch(url.toString(), options);
  const data = await resp.json();
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  ctx.response.body = data;
}

export { addMaps, checkUser, deleteMaps, getMaps };
