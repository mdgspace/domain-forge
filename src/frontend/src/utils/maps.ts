export async function getMaps(user: string) {
  const backend = import.meta.env.VITE_APP_BACKEND;
  const rootUrl = new URL(
    `${backend}/map?user=${user}&token=${
      localStorage.getItem("JWTUser")?.toString()
    }&provider=${localStorage.getItem("provider")?.toString()}`,
  );

  const resp = await fetch(rootUrl.toString(), {
    method: "GET",
    headers: {
      "Accept": "application/json",
    },
  });
  const data = await resp.json();
  return data;
}
