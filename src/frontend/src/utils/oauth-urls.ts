function generateOAuthState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  const state = Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
  sessionStorage.setItem("oauth_state", state);
  return state;
}

function oauthUrl(provider: string) {
  let rootUrl: string, clientId: string, redirectUri: string, scope: string;
  const responseType = "code";

  if (provider === "github") {
    rootUrl = "https://github.com/login/oauth/authorize";
    clientId = import.meta.env.VITE_APP_GITHUB_OAUTH_CLIENT_ID;
    redirectUri = import.meta.env.VITE_APP_GITHUB_OAUTH_REDIRECT_URL;
    scope = "user:email admin:repo_hook";
  } else if (provider === "gitlab") {
    rootUrl = "https://gitlab.com/oauth/authorize";
    clientId = import.meta.env.VITE_APP_GITLAB_OAUTH_CLIENT_ID;
    redirectUri = import.meta.env.VITE_APP_GITLAB_OAUTH_REDIRECT_URL;
    scope = "read_user";
  } else {
    console.error("Unsupported provider");
    return "";
  }

  const state = generateOAuthState();
  const options = {
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scope,
    response_type: responseType,
    state: state,
  };
  const qs = new URLSearchParams(options);
  return `${rootUrl}?${qs.toString()}`;
}

export { oauthUrl };
