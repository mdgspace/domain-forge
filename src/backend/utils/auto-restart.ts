import { exec } from "../dependencies.ts";

const restartCounts = new Map<string, { count: number; lastRestart: Date }>();

export function getRestartCount(containerName: string): number {
    return restartCounts.get(containerName)?.count || 0;
}

export async function restartContainer(containerName: string): Promise<void> {
    try {
        await exec(
            `bash -c "echo 'docker restart ${containerName}' > /hostpipe/pipe"`
        );

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
