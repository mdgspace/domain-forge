export async function getMaps(user: string) {
  const backend = import.meta.env.VITE_APP_BACKEND;
  const token = localStorage.getItem("JWTUser")?.toString() || "";
  const provider = localStorage.getItem("provider")?.toString() || "github";

  const rootUrl = new URL(`${backend}/map`);
  rootUrl.searchParams.set("user", user);

  const resp = await fetch(rootUrl.toString(), {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "Authorization": `Bearer ${token}`,
      "X-Auth-Provider": provider,
    },
  });
  const data = await resp.json();
  return data;
}
