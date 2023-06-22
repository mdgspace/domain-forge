import { Context } from "../dependencies.ts";

async function githubAuth(ctx: Context, id: string, secret: string) {
  const code = ctx.request.url.searchParams.get("code");
  const rootUrl = new URL("https://github.com/login/oauth/access_token");

  if (code != null) {
    ctx.response.body = "authenticating...";
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
    console.log(body.access_token);
    ctx.response.redirect("http://localhost:7777/");
  } else {
    ctx.response.body = "something went wrong...";
  }
}

export default githubAuth;
