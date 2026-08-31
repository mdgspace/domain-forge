import {
  Application,
  Context,
  isHttpError,
  Router,
  Status,
} from "https://deno.land/x/oak@v12.5.0/mod.ts";
import { Session } from "https://deno.land/x/oak_sessions@v4.1.9/mod.ts";
import { create, verify } from "https://deno.land/x/djwt@v2.9.1/mod.ts";
async function exec(command: string) {
  const process = new Deno.Command("sh", {
    args: ["-c", command],
    stdout: "piped",
    stderr: "piped",
  });
  const { code, stdout, stderr } = await process.output();
  return {
    output: new TextDecoder().decode(stdout),
    error: new TextDecoder().decode(stderr),
    status: { code, success: code === 0 },
  };
}
import * as Sentry from "npm:@sentry/deno";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
import { MongoClient, ObjectId } from "npm:mongodb@6.1.0";

try {
  // Load .env only for variables that are not already set in the runtime environment
  const loadedEnv = await load({ export: false });
  const loadedBackendEnv = await load({ export: false, envPath: "./src/backend/.env" }).catch(() => ({}));
  const merged = { ...loadedEnv, ...loadedBackendEnv };
  for (const [key, val] of Object.entries(merged)) {
    if (!Deno.env.get(key) && val !== undefined) {
      Deno.env.set(key, val);
    }
  }
} catch (_e) {
  // Ignore errors if file already loaded or not found
}

export {
  Application,
  Context,
  create,
  exec,
  isHttpError,
  oakCors,
  Router,
  Sentry,
  Session,
  Status,
  verify,
  MongoClient,
  ObjectId,
};
