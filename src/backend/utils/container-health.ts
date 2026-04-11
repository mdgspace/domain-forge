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

const PROMETHEUS_URL = Deno.env.get('PROMETHEUS_URL') || 'http://prometheus:9090';
const CADVISOR_URL = Deno.env.get('CADVISOR_URL') || 'http://cadvisor:8080';
const DEBUG = Deno.env.get('HEALTH_DEBUG') === 'true';

const DEFAULT_THRESHOLDS: HealthThresholds = {
    maxCpuPercent: Number(Deno.env.get('MAX_CPU_THRESHOLD')) || 90,
    maxMemoryPercent: Number(Deno.env.get('MAX_MEMORY_THRESHOLD')) || 85,
    maxRestartCount: Number(Deno.env.get('MAX_RESTART_COUNT')) || 5,
};

/**
 * Fetches the latest logs for a container from the shared /hostpipe/logs directory.
 */
export async function getContainerLogs(subdomain: string): Promise<string> {
    const logPath = `/hostpipe/logs/${subdomain}.log`;
    try {
        const content = await Deno.readTextFile(logPath);
        return content;
    } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
            return "No logs found for this subdomain.";
        }
        throw error;
    }
}

/**
 * Directly queries cadvisor REST API for detailed container information.
 */
export async function getCadvisorDetailedStats(containerName: string) {
    const url = `${CADVISOR_URL}/api/v1.3/containers/docker/${containerName}`;
    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        if (DEBUG) console.error(`[Health] Failed to fetch cadvisor stats for ${containerName}:`, error);
        return null;
    }
}


async function queryPrometheus(query: string): Promise<PrometheusResult> {
    const url = `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`;

    if (DEBUG) {
        console.log('[Health] Prometheus query:', query);
    }

    try {
        const response = await fetch(url);
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
    range: TimeRange
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
        console.log('[Health] Prometheus range query:', query, range);
    }

    try {
        const response = await fetch(url);
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


export async function getAllContainerStats(): Promise<ContainerStats[]> {
    const cpuQuery = 'rate(container_cpu_usage_seconds_total{name=~".+"}[1m]) * 100';
    const cpuResult = await queryPrometheus(cpuQuery);
    const memUsageQuery = 'container_memory_usage_bytes{name=~".+"}';
    const memLimitQuery = 'container_memory_max_usage_bytes{name=~".+"}';
    const lastSeenQuery = 'container_last_seen{name=~".+"}';

    const [memUsageResult, memLimitResult, lastSeenResult] = await Promise.all([
        queryPrometheus(memUsageQuery),
        queryPrometheus(memLimitQuery),
        queryPrometheus(lastSeenQuery),
    ]);

    const statsMap = new Map<string, Partial<ContainerStats>>();
    const now = new Date();

    // Process Last Seen metrics to identify all known containers
    for (const metric of lastSeenResult.data?.result || []) {
        const name = metric.metric.name || metric.metric.container_name || '';
        if (isUserContainer(name)) {
            const lastSeenTs = parseFloat(metric.value?.[1] || '0');
            const isAlive = (Date.now() / 1000) - lastSeenTs < 60; // Seen in last 60s
            
            const existing = statsMap.get(name) || { name, lastUpdated: now };
            existing.status = isAlive ? 'running' : 'exited';
            existing.subdomain = name;
            existing.containerId = metric.metric.id || name;
            statsMap.set(name, existing);
        }
    }

    // Process CPU metrics
    for (const metric of cpuResult.data?.result || []) {
        const name = metric.metric.name || metric.metric.container_name || '';
        if (isUserContainer(name)) {
            const existing = statsMap.get(name) || { name, lastUpdated: now };
            existing.cpuPercent = parseFloat(metric.value?.[1] || '0');
            statsMap.set(name, existing);
        }
    }

    // Process memory metrics
    for (const metric of memUsageResult.data?.result || []) {
        const name = metric.metric.name || metric.metric.container_name || '';
        if (isUserContainer(name)) {
            const existing = statsMap.get(name) || { name, lastUpdated: now };
            existing.memoryUsage = parseFloat(metric.value?.[1] || '0');
            statsMap.set(name, existing);
        }
    }

    // Process memory limit metrics
    for (const metric of memLimitResult.data?.result || []) {
        const name = metric.metric.name || metric.metric.container_name || '';
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
        status: stats.status || determineStatus(stats),
        lastUpdated: stats.lastUpdated || now,
    }));
}


export async function getContainerHistory(
    containerName: string,
    range: TimeRange
): Promise<{ cpu: [number, number][]; memory: [number, number][] }> {
    const cpuQuery = `rate(container_cpu_usage_seconds_total{name="${containerName}"}[1m]) * 100`;
    const memQuery = `container_memory_usage_bytes{name="${containerName}"}`;

    const [cpuResult, memResult] = await Promise.all([
        queryPrometheusRange(cpuQuery, range),
        queryPrometheusRange(memQuery, range),
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
        stats.status === 'exited' ||
        stats.status === 'failed'
    );
}


export async function getHealthSummary(): Promise<{
    total: number;
    healthy: number;
    unhealthy: number;
    containers: ContainerStats[];
}> {
    const containers = await getAllContainerStats();
    const unhealthyCount = containers.filter(c => isUnhealthy(c)).length;

    return {
        total: containers.length,
        healthy: containers.length - unhealthyCount,
        unhealthy: unhealthyCount,
        containers,
    };
}


function isUserContainer(name: string): boolean {
    const systemContainers = ['df_backend', 'df_frontend', 'df_prometheus', 'df_cadvisor'];
    return name.length > 0 && !systemContainers.includes(name) && !name.startsWith('k8s_');
}



function determineStatus(stats: Partial<ContainerStats>): ContainerStatus {
    if (!stats.cpuPercent && !stats.memoryUsage) {
        return 'unknown';
    }
    return 'running';
}


function parseDuration(duration: string): number {
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


function parseStep(step: TimeStep): number {
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

export function getUnhealthyReason(c: { cpuPercent: number; memoryPercent: number; restartCount: number; status: string }): string {
    const reasons: string[] = [];

    if (c.cpuPercent > 90) reasons.push(`High CPU (${c.cpuPercent.toFixed(1)}%)`);
    if (c.memoryPercent > 85) reasons.push(`High Memory (${c.memoryPercent.toFixed(1)}%)`);
    if (c.restartCount > 5) reasons.push(`Many restarts (${c.restartCount})`);
    if (c.status === 'exited') reasons.push('Container exited');
    if (c.status === 'failed') reasons.push('Deployment failed');
    if (c.status === 'unhealthy') reasons.push('Health check failed');

    return reasons.join(', ') || 'Unknown';
}
