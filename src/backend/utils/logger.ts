import { Context } from "../dependencies.ts";

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

const LOG_FILE_PATH = "/hostpipe/logs/df_backend.log";
const LOG_BACKUP_PATH = "/hostpipe/logs/df_backend.log.1";
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_QUEUE_SIZE = 1000;

const logQueue: string[] = [];
let isProcessingQueue = false;

async function checkAndRotateLog(): Promise<void> {
  try {
    const stat = await Deno.stat(LOG_FILE_PATH);
    if (stat.size >= MAX_LOG_SIZE) {
      try {
        await Deno.remove(LOG_BACKUP_PATH).catch(() => {});
        await Deno.rename(LOG_FILE_PATH, LOG_BACKUP_PATH);
      } catch (_e) {
        // Ignore rotation error
      }
    }
  } catch (_e) {
    // Log file does not exist yet
  }
}

async function ensureLogDirectory(): Promise<void> {
  try {
    await Deno.mkdir("/hostpipe/logs", { recursive: true });
  } catch (_e) {
    // Ignore error if directory already exists or filesystem unavailable
  }
}

// Initialize directory in background
ensureLogDirectory();

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  meta?: Record<string, unknown>;
}

export async function flushLogQueue(): Promise<void> {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  try {
    while (logQueue.length > 0) {
      await checkAndRotateLog();
      // Drain up to 50 entries per disk write to bound I/O overhead
      const batch = logQueue.splice(0, 50);
      const content = batch.join("\n") + "\n";
      const encoder = new TextEncoder();
      try {
        await Deno.writeFile(LOG_FILE_PATH, encoder.encode(content), {
          append: true,
          create: true,
        });
      } catch (_e) {
        // Fail silently on filesystem write error to avoid crashing the server
      }
    }
  } finally {
    isProcessingQueue = false;
  }
}

function enqueueLogLine(line: string): void {
  // Bound memory: drop oldest entries if queue reaches maximum capacity
  if (logQueue.length >= MAX_QUEUE_SIZE) {
    logQueue.shift();
  }
  logQueue.push(line);
  flushLogQueue().catch(() => {});
}

export function getLogQueueSizeForTest(): number {
  return logQueue.length;
}

export function logMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta } : {}),
  };

  const line = JSON.stringify(entry);

  if (level === "ERROR") {
    console.error(line);
  } else if (level === "WARN") {
    console.warn(line);
  } else {
    console.log(line);
  }

  enqueueLogLine(line);
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => logMessage("DEBUG", message, meta),
  info: (message: string, meta?: Record<string, unknown>) => logMessage("INFO", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => logMessage("WARN", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => logMessage("ERROR", message, meta),
};

export async function requestLoggerMiddleware(ctx: Context, next: () => Promise<unknown>): Promise<void> {
  const start = Date.now();
  const { method, url } = ctx.request;
  const path = url.pathname;

  try {
    await next();
  } finally {
    const duration = Date.now() - start;
    const status = ctx.response.status;
    const user = ctx.request.url.searchParams.get("user") || "anonymous";

    logger.info(`HTTP ${method} ${path} -> ${status} [${duration}ms]`, {
      method,
      path,
      status,
      durationMs: duration,
      user,
    });
  }
}
