import { Sentry } from "./dependencies.ts";
import { getAllActiveSubdomains } from "./db.ts";

// --- Configs ---
const CLEANUP_INTERVAL_MS = parseInt(Deno.env.get("LOG_CLEANUP_INTERVAL_MS") || String(24 * 60 * 60 * 1000)); // Default 24h
const MAX_LOG_SIZE_BYTES = parseInt(Deno.env.get("MAX_LOG_SIZE_BYTES") || String(500 * 1024)); // Default 500KB
const LOG_DIR = "/hostpipe/logs";
const STATUS_DIR = "/hostpipe/status";

let cleanupInterval: number | null = null;
let isRunning = false;

export function startLogCleanup(): void {
  if (isRunning) {
    console.log("[Log Cleanup] Already running");
    return;
  }

  console.log("[Log Cleanup] Starting scheduler...");
  console.log(`[Log Cleanup] Interval: ${CLEANUP_INTERVAL_MS}ms (~${(CLEANUP_INTERVAL_MS / 3600000).toFixed(1)}h)`);
  console.log(`[Log Cleanup] Max log size: ${(MAX_LOG_SIZE_BYTES / 1024).toFixed(0)}KB`);

  isRunning = true;

  setTimeout(() => runCleanup(), 10_000);
  cleanupInterval = setInterval(() => runCleanup(), CLEANUP_INTERVAL_MS);
}


async function runCleanup(): Promise<void> {
  console.log("[Log Cleanup] Running cleanup cycle...");

  try {
    const activeSubdomains = new Set(await getAllActiveSubdomains());
    console.log(`[Log Cleanup] Active subdomains in DB: ${activeSubdomains.size}`);

    await truncateOversizedLogs(activeSubdomains);

    await removeOrphanedFiles(activeSubdomains);

    console.log("[Log Cleanup] Cleanup cycle complete.");
  } catch (error) {
    console.error("[Log Cleanup] Cleanup cycle failed:", error);
    Sentry.captureException(error);
  }
}

// Truncates oversized log files
async function truncateOversizedLogs(activeSubdomains: Set<string>): Promise<void> {
  let truncatedCount = 0;

  try {
    for await (const entry of Deno.readDir(LOG_DIR)) {
      if (!entry.isFile || !entry.name.endsWith(".log")) continue;

      const subdomain = entry.name.replace(/\.log$/, "");

      if (!activeSubdomains.has(subdomain)) continue;

      const filePath = `${LOG_DIR}/${entry.name}`;

      try {
        const stat = await Deno.stat(filePath);

        if (stat.size > MAX_LOG_SIZE_BYTES) {
          console.log(`[Log Cleanup] Truncating ${entry.name}: ${(stat.size / 1024).toFixed(0)}KB -> ${(MAX_LOG_SIZE_BYTES / 1024).toFixed(0)}KB`);

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

          await Deno.writeFile(filePath, buffer.subarray(0, totalRead));
          truncatedCount++;
        }
      } catch (fileError) {
        console.error(`[Log Cleanup] Error processing ${entry.name}:`, fileError);
      }
    }
  } catch (dirError) {
    if (!(dirError instanceof Deno.errors.NotFound)) {
      throw dirError;
    }
    console.log("[Log Cleanup] Log directory not found, skipping truncation.");
  }

  if (truncatedCount > 0) {
    console.log(`[Log Cleanup] Truncated ${truncatedCount} oversized log file(s).`);
  }
}

// Removes orphaned log and status files
async function removeOrphanedFiles(activeSubdomains: Set<string>): Promise<void> {
  let removedLogs = 0;
  let removedStatus = 0;

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

// Emit current cleanup scheduler stats
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

// For manually triggering cleanup
export async function triggerCleanup(): Promise<void> {
  console.log("[Log Cleanup] Manual cleanup triggered");
  await runCleanup();
}
