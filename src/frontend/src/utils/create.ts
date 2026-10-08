import { check_jwt } from "./authorize.ts";

function isValidSubdomain(s: string): boolean {
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i.test(s);
}

function secure_input(s: string): boolean {
  if (!s || typeof s !== "string") return false;
  // Disallow shell metacharacters that could cause command injection
  const dangerousShellChars = /[;&|`$><\\!~\n\r"']/;
  return !dangerousShellChars.test(s);
}

function validateResource(resourceType: string, resource: string): boolean {
  if (!resource || !secure_input(resource)) return false;
  if (resourceType === "PORT") {
    const portNum = Number(resource);
    return Number.isInteger(portNum) && portNum >= 1 && portNum <= 65535;
  }
  if (resourceType === "URL") {
    try {
      const url = new URL(resource);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }
  if (resourceType === "GITHUB") {
    try {
      const url = new URL(resource);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
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
  dockerfile_present: string,
  port: string,
  stack: string,
  build_cmds: string,
  enable_ci: boolean,
) {
  if (!isValidSubdomain(subdomain)) {
    return "failed";
  }
  if (!["URL", "PORT", "GITHUB"].includes(resource_type)) {
    return "failed";
  }
  if (!validateResource(resource_type, resource)) {
    return "failed";
  }
  const user = await check_jwt(
    localStorage.getItem("JWTUser")!,
    localStorage.getItem("provider")!,
  );
  const backend = import.meta.env.VITE_APP_BACKEND;
  const domain = import.meta.env.VITE_APP_DOMAIN;
  const rootUrl = new URL(`${backend}/map`);
  const body = {
    "subdomain": subdomain + "." + domain,
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
    "enable_ci": enable_ci,
  };
  const token = localStorage.getItem("JWTUser") || "";
  const provider = localStorage.getItem("provider") || "github";
  const resp = await fetch(rootUrl.toString(), {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "X-Auth-Provider": provider,
    },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (data.status === "failed") {
    return "Failed";
  }
  return "Submitted";
}
