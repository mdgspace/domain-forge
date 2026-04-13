import { createClient } from "./dependencies.ts";
import dockerize, { dockerignore } from "./utils/container.ts";
import DfContentMap from "./types/maps_interface.ts";

const MEMORY_LIMIT = Deno.env.get("MEMORY_LIMIT");
const REDIS_URL = Deno.env.get("REDIS_URL") || "redis://redis:6379";

const redis = createClient({ url: REDIS_URL });
redis.on('error', (err) => console.error('Redis Client Error', err));
await redis.connect();

export interface JobPayload {
  action: "create" | "delete" | "restart" | "stop";
  subdomain: string;
  resourceType?: string;
  resource?: string;
  port?: string;
  memLimit?: string;
  staticContent?: string;
  dockerfilePresent?: string;
  dockerfileContent?: string;
  dockerignoreContent?: string;
  envContent?: string;
  stack?: string;
  buildCmds?: string;
}

async function enqueueJob(payload: JobPayload): Promise<void> {
  try {
    await redis.lPush("jobs:deployments", JSON.stringify(payload));
    console.log(`[scripts] Enqueued job for ${payload.subdomain}`);
  } catch (error) {
    console.error(`[scripts] Failed to enqueue job for ${payload.subdomain}`);
    console.error(error);
    throw error;
  }
}

async function addScript(
  document: DfContentMap,
  env_content: string,
  static_content: string,
  dockerfile_present: string,
  stack: string,
  port: string,
  build_cmds: string,
) {
  const subdomain = document.subdomain;
  const resource = document.resource;
  const safePort = port;
  const memLimit = MEMORY_LIMIT || "512m";

  const jobPayload: JobPayload = {
    action: "create",
    subdomain,
    resourceType: document.resource_type,
    resource,
    port: safePort,
    memLimit,
    staticContent: static_content,
    dockerfilePresent: dockerfile_present,
    dockerfileContent: (document.resource_type === "GITHUB" && static_content == "No" && dockerfile_present === 'No') ? dockerize(stack || "", safePort, build_cmds || "") : undefined,
    dockerignoreContent: (document.resource_type === "GITHUB" && static_content == "No" && dockerfile_present === 'No') ? dockerignore(stack || "") : undefined,
    envContent: env_content || undefined,
    stack,
    buildCmds: build_cmds
  };

  await enqueueJob(jobPayload);
}

async function deleteScript(document: DfContentMap) {
  const jobPayload: JobPayload = {
    action: "delete",
    subdomain: document.subdomain
  };
  await enqueueJob(jobPayload);
}

export { addScript, deleteScript };
