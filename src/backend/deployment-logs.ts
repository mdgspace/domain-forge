import { deploymentLogsCollection } from "./db.ts";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DeploymentStatus = "pending" | "building" | "success" | "failed";

export interface DeploymentLog {
  _id?: string;
  subdomain: string;
  author: string;
  status: DeploymentStatus;
  logContent: string;
  errorSummary?: string;
  startedAt: Date;
  completedAt?: Date;
  resourceType: string;
  resource: string;
}

// ── Create ────────────────────────────────────────────────────────────────────

/**
 * Create a new deployment log entry.
 * Called when a deployment is initiated (addSubdomain).
 * Returns the inserted ID, or null if the DB is unavailable.
 */
export async function createDeploymentLog(
  log: Omit<DeploymentLog, "_id" | "logContent" | "startedAt">
): Promise<string | null> {
  if (!deploymentLogsCollection) {
    console.warn("[DeploymentLogs] DB not available, skipping log creation");
    return null;
  }

  try {
    const entry: DeploymentLog = {
      ...log,
      logContent: "",
      startedAt: new Date(),
    };

    const result = await deploymentLogsCollection.insertOne(entry);
    console.log(`[DeploymentLogs] Created log for ${log.subdomain}, id=${result.insertedId}`);
    return String(result.insertedId);
  } catch (error) {
    console.error("[DeploymentLogs] Failed to create log:", error);
    return null;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────

/**
 * Update a deployment log with new status, log content, and optional error summary.
 * Called by the log-watcher when a shell script finishes.
 */
export async function updateDeploymentLog(
  subdomain: string,
  update: {
    status: DeploymentStatus;
    logContent: string;
    errorSummary?: string;
    completedAt?: Date;
  }
): Promise<boolean> {
  if (!deploymentLogsCollection) {
    console.warn("[DeploymentLogs] DB not available, skipping log update");
    return false;
  }

  try {
    // Update the most recent log for this subdomain.
    const result = await deploymentLogsCollection.updateOne(
      { subdomain },
      {
        $set: {
          status: update.status,
          logContent: update.logContent,
          ...(update.errorSummary && { errorSummary: update.errorSummary }),
          ...(update.completedAt && { completedAt: update.completedAt }),
        },
      },
      { sort: { startedAt: -1 } }
    );

    if (result.matchedCount === 0) {
      // No existing log — create one on-the-fly (script ran but no DB log was created,
      // e.g. a deployment from before this feature existed).
      console.log(`[DeploymentLogs] No existing log for ${subdomain}, creating retroactively`);
      await deploymentLogsCollection.insertOne({
        subdomain,
        author: "unknown",
        status: update.status,
        logContent: update.logContent,
        errorSummary: update.errorSummary || undefined,
        startedAt: new Date(),
        completedAt: update.completedAt || new Date(),
        resourceType: "unknown",
        resource: "unknown",
      });
    }

    return true;
  } catch (error) {
    console.error(`[DeploymentLogs] Failed to update log for ${subdomain}:`, error);
    return false;
  }
}

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Get all deployment logs for a specific author.
 * Returns the latest log per subdomain.
 */
export async function getDeploymentLogsByAuthor(
  author: string,
  adminList: string[] = []
): Promise<DeploymentLog[]> {
  if (!deploymentLogsCollection) {
    return [];
  }

  try {
    const filter = adminList.includes(author) ? {} : { author };
    const logs = await deploymentLogsCollection
      .find(filter)
      .sort({ startedAt: -1 })
      .toArray();

    // Deduplicate: keep only the latest log per subdomain.
    const seen = new Set<string>();
    const deduplicated: DeploymentLog[] = [];
    for (const log of logs) {
      if (!seen.has(log.subdomain)) {
        seen.add(log.subdomain);
        deduplicated.push(log);
      }
    }

    return deduplicated;
  } catch (error) {
    console.error("[DeploymentLogs] Failed to get logs:", error);
    return [];
  }
}

/**
 * Get the latest deployment log for a specific subdomain.
 */
export async function getDeploymentLogBySubdomain(
  subdomain: string
): Promise<DeploymentLog | null> {
  if (!deploymentLogsCollection) {
    return null;
  }

  try {
    const log = await deploymentLogsCollection.findOne(
      { subdomain },
      { sort: { startedAt: -1 } }
    );
    return log || null;
  } catch (error) {
    console.error(`[DeploymentLogs] Failed to get log for ${subdomain}:`, error);
    return null;
  }
}
