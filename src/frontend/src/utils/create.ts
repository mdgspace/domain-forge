import { check_jwt } from "./authorize";

function secure_input(s: string) {
  const blockedPhrases = [';', '&', '|', '&&', '||', '>', '>>', '<', '<<', '$', '(', ')', '{', '}', '`', '"', '!', '~', '*', '?', '[', ']', '#', '%', '+','curl','wget','rm','tail','cat','grep','nc','xxd','apt','echo','pwd','ping','more','tail','usermod','bash','sudo',','];

  for (let phrase of blockedPhrases) {
    if (s.includes(phrase)) {
      return false;
    }
  }
  return true;
}
export async function create(
  subdomain: string,
  resource_type: string,
  resource: string,
  env_content: string,
) {
  if(secure_input(subdomain) === false){
    return "failed";
  }
  if(secure_input(resource_type) === false){
    return "failed";
  }
  if(secure_input(resource) === false){
    return "failed";
  }
  const user = await check_jwt(localStorage.getItem("JWTUser")!);
  const backend = import.meta.env.VITE_APP_BACKEND;
  const rootUrl = new URL(`${backend}/map`);
  const body = {
    "subdomain": subdomain + ".mdgspace.org",
    "resource_type": resource_type,
    "resource": resource,
    "env_content": env_content,
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
  return "Submitted";
}
