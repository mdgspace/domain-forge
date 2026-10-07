import { Context } from "../dependencies.ts";
import { checkJWT, isSuperAdmin } from "./jwt.ts";

export interface AuthContext {
  user: string;
  provider: string;
  token: string;
}

/**
 * Extracts and verifies authentication strictly from request headers (Authorization: Bearer <token>).
 * Query-parameter token extraction is prohibited to prevent token leakage in access logs/history.
 */
export async function authenticateRequest(ctx: Context): Promise<AuthContext | null> {
  const authHeader = ctx.request.headers.get("Authorization");
  const headerProvider = ctx.request.headers.get("X-Auth-Provider");
  const queryUser = ctx.request.url.searchParams.get("user");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7).trim();
  const provider = headerProvider || "github";

  if (!token) {
    return null;
  }

  const user = await checkJWT(provider, token);
  if (!user || user === "not verified") {
    return null;
  }

  // If a specific user query parameter was passed, verify it matches the authenticated subject unless superadmin
  if (queryUser && queryUser !== user && !isSuperAdmin(user)) {
    return null;
  }

  return { user, provider, token };
}
