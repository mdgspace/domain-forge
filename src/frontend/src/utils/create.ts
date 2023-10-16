import { check_jwt } from "./authorize";
export async function create(
  subdomain: string,
  resource_type: string,
  resource: string,
) {
  const user = await check_jwt(localStorage.getItem("JWTUser")!);
  const backend = import.meta.env.VITE_APP_BACKEND;
  const rootUrl = new URL(`${backend}/map`);
  const body = {
    "subdomain": subdomain + ".mdgspace.org",
    "resource_type": resource_type,
    "resource": resource,
    "author": user,
    "date": new Date().toLocaleDateString(),
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
