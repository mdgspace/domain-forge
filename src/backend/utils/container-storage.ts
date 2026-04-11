import {exec } from "../dependencies.ts";
export async function canAllocateStorage(requestedMb: number) {
  const STORAGE_PATH = "/mnt/storage";
  const SAFETY_BUFFER_MB = 200; // keep buffer for system + docker

  try {
    const responseProcess = new Deno.Command("sh", {
      args: ["-c", "cat /hostpipe/output_pipe"],
    }).output(); // don't await yet, just start it
    await exec(`bash -c "echo 'RESPOND::df ${STORAGE_PATH} --output=avail' > /hostpipe/pipe"`);
    const response=await responseProcess;
    const output = new TextDecoder().decode(response.stdout).trim().split("\n");
    const availableKb = parseInt(output[1].trim());
    if (isNaN(availableKb)) {
      throw new Error(`Unexpected df output: ${output}`);
    }
    const availableMb = Math.floor(availableKb / 1024);
    const usableMb = availableMb - SAFETY_BUFFER_MB;
    const canAllocate = usableMb >= requestedMb;
    console.log(`can allocate ${canAllocate} memory`);
    console.log(`Available memory is ${availableMb} requested is ${requestedMb}`);
    return {
      can_allocate: canAllocate,
      available_mb: usableMb,
      requested_mb: requestedMb,
      reason: canAllocate ? null : "Not enough disk space",
    };
  } catch (err) {
    console.log(`Error during memory check volume`);
    return {
      can_allocate: false,
      available_mb: 0,
      requested_mb: requestedMb,
      reason: "Failed to check disk space",
    };
  }
}