import { Context } from "./dependencies.ts";
import { getMaps } from "./db.ts";
import { authenticateRequest } from "./utils/auth-helper.ts";
import { isSuperAdmin } from "./utils/jwt.ts";
import { isValidSubdomain } from "./utils/subdomain.ts";
import { getStatusSnapshot } from "./utils/status-snapshot.ts";

const STATUS_DIR = "/hostpipe/status";
const encoder = new TextEncoder();

type Subscriber = {
  subdomains: Set<string>;
  controller: ReadableStreamDefaultController<Uint8Array>;
  close: () => void;
};

const subscribers = new Set<Subscriber>();
let watcherStarted = false;

// Tracks the last status published per subdomain. Prevents the polling fallback
// (which is more reliable than Deno.watchFs for host-written files on bind mounts)
// from flooding subscribers with unchanged statuses.
const lastPublishedStatus = new Map<string, string>();

function eventMessage(event: string, payload: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
}

async function publishStatus(path: string): Promise<void> {
  if (!path.endsWith(".status")) return;

  const subdomain = path.split("/").pop()?.slice(0, -".status".length);
  if (!subdomain || !isValidSubdomain(subdomain)) return;

  let status: string;
  try {
    status = (await Deno.readTextFile(path)).trim();
  } catch {
    // A deleted status file is expected when a mapping is removed.
    return;
  }
  if (!status) return;

  // Only push when the value actually changes; the poller calls this repeatedly.
  if (lastPublishedStatus.get(subdomain) === status) return;
  lastPublishedStatus.set(subdomain, status);

  const message = eventMessage("status", { subdomain, status });
  for (const subscriber of subscribers) {
    if (subscriber.subdomains.has(subdomain)) {
      try {
        subscriber.controller.enqueue(message);
      } catch {
        subscriber.close();
      }
    }
  }
}

/** Send the current values so reconnecting clients cannot retain a stale badge. */
async function sendStatusSnapshot(subscriber: Subscriber): Promise<void> {
  const updates = await getStatusSnapshot(STATUS_DIR, subscriber.subdomains, Deno.readTextFile);
  for (const update of updates) {
    lastPublishedStatus.set(update.subdomain, update.status);
    subscriber.controller.enqueue(eventMessage("status", update));
  }
}

/** Start one shared host-status watcher for all connected dashboards. */
async function watchStatuses(): Promise<void> {
  while (true) {
    try {
      await Deno.mkdir(STATUS_DIR, { recursive: true });
      const watcher = Deno.watchFs(STATUS_DIR);
      for await (const event of watcher) {
        if (event.kind === "modify" || event.kind === "create") {
          await Promise.all(event.paths.map(publishStatus));
        }
      }
    } catch (error) {
      console.error("Status file watcher stopped; retrying in five seconds.", error);
      await new Promise((resolve) => setTimeout(resolve, 5_000));
    }
  }
}

/**
 * Polls /hostpipe/status every 2s. Deno.watchFs does not reliably report file
 * changes made by host-side processes on a bind mount, so container.sh writing
 * /hostpipe/status/<subdomain>.status may be missed (e.g. the final READY write).
 * Polling is the dependable fallback that makes Redeploy status (DEPLOYING ->
 * READY/FAILED) update live without a manual refresh.
 */
async function pollStatuses(): Promise<void> {
  while (true) {
    try {
      await Deno.mkdir(STATUS_DIR, { recursive: true });
      const entries = Array.from(Deno.readDirSync(STATUS_DIR));
      await Promise.all(
        entries
          .filter((entry) => entry.isFile && entry.name.endsWith(".status"))
          .map((entry) => publishStatus(`${STATUS_DIR}/${entry.name}`)),
      );
    } catch (error) {
      console.error("Status polling error; retrying in two seconds.", error);
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
}

function startStatusWatcher(): void {
  if (watcherStarted) return;
  watcherStarted = true;
  void watchStatuses();
  void pollStatuses();
}

async function streamStatuses(ctx: Context): Promise<void> {
  const auth = await authenticateRequest(ctx);
  if (!auth) ctx.throw(401, "Unauthorized");
  const maps = await getMaps(auth.user, isSuperAdmin(auth.user));
  const subdomains = new Set<string>(maps.documents.map((map: { subdomain: string }) => map.subdomain));

  let subscriber: Subscriber | undefined;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Keep start() synchronous. If start() returns a promise, the stream stays
      // in the "starting" state until it resolves, which stops Deno from flushing
      // the HTTP response headers. The browser then sees /map/status-stream stuck
      // at "pending" with no "EventStream" tab. Set up the subscriber and send the
      // connected comment synchronously, then push the snapshot in the background.
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          subscriber?.close();
        }
      }, 25_000);

      const close = () => {
        if (!subscriber) return;
        clearInterval(heartbeat);
        subscribers.delete(subscriber);
        try {
          controller.close();
        } catch {
          // The connection may already be closed by the browser.
        }
      };
      subscriber = { subdomains, controller, close };
      subscribers.add(subscriber);
      controller.enqueue(encoder.encode(": connected\n\n"));
      // Fire-and-forget so the response head is never delayed by the snapshot.
      sendStatusSnapshot(subscriber).catch(() => {
        // If the snapshot fails, live updates still arrive via the file watcher.
      });
    },
    cancel() {
      subscriber?.close();
    },
  });

  ctx.response.headers.set("Content-Type", "text/event-stream");
  ctx.response.headers.set("Cache-Control", "no-cache");
  ctx.response.headers.set("Connection", "keep-alive");
  ctx.response.headers.set("X-Accel-Buffering", "no");
  ctx.response.body = stream;
}

export { startStatusWatcher, streamStatuses };
