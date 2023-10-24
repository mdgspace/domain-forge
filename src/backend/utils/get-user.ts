export default async function getProviderUser(accessToken: string, provider: string) {
  let apiUrl = "";
  let authorizationHeader = "";

  if (provider === "github") {
    apiUrl = "https://api.github.com/user";
    authorizationHeader = `Bearer ${accessToken}`;
  } else if (provider === "gitlab") {
    apiUrl = "https://gitlab.com/api/v4/user";
    authorizationHeader = `Bearer ${accessToken}`;
  } else {
    throw new Error("Unsupported provider");
  }

  const user_resp = await fetch(apiUrl, {
    headers: {
      Authorization: authorizationHeader,
    },
  });

  if (user_resp.status !== 200) {
    throw new Error(`Failed to fetch user data from ${provider}`);
  }

  const user = await user_resp.json();

  if (provider === "github") {
    return user.login;
  } else if (provider === "gitlab") {
    return user.username;
  } else {
    throw new Error("Unsupported provider");
  }
}
