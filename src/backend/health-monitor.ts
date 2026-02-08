import { Sentry } from "./dependencies.ts";
import {
    getAllContainerStats,
    isUnhealthy,
    type ContainerStats,
    type HealthThresholds,
} from "./utils/container-health.ts";
import { restartContainer } from "./utils/auto-restart.ts";

const HEALTH_CHECK_INTERVAL = parseInt(Deno.env.get('HEALTH_CHECK_INTERVAL') || '30000');
const DEBUG = Deno.env.get('HEALTH_DEBUG') === 'true';

const THRESHOLDS: HealthThresholds = {
    maxCpuPercent: parseInt(Deno.env.get('MAX_CPU_THRESHOLD') || '90'),
    maxMemoryPercent: parseInt(Deno.env.get('MAX_MEMORY_THRESHOLD') || '85'),
    maxRestartCount: parseInt(Deno.env.get('MAX_RESTART_COUNT') || '5'),
};

let monitorInterval: number | null = null;
let isRunning = false;

const restartAttempts = new Map<string, { count: number; lastAttempt: Date }>();

export function startHealthMonitor(): void {
    if (isRunning) {
        console.log('[Health Monitor] Already running');
        return;
    }

    console.log('[Health Monitor] Starting...');
    console.log('[Health Monitor] Check interval:', HEALTH_CHECK_INTERVAL, 'ms');
    console.log('[Health Monitor] Thresholds:', THRESHOLDS);

    isRunning = true;

    checkContainerHealth();
    monitorInterval = setInterval(checkContainerHealth, HEALTH_CHECK_INTERVAL);
}


async function checkContainerHealth(): Promise<void> {
    if (DEBUG) {
        console.log('[Health Monitor] Running health check...');
    }

    try {
        const containers = await getAllContainerStats();

        if (DEBUG) {
            console.log(`[Health Monitor] Found ${containers.length} user containers`);
        }

        for (const container of containers) {
            if (isUnhealthy(container, THRESHOLDS)) {
                await handleUnhealthyContainer(container);
            } else {
                if (restartAttempts.has(container.name)) {
                    restartAttempts.delete(container.name);
                    if (DEBUG) {
                        console.log(`[Health Monitor] ${container.name} recovered, reset restart count`);
                    }
                }
            }
        }
    } catch (error) {
        console.error('[Health Monitor] Health check failed:', error);
        Sentry.captureException(error);
    }
}


async function handleUnhealthyContainer(container: ContainerStats): Promise<void> {
    console.log(`[Health Monitor] Unhealthy container detected: ${container.name}`);
    console.log(`[Health Monitor] Stats: CPU=${container.cpuPercent.toFixed(1)}%, Mem=${container.memoryPercent.toFixed(1)}%, Restarts=${container.restartCount}, Status=${container.status}`);

    const attempts = restartAttempts.get(container.name) || { count: 0, lastAttempt: new Date(0) };

    if (attempts.count >= THRESHOLDS.maxRestartCount) {
        console.error(`[Health Monitor] ${container.name} exceeded max restart attempts (${attempts.count})`);

        Sentry.captureMessage(`Container ${container.name} marked as dead after ${attempts.count} restart attempts`, 'error');
        return;
    }

    const cooldownMs = calculateCooldown(attempts.count);
    const timeSinceLastAttempt = Date.now() - attempts.lastAttempt.getTime();

    if (timeSinceLastAttempt < cooldownMs) {
        if (DEBUG) {
            console.log(`[Health Monitor] ${container.name} in cooldown, ${Math.ceil((cooldownMs - timeSinceLastAttempt) / 1000)}s remaining`);
        }
        return;
    }
    console.log(`[Health Monitor] Restarting ${container.name} (attempt ${attempts.count + 1})`);

    try {
        await restartContainer(container.name);
        restartAttempts.set(container.name, {
            count: attempts.count + 1,
            lastAttempt: new Date(),
        });

        Sentry.captureMessage(`Container ${container.name} restarted (attempt ${attempts.count + 1})`, 'info');

    } catch (error) {
        console.error(`[Health Monitor] Failed to restart ${container.name}:`, error);
        Sentry.captureException(error);
        restartAttempts.set(container.name, {
            count: attempts.count + 1,
            lastAttempt: new Date(),
        });
    }
}


function calculateCooldown(attemptCount: number): number {
    const baseMs = 30000; 
    const maxMs = 600000;
    return Math.min(baseMs * Math.pow(2, attemptCount), maxMs);
}


export function getMonitorStatus(): {
    running: boolean;
    interval: number;
    thresholds: HealthThresholds;
    restartAttempts: Record<string, { count: number; lastAttempt: string }>;
} {
    const attempts: Record<string, { count: number; lastAttempt: string }> = {};
    for (const [name, data] of restartAttempts) {
        attempts[name] = {
            count: data.count,
            lastAttempt: data.lastAttempt.toISOString(),
        };
    }

    return {
        running: isRunning,
        interval: HEALTH_CHECK_INTERVAL,
        thresholds: THRESHOLDS,
        restartAttempts: attempts,
    };
}


export async function triggerHealthCheck(): Promise<void> {
    console.log('[Health Monitor] Manual health check triggered');
    await checkContainerHealth();
}
