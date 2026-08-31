import { Context } from "./dependencies.ts";
import {
    getContainerHistory,
    getHealthSummary,
    isUnhealthy,
    type TimeStep,
    type TimeRange,
} from "./utils/container-health.ts";
import { restartContainer, stopContainer, getRestartCount, getStopCount, validateContainerName } from "./utils/auto-restart.ts";
import { getMonitorStatus, triggerHealthCheck } from "./health-monitor.ts";
import { isSuperAdmin } from "./utils/jwt.ts";
import { getUserSubdomains, verifySubdomainOwnership } from "./db.ts";
import { authenticateRequest } from "./utils/auth-helper.ts";
import { isValidSubdomain } from "./utils/log-service.ts";

const TIME_RANGE_PRESETS: Record<TimeStep, TimeRange> = {
    '1s': { step: '1s', duration: '5m' },
    '15s': { step: '15s', duration: '15m' },
    '1m': { step: '1m', duration: '1h' },
    '5m': { step: '5m', duration: '6h' },
    '1h': { step: '1h', duration: '24h' },
    '1d': { step: '1d', duration: '7d' },
};

export async function getContainerHealth(ctx: Context): Promise<void> {
    const auth = await authenticateRequest(ctx);
    if (!auth) {
        ctx.throw(401, "Unauthorized");
    }
    const author = auth.user;

    const summary = await getHealthSummary(author);
    const isSuper = isSuperAdmin(author);
    let visibleContainers = summary.containers;

    if (!isSuper) {
        const owned = new Set(await getUserSubdomains(author));
        visibleContainers = summary.containers.filter(c =>
            owned.has(c.subdomain) || owned.has(c.name)
        );
    }

    const total = visibleContainers.length;
    const healthy = visibleContainers.filter(c => !isUnhealthy(c)).length;
    const unhealthy = total - healthy;

    ctx.response.body = {
        total,
        healthy,
        unhealthy,
        containers: visibleContainers.map(c => ({
            name: c.name,
            subdomain: c.subdomain,
            status: c.status,
            cpuPercent: Math.round(c.cpuPercent * 100) / 100,
            memoryPercent: Math.round(c.memoryPercent * 100) / 100,
            memoryUsageMB: Math.round((c.memoryUsage / (1024 * 1024)) * 100) / 100,
            restartCount: getRestartCount(c.name),
            stopCount: getStopCount(c.name),
            isHealthy: !isUnhealthy(c),
            lastUpdated: c.lastUpdated.toISOString(),
        })),
    };
}

export async function getContainerMetrics(ctx: Context): Promise<void> {
    const subdomain = (ctx as any).params?.subdomain;
    const stepParam = ctx.request.url.searchParams.get("step") || '1m';
    const auth = await authenticateRequest(ctx);
    if (!auth) {
        ctx.throw(401, "Unauthorized");
    }
    const author = auth.user;

    if (!subdomain || !isValidSubdomain(subdomain)) {
        ctx.throw(400, "Subdomain parameter is invalid or missing");
    }

    const hasAccess = await verifySubdomainOwnership(author, subdomain);
    if (!hasAccess) {
        ctx.throw(403, "You do not have permission to view metrics for this container.");
    }

    const step = stepParam as TimeStep;
    const range = TIME_RANGE_PRESETS[step] || TIME_RANGE_PRESETS['1m'];

    const history = await getContainerHistory(subdomain, range, author);

    ctx.response.body = {
        subdomain,
        step: range.step,
        duration: range.duration,
        dataPoints: history.cpu.length,
        cpu: history.cpu.map(([ts, val]) => ({
            timestamp: new Date(ts).toISOString(),
            value: Math.round(val * 100) / 100,
        })),
        memory: history.memory.map(([ts, val]) => ({
            timestamp: new Date(ts).toISOString(),
            valueMB: Math.round((val / (1024 * 1024)) * 100) / 100,
        })),
    };
}

