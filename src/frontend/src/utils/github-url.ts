export function githubUrl() {
  const rootUrl = "https://github.com/login/oauth/authorize";
  const options = {
    client_id: import.meta.env.VITE_APP_GITHUB_OAUTH_CLIENT_ID,
    redirect_uri: import.meta.env.VITE_APP_GITHUB_OAUTH_REDIRECT_URL,
    scope: "user:email",
  };
  const qs: URLSearchParams = new URLSearchParams(options);
  return `${rootUrl}?${qs.toString()}`;
}
