import { exec } from "../dependencies.ts";

const restartCounts = new Map<string, { count: number; lastRestart: Date }>();
const stopCounts = new Map<string, { count: number; lastStop: Date }>();
const SAFE_CONTAINER_NAME_PATTERN = /^[a-zA-Z0-9_.-]+$/;

let execCommand = async (command: string): Promise<void> => {
    await exec(command);
};

export function validateContainerName(containerName: string): string {
    if (!containerName || !SAFE_CONTAINER_NAME_PATTERN.test(containerName)) {
        throw new Error(`Invalid container name: ${containerName}`);
    }
    return containerName;
}

function buildHostPipeCommand(scriptName: "restart.sh" | "stop.sh", containerName: string): string {
    const safeName = validateContainerName(containerName);
    return `bash -c "echo 'bash ../../src/backend/shell_scripts/${scriptName} ${safeName}' > /hostpipe/pipe"`;
}

export function setCommandExecutorForTest(
    executor: ((command: string) => Promise<void>) | null,
): void {
    execCommand = executor ?? (async (command: string): Promise<void> => {
        await exec(command);
    });
}

export function resetContainerActionStatsForTest(): void {
    restartCounts.clear();
    stopCounts.clear();
}

export function getRestartCount(containerName: string): number {
    return restartCounts.get(containerName)?.count || 0;
}

export function getStopCount(containerName: string): number {
    return stopCounts.get(containerName)?.count || 0;
}

export async function restartContainer(containerName: string): Promise<void> {
    const safeContainerName = validateContainerName(containerName);

    try {
        await execCommand(buildHostPipeCommand("restart.sh", safeContainerName));

        const current = restartCounts.get(safeContainerName);
        restartCounts.set(safeContainerName, {
            count: (current?.count || 0) + 1,
            lastRestart: new Date(),
        });

    } catch (error) {
        console.error(`[Auto-Restart] Failed to restart ${safeContainerName}:`, error);
        throw error;
    }
}

export async function stopContainer(containerName: string): Promise<void> {
    const safeContainerName = validateContainerName(containerName);

    try {
        await execCommand(buildHostPipeCommand("stop.sh", safeContainerName));

        const current = stopCounts.get(safeContainerName);
        stopCounts.set(safeContainerName, {
            count: (current?.count || 0) + 1,
            lastStop: new Date(),
        });
    } catch (error) {
        console.error(`Failed to stop ${safeContainerName}:`, error);
        throw error;
    }
}
