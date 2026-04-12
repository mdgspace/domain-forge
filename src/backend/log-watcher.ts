import { Sentry } from "./dependencies.ts";
import {
  updateDeploymentLog,
  type DeploymentStatus,
} from "./deployment-logs.ts";

// ── Config ────────────────────────────────────────────────────────────────────

const LOG_DIR = "/hostpipe/logs";
const POLL_INTERVAL_MS = parseInt(Deno.env.get("LOG_POLL_INTERVAL") || "5000");
const LOG_RETENTION_MS = parseInt(
  Deno.env.get("LOG_RETENTION_MS") || String(60 * 60 * 1000) // 1 hour
);
const DEBUG = Deno.env.get("LOG_WATCHER_DEBUG") === "true";

// Track files we've already fully processed (status marker found).
const processedFiles = new Map<string, number>(); // filename → processed timestamp

// ── Public ────────────────────────────────────────────────────────────────────

/**
 * Start the log watcher service.
 * Attempts to use Deno.watchFs for real-time notifications, falling back to
 * periodic polling if the watcher is unavailable.
 */
export function startLogWatcher(): void {
  console.log("[LogWatcher] Starting...");
  console.log(`[LogWatcher] Watching directory: ${LOG_DIR}`);
  console.log(`[LogWatcher] Poll interval: ${POLL_INTERVAL_MS}ms`);

  // Ensure the log directory exists.
  try {
    Deno.mkdirSync(LOG_DIR, { recursive: true });
  } catch {
    // May fail inside the container if the dir already exists or is read-only.
    // That's fine — the shell scripts create it on the host.
  }

  // Try filesystem watcher first, fall back to polling.
  try {
    startFsWatcher();
  } catch (error) {
    console.warn("[LogWatcher] Deno.watchFs unavailable, falling back to polling:", error);
    startPolling();
  }
}

// ── Filesystem Watcher ────────────────────────────────────────────────────────

function startFsWatcher(): void {
  const watcher = Deno.watchFs(LOG_DIR);

  // Process events asynchronously.
  (async () => {
    for await (const event of watcher) {
      if (event.kind === "modify" || event.kind === "create") {
        for (const path of event.paths) {
          if (path.endsWith(".log")) {
            const filename = path.split("/").pop()!;
            const subdomain = filename.replace(".log", "");
            await processLogFile(subdomain, path);
          }
        }
      }
    }
  })().catch((error) => {
    console.error("[LogWatcher] Watcher error, switching to polling:", error);
    startPolling();
  });

  // Also run polling as a backup to catch any files the watcher might miss.
  setInterval(pollLogFiles, POLL_INTERVAL_MS);

  console.log("[LogWatcher] Filesystem watcher started (with polling backup)");
}

// ── Polling ───────────────────────────────────────────────────────────────────

function startPolling(): void {
  setInterval(pollLogFiles, POLL_INTERVAL_MS);
  console.log("[LogWatcher] Polling started");
}

async function pollLogFiles(): Promise<void> {
  try {
    for await (const entry of Deno.readDir(LOG_DIR)) {
      if (entry.isFile && entry.name.endsWith(".log")) {
        const subdomain = entry.name.replace(".log", "");
        const filePath = `${LOG_DIR}/${entry.name}`;
        await processLogFile(subdomain, filePath);
      }
    }
  } catch (error) {
    if (DEBUG) {
      console.warn("[LogWatcher] Poll error:", error);
    }
  }

  // Clean up old processed files.
  cleanupProcessedFiles();
}

// ── Log File Processing ───────────────────────────────────────────────────────

