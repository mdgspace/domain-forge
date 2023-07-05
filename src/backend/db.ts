const DATA_API_KEY = Deno.env.get("MONGO_API_KEY")!;
const APP_ID = Deno.env.get("MONGO_APP_ID");
const BASE_URI =
  `https://ap-south-1.aws.data.mongodb-api.com/app/${APP_ID}/endpoint/data/v1`;
const DATA_SOURCE = "domain-forge-demo-db";
const DATABASE = "df_test";
const COLLECTION = "user_auth";
const options = {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Request-Headers": "*",
    "api-key": DATA_API_KEY,
  },
  body: "",
};
const query = {
  collection: COLLECTION,
  database: DATABASE,
  dataSource: DATA_SOURCE,
  filter: {},
  update: {},
};
async function checkUser(accessToken: string) {
  const user_resp = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const user = await user_resp.json();
  const githubId = user.login;
  options.body = JSON.stringify(query);
  query.filter = { "githubId": githubId };
  const url = new URL(`${BASE_URI}/action/find`);
  const resp = await fetch(url.toString(), options);
  const data = await resp.json();
  const update_url = new URL(`${BASE_URI}/action/updateOne`);
  query.update = {
    "$set": {
      "authToken": accessToken,
      "githubId": githubId,
    },
  };
  const status_resp = await fetch(update_url.toString(), options);
  const status = await status_resp.json();
  return { status, githubId };
}

function getMaps() {
  //code comes here
}
function addMaps() {
  //code comes here
}
function deleteMaps() {
  //code comes here
}

export { addMaps, checkUser, deleteMaps, getMaps };