export async function getHealthDashboard(ctx: Context): Promise<void> {
    const auth = await authenticateRequest(ctx);
    if (!auth) {
        ctx.throw(401, "Unauthorized");
    }
    const author = auth.user;

    const summary = await getHealthSummary(author);
    const monitorStatus = getMonitorStatus();
    const isSuper = isSuperAdmin(author);
    let visibleContainers = summary.containers;

    if (!isSuper) {
        const owned = new Set(await getUserSubdomains(author));
        visibleContainers = summary.containers.filter(c =>
            owned.has(c.subdomain) || owned.has(c.name)
        );
    }

    const total = visibleContainers.length;
    const healthy = visibleContainers.filter(c => !isUnhealthy(c)).length;
    const unhealthy = total - healthy;

    ctx.response.body = {
        overview: {
            total,
            healthy,
            unhealthy,
            healthPercent: total > 0
                ? Math.round((healthy / total) * 100)
                : 100,
        },
        monitor: {
            running: monitorStatus.running,
            checkIntervalMs: monitorStatus.interval,
            thresholds: monitorStatus.thresholds,
        },
        unhealthyContainers: visibleContainers
            .filter(c => isUnhealthy(c))
            .map(c => ({
                name: c.name,
                subdomain: c.subdomain,
                reason: getUnhealthyReason(c),
                restartAttempts: monitorStatus.restartAttempts[c.name]?.count || 0,
            })),
    };
}

export async function restartContainerHandler(ctx: Context): Promise<void> {
    const subdomain = (ctx as any).params?.subdomain;
    let safeSubdomain = "";
    try {
        safeSubdomain = validateContainerName(subdomain);
    } catch {
        ctx.throw(400, "Invalid container identifier");
    }

    const auth = await authenticateRequest(ctx);
    if (!auth || !auth.user || auth.user === "not verified") {
        ctx.throw(401, "Unauthorized");
    }
    const author = auth.user;

    const hasAccess = await verifySubdomainOwnership(author, safeSubdomain);
    if (!hasAccess) {
        ctx.throw(403, "You do not have permission to restart this container.");
    }

    try {
        await restartContainer(safeSubdomain);

        ctx.response.body = {
            status: "success",
            message: `Container ${safeSubdomain} restart initiated`,
        };
    } catch (error) {
        console.error(`Failed to restart container ${safeSubdomain}`, error);
        ctx.response.status = 500;
        ctx.response.body = {
            status: "error",
            message: `Failed to restart ${safeSubdomain}`,
        };
    }
}

export async function stopContainerHandler(ctx: Context): Promise<void> {
    const subdomain = (ctx as any).params?.subdomain;
    let safeSubdomain = "";
    try {
        safeSubdomain = validateContainerName(subdomain);
    } catch {
        ctx.throw(400, "Invalid container identifier");
    }

    const auth = await authenticateRequest(ctx);
    if (!auth || !auth.user || auth.user === "not verified") {
        ctx.throw(401, "Unauthorized");
    }
    const author = auth.user;

    const hasAccess = await verifySubdomainOwnership(author, safeSubdomain);
    if (!hasAccess) {
        ctx.throw(403, "You do not have permission to stop this container.");
    }

    try {
        await stopContainer(safeSubdomain);

        ctx.response.body = {
            status: "success",
            message: `Container ${safeSubdomain} stop initiated`,
        };
    } catch (error) {
        console.error(`Failed to stop container ${safeSubdomain}`, error);
        ctx.response.status = 500;
        ctx.response.body = {
            status: "error",
            message: `Failed to stop ${safeSubdomain}`,
        };
    }
}

export async function triggerHealthCheckHandler(ctx: Context): Promise<void> {
    const auth = await authenticateRequest(ctx);
    if (!auth || !auth.user || auth.user === "not verified") {
        ctx.throw(401, "Unauthorized");
    }
    const author = auth.user;

    if (!isSuperAdmin(author)) {
        ctx.throw(403, "Only super administrators can trigger health checks.");
    }

    await triggerHealthCheck();

    ctx.response.body = {
        status: "success",
        message: "Health check triggered",
    };
}

function getUnhealthyReason(c: { cpuPercent: number; memoryPercent: number; restartCount: number; status: string }): string {
    const reasons: string[] = [];

    if (c.cpuPercent > 90) reasons.push(`High CPU (${c.cpuPercent.toFixed(1)}%)`);
    if (c.memoryPercent > 85) reasons.push(`High Memory (${c.memoryPercent.toFixed(1)}%)`);
    if (c.restartCount > 5) reasons.push(`Many restarts (${c.restartCount})`);
    if (c.status === 'exited') reasons.push('Container exited');
    if (c.status === 'unhealthy') reasons.push('Health check failed');

    return reasons.join(', ') || 'Unknown';
}