async function processLogFile(subdomain: string, filePath: string): Promise<void> {
  // Skip if already fully processed and file hasn't changed.
  if (processedFiles.has(subdomain)) {
    return;
  }

  try {
    const content = await Deno.readTextFile(filePath);

    if (!content || content.trim().length === 0) {
      return; // File is empty or just whitespace, skip.
    }

    // Look for the status marker.
    const statusMatch = content.match(/###STATUS:(SUCCESS|FAILED(?::(\d+))?)###/);

    if (!statusMatch) {
      // No status marker yet — deployment is still in progress.
      // Update to "building" if we see DEPLOY_START but no status yet.
      if (content.includes("###DEPLOY_START:")) {
        await updateDeploymentLog(subdomain, {
          status: "building",
          logContent: sanitizeLogContent(content),
        });
      }
      return;
    }

    // Parse the status.
    const rawStatus = statusMatch[1];
    const status: DeploymentStatus = rawStatus === "SUCCESS" ? "success" : "failed";
    const exitCode = statusMatch[2] || undefined;

    // Extract error summary for failed deployments.
    let errorSummary: string | undefined;
    if (status === "failed") {
      errorSummary = extractErrorSummary(content, exitCode);
    }

    if (DEBUG) {
      console.log(`[LogWatcher] ${subdomain}: status=${status}, errorSummary=${errorSummary}`);
    }

    // Extract completedAt from the DEPLOY_END marker if present.
    let completedAt = new Date();
    const endMatch = content.match(/###DEPLOY_END:(.+?)###/);
    if (endMatch) {
      completedAt = new Date(endMatch[1]);
    }

    // Update the deployment log in MongoDB.
    await updateDeploymentLog(subdomain, {
      status,
      logContent: sanitizeLogContent(content),
      errorSummary,
      completedAt,
    });

    // Mark as processed so we don't re-process.
    processedFiles.set(subdomain, Date.now());

    console.log(`[LogWatcher] Processed deployment log for ${subdomain}: ${status}`);

    if (status === "failed") {
      Sentry.captureMessage(
        `Deployment failed for ${subdomain}: ${errorSummary || "unknown error"}`,
        "error"
      );
    }
  } catch (error) {
    if (DEBUG) {
      console.error(`[LogWatcher] Error processing ${filePath}:`, error);
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Strip the internal markers from log content before storing,
 * keeping only the human-readable deployment output.
 */
function sanitizeLogContent(content: string): string {
  return content
    .replace(/###DEPLOY_START:.+?###\n?/g, "")
    .replace(/###DEPLOY_END:.+?###\n?/g, "")
    .replace(/###STATUS:.+?###\n?/g, "")
    .trim();
}

/**
 * Extract a meaningful error summary from the log output.
 * Looks for common Docker / Git / build error patterns.
 */
function extractErrorSummary(content: string, exitCode?: string): string {
  const lines = content.split("\n");
  const errorLines: string[] = [];

  // Patterns that typically indicate the root cause.
  const errorPatterns = [
    /^(error|ERROR|Error)[:\s]/i,
    /^fatal:/i,
    /^FATAL/,
    /failed to/i,
    /npm ERR!/,
    /pip.*error/i,
    /ModuleNotFoundError/,
    /ImportError/,
    /SyntaxError/,
    /Cannot find module/,
    /command not found/,
    /No such file or directory/,
    /permission denied/i,
    /returned a non-zero code/,
    /unable to/i,
    /could not/i,
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    // Skip our own markers.
    if (trimmed.startsWith("###")) continue;

    for (const pattern of errorPatterns) {
      if (pattern.test(trimmed)) {
        errorLines.push(trimmed);
        break;
      }
    }
  }

  if (errorLines.length > 0) {
    // Return the first few error lines (max 3) as the summary.
    return errorLines.slice(0, 3).join(" | ");
  }

  // Fallback: return the last non-empty, non-marker line.
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim();
    if (trimmed.length > 0 && !trimmed.startsWith("###")) {
      return `Deployment failed (exit code ${exitCode || "unknown"}): ${trimmed}`;
    }
  }

  return `Deployment failed with exit code ${exitCode || "unknown"}`;
}

/**
 * Remove processed files that are older than the retention period.
 */
function cleanupProcessedFiles(): void {
  const now = Date.now();
  for (const [subdomain, timestamp] of processedFiles) {
    if (now - timestamp > LOG_RETENTION_MS) {
      // Remove the log file.
      try {
        Deno.removeSync(`${LOG_DIR}/${subdomain}.log`);
        if (DEBUG) {
          console.log(`[LogWatcher] Cleaned up log file for ${subdomain}`);
        }
      } catch {
        // File may already be gone; ignore.
      }
      processedFiles.delete(subdomain);
    }
  }
}
