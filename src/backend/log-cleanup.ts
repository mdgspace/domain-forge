import { Sentry } from "./dependencies.ts";
import { getAllActiveSubdomains } from "./db.ts";

// --- Configuration ---
// Run cleanup once every 24 hours (configurable via env)
const CLEANUP_INTERVAL_MS = parseInt(Deno.env.get("LOG_CLEANUP_INTERVAL_MS") || String(24 * 60 * 60 * 1000));
// Maximum log file size to keep (500KB) — the API only serves the last 100KB,
// so 5x headroom is plenty for SSH debugging while preventing unbounded growth
const MAX_LOG_SIZE_BYTES = parseInt(Deno.env.get("MAX_LOG_SIZE_BYTES") || String(500 * 1024));
// Paths where logs and status files live (matches container.sh / automate.sh)
const LOG_DIR = "/hostpipe/logs";
const STATUS_DIR = "/hostpipe/status";

let cleanupInterval: number | null = null;
let isRunning = false;

/**
 * Starts the log cleanup scheduler.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function startLogCleanup(): void {
  if (isRunning) {
    console.log("[Log Cleanup] Already running");
    return;
  }

  console.log("[Log Cleanup] Starting scheduler...");
  console.log(`[Log Cleanup] Interval: ${CLEANUP_INTERVAL_MS}ms (~${(CLEANUP_INTERVAL_MS / 3600000).toFixed(1)}h)`);
  console.log(`[Log Cleanup] Max log size: ${(MAX_LOG_SIZE_BYTES / 1024).toFixed(0)}KB`);

  isRunning = true;

  // Run first cleanup after a short delay (don't block startup)
  setTimeout(() => runCleanup(), 10_000);
  cleanupInterval = setInterval(() => runCleanup(), CLEANUP_INTERVAL_MS);
}

/**
 * Core cleanup routine — runs both strategies:
 *   1. Truncate oversized log files for active subdomains
 *   2. Delete orphaned log/status files with no matching DB record
 */
async function runCleanup(): Promise<void> {
  console.log("[Log Cleanup] Running cleanup cycle...");

  try {
    const activeSubdomains = new Set(await getAllActiveSubdomains());
    console.log(`[Log Cleanup] Active subdomains in DB: ${activeSubdomains.size}`);

    // --- Strategy 1: Truncate oversized log files ---
    await truncateOversizedLogs(activeSubdomains);

    // --- Strategy 2: Remove orphaned files ---
    await removeOrphanedFiles(activeSubdomains);

    console.log("[Log Cleanup] Cleanup cycle complete.");
  } catch (error) {
    console.error("[Log Cleanup] Cleanup cycle failed:", error);
    Sentry.captureException(error);
  }
}

/**
 * Strategy 1: Truncate log files that exceed MAX_LOG_SIZE_BYTES.
 * Keeps the LAST MAX_LOG_SIZE_BYTES of each file (the most recent logs).
 * Only processes files that belong to active subdomains.
 */
async function truncateOversizedLogs(activeSubdomains: Set<string>): Promise<void> {
  let truncatedCount = 0;

  try {
    for await (const entry of Deno.readDir(LOG_DIR)) {
      if (!entry.isFile || !entry.name.endsWith(".log")) continue;

      const subdomain = entry.name.replace(/\.log$/, "");

      // Only truncate logs for active subdomains — orphans are handled separately
      if (!activeSubdomains.has(subdomain)) continue;

      const filePath = `${LOG_DIR}/${entry.name}`;

      try {
        const stat = await Deno.stat(filePath);

        if (stat.size > MAX_LOG_SIZE_BYTES) {
          console.log(`[Log Cleanup] Truncating ${entry.name}: ${(stat.size / 1024).toFixed(0)}KB -> ${(MAX_LOG_SIZE_BYTES / 1024).toFixed(0)}KB`);

          // Read the last MAX_LOG_SIZE_BYTES
          const file = await Deno.open(filePath, { read: true });
          const start = stat.size - MAX_LOG_SIZE_BYTES;
          await file.seek(start, Deno.SeekMode.Start);
          const buffer = new Uint8Array(MAX_LOG_SIZE_BYTES);
          let totalRead = 0;
          while (totalRead < MAX_LOG_SIZE_BYTES) {
            const bytesRead = await file.read(buffer.subarray(totalRead));
            if (bytesRead === null) break;
            totalRead += bytesRead;
          }
          file.close();

          // Overwrite the file with only the tail content
          await Deno.writeFile(filePath, buffer.subarray(0, totalRead));

          truncatedCount++;
        }
      } catch (fileError) {
        // Individual file errors shouldn't stop the whole cleanup
        console.error(`[Log Cleanup] Error processing ${entry.name}:`, fileError);
      }
    }
  } catch (dirError) {
    // Log directory might not exist yet (fresh install) — that's fine
    if (!(dirError instanceof Deno.errors.NotFound)) {
      throw dirError;
    }
    console.log("[Log Cleanup] Log directory not found, skipping truncation.");
  }

  if (truncatedCount > 0) {
    console.log(`[Log Cleanup] Truncated ${truncatedCount} oversized log file(s).`);
  }
}

