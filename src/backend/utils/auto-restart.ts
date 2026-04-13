import { createClient } from "../dependencies.ts";

const restartCounts = new Map<string, { count: number; lastRestart: Date }>();
const stopCounts = new Map<string, { count: number; lastStop: Date }>();
const SAFE_CONTAINER_NAME_PATTERN = /^[a-zA-Z0-9_.-]+$/;

const REDIS_URL = Deno.env.get("REDIS_URL") || "redis://redis:6379";
const redis = createClient({ url: REDIS_URL });
redis.on('error', (err) => console.error('Redis Client Error', err));
await redis.connect();

let execCommand = async (payload: any): Promise<void> => {
    await redis.lPush("jobs:deployments", JSON.stringify(payload));
};

export function validateContainerName(containerName: string): string {
    if (!containerName || !SAFE_CONTAINER_NAME_PATTERN.test(containerName)) {
        throw new Error(`Invalid container name: ${containerName}`);
    }
    return containerName;
}

function buildHostJobPayload(action: "restart" | "stop", containerName: string): any {
    const safeName = validateContainerName(containerName);
    return {
        action,
        subdomain: safeName
    };
}

export function setCommandExecutorForTest(
    executor: ((payload: any) => Promise<void>) | null,
): void {
    execCommand = executor ?? (async (payload: any): Promise<void> => {
        await redis.lPush("jobs:deployments", JSON.stringify(payload));
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
        await execCommand(buildHostJobPayload("restart", safeContainerName));

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
        await execCommand(buildHostJobPayload("stop", safeContainerName));

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
