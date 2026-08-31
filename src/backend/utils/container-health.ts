import { isSuperAdmin, getAdmins, getSuperAdmins } from "./jwt.ts";
import { getAllTenantsWithSubdomains, getSubdomainOwner } from "../db.ts";

export interface ContainerStats {
    containerId: string;
    name: string;
    subdomain: string;
    cpuPercent: number;
    memoryUsage: number;
    memoryLimit: number;
    memoryPercent: number;
    restartCount: number;
    status: ContainerStatus;
    lastUpdated: Date;
}

export type ContainerStatus = 'running' | 'exited' | 'paused' | 'unhealthy' | 'unknown';

export interface TimeRange {
    step: TimeStep;
    duration: string;
}

export type TimeStep = '1s' | '15s' | '1m' | '5m' | '1h' | '1d';

export interface HealthThresholds {
    maxCpuPercent: number;
    maxMemoryPercent: number;
    maxRestartCount: number;
}

interface PrometheusResult {
    status: 'success' | 'error';
    data: {
        resultType: 'vector' | 'matrix' | 'scalar';
        result: PrometheusMetric[];
    };
    error?: string;
}

interface PrometheusMetric {
    metric: Record<string, string>;
    value?: [number, string];
    values?: [number, string][];
}

const RAW_MIMIR_URL = Deno.env.get('MIMIR_URL') || Deno.env.get('PROMETHEUS_URL') || 'http://mimir:8080';
const PROMETHEUS_URL = RAW_MIMIR_URL.endsWith('/prometheus')
    ? RAW_MIMIR_URL
    : `${RAW_MIMIR_URL.replace(/\/$/, '')}/prometheus`;

const DEBUG = Deno.env.get('HEALTH_DEBUG') === 'true';

const DEFAULT_THRESHOLDS: HealthThresholds = {
    maxCpuPercent: Number(Deno.env.get('MAX_CPU_THRESHOLD')) || 90,
    maxMemoryPercent: Number(Deno.env.get('MAX_MEMORY_THRESHOLD')) || 85,
    maxRestartCount: Number(Deno.env.get('MAX_RESTART_COUNT')) || 5,
};

async function resolveTenantHeader(user?: string): Promise<string> {
    if (user && !isSuperAdmin(user)) {
        return user;
    }
    try {
        const dbTenants = await getAllTenantsWithSubdomains().catch(() => ({}));
        const allTenants = Array.from(
            new Set([
                ...Object.keys(dbTenants),
                ...getAdmins(),
                ...getSuperAdmins(),
            ])
        ).filter((t) => t && t !== "not verified" && t !== "anonymous");

        return allTenants.length > 0 ? allTenants.join("|") : "admin";
    } catch (_e) {
        return "admin";
    }
}

async function queryPrometheus(query: string, tenantId = "admin"): Promise<PrometheusResult> {
    const url = `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`;

    if (DEBUG) {
        console.log(`[Health] Mimir/Prometheus query [tenant: ${tenantId}]:`, query);
    }

    try {
        const response = await fetch(url, {
            headers: {
                "Accept": "application/json",
                "X-Scope-OrgID": tenantId,
            },
            signal: AbortSignal.timeout(4000),
        });
        const result = await response.json() as PrometheusResult;

        if (DEBUG) {
            console.log('[Health] Prometheus result:', JSON.stringify(result, null, 2));
        }

        return result;
    } catch (error) {
        console.error('[Health] Prometheus query failed:', error);
        return { status: 'error', data: { resultType: 'vector', result: [] }, error: String(error) };
    }
}

async function queryPrometheusRange(
    query: string,
    range: TimeRange,
    tenantId = "admin",
): Promise<PrometheusResult> {
    const now = Math.floor(Date.now() / 1000);
    const durationSeconds = parseDuration(range.duration);
    const start = now - durationSeconds;
    const stepSeconds = parseStep(range.step);

    const url = `${PROMETHEUS_URL}/api/v1/query_range?` + new URLSearchParams({
        query,
        start: String(start),
        end: String(now),
        step: String(stepSeconds),
    });

    if (DEBUG) {
        console.log(`[Health] Range query [tenant: ${tenantId}]:`, query, range);
    }

    try {
        const response = await fetch(url, {
            headers: {
                "Accept": "application/json",
                "X-Scope-OrgID": tenantId,
            },
            signal: AbortSignal.timeout(4000),
        });
        const result = await response.json() as PrometheusResult;

        if (DEBUG) {
            console.log('[Health] Range result samples:', result.data?.result?.length || 0);
        }

        return result;
    } catch (error) {
        console.error('[Health] Prometheus range query failed:', error);
        return { status: 'error', data: { resultType: 'matrix', result: [] }, error: String(error) };
    }
}

