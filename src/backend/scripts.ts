import { exec } from "./dependencies.ts";
import dockerize, { dockerignore } from "./utils/container.ts";
import DfContentMap from "./types/maps_interface.ts";

const MEMORY_LIMIT = Deno.env.get("MEMORY_LIMIT");

function shellEscape(input: string, label = "input"): string {
  if (!input) return "";
  if (input.startsWith("-")) {
    throw new Error(`[scripts] Invalid ${label}: cannot start with a hyphen`);
  }
  const safeCharPattern = /^[a-zA-Z0-9.\-_:/~?=#]+$/;

  if (!safeCharPattern.test(input)) {
    throw new Error(`[scripts] Invalid characters in ${label}: ${input}`);
  }
  return input;
}

async function safeExec(command: string): Promise<void> {
  try {
    await exec(command);
  } catch (error) {
    console.error(`[scripts] exec failed: ${command}`);
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
  const subdomain = shellEscape(document.subdomain, "subdomain");
  const resource = shellEscape(document.resource, "resource");
  const safePort = shellEscape(port, "port");
  const memLimit = shellEscape(MEMORY_LIMIT || "512m", "MEMORY_LIMIT");

  if (document.resource_type === "URL") {
    await safeExec(
      `bash -c "echo 'bash ../../src/backend/shell_scripts/automate.sh -u ${resource} ${subdomain}' > /hostpipe/pipe"`,
    );
  } else if (document.resource_type === "PORT") {
    await safeExec(
      `bash -c "echo 'bash ../../src/backend/shell_scripts/automate.sh -p ${resource} ${subdomain}' > /hostpipe/pipe"`,
    );
  } else if (document.resource_type === "GITHUB" && static_content == "Yes") {
    await Deno.writeTextFile(`/hostpipe/.env`, env_content || "");
    await safeExec(
      `bash -c "echo 'bash ../../src/backend/shell_scripts/container.sh -s ${subdomain} ${resource} 80 ${memLimit}' > /hostpipe/pipe"`,
    );
  } else if (document.resource_type === "GITHUB" && static_content == "No") {
    if (dockerfile_present === 'No') {
      await Deno.writeTextFile(`/hostpipe/Dockerfile`, dockerize(stack || "", safePort, build_cmds || ""));
      await Deno.writeTextFile(`/hostpipe/.dockerignore`, dockerignore(stack || ""));
      await Deno.writeTextFile(`/hostpipe/.env`, env_content || "");
      await safeExec(
        `bash -c "echo 'bash ../../src/backend/shell_scripts/container.sh -g ${subdomain} ${resource} ${safePort} ${memLimit}' > /hostpipe/pipe"`,
      );
    } else if (dockerfile_present === 'Yes') {
      await safeExec(
        `bash -c "echo 'bash ../../src/backend/shell_scripts/container.sh -d ${subdomain} ${resource} ${safePort} ${memLimit}' > /hostpipe/pipe"`,
      );
    }
  }
}

async function deleteScript(document: DfContentMap) {
  const subdomain = shellEscape(document.subdomain, "subdomain");
  await safeExec(
    `bash -c "echo 'bash ../../src/backend/shell_scripts/delete.sh ${subdomain}' > /hostpipe/pipe"`,
  );
}

export { addScript, deleteScript };
