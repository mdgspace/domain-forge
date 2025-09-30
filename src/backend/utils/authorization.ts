import { getMaps } from "../db.ts";
import { checkJWT } from "./jwt.ts";

/**
 * Verify if a user has access to a project (either owner or admin)
 * @param subdomain
 * @param userId
 * @param adminList
 * @returns
 */
export async function verifyProjectAccess(
  subdomain: string,
  userId: string,
  adminList: string[],
): Promise<boolean> {
  if (adminList.includes(userId)) {
    return true;
  }

  try {
    const mapsData = await getMaps(userId, adminList);
    if (mapsData.documents) {
      const project = mapsData.documents.find(
        (p: { subdomain: string }) => p.subdomain === subdomain,
      );
      return project !== undefined;
    }
  } catch (error) {
    console.error("Error verifying project access:", error);
    return false;
  }

  return false;
}

/**
 * Validate JWT and extract user ID, then verify project access
 * @param token
 * @param provider
 * @param subdomain
 * @param adminList
 * @returns
 */
export async function authorizeProjectAccess(
  token: string,
  provider: string,
  subdomain: string,
  adminList: string[],
): Promise<string | null> {
  try {
    if (!token || !provider) {
      return null;
    }

    const userId = await checkJWT(provider, token);
    if (userId === "not verified") {
      return null;
    }

    const hasAccess = await verifyProjectAccess(subdomain, userId, adminList);
    if (!hasAccess) {
      return null;
    }

    return userId;
  } catch (error) {
    console.error("Authorization error:", error);
    return null;
  }
}

/**
 * Get project owner for a given subdomain
 * @param subdomain
 * @param adminList
 * @returns
 */
export async function getProjectOwner(
  subdomain: string,
  adminList: string[],
): Promise<string | null> {
  try {
    const mapsData = await getMaps(adminList[0] || "", adminList);
    if (mapsData.documents) {
      const project = mapsData.documents.find(
        (p: { subdomain: string }) => p.subdomain === subdomain,
      );
      return project?.author || null;
    }
  } catch (error) {
    console.error("Error getting project owner:", error);
  }
  return null;
}

