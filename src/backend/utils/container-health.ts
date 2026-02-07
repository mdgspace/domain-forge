export interface ContainerStats {
    containerId: string;
    name: string;
    subdomain: string;
    cpuPercent: number;
    memoryUsage: number;      
    memoryLimit: number;      
    memoryPercent: number;
    networkRxBytes: number;
    networkTxBytes: number;
    restartCount: number;
    status: ContainerStatus;
    lastUpdated: Date;
}

export type ContainerStatus = 'running' | 'exited' | 'paused' | 'unhealthy' | 'unknown';

//Time range for historical metrics 
export interface TimeRange {
    step: TimeStep;
    duration: string;  
}

export type TimeStep = '1s' | '15s' | '1m' | '5m' | '1h' | '1d';

//Health thresholds for determining unhealthy status 
export interface HealthThresholds {
    maxCpuPercent: number;      
    maxMemoryPercent: number;   
    maxRestartCount: number;    
}

//Prometheus query result structure 
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
const DEBUG = Deno.env.get('HEALTH_DEBUG') === 'true';

const DEFAULT_THRESHOLDS: HealthThresholds = {
    maxCpuPercent: 90,
    maxMemoryPercent: 85,
    maxRestartCount: 5,
};

//Execute an instant query against Prometheus
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

//Execute a range query for historical metrics
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

//Get current stats for all user containers (excludes system containers)
export async function getAllContainerStats(): Promise<ContainerStats[]> {
    // Query CPU usage rate (percentage)
    const cpuQuery = 'rate(container_cpu_usage_seconds_total{name=~".+"}[1m]) * 100';
    const cpuResult = await queryPrometheus(cpuQuery);

    // Query memory usage and limit
    const memUsageQuery = 'container_memory_usage_bytes{name=~".+"}';
    const memLimitQuery = 'container_memory_max_usage_bytes{name=~".+"}';

    const [memUsageResult, memLimitResult] = await Promise.all([
        queryPrometheus(memUsageQuery),
        queryPrometheus(memLimitQuery),
    ]);

    // Build container stats map
    const statsMap = new Map<string, Partial<ContainerStats>>();
    const now = new Date();

    // Process CPU metrics
    for (const metric of cpuResult.data?.result || []) {
        const name = metric.metric.name || metric.metric.container_name || '';
        if (isUserContainer(name)) {
            const existing = statsMap.get(name) || { name, lastUpdated: now };
            existing.cpuPercent = parseFloat(metric.value?.[1] || '0');
            existing.subdomain = extractSubdomain(name);
            existing.containerId = metric.metric.id || name;
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

    // Convert to array with defaults for missing fields
    return Array.from(statsMap.values()).map(stats => ({
        containerId: stats.containerId || stats.name || '',
        name: stats.name || '',
        subdomain: stats.subdomain || '',
        cpuPercent: stats.cpuPercent || 0,
        memoryUsage: stats.memoryUsage || 0,
        memoryLimit: stats.memoryLimit || 0,
        memoryPercent: stats.memoryPercent || 0,
        networkRxBytes: stats.networkRxBytes || 0,
        networkTxBytes: stats.networkTxBytes || 0,
        restartCount: stats.restartCount || 0,
        status: determineStatus(stats),
        lastUpdated: stats.lastUpdated || now,
    }));
}

//Get historical metrics for a specific container
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

//Check if a container is unhealthy based on thresholds
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

//Get health summary for all containers
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

//Check if container is a user-deployed container (not system)
function isUserContainer(name: string): boolean {
    // Exclude system containers
    const systemContainers = ['df_backend', 'df_frontend', 'df_prometheus', 'df_cadvisor'];
    return name.length > 0 && !systemContainers.includes(name) && !name.startsWith('k8s_');
}

//Extract subdomain from container name
function extractSubdomain(containerName: string): string {
    // Container names in Domain-Forge ARE the subdomain
    return containerName;
}

//Determine container status from available metrics
function determineStatus(stats: Partial<ContainerStats>): ContainerStatus {
    if (!stats.cpuPercent && !stats.memoryUsage) {
        return 'unknown';
    }
    // If we have metrics, container is running
    // TODO: Add health check status from Docker inspect
    return 'running';
}

//Parse duration string to seconds
function parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 3600; // Default 1h

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

//Parse time step to seconds
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
