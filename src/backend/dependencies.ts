import {
  Application,
  Context,
  isHttpError,
  Router,
  Status,
} from "https://deno.land/x/oak@v12.5.0/mod.ts";
import { Session } from "https://deno.land/x/oak_sessions@v4.1.9/mod.ts";
import { create, verify } from "https://deno.land/x/djwt@v2.9.1/mod.ts";
import { exec } from "https://deno.land/x/exec@0.0.5/mod.ts";
import * as Sentry from 'https://deno.land/x/sentry/index.mjs';
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
import { MongoClient, ObjectId } from "npm:mongodb@6.1.0";
import { createClient } from "npm:redis@4.6.10";

try {
  await load({ export: true }); // Try default .env in CWD
  // If running from root, try loading src/backend/.env
  await load({ export: true, envPath: "./src/backend/.env" });
} catch (e) {
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
  createClient,
};
