export async function getMaps(user: string) {
  const PORT = import.meta.env.VITE_APP_BACKEND_PORT;
  const rootUrl = new URL(`http://localhost:${PORT}/map?user=${user}`);
  const resp = await fetch(rootUrl.toString(), {
    method: "GET",
    headers: {
      "Accept": "application/json",
    },
  });
  const data = await resp.json();
  return data;
}
