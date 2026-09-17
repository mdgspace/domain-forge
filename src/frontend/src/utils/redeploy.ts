export async function redeploySubdomain(subdomain: string) {
  const backend = import.meta.env.VITE_APP_BACKEND;
  const url = new URL(`${backend}/map/${encodeURIComponent(subdomain)}/redeploy`);
  const token = localStorage.getItem("JWTUser");
  const provider = localStorage.getItem("provider");
  if (!token || !provider) throw new Error("You are not authenticated.");

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Authorization": `Bearer ${token}`,
      "X-Auth-Provider": provider,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Could not initiate redeployment.");
  }
  return data;
}
