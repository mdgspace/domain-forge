import { exec } from "./dependencies.ts";
import dockerize from "./utils/container.ts";
import DfContentMap from "./types/maps_interface.ts";
import {
  getSecretsForProject,
  upsertVolumeMetadata,
} from "./db.ts";
import { getEncryptionService } from "./utils/encryption.ts";

const MEMORY_LIMIT = Deno.env.get("MEMORY_LIMIT");
const VOLUME_MOUNT_PATH = "/app/data";

function mergeEnvVars(
  envContent: string,
  secrets: Record<string, string>,
): string {
  const lines: string[] = [];

  if (envContent && envContent.trim()) {
    const envLines = envContent.split("\n").filter((line) => line.trim());
    lines.push(...envLines);
  }

  for (const [key, value] of Object.entries(secrets)) {
    const escapedValue = value.replace(/(["$`\\])/g, "\\$1");
    lines.push(`${key}=${escapedValue}`);
  }

  return lines.join("\n");
}

function sanitizeSubdomain(subdomain: string): string {
  return subdomain.replace(/[.:\/]/g, "-");
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
  if (document.resource_type === "URL") {
    await exec(
      `bash -c "echo 'bash ../../src/backend/shell_scripts/automate.sh -u ${document.resource} ${document.subdomain}' > /hostpipe/pipe"`,
    );
    return;
  } else if (document.resource_type === "PORT") {
    await exec(
      `bash -c "echo 'bash ../../src/backend/shell_scripts/automate.sh -p ${document.resource} ${document.subdomain}' > /hostpipe/pipe"`,
    );
    return;
  }

  let envFilePath: string | null = null;
  let hasSecrets = false;

  try {
    const volumeName = `df-vol-${sanitizeSubdomain(document.subdomain)}`;
    await exec(
      `bash -c "echo 'bash ../../src/backend/shell_scripts/volume.sh create ${document.subdomain}' > /hostpipe/pipe"`,
    );

    await new Promise((resolve) => setTimeout(resolve, 500));

    await upsertVolumeMetadata(document.subdomain, volumeName, VOLUME_MOUNT_PATH);

    const storedSecret = await getSecretsForProject(document.subdomain);
    let decryptedSecrets: Record<string, string> = {};

    if (storedSecret) {
      const encryptionService = getEncryptionService();
      if (encryptionService.isInitialized()) {
        try {
          decryptedSecrets = await encryptionService.decryptSecrets({
            encrypted: storedSecret.encrypted_secrets,
            iv: storedSecret.iv,
            tag: storedSecret.tag,
          });
          hasSecrets = Object.keys(decryptedSecrets).length > 0;
        } catch (error) {
          console.error(`Failed to decrypt secrets for ${document.subdomain}:`, error);
        }
      }
    }

    const allEnvVars = mergeEnvVars(env_content || "", decryptedSecrets);

    if (allEnvVars.trim() || hasSecrets) {
      envFilePath = `/tmp/${sanitizeSubdomain(document.subdomain)}-${Date.now()}.env`;
      await Deno.writeTextFile(envFilePath, allEnvVars);
    }
  } catch (error) {
    console.error("Error preparing volumes/secrets for deployment:", error);
  }

  if (document.resource_type === "GITHUB" && static_content == "Yes") {
    if (env_content && !hasSecrets) {
      Deno.writeTextFile(`/hostpipe/.env`, env_content);
    }
    
    const envFileArg = envFilePath ? ` ${envFilePath}` : "";
    await exec(
      `bash -c "echo 'bash ../../src/backend/shell_scripts/container.sh -s ${document.subdomain} ${document.resource} 80 ${MEMORY_LIMIT}${envFileArg}' > /hostpipe/pipe"`,
    );
  } else if (document.resource_type === "GITHUB" && static_content == "No") {
    if (dockerfile_present === "No") {
      const dockerfile = dockerize(stack, port, build_cmds);
      Deno.writeTextFile(`/hostpipe/Dockerfile`, dockerfile);
      
      if (env_content && !hasSecrets) {
        Deno.writeTextFile(`/hostpipe/.env`, env_content);
      }
      
      const envFileArg = envFilePath ? ` ${envFilePath}` : "";
      await exec(
        `bash -c "echo 'bash ../../src/backend/shell_scripts/container.sh -g ${document.subdomain} ${document.resource} ${port} ${MEMORY_LIMIT}${envFileArg}' > /hostpipe/pipe"`,
      );
    } else if (dockerfile_present === "Yes") {
      const envFileArg = envFilePath ? ` ${envFilePath}` : "";
      await exec(
        `bash -c "echo 'bash ../../src/backend/shell_scripts/container.sh -d ${document.subdomain} ${document.resource} ${port} ${MEMORY_LIMIT}${envFileArg}' > /hostpipe/pipe"`,
      );
    }
  }
}

async function deleteScript(document: DfContentMap) {
  await exec(
    `bash -c "echo 'bash ../../src/backend/shell_scripts/delete.sh ${document.subdomain}' > /hostpipe/pipe"`,
  );
}

export { addScript, deleteScript };
