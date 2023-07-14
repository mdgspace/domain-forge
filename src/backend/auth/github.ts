import { Context } from "../dependencies.ts";
import { checkUser } from "../db.ts";

async function githubAuth(ctx: Context, id: string, secret: string) {
  if (!ctx.request.hasBody) {
    ctx.throw(415);
  }
  const code = await ctx.request.body().value;
  console.log(code);
  const rootUrl = new URL("https://github.com/login/oauth/access_token");

  if (code !== null) {
    rootUrl.search = new URLSearchParams({
      client_id: id,
      client_secret: secret,
      code,
    }).toString();
    const resp = await fetch(rootUrl.toString(), {
      method: "POST",
      headers: {
        "Accept": "application/json",
      },
    });
    const body = await resp.json();
    const { status, githubId } = await checkUser(body.access_token);
    ctx.response.headers.set("Access-Control-Allow-Origin", "*");
    if (status.matchedCount == 1) {
      ctx.response.body = githubId;
    } else {
      ctx.response.body = "not authorized";
    }
  } else {
    ctx.response.body = "not authorized";
  }
}

export default githubAuth;
