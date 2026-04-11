import { exec } from "../dependencies.ts";

const restartCounts = new Map<string, { count: number; lastRestart: Date }>();
const stopCounts = new Map<string, { count: number; lastStop: Date }>();

export function getRestartCount(containerName: string): number {
    return restartCounts.get(containerName)?.count || 0;
}

export function getStopCount(containerName: string): number {
    return stopCounts.get(containerName)?.count || 0;
}

export async function restartContainer(containerName: string): Promise<void> {
    try {
        await exec(
            `bash -c "echo 'mkdir -p /hostpipe/logs && bash /home/alronova/DevZone/domain-forge/src/backend/shell_scripts/restart.sh ${containerName} > /hostpipe/logs/${containerName}.log 2>&1' > /hostpipe/pipe"`
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

export async function stopContainer(containerName: string): Promise<void> {
    try {
        await exec(
            `bash -c "echo 'mkdir -p /hostpipe/logs && bash /home/alronova/DevZone/domain-forge/src/backend/shell_scripts/stop.sh ${containerName} > /hostpipe/logs/${containerName}.log 2>&1' > /hostpipe/pipe"`
        );

        const current = stopCounts.get(containerName);
        stopCounts.set(containerName, {
            count: (current?.count || 0) + 1,
            lastStop: new Date(),
        });
    } catch (error) {
        console.error(`Failed to stop ${containerName}:`, error);
        throw error;
    }
}
