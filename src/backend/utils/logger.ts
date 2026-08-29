import { Context } from "../dependencies.ts";

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

const LOG_FILE_PATH = "/hostpipe/logs/df_backend.log";

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

async function writeLogToFile(line: string): Promise<void> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(line + "\n");
    await Deno.writeFile(LOG_FILE_PATH, data, { append: true, create: true });
  } catch (_e) {
    // Fail silently on filesystem write error to avoid crashing the server
  }
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

  writeLogToFile(line);
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
