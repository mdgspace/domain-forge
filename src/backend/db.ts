import getGithubUser from "./utils/github-user.ts";
import { Context } from "./dependencies.ts";
import { exec } from "./dependencies.ts";
import dockerize from "./utils/container.ts";
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
  let env_content;
  let static_content;
  let stack;
  let port;
  let build_cmds
  const body = await ctx.request.body().value;
  try {
    document = JSON.parse(body);
    //env_contents not getting saved to db
    env_content = document.env_content
    static_content = document.static_content
    stack = document.stack
    port = document.port
    build_cmds = document.build_cmds
    delete document.port
    delete document.build_cmds
    delete document.stack
    delete document.env_content
    delete document.static_content
  } catch (e) {
    document = body;
    env_content = document.env_content
    static_content = document.static_content
    stack = document.stack
    port = document.port
    build_cmds = document.build_cmds
    delete document.port
    delete document.build_cmds
    delete document.stack
    delete document.env_content
    delete document.static_content
  }
  let query = {
    collection: "content_maps",
    database: DATABASE,
    dataSource: DATA_SOURCE,
    filter: { "subdomain": document.subdomain },
  };
  options.body = JSON.stringify(query);
  let url = new URL(`${BASE_URI}/action/find`);
  let resp = await fetch(url.toString(), options);
  let data = await resp.json();
  if(data.documents.length == 0){
   let query = {
    collection: "content_maps",
    database: DATABASE,
    dataSource: DATA_SOURCE,
    document: document,
  };
  options.body = JSON.stringify(query);
  url = new URL(`${BASE_URI}/action/insertOne`);
  resp = await fetch(url.toString(), options);
  data = await resp.json();
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  console.log(static_content);
  if (document.resource_type === "URL") {
    await exec(
      `bash -c "echo 'bash ../../src/backend/utils/automate.sh -u ${document.resource} ${document.subdomain}' > /hostpipe/pipe"`,
    );
  } else if (document.resource_type === "PORT") {
    await exec(
      `bash -c "echo 'bash ../../src/backend/utils/automate.sh -p ${document.resource} ${document.subdomain}' > /hostpipe/pipe"`,
    );
  }
    else if (document.resource_type === "GITHUB" && static_content=="Yes") {
      await exec(
        `bash -c "echo 'bash ../../src/backend/utils/container.sh -s ${document.subdomain} ${document.resource} ${env_content}' > /hostpipe/pipe"`,
      );
    }else if (document.resource_type === "GITHUB" && static_content=="No" ) {
      let dockerfile = dockerize(stack,port,build_cmds)
      console.log(dockerfile)
      console.log("idar")
      await exec(
        `bash -c "echo 'bash ../../src/backend/utils/container.sh -g ${document.subdomain} ${document.resource} ${env_content} ${dockerfile} ${port}' > /hostpipe/pipe"`,
      );
    }
  

  (data.insertedId !== undefined)
    ? ctx.response.body = {"status":"success"}
    : ctx.response.body = { "status": "failed" };
}else{
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");

  ctx.response.body = { "status": "failed" };
}

}

async function deleteMaps(ctx: Context) {
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

  const query = {
    collection: "content_maps",
    database: DATABASE,
    dataSource: DATA_SOURCE,
    filter: document,
  };
  options.body = JSON.stringify(query);
  const url = new URL(`${BASE_URI}/action/deleteOne`);
  const resp = await fetch(url.toString(), options);
  const data = await resp.json();
  if(data.deletedCount){
    await exec(`bash -c "echo 'bash ../../src/backend/utils/delete.sh ${document.subdomain}' > /hostpipe/pipe"`)
  }

  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  ctx.response.body = data;
}

export { addMaps, checkUser, deleteMaps, getMaps };

// FROM python:3.11 
// WORKDIR /app 
// COPY requirements.txt . 
// RUN pip install --no-cache-dir -r requirements.txt 
// COPY . .
// EXPOSE 8000 
// CMD ["python3","manage.py","runserver"]