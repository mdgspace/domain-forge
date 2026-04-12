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
  dockerfile_present:string,
  port: string,
  stack: string,
  build_cmds: string,
) {
  const domain = import.meta.env.VITE_APP_DOMAIN;
  const fullSubdomain = `${subdomain}.${domain}`;

  if (secure_input(subdomain) === false) {
    return {
      status: "failed",
      subdomain: fullSubdomain,
      message: "Invalid subdomain input.",
    };
  }
  if (secure_input(resource_type) === false) {
    return {
      status: "failed",
      subdomain: fullSubdomain,
      message: "Invalid resource type input.",
    };
  }
  if (secure_input(resource) === false) {
    return {
      status: "failed",
      subdomain: fullSubdomain,
      message: "Invalid resource input.",
    };
  }
  const user = await check_jwt(
    localStorage.getItem("JWTUser")!,
    localStorage.getItem("provider")!,
  );
  const backend = import.meta.env.VITE_APP_BACKEND;
  const rootUrl = new URL(`${backend}/map`);
  const body = {
    "subdomain": fullSubdomain,
    "resource_type": resource_type,
    "resource": resource,
    "env_content": env_content,
    "static_content": static_content,
    "dockerfile_present":dockerfile_present,
    "port": port,
    "build_cmds": build_cmds,
    "stack": stack,
    "author": user,
    "date": new Date().toLocaleDateString(),
    "token": localStorage.getItem("JWTUser"),
    "provider": localStorage.getItem("provider"),
  };
  try {
    const resp = await fetch(rootUrl.toString(), {
      method: "POST",
      headers: {
        "Accept": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await resp.json();

    if (!resp.ok || data.status === "failed") {
      return {
        status: "failed",
        subdomain: fullSubdomain,
        message: data.message || "Failed to create subdomain.",
      };
    }
    if (data.status === "pending") {
      return {
        status: "pending",
        subdomain: fullSubdomain,
        message: data.message || "Deployment initiated.",
      };
    }

    return {
      status: "success",
      subdomain: fullSubdomain,
      message: data.message || "Submitted",
    };
  } catch (error) {
    console.error("[create] Failed to create subdomain:", error);
    return {
      status: "failed",
      subdomain: fullSubdomain,
      message: "Request failed while creating subdomain.",
    };
  }
}
