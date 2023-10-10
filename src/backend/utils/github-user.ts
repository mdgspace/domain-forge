export default async function getGithubUser(accessToken: string) {
  const user_resp = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const user = await user_resp.json();
  return user.login;
}
