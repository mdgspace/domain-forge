import getGithubUser from "./utils/github-user.ts";
import DfContentMap from "./types/maps_interface.ts";

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

const MONGO_URLs = {
  update: new URL(`${BASE_URI}/action/updateOne`),
  find: new URL(`${BASE_URI}/action/find`),
  insert: new URL(`${BASE_URI}/action/insertOne`),
  delete: new URL(`${BASE_URI}/action/deleteOne`),
};

// Function to update access token on db if user exists
async function checkUser(accessToken: string) {
  const githubId = await getGithubUser(accessToken);

  const query = {
    collection: "user_auth",
    database: DATABASE,
    dataSource: DATA_SOURCE,
    filter: { "githubId": githubId },
    update: {
      $set: {
        "githubId": githubId,
        "authToken": accessToken,
      },
    },
  };

  options.body = JSON.stringify(query);

  const status_resp = await fetch(MONGO_URLs.update.toString(), options);
  const status = await status_resp.json();
  return { status, githubId };
}

// Get all content maps corresponding to user
async function getMaps(author: string) {
  const query = {
    collection: "content_maps",
    database: DATABASE,
    dataSource: DATA_SOURCE,
    filter: { "author": author },
  };
  options.body = JSON.stringify(query);
  const resp = await fetch(MONGO_URLs.find.toString(), options);
  const data = await resp.json();
  return data;
}

// Add content maps
async function addMaps(document: DfContentMap) {
  const query = {
    collection: "content_maps",
    database: DATABASE,
    dataSource: DATA_SOURCE,
    filter: { "subdomain": document.subdomain },
  };
  options.body = JSON.stringify(query);

  let resp = await fetch(MONGO_URLs.find.toString(), options);
  let data = await resp.json();

  if (data.documents.length == 0) {
    const query = {
      collection: "content_maps",
      database: DATABASE,
      dataSource: DATA_SOURCE,
      document: document,
    };

    options.body = JSON.stringify(query);
    resp = await fetch(MONGO_URLs.insert.toString(), options);
    data = await resp.json();

    return (data.insertedId !== undefined);
  } else {
    return false;
  }
}

// Delete content maps
async function deleteMaps(document: DfContentMap) {
  const query = {
    collection: "content_maps",
    database: DATABASE,
    dataSource: DATA_SOURCE,
    filter: document,
  };
  options.body = JSON.stringify(query);

  const resp = await fetch(MONGO_URLs.delete.toString(), options);
  const data = await resp.json();

  return data;
}

export { addMaps, checkUser, deleteMaps, getMaps };
