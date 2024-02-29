import { check_jwt } from "./authorize.ts";

function secure_input(s: string) {
  const blockedPhrases = [
    ";",
    "&",
    "|",
    "&&",
    "||",
    ">",
    ">>",
    "<",
    "<<",
    "$",
    "(",
    ")",
    "{",
    "}",
    "`",
    '"',
    "!",
    "~",
    "*",
    "?",
    "[",
    "]",
    "#",
    "%",
    "+",
    "curl",
    "wget",
    "rm",
    "tail",
    "cat",
    "grep",
    "nc",
    "xxd",
    "apt",
    "echo",
    "pwd",
    "ping",
    "more",
    "tail",
    "usermod",
    "bash",
    "sudo",
    ",",
  ];

  for (const phrase of blockedPhrases) {
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
  static_content: string,
  port: string,
  stack: string,
  build_cmds: string,
) {
  if (secure_input(subdomain) === false) {
    return "failed";
  }
  if (secure_input(resource_type) === false) {
    return "failed";
  }
  if (secure_input(resource) === false) {
    return "failed";
  }
  const user = await check_jwt(localStorage.getItem("JWTUser")!, localStorage.getItem("provider")!);
  const backend = import.meta.env.VITE_APP_BACKEND;
  const rootUrl = new URL(`${backend}/map`);
  const body = {
    "subdomain": subdomain + ".df.mdgspace.org",
    "resource_type": resource_type,
    "resource": resource,
    "env_content": env_content,
    "static_content": static_content,
    "port": port,
    "build_cmds": build_cmds,
    "stack": stack,
    "author": user,
    "date": new Date().toLocaleDateString(),
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
  if (data.status === "failed") {
    return "Failed";
  }
  return "Submitted";
}
