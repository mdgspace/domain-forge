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
    "Content-Type": "application/json",
    "Access-Control-Request-Headers": "*",
    "api-key": DATA_API_KEY,
  },
  body: "",
};
const auth_query = {
  collection: "user_auth",
  database: DATABASE,
  dataSource: DATA_SOURCE,
  filter: {},
  update: {},
};
const maps_query = {
  collection: "content_maps",
  database: DATABASE,
  dataSource: DATA_SOURCE,
  filter: {},
};

async function checkUser(accessToken: string) {
  const githubId = await getGithubUser(accessToken);
  options.body = JSON.stringify(auth_query);
  auth_query.filter = { "githubId": githubId };
  const update_url = new URL(`${BASE_URI}/action/updateOne`);
  auth_query.update = {
    "$set": {
      "authToken": accessToken,
      "githubId": githubId,
    },
  };
  const status_resp = await fetch(update_url.toString(), options);
  const status = await status_resp.json();
  return { status, githubId };
}

async function getMaps(ctx: Context) {
  const author = ctx.request.url.searchParams.get('user');
  maps_query.filter = { "author": author };
  options.body = JSON.stringify(maps_query);
  const url = new URL(`${BASE_URI}/action/find`);
  const resp = await fetch(url.toString(), options);
  const data = await resp.json();
  console.log(data.documents);
  ctx.response.body = data.documents;
}
function addMaps() {
  //code comes here
}
function deleteMaps() {
  //code comes here
}

export { addMaps, checkUser, deleteMaps, getMaps };
