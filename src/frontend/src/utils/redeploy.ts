import { check_jwt } from "./authorize.ts";

export async function redeploySubdomain(subdomain: string) {
  const user = await check_jwt(
    localStorage.getItem("JWTUser")!,
    localStorage.getItem("provider")!,
  );
  const backend = import.meta.env.VITE_APP_BACKEND;
  const url = new URL(`${backend}/map/${encodeURIComponent(subdomain)}/redeploy`);
  const response = await fetch(url.toString(), {
    method: "POST",
    headers: { "Accept": "application/json" },
    body: JSON.stringify({
      author: user,
      token: localStorage.getItem("JWTUser"),
      provider: localStorage.getItem("provider"),
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Could not initiate redeployment.");
  }
  return data;
}
