import { check_jwt } from "./authorize.ts";

const backend = import.meta.env.VITE_APP_BACKEND;

export async function getSecretKeys(subdomain: string): Promise<{
  keys: string[];
  hasSecrets: boolean;
  keysCount: number;
  lastUpdated?: string;
}> {
  const token = localStorage.getItem("JWTUser");
  const provider = localStorage.getItem("provider");

  if (!token || !provider) {
    throw new Error("Not authenticated");
  }

  const rootUrl = new URL(`${backend}/secrets/${subdomain}`);
  rootUrl.searchParams.set("token", token);
  rootUrl.searchParams.set("provider", provider);

  const resp = await fetch(rootUrl.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!resp.ok) {
    const error = await resp.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${resp.status}`);
  }

  return await resp.json();
}

export async function upsertSecrets(
  subdomain: string,
  secrets: Record<string, string>,
): Promise<{ status: string; message: string; keysCount: number }> {
  const token = localStorage.getItem("JWTUser");
  const provider = localStorage.getItem("provider");

  if (!token || !provider) {
    throw new Error("Not authenticated");
  }

  const rootUrl = new URL(`${backend}/secrets/${subdomain}`);
  const resp = await fetch(rootUrl.toString(), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      secrets,
      token,
      provider,
    }),
  });

  if (!resp.ok) {
    const error = await resp.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${resp.status}`);
  }

  return await resp.json();
}


export async function deleteSecrets(subdomain: string): Promise<{
  status: string;
  message: string;
}> {
  const token = localStorage.getItem("JWTUser");
  const provider = localStorage.getItem("provider");

  if (!token || !provider) {
    throw new Error("Not authenticated");
  }

  const rootUrl = new URL(`${backend}/secrets/${subdomain}`);
  const resp = await fetch(rootUrl.toString(), {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      token,
      provider,
    }),
  });

  if (!resp.ok) {
    const error = await resp.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${resp.status}`);
  }

  return await resp.json();
}

