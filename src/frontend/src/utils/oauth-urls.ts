function oauthUrl(provider: string) {
  let rootUrl: string, clientId: string, redirectUri: string, scope: string;
  const responseType = "code";
  console.log(provider);
  if (provider === "github") {
    rootUrl = "https://github.com/login/oauth/authorize";
    clientId = import.meta.env.VITE_APP_GITHUB_OAUTH_CLIENT_ID;
    redirectUri = import.meta.env.VITE_APP_GITHUB_OAUTH_REDIRECT_URL;
    scope = "user:email";
  } else if (provider === "gitlab") {
    rootUrl = "https://gitlab.com/oauth/authorize";
    clientId = import.meta.env.VITE_APP_GITLAB_OAUTH_CLIENT_ID;
    redirectUri = import.meta.env.VITE_APP_GITLAB_OAUTH_REDIRECT_URL;
    scope = "read_user";
  } else {
    console.error("Unsupported provider");
    return "";
  }

  const options = {
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scope,
    response_type: responseType,
  };
  const qs = new URLSearchParams(options);
  return `${rootUrl}?${qs.toString()}`;
}

export { oauthUrl };