/**
 * Strategy 2: Remove log and status files that don't belong to any active subdomain.
 * These are "orphans" — leftover from subdomains that were deleted but whose
 * files weren't cleaned up (e.g., server crashed during deletion).
 */
async function removeOrphanedFiles(activeSubdomains: Set<string>): Promise<void> {
  let removedLogs = 0;
  let removedStatus = 0;

  // Clean orphaned log files
  try {
    for await (const entry of Deno.readDir(LOG_DIR)) {
      if (!entry.isFile || !entry.name.endsWith(".log")) continue;

      const subdomain = entry.name.replace(/\.log$/, "");

      if (!activeSubdomains.has(subdomain)) {
        const filePath = `${LOG_DIR}/${entry.name}`;
        console.log(`[Log Cleanup] Removing orphaned log: ${entry.name}`);
        try {
          await Deno.remove(filePath);
          removedLogs++;
        } catch (e) {
          console.error(`[Log Cleanup] Failed to remove ${filePath}:`, e);
        }
      }
    }
  } catch (dirError) {
    if (!(dirError instanceof Deno.errors.NotFound)) {
      throw dirError;
    }
  }

  // Clean orphaned status files
  try {
    for await (const entry of Deno.readDir(STATUS_DIR)) {
      if (!entry.isFile || !entry.name.endsWith(".status")) continue;

      const subdomain = entry.name.replace(/\.status$/, "");

      if (!activeSubdomains.has(subdomain)) {
        const filePath = `${STATUS_DIR}/${entry.name}`;
        console.log(`[Log Cleanup] Removing orphaned status: ${entry.name}`);
        try {
          await Deno.remove(filePath);
          removedStatus++;
        } catch (e) {
          console.error(`[Log Cleanup] Failed to remove ${filePath}:`, e);
        }
      }
    }
  } catch (dirError) {
    if (!(dirError instanceof Deno.errors.NotFound)) {
      throw dirError;
    }
  }

  if (removedLogs > 0 || removedStatus > 0) {
    const msg = `[Log Cleanup] Removed ${removedLogs} orphaned log(s) and ${removedStatus} orphaned status file(s).`;
    console.log(msg);
    Sentry.captureMessage(msg, "info");
  }
}

/**
 * Returns current cleanup scheduler status (for debugging / health endpoint).
 */
export function getCleanupStatus(): {
  running: boolean;
  intervalMs: number;
  maxLogSizeBytes: number;
  logDir: string;
  statusDir: string;
} {
  return {
    running: isRunning,
    intervalMs: CLEANUP_INTERVAL_MS,
    maxLogSizeBytes: MAX_LOG_SIZE_BYTES,
    logDir: LOG_DIR,
    statusDir: STATUS_DIR,
  };
}

/**
 * Manually trigger a cleanup cycle (useful for admin/debugging).
 */
export async function triggerCleanup(): Promise<void> {
  console.log("[Log Cleanup] Manual cleanup triggered");
  await runCleanup();
}
