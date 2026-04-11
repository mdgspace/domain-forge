import { Context } from "./dependencies.ts";
import {
    getContainerHistory,
    getContainerLogs,
    getHealthSummary,
    getUnhealthyReason,
    isUnhealthy,
    type TimeStep,
    type TimeRange,
} from "./utils/container-health.ts";
import { restartContainer, stopContainer, getRestartCount, getStopCount } from "./utils/auto-restart.ts";
import { getMonitorStatus, triggerHealthCheck } from "./health-monitor.ts";
import { checkJWT } from "./utils/jwt.ts";
import { getMaps } from "./db.ts";

const ADMIN_LIST = Deno.env.get("ADMIN_LIST")?.split("|") || [];

const TIME_RANGE_PRESETS: Record<TimeStep, TimeRange> = {
    '1s': { step: '1s', duration: '5m' },
    '15s': { step: '15s', duration: '15m' },
    '1m': { step: '1m', duration: '1h' },
    '5m': { step: '5m', duration: '6h' },
    '1h': { step: '1h', duration: '24h' },
    '1d': { step: '1d', duration: '7d' },
};


export async function getContainerLogsHandler(ctx: Context): Promise<void> {
    const subdomain = ctx.params.subdomain;
    const author = ctx.request.url.searchParams.get("user");
    const token = ctx.request.url.searchParams.get("token");
    const provider = ctx.request.url.searchParams.get("provider");

    if (author !== await checkJWT(provider!, token!)) {
        ctx.throw(401);
    }

    try {
        const logs = await getContainerLogs(subdomain);
        ctx.response.body = {
            subdomain,
            logs,
        };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = {
            status: "error",
            message: `Failed to fetch logs for ${subdomain}: ${error}`,
        };
    }
}


export async function getContainerHealth(ctx: Context): Promise<void> {
    const author = ctx.request.url.searchParams.get("user");
    const token = ctx.request.url.searchParams.get("token");
    const provider = ctx.request.url.searchParams.get("provider");

    if (author !== await checkJWT(provider!, token!)) {
        ctx.throw(401);
    }

    const summary = await getHealthSummary();
    const dbData = await getMaps(author!, ADMIN_LIST);
    const dbSubdomains = dbData.documents.map((doc: any) => doc.subdomain);

    const stats = summary.containers.map(c => ({
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
    }));

    // Identify subdomains from DB that are not in Prometheus
    for (const subdomain of dbSubdomains) {
        if (!stats.find(s => s.subdomain === subdomain)) {
            stats.push({
                name: subdomain,
                subdomain: subdomain,
                status: 'failed',
                cpuPercent: 0,
                memoryPercent: 0,
                memoryUsageMB: 0,
                restartCount: 0,
                stopCount: 0,
                isHealthy: false,
                lastUpdated: new Date().toISOString(),
            });
        }
    }

    ctx.response.body = {
        total: stats.length,
        healthy: stats.filter(s => s.isHealthy && s.status === 'running').length,
        unhealthy: stats.filter(s => !s.isHealthy || s.status !== 'running').length,
        containers: stats,
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
    const dbData = await getMaps(author!, ADMIN_LIST);
    const dbSubdomains = dbData.documents.map((doc: any) => doc.subdomain);

    const unhealthyContainers = summary.containers
        .filter(c => isUnhealthy(c))
        .map(c => ({
            name: c.name,
            subdomain: c.subdomain,
            reason: getUnhealthyReason(c),
            restartAttempts: monitorStatus.restartAttempts[c.name]?.count || 0,
        }));

    // Add failed containers from DB
    for (const subdomain of dbSubdomains) {
        if (!summary.containers.find(c => (c.subdomain || c.name) === subdomain)) {
            unhealthyContainers.push({
                name: subdomain,
                subdomain: subdomain,
                reason: 'Deployment failed (not running)',
                restartAttempts: 0,
            });
        }
    }

    ctx.response.body = {
        overview: {
            total: dbSubdomains.length,
            healthy: dbSubdomains.length - unhealthyContainers.length,
            unhealthy: unhealthyContainers.length,
            healthPercent: dbSubdomains.length > 0
                ? Math.round(((dbSubdomains.length - unhealthyContainers.length) / dbSubdomains.length) * 100)
                : 100,
        },
        monitor: {
            running: monitorStatus.running,
            checkIntervalMs: monitorStatus.interval,
            thresholds: monitorStatus.thresholds,
        },
        unhealthyContainers,
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

    ctx.response.body = {
        status: "success",
        message: "Health check triggered",
    };
}
