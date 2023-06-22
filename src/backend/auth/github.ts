import { Context } from "../dependencies.ts";

async function githubAuth(ctx: Context, id: string, secret: string) {
  const code = ctx.request.url.searchParams.get("code");
  const rootUrl = "https://github.com/login/oauth/access_token";

  if (code != null) {
    ctx.response.body = "authenticating...";
    const query = new URLSearchParams({
      client_id: id,
      client_secret: secret,
      code,
    });
    const resp = await fetch(`${rootUrl}?` + query, {
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