export async function getAllContainerStats(user?: string): Promise<ContainerStats[]> {
    const tenantId = await resolveTenantHeader(user);
    const cpuQuery = 'irate(container_cpu_usage_seconds_total{name=~".+"}[1m]) * 100';
    const cpuResult = await queryPrometheus(cpuQuery, tenantId);
    const memUsageQuery = 'container_memory_usage_bytes{name=~".+"}';
    const memLimitQuery = 'container_memory_max_usage_bytes{name=~".+"}';

    const [memUsageResult, memLimitResult] = await Promise.all([
        queryPrometheus(memUsageQuery, tenantId),
        queryPrometheus(memLimitQuery, tenantId),
    ]);

    const statsMap = new Map<string, Partial<ContainerStats>>();
    const now = new Date();

    // Process CPU metrics
    for (const metric of cpuResult.data?.result || []) {
        const rawName = metric.metric.name || metric.metric.container_name || '';
        const name = rawName.replace(/^\//, '');
        if (isUserContainer(name)) {
            const existing = statsMap.get(name) || { name, lastUpdated: now };
            existing.cpuPercent = parseFloat(metric.value?.[1] || '0');
            existing.subdomain = name;
            existing.containerId = metric.metric.id || name;
            statsMap.set(name, existing);
        }
    }

    // Process memory metrics
    for (const metric of memUsageResult.data?.result || []) {
        const rawName = metric.metric.name || metric.metric.container_name || '';
        const name = rawName.replace(/^\//, '');
        if (isUserContainer(name)) {
            const existing = statsMap.get(name) || { name, lastUpdated: now };
            existing.memoryUsage = parseFloat(metric.value?.[1] || '0');
            statsMap.set(name, existing);
        }
    }

    // Process memory limit metrics
    for (const metric of memLimitResult.data?.result || []) {
        const rawName = metric.metric.name || metric.metric.container_name || '';
        const name = rawName.replace(/^\//, '');
        if (isUserContainer(name)) {
            const existing = statsMap.get(name) || { name, lastUpdated: now };
            existing.memoryLimit = parseFloat(metric.value?.[1] || '0');
            if (existing.memoryUsage && existing.memoryLimit > 0) {
                existing.memoryPercent = (existing.memoryUsage / existing.memoryLimit) * 100;
            }
            statsMap.set(name, existing);
        }
    }

    return Array.from(statsMap.values()).map(stats => ({
        containerId: stats.containerId || stats.name || '',
        name: stats.name || '',
        subdomain: stats.subdomain || '',
        cpuPercent: stats.cpuPercent || 0,
        memoryUsage: stats.memoryUsage || 0,
        memoryLimit: stats.memoryLimit || 0,
        memoryPercent: stats.memoryPercent || 0,
        restartCount: stats.restartCount || 0,
        status: determineStatus(stats),
        lastUpdated: stats.lastUpdated || now,
    }));
}

export async function getContainerHistory(
    containerName: string,
    range: TimeRange,
    user?: string,
): Promise<{ cpu: [number, number][]; memory: [number, number][] }> {
    const normalizedName = containerName.replace(/^\//, '');
    let tenantId: string;
    if (user && !isSuperAdmin(user)) {
        tenantId = user;
    } else {
        const owner = await getSubdomainOwner(normalizedName).catch(() => null);
        tenantId = owner || (await resolveTenantHeader(user));
    }
    const cpuQuery = `irate(container_cpu_usage_seconds_total{name=~"^/?${normalizedName}$"}[1m]) * 100`;
    const memQuery = `container_memory_usage_bytes{name=~"^/?${normalizedName}$"}`;

    const [cpuResult, memResult] = await Promise.all([
        queryPrometheusRange(cpuQuery, range, tenantId),
        queryPrometheusRange(memQuery, range, tenantId),
    ]);

    const cpuData = cpuResult.data?.result?.[0]?.values?.map(
        ([ts, val]) => [ts * 1000, parseFloat(val)] as [number, number]
    ) || [];

    const memData = memResult.data?.result?.[0]?.values?.map(
        ([ts, val]) => [ts * 1000, parseFloat(val)] as [number, number]
    ) || [];

    return { cpu: cpuData, memory: memData };
}

export function isUnhealthy(
    stats: ContainerStats,
    thresholds: HealthThresholds = DEFAULT_THRESHOLDS
): boolean {
    return (
        stats.cpuPercent > thresholds.maxCpuPercent ||
        stats.memoryPercent > thresholds.maxMemoryPercent ||
        stats.restartCount > thresholds.maxRestartCount ||
        stats.status === 'unhealthy' ||
        stats.status === 'exited'
    );
}

export async function getHealthSummary(user?: string): Promise<{
    total: number;
    healthy: number;
    unhealthy: number;
    containers: ContainerStats[];
}> {
    const containers = await getAllContainerStats(user);
    const unhealthyCount = containers.filter(c => isUnhealthy(c)).length;

    return {
        total: containers.length,
        healthy: containers.length - unhealthyCount,
        unhealthy: unhealthyCount,
        containers,
    };
}

export function isUserContainer(name: string): boolean {
    if (!name) return false;
    if (/^[0-9a-f]{12,64}$/i.test(name)) return false;

    // Use exact and anchored system pattern matching to avoid false positives
    const normalized = name.replace(/^\//, "").toLowerCase();
    const systemPattern = /^(df_.*|docker[-_]df_.*|domain[-_]forge[-_].*|k8s_.*|(cadvisor|prometheus|mimir|loki|alloy|grafana|traefik|caddy)([-_]\d+)?)$/i;

    return !systemPattern.test(normalized);
}

function determineStatus(stats: Partial<ContainerStats>): ContainerStatus {
    if (!stats.cpuPercent && !stats.memoryUsage) {
        return 'unknown';
    }
    return 'running';
}

export function parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 3600;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
        case 's': return value;
        case 'm': return value * 60;
        case 'h': return value * 3600;
        case 'd': return value * 86400;
        default: return 3600;
    }
}

export function parseStep(step: TimeStep): number {
    switch (step) {
        case '1s': return 1;
        case '15s': return 15;
        case '1m': return 60;
        case '5m': return 300;
        case '1h': return 3600;
        case '1d': return 86400;
        default: return 60;
    }
}
