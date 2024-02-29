import { check_jwt } from "./authorize.ts";
export async function deleteSubDomain(subdomain: string) {
  const user = await check_jwt(localStorage.getItem("JWTUser")!,localStorage.getItem("provider")!);
  const backend = import.meta.env.VITE_APP_BACKEND;
  const rootUrl = new URL(`${backend}/mapdel`);
  const body = {
    "subdomain": subdomain,
    "author": user,
    "token": localStorage.getItem("JWTUser"),
    "provider": localStorage.getItem("provider"),
  };
  const resp = await fetch(rootUrl.toString(), {
    method: "POST",
    headers: {
      "Accept": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  return data;
}
