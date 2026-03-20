import { Context } from "./dependencies.ts";
import {
    getContainerHistory,
    getHealthSummary,
    isUnhealthy,
    type TimeStep,
    type TimeRange,
} from "./utils/container-health.ts";
import { restartContainer, stopContainer, getRestartCount, getStopCount } from "./utils/auto-restart.ts";
import { getMonitorStatus, triggerHealthCheck } from "./health-monitor.ts";
import { checkJWT } from "./utils/jwt.ts";

const TIME_RANGE_PRESETS: Record<TimeStep, TimeRange> = {
    '1s': { step: '1s', duration: '5m' },
    '15s': { step: '15s', duration: '15m' },
    '1m': { step: '1m', duration: '1h' },
    '5m': { step: '5m', duration: '6h' },
    '1h': { step: '1h', duration: '24h' },
    '1d': { step: '1d', duration: '7d' },
};


export async function getContainerHealth(ctx: Context): Promise<void> {
    const author = ctx.request.url.searchParams.get("user");
    const token = ctx.request.url.searchParams.get("token");
    const provider = ctx.request.url.searchParams.get("provider");

    if (author !== await checkJWT(provider!, token!)) {
        ctx.throw(401);
    }

    const summary = await getHealthSummary();

    ctx.response.headers.set("Access-Control-Allow-Origin", "*");
    ctx.response.body = {
        total: summary.total,
        healthy: summary.healthy,
        unhealthy: summary.unhealthy,
        containers: summary.containers.map(c => ({
            name: c.name,
            subdomain: c.subdomain,
            status: c.status,
            cpuPercent: Math.round(c.cpuPercent * 100) / 100,
            memoryPercent: Math.round(c.memoryPercent * 100) / 100,
            memoryUsageMB: Math.round(c.memoryUsage / (1024 * 1024)),
            restartCount: getRestartCount(c.name),
            stopCount: getStopCount(c.name),
            isHealthy: !isUnhealthy(c),
            lastUpdated: c.lastUpdated.toISOString(),
        })),
    };
}


export async function getContainerMetrics(ctx: Context): Promise<void> {
    const subdomain = ctx.params.subdomain;
    const stepParam = ctx.request.url.searchParams.get("step") || '1m';
    const author = ctx.request.url.searchParams.get("user");
    const token = ctx.request.url.searchParams.get("token");
    const provider = ctx.request.url.searchParams.get("provider");

    if (author !== await checkJWT(provider!, token!)) {
        ctx.throw(401);
    }

    const step = stepParam as TimeStep;
    const range = TIME_RANGE_PRESETS[step] || TIME_RANGE_PRESETS['1m'];

    const history = await getContainerHistory(subdomain, range);

    ctx.response.headers.set("Access-Control-Allow-Origin", "*");
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
            valueMB: Math.round(val / (1024 * 1024)),
        })),
    };
}


export async function getHealthDashboard(ctx: Context): Promise<void> {
    const author = ctx.request.url.searchParams.get("user");
    const token = ctx.request.url.searchParams.get("token");
    const provider = ctx.request.url.searchParams.get("provider");

    if (author !== await checkJWT(provider!, token!)) {
        ctx.throw(401);
    }

    const summary = await getHealthSummary();
    const monitorStatus = getMonitorStatus();

    ctx.response.headers.set("Access-Control-Allow-Origin", "*");
    ctx.response.body = {
        overview: {
            total: summary.total,
            healthy: summary.healthy,
            unhealthy: summary.unhealthy,
            healthPercent: summary.total > 0
                ? Math.round((summary.healthy / summary.total) * 100)
                : 100,
        },
        monitor: {
            running: monitorStatus.running,
            checkIntervalMs: monitorStatus.interval,
            thresholds: monitorStatus.thresholds,
        },
        unhealthyContainers: summary.containers
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
    const subdomain = ctx.params.subdomain;

    const body = await ctx.request.body().value;
    let document;
    try {
        document = typeof body === 'string' ? JSON.parse(body) : body;
    } catch {
        document = body;
    }

    const author = document?.author;
    const token = document?.token;
    const provider = document?.provider;

    if (author !== await checkJWT(provider, token)) {
        ctx.throw(401);
    }

    try {
        await restartContainer(subdomain);

        ctx.response.headers.set("Access-Control-Allow-Origin", "*");
        ctx.response.body = {
            status: "success",
            message: `Container ${subdomain} restart initiated`,
        };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = {
            status: "error",
            message: `Failed to restart ${subdomain}: ${error}`,
        };
    }
}

export async function stopContainerHandler(ctx: Context): Promise<void> {
    const subdomain = ctx.params.subdomain;

    const body = await ctx.request.body().value;
    let document;
    try {
        document = typeof body === 'string' ? JSON.parse(body) : body;
    } catch {
        document = body;
    }

    const author = document?.author;
    const token = document?.token;
    const provider = document?.provider;

    if (author !== await checkJWT(provider, token)) {
        ctx.throw(401);
    }

    try {
        await stopContainer(subdomain);

        ctx.response.headers.set("Access-Control-Allow-Origin", "*");
        ctx.response.body = {
            status: "success",
            message: `Container ${subdomain} stop initiated`,
        };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = {
            status: "error",
            message: `Failed to stop ${subdomain}: ${error}`,
        };
    }
}


export async function triggerHealthCheckHandler(ctx: Context): Promise<void> {
    const body = await ctx.request.body().value;
    let document;
    try {
        document = typeof body === 'string' ? JSON.parse(body) : body;
    } catch {
        document = body;
    }

    const ADMIN_LIST = Deno.env.get("ADMIN_LIST")?.split("|") || [];
    const author = document?.author;
    const token = document?.token;
    const provider = document?.provider;

    if (author !== await checkJWT(provider, token) || !ADMIN_LIST.includes(author)) {
        ctx.throw(401);
    }

    await triggerHealthCheck();

    ctx.response.headers.set("Access-Control-Allow-Origin", "*");
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
