import { exec } from "./dependencies.ts";
import dockerize from "./utils/container.ts";
import DfContentMap from "./types/maps_interface.ts";

async function addScript(
  document: DfContentMap,
  env_content: string,
  static_content: string,
  stack: string,
  port: string,
  build_cmds: string,
) {
    if (document.resource_type === "URL") {
      await exec(
        `bash -c "echo 'bash ../../src/backend/utils/automate.sh -u ${document.resource} ${document.subdomain}' > /hostpipe/pipe"`,
      );
    } else if (document.resource_type === "PORT") {
      await exec(
        `bash -c "echo 'bash ../../src/backend/utils/automate.sh -p ${document.resource} ${document.subdomain}' > /hostpipe/pipe"`,
      );
    } else if (document.resource_type === "GITHUB" && static_content == "Yes") {
      Deno.writeTextFile(`/hostpipe/.env`,env_content)
      await exec(
        `bash -c "echo 'bash ../../src/backend/utils/container.sh -s ${document.subdomain} ${document.resource}' > /hostpipe/pipe"`,
      );
    } else if (document.resource_type === "GITHUB" && static_content == "No") {
      let dockerfile = dockerize(stack, port, build_cmds);
      Deno.writeTextFile(`/hostpipe/Dockerfile`,dockerfile)
      Deno.writeTextFile(`/hostpipe/.env`,env_content)
      await exec(
        `bash -c "echo 'bash ../../src/backend/utils/container.sh -g ${document.subdomain} ${document.resource} ${port}' > /hostpipe/pipe"`);
    }
}

async function deleteScript(document: DfContentMap) {
  await exec(
    `bash -c "echo 'bash ../../src/backend/utils/delete.sh ${document.subdomain}' > /hostpipe/pipe"`,
  );
}

export { addScript, deleteScript };
