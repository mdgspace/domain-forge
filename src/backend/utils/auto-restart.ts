import { exec } from "../dependencies.ts";

//Restart Count Tracking (in-memory)
//Track restart counts per container (resets when backend restarts)
const restartCounts = new Map<string, { count: number; lastRestart: Date }>();

//Get restart count for a container
export function getRestartCount(containerName: string): number {
    return restartCounts.get(containerName)?.count || 0;
}

//Restart a container by name using the named pipe
export async function restartContainer(containerName: string): Promise<void> {
    try {
        // Send restart command through named pipe to host
        await exec(
            `bash -c "echo 'docker restart ${containerName}' > /hostpipe/pipe"`
        );

        // Track restart count
        const current = restartCounts.get(containerName);
        restartCounts.set(containerName, {
            count: (current?.count || 0) + 1,
            lastRestart: new Date(),
        });

    } catch (error) {
        console.error(`[Auto-Restart] Failed to restart ${containerName}:`, error);
        throw error;
    }
}
