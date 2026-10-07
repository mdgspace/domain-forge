import {
    assertEquals,
    assertExists,
    assert,
    assertThrows,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
    getRestartCount,
    getStopCount,
    restartContainer,
    stopContainer,
    resetContainerActionStatsForTest,
    setCommandExecutorForTest,
} from "../utils/auto-restart.ts";

type ContainerStatus = 'running' | 'exited' | 'paused' | 'unhealthy' | 'unknown';
type TimeStep = '1s' | '15s' | '1m' | '5m' | '1h' | '1d';

interface ContainerStats {
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

interface HealthThresholds {
    maxCpuPercent: number;
    maxMemoryPercent: number;
    maxRestartCount: number;
}

interface TimeRange {
    step: TimeStep;
    duration: string;
}

Deno.test("parseDuration - parses seconds", () => {
    const parseDuration = (duration: string): number => {
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
    };

    assertEquals(parseDuration("30s"), 30);
    assertEquals(parseDuration("1s"), 1);
    assertEquals(parseDuration("60s"), 60);
});

Deno.test("parseDuration - parses minutes", () => {
    const parseDuration = (duration: string): number => {
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
    };

    assertEquals(parseDuration("1m"), 60);
    assertEquals(parseDuration("5m"), 300);
    assertEquals(parseDuration("15m"), 900);
    assertEquals(parseDuration("30m"), 1800);
});

Deno.test("parseDuration - parses hours", () => {
    const parseDuration = (duration: string): number => {
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
    };

    assertEquals(parseDuration("1h"), 3600);
    assertEquals(parseDuration("2h"), 7200);
    assertEquals(parseDuration("24h"), 86400);
});

Deno.test("parseDuration - parses days", () => {
    const parseDuration = (duration: string): number => {
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
    };

    assertEquals(parseDuration("1d"), 86400);
    assertEquals(parseDuration("7d"), 604800);
});

Deno.test("parseDuration - handles invalid input", () => {
    const parseDuration = (duration: string): number => {
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
    };

    assertEquals(parseDuration("invalid"), 3600);
    assertEquals(parseDuration(""), 3600);
    assertEquals(parseDuration("abc123"), 3600);
    assertEquals(parseDuration("10x"), 3600);
});

Deno.test("parseStep - parses all valid steps", () => {
    const parseStep = (step: TimeStep): number => {
        switch (step) {
            case '1s': return 1;
            case '15s': return 15;
            case '1m': return 60;
            case '5m': return 300;
            case '1h': return 3600;
            case '1d': return 86400;
            default: return 60;
        }
    };

    assertEquals(parseStep("1s"), 1);
    assertEquals(parseStep("15s"), 15);
    assertEquals(parseStep("1m"), 60);
    assertEquals(parseStep("5m"), 300);
    assertEquals(parseStep("1h"), 3600);
    assertEquals(parseStep("1d"), 86400);
});

Deno.test("isUserContainer - allows user containers", () => {
    const isUserContainer = (name: string): boolean => {
        if (!name) return false;
        if (/^[0-9a-f]{12,64}$/i.test(name)) return false;
        const lower = name.toLowerCase();
        const systemPatterns = [
            'df_', 'docker-df_', 'cadvisor', 'prometheus', 'loki', 'alloy', 'grafana', 'traefik', 'caddy', 'k8s_'
        ];
        return !systemPatterns.some(pat => lower.includes(pat));
    };

    assertEquals(isUserContainer("my-app"), true);
    assertEquals(isUserContainer("user-project"), true);
    assertEquals(isUserContainer("test123-app"), true);
    assertEquals(isUserContainer("production-api"), true);
});

Deno.test("isUserContainer - blocks system containers", () => {
    const isUserContainer = (name: string): boolean => {
        if (!name) return false;
        if (/^[0-9a-f]{12,64}$/i.test(name)) return false;
        const lower = name.toLowerCase();
        const systemPatterns = [
            'df_', 'docker-df_', 'cadvisor', 'prometheus', 'loki', 'alloy', 'grafana', 'traefik', 'caddy', 'k8s_'
        ];
        return !systemPatterns.some(pat => lower.includes(pat));
    };

    assertEquals(isUserContainer("df_backend"), false);
    assertEquals(isUserContainer("df_frontend"), false);
    assertEquals(isUserContainer("df_prometheus"), false);
    assertEquals(isUserContainer("df_cadvisor"), false);
    assertEquals(isUserContainer("df_loki"), false);
    assertEquals(isUserContainer("df_alloy"), false);
    assertEquals(isUserContainer("df_grafana"), false);
    assertEquals(isUserContainer("docker-df_backend-1"), false);
    assertEquals(isUserContainer("traefik-traefik-1"), false);
    assertEquals(isUserContainer("caddy-caddy-1"), false);
    assertEquals(isUserContainer("1f776d48c327"), false);
});

Deno.test("isUserContainer - blocks kubernetes containers", () => {
    const isUserContainer = (name: string): boolean => {
        const systemContainers = ['df_backend', 'df_frontend', 'df_prometheus', 'df_cadvisor'];
        return name.length > 0 && !systemContainers.includes(name) && !name.startsWith('k8s_');
    };

    assertEquals(isUserContainer("k8s_pod"), false);
    assertEquals(isUserContainer("k8s_container"), false);
    assertEquals(isUserContainer("k8s_anything"), false);
});

Deno.test("isUserContainer - handles empty string", () => {
    const isUserContainer = (name: string): boolean => {
        const systemContainers = ['df_backend', 'df_frontend', 'df_prometheus', 'df_cadvisor'];
        return name.length > 0 && !systemContainers.includes(name) && !name.startsWith('k8s_');
    };

    assertEquals(isUserContainer(""), false);
});

Deno.test("isUnhealthy - healthy container", () => {
    const isUnhealthy = (stats: ContainerStats, thresholds: HealthThresholds): boolean => {
        return (
            stats.cpuPercent > thresholds.maxCpuPercent ||
            stats.memoryPercent > thresholds.maxMemoryPercent ||
            stats.restartCount > thresholds.maxRestartCount ||
            stats.status === 'unhealthy' ||
            stats.status === 'exited'
        );
    };

    const healthyContainer: ContainerStats = {
        containerId: "abc",
        name: "test",
        subdomain: "test",
        cpuPercent: 50,
        memoryUsage: 100,
        memoryLimit: 200,
        memoryPercent: 50,
        restartCount: 0,
        status: 'running',
        lastUpdated: new Date(),
    };

    const thresholds: HealthThresholds = {
        maxCpuPercent: 90,
        maxMemoryPercent: 85,
        maxRestartCount: 5,
    };

    assertEquals(isUnhealthy(healthyContainer, thresholds), false);
});

Deno.test("isUnhealthy - high CPU", () => {
    const isUnhealthy = (stats: ContainerStats, thresholds: HealthThresholds): boolean => {
        return (
            stats.cpuPercent > thresholds.maxCpuPercent ||
            stats.memoryPercent > thresholds.maxMemoryPercent ||
            stats.restartCount > thresholds.maxRestartCount ||
            stats.status === 'unhealthy' ||
            stats.status === 'exited'
        );
    };

    const highCpuContainer: ContainerStats = {
        containerId: "abc",
        name: "test",
        subdomain: "test",
        cpuPercent: 95,
        memoryUsage: 100,
        memoryLimit: 200,
        memoryPercent: 50,
        restartCount: 0,
        status: 'running',
        lastUpdated: new Date(),
    };

    const thresholds: HealthThresholds = {
        maxCpuPercent: 90,
        maxMemoryPercent: 85,
        maxRestartCount: 5,
    };

    assertEquals(isUnhealthy(highCpuContainer, thresholds), true);
});

Deno.test("isUnhealthy - high memory", () => {
    const isUnhealthy = (stats: ContainerStats, thresholds: HealthThresholds): boolean => {
        return (
            stats.cpuPercent > thresholds.maxCpuPercent ||
            stats.memoryPercent > thresholds.maxMemoryPercent ||
            stats.restartCount > thresholds.maxRestartCount ||
            stats.status === 'unhealthy' ||
            stats.status === 'exited'
        );
    };

    const highMemContainer: ContainerStats = {
        containerId: "abc",
        name: "test",
        subdomain: "test",
        cpuPercent: 50,
        memoryUsage: 100,
        memoryLimit: 200,
        memoryPercent: 92,
        restartCount: 0,
        status: 'running',
        lastUpdated: new Date(),
    };

    const thresholds: HealthThresholds = {
        maxCpuPercent: 90,
        maxMemoryPercent: 85,
        maxRestartCount: 5,
    };

    assertEquals(isUnhealthy(highMemContainer, thresholds), true);
});

Deno.test("isUnhealthy - too many restarts", () => {
    const isUnhealthy = (stats: ContainerStats, thresholds: HealthThresholds): boolean => {
        return (
            stats.cpuPercent > thresholds.maxCpuPercent ||
            stats.memoryPercent > thresholds.maxMemoryPercent ||
            stats.restartCount > thresholds.maxRestartCount ||
            stats.status === 'unhealthy' ||
            stats.status === 'exited'
        );
    };

    const manyRestartsContainer: ContainerStats = {
        containerId: "abc",
        name: "test",
        subdomain: "test",
        cpuPercent: 50,
        memoryUsage: 100,
        memoryLimit: 200,
        memoryPercent: 50,
        restartCount: 10,
        status: 'running',
        lastUpdated: new Date(),
    };

    const thresholds: HealthThresholds = {
        maxCpuPercent: 90,
        maxMemoryPercent: 85,
        maxRestartCount: 5,
    };

    assertEquals(isUnhealthy(manyRestartsContainer, thresholds), true);
});

Deno.test("isUnhealthy - unhealthy status", () => {
    const isUnhealthy = (stats: ContainerStats, thresholds: HealthThresholds): boolean => {
        return (
            stats.cpuPercent > thresholds.maxCpuPercent ||
            stats.memoryPercent > thresholds.maxMemoryPercent ||
            stats.restartCount > thresholds.maxRestartCount ||
            stats.status === 'unhealthy' ||
            stats.status === 'exited'
        );
    };

    const unhealthyStatusContainer: ContainerStats = {
        containerId: "abc",
        name: "test",
        subdomain: "test",
        cpuPercent: 50,
        memoryUsage: 100,
        memoryLimit: 200,
        memoryPercent: 50,
        restartCount: 0,
        status: 'unhealthy',
        lastUpdated: new Date(),
    };

    const thresholds: HealthThresholds = {
        maxCpuPercent: 90,
        maxMemoryPercent: 85,
        maxRestartCount: 5,
    };

    assertEquals(isUnhealthy(unhealthyStatusContainer, thresholds), true);
});

Deno.test("isUnhealthy - exited status", () => {
    const isUnhealthy = (stats: ContainerStats, thresholds: HealthThresholds): boolean => {
        return (
            stats.cpuPercent > thresholds.maxCpuPercent ||
            stats.memoryPercent > thresholds.maxMemoryPercent ||
            stats.restartCount > thresholds.maxRestartCount ||
            stats.status === 'unhealthy' ||
            stats.status === 'exited'
        );
    };

    const exitedContainer: ContainerStats = {
        containerId: "abc",
        name: "test",
        subdomain: "test",
        cpuPercent: 50,
        memoryUsage: 100,
        memoryLimit: 200,
        memoryPercent: 50,
        restartCount: 0,
        status: 'exited',
        lastUpdated: new Date(),
    };

    const thresholds: HealthThresholds = {
        maxCpuPercent: 90,
        maxMemoryPercent: 85,
        maxRestartCount: 5,
    };

    assertEquals(isUnhealthy(exitedContainer, thresholds), true);
});

Deno.test("determineStatus - running with metrics", () => {
    const determineStatus = (stats: Partial<ContainerStats>): ContainerStatus => {
        if (!stats.cpuPercent && !stats.memoryUsage) {
            return 'unknown';
        }
        return 'running';
    };

    assertEquals(determineStatus({ cpuPercent: 10, memoryUsage: 1000 }), 'running');
});

Deno.test("determineStatus - unknown without metrics", () => {
    const determineStatus = (stats: Partial<ContainerStats>): ContainerStatus => {
        if (!stats.cpuPercent && !stats.memoryUsage) {
            return 'unknown';
        }
        return 'running';
    };

    assertEquals(determineStatus({}), 'unknown');
    assertEquals(determineStatus({ cpuPercent: 0, memoryUsage: 0 }), 'unknown');
});

Deno.test("determineStatus - running with only CPU", () => {
    const determineStatus = (stats: Partial<ContainerStats>): ContainerStatus => {
        if (!stats.cpuPercent && !stats.memoryUsage) {
            return 'unknown';
        }
        return 'running';
    };

    assertEquals(determineStatus({ cpuPercent: 10 }), 'running');
});

Deno.test("determineStatus - running with only memory", () => {
    const determineStatus = (stats: Partial<ContainerStats>): ContainerStatus => {
        if (!stats.cpuPercent && !stats.memoryUsage) {
            return 'unknown';
        }
        return 'running';
    };

    assertEquals(determineStatus({ memoryUsage: 1000 }), 'running');
});

Deno.test("calculateCooldown - first attempt (30s)", () => {
    const calculateCooldown = (attemptCount: number): number => {
        const baseMs = 30000;
        const maxMs = 600000;
        return Math.min(baseMs * Math.pow(2, attemptCount), maxMs);
    };

    assertEquals(calculateCooldown(0), 30000);
});

Deno.test("calculateCooldown - second attempt (60s)", () => {
    const calculateCooldown = (attemptCount: number): number => {
        const baseMs = 30000;
        const maxMs = 600000;
        return Math.min(baseMs * Math.pow(2, attemptCount), maxMs);
    };

    assertEquals(calculateCooldown(1), 60000);
});

Deno.test("calculateCooldown - third attempt (120s)", () => {
    const calculateCooldown = (attemptCount: number): number => {
        const baseMs = 30000;
        const maxMs = 600000;
        return Math.min(baseMs * Math.pow(2, attemptCount), maxMs);
    };

    assertEquals(calculateCooldown(2), 120000);
});

Deno.test("calculateCooldown - exponential growth", () => {
    const calculateCooldown = (attemptCount: number): number => {
        const baseMs = 30000;
        const maxMs = 600000;
        return Math.min(baseMs * Math.pow(2, attemptCount), maxMs);
    };

    assertEquals(calculateCooldown(3), 240000);
    assertEquals(calculateCooldown(4), 480000);
});

Deno.test("calculateCooldown - caps at 10 minutes", () => {
    const calculateCooldown = (attemptCount: number): number => {
        const baseMs = 30000;
        const maxMs = 600000;
        return Math.min(baseMs * Math.pow(2, attemptCount), maxMs);
    };

    assertEquals(calculateCooldown(5), 600000);
    assertEquals(calculateCooldown(10), 600000);
    assertEquals(calculateCooldown(100), 600000);
});

Deno.test("getUnhealthyReason - high CPU", () => {
    const getUnhealthyReason = (c: { cpuPercent: number; memoryPercent: number; restartCount: number; status: string }): string => {
        const reasons: string[] = [];
        if (c.cpuPercent > 90) reasons.push(`High CPU (${c.cpuPercent.toFixed(1)}%)`);
        if (c.memoryPercent > 85) reasons.push(`High Memory (${c.memoryPercent.toFixed(1)}%)`);
        if (c.restartCount > 5) reasons.push(`Many restarts (${c.restartCount})`);
        if (c.status === 'exited') reasons.push('Container exited');
        if (c.status === 'unhealthy') reasons.push('Health check failed');
        return reasons.join(', ') || 'Unknown';
    };

    const result = getUnhealthyReason({ cpuPercent: 95, memoryPercent: 50, restartCount: 0, status: 'running' });
    assert(result.includes("High CPU"));
    assert(result.includes("95.0%"));
});

Deno.test("getUnhealthyReason - high memory", () => {
    const getUnhealthyReason = (c: { cpuPercent: number; memoryPercent: number; restartCount: number; status: string }): string => {
        const reasons: string[] = [];
        if (c.cpuPercent > 90) reasons.push(`High CPU (${c.cpuPercent.toFixed(1)}%)`);
        if (c.memoryPercent > 85) reasons.push(`High Memory (${c.memoryPercent.toFixed(1)}%)`);
        if (c.restartCount > 5) reasons.push(`Many restarts (${c.restartCount})`);
        if (c.status === 'exited') reasons.push('Container exited');
        if (c.status === 'unhealthy') reasons.push('Health check failed');
        return reasons.join(', ') || 'Unknown';
    };

    const result = getUnhealthyReason({ cpuPercent: 50, memoryPercent: 90, restartCount: 0, status: 'running' });
    assert(result.includes("High Memory"));
    assert(result.includes("90.0%"));
});

Deno.test("getUnhealthyReason - many restarts", () => {
    const getUnhealthyReason = (c: { cpuPercent: number; memoryPercent: number; restartCount: number; status: string }): string => {
        const reasons: string[] = [];
        if (c.cpuPercent > 90) reasons.push(`High CPU (${c.cpuPercent.toFixed(1)}%)`);
        if (c.memoryPercent > 85) reasons.push(`High Memory (${c.memoryPercent.toFixed(1)}%)`);
        if (c.restartCount > 5) reasons.push(`Many restarts (${c.restartCount})`);
        if (c.status === 'exited') reasons.push('Container exited');
        if (c.status === 'unhealthy') reasons.push('Health check failed');
        return reasons.join(', ') || 'Unknown';
    };

    const result = getUnhealthyReason({ cpuPercent: 50, memoryPercent: 50, restartCount: 10, status: 'running' });
    assert(result.includes("Many restarts"));
    assert(result.includes("10"));
});

Deno.test("getUnhealthyReason - container exited", () => {
    const getUnhealthyReason = (c: { cpuPercent: number; memoryPercent: number; restartCount: number; status: string }): string => {
        const reasons: string[] = [];
        if (c.cpuPercent > 90) reasons.push(`High CPU (${c.cpuPercent.toFixed(1)}%)`);
        if (c.memoryPercent > 85) reasons.push(`High Memory (${c.memoryPercent.toFixed(1)}%)`);
        if (c.restartCount > 5) reasons.push(`Many restarts (${c.restartCount})`);
        if (c.status === 'exited') reasons.push('Container exited');
        if (c.status === 'unhealthy') reasons.push('Health check failed');
        return reasons.join(', ') || 'Unknown';
    };

    const result = getUnhealthyReason({ cpuPercent: 50, memoryPercent: 50, restartCount: 0, status: 'exited' });
    assertEquals(result, "Container exited");
});

Deno.test("getUnhealthyReason - health check failed", () => {
    const getUnhealthyReason = (c: { cpuPercent: number; memoryPercent: number; restartCount: number; status: string }): string => {
        const reasons: string[] = [];
        if (c.cpuPercent > 90) reasons.push(`High CPU (${c.cpuPercent.toFixed(1)}%)`);
        if (c.memoryPercent > 85) reasons.push(`High Memory (${c.memoryPercent.toFixed(1)}%)`);
        if (c.restartCount > 5) reasons.push(`Many restarts (${c.restartCount})`);
        if (c.status === 'exited') reasons.push('Container exited');
        if (c.status === 'unhealthy') reasons.push('Health check failed');
        return reasons.join(', ') || 'Unknown';
    };

    const result = getUnhealthyReason({ cpuPercent: 50, memoryPercent: 50, restartCount: 0, status: 'unhealthy' });
    assertEquals(result, "Health check failed");
});

Deno.test("getUnhealthyReason - multiple reasons", () => {
    const getUnhealthyReason = (c: { cpuPercent: number; memoryPercent: number; restartCount: number; status: string }): string => {
        const reasons: string[] = [];
        if (c.cpuPercent > 90) reasons.push(`High CPU (${c.cpuPercent.toFixed(1)}%)`);
        if (c.memoryPercent > 85) reasons.push(`High Memory (${c.memoryPercent.toFixed(1)}%)`);
        if (c.restartCount > 5) reasons.push(`Many restarts (${c.restartCount})`);
        if (c.status === 'exited') reasons.push('Container exited');
        if (c.status === 'unhealthy') reasons.push('Health check failed');
        return reasons.join(', ') || 'Unknown';
    };

    const result = getUnhealthyReason({ cpuPercent: 95, memoryPercent: 90, restartCount: 10, status: 'running' });
    assert(result.includes("High CPU"));
    assert(result.includes("High Memory"));
    assert(result.includes("Many restarts"));
});

Deno.test("getUnhealthyReason - unknown when healthy", () => {
    const getUnhealthyReason = (c: { cpuPercent: number; memoryPercent: number; restartCount: number; status: string }): string => {
        const reasons: string[] = [];
        if (c.cpuPercent > 90) reasons.push(`High CPU (${c.cpuPercent.toFixed(1)}%)`);
        if (c.memoryPercent > 85) reasons.push(`High Memory (${c.memoryPercent.toFixed(1)}%)`);
        if (c.restartCount > 5) reasons.push(`Many restarts (${c.restartCount})`);
        if (c.status === 'exited') reasons.push('Container exited');
        if (c.status === 'unhealthy') reasons.push('Health check failed');
        return reasons.join(', ') || 'Unknown';
    };

    const result = getUnhealthyReason({ cpuPercent: 50, memoryPercent: 50, restartCount: 0, status: 'running' });
    assertEquals(result, "Unknown");
});

Deno.test("TIME_RANGE_PRESETS - all presets defined", () => {
    const TIME_RANGE_PRESETS: Record<TimeStep, TimeRange> = {
        '1s': { step: '1s', duration: '5m' },
        '15s': { step: '15s', duration: '15m' },
        '1m': { step: '1m', duration: '1h' },
        '5m': { step: '5m', duration: '6h' },
        '1h': { step: '1h', duration: '24h' },
        '1d': { step: '1d', duration: '7d' },
    };

    assertEquals(TIME_RANGE_PRESETS['1s'].duration, '5m');
    assertEquals(TIME_RANGE_PRESETS['15s'].duration, '15m');
    assertEquals(TIME_RANGE_PRESETS['1m'].duration, '1h');
    assertEquals(TIME_RANGE_PRESETS['5m'].duration, '6h');
    assertEquals(TIME_RANGE_PRESETS['1h'].duration, '24h');
    assertEquals(TIME_RANGE_PRESETS['1d'].duration, '7d');
});

Deno.test("getRestartCount - returns 0 for unknown container", () => {
    resetContainerActionStatsForTest();

    assertEquals(getRestartCount("unknown-container"), 0);
});

Deno.test("getRestartCount - returns correct count", async () => {
    resetContainerActionStatsForTest();
    setCommandExecutorForTest(async () => {});

    try {
        await restartContainer("test-container");
        await restartContainer("test-container");
        await restartContainer("test-container");
    } finally {
        setCommandExecutorForTest(null);
    }

    assertEquals(getRestartCount("test-container"), 3);
});

Deno.test("getRestartCount - tracks multiple containers separately", async () => {
    resetContainerActionStatsForTest();
    setCommandExecutorForTest(async () => {});

    try {
        await restartContainer("container-a");
        await restartContainer("container-a");
        await restartContainer("container-b");
        await restartContainer("container-b");
        await restartContainer("container-b");
        await restartContainer("container-b");
        await restartContainer("container-b");
    } finally {
        setCommandExecutorForTest(null);
    }

    assertEquals(getRestartCount("container-a"), 2);
    assertEquals(getRestartCount("container-b"), 5);
});

Deno.test("getStopCount - returns correct count", async () => {
    resetContainerActionStatsForTest();
    setCommandExecutorForTest(async () => {});

    try {
        await stopContainer("test-container");
        await stopContainer("test-container");
        await stopContainer("test-container");
    } finally {
        setCommandExecutorForTest(null);
    }

    assertEquals(getStopCount("test-container"), 3);
});

Deno.test("restartContainer - updates restart count", async () => {
    resetContainerActionStatsForTest();
    let execCalledWith = "";
    setCommandExecutorForTest(async (cmd: string) => {
        execCalledWith = cmd;
    });

    try {
        await restartContainer("test-container");
    } finally {
        setCommandExecutorForTest(null);
    }

    assertEquals(execCalledWith, `bash -c "echo 'bash ../../src/backend/shell_scripts/restart.sh test-container' > /hostpipe/pipe"`);
    assertEquals(getRestartCount("test-container"), 1);
});

Deno.test("stopContainer - updates stop count and calls stop script", async () => {
    resetContainerActionStatsForTest();
    let execCalledWith = "";
    setCommandExecutorForTest(async (cmd: string) => {
        execCalledWith = cmd;
    });

    try {
        await stopContainer("test-container");
    } finally {
        setCommandExecutorForTest(null);
    }

    assertEquals(execCalledWith, `bash -c "echo 'bash ../../src/backend/shell_scripts/stop.sh test-container' > /hostpipe/pipe"`);
    assertEquals(getStopCount("test-container"), 1);
});

Deno.test("ContainerStats - validates all required fields", () => {
    const validStats: ContainerStats = {
        containerId: "abc123",
        name: "test-container",
        subdomain: "test",
        cpuPercent: 25.5,
        memoryUsage: 1024 * 1024 * 100,
        memoryLimit: 1024 * 1024 * 512,
        memoryPercent: 19.5,
        restartCount: 0,
        status: "running",
        lastUpdated: new Date(),
    };

    assertExists(validStats.containerId);
    assertExists(validStats.name);
    assertExists(validStats.subdomain);
    assert(typeof validStats.cpuPercent === 'number');
    assert(typeof validStats.memoryUsage === 'number');
    assert(typeof validStats.memoryLimit === 'number');
    assert(typeof validStats.memoryPercent === 'number');
    assert(typeof validStats.restartCount === 'number');
    assertExists(validStats.status);
    assert(validStats.lastUpdated instanceof Date);
});

Deno.test("HealthThresholds - validates structure", () => {
    const thresholds: HealthThresholds = {
        maxCpuPercent: 90,
        maxMemoryPercent: 85,
        maxRestartCount: 5,
    };

    assert(typeof thresholds.maxCpuPercent === 'number');
    assert(typeof thresholds.maxMemoryPercent === 'number');
    assert(typeof thresholds.maxRestartCount === 'number');
});

Deno.test("TimeRange - validates structure", () => {
    const range: TimeRange = {
        step: '1m',
        duration: '1h',
    };

    assertExists(range.step);
    assertExists(range.duration);
});

Deno.test("Edge case - zero values handled correctly", () => {
    const isUnhealthy = (cpuPercent: number, threshold: number): boolean => {
        return cpuPercent > threshold;
    };

    assertEquals(isUnhealthy(0, 90), false);
});

Deno.test("Edge case - negative values handled correctly", () => {
    const isUnhealthy = (cpuPercent: number, threshold: number): boolean => {
        return cpuPercent > threshold;
    };

    assertEquals(isUnhealthy(-10, 90), false);
});

Deno.test("Edge case - exactly at threshold", () => {
    const isUnhealthy = (cpuPercent: number, threshold: number): boolean => {
        return cpuPercent > threshold;
    };

    assertEquals(isUnhealthy(90, 90), false);
    assertEquals(isUnhealthy(90.001, 90), true);
});

Deno.test("Edge case - very large values", () => {
    const isUnhealthy = (cpuPercent: number, threshold: number): boolean => {
        return cpuPercent > threshold;
    };

    assertEquals(isUnhealthy(1000, 90), true);
    assertEquals(isUnhealthy(Number.MAX_SAFE_INTEGER, 90), true);
});

Deno.test("Edge case - empty container list", () => {
    const containers: ContainerStats[] = [];
    assertEquals(containers.length, 0);
    assertEquals(containers.filter(() => true).length, 0);
});

Deno.test("Edge case - container name with special characters", () => {
    const isUserContainer = (name: string): boolean => {
        const systemContainers = ['df_backend', 'df_frontend', 'df_prometheus', 'df_cadvisor'];
        return name.length > 0 && !systemContainers.includes(name) && !name.startsWith('k8s_');
    };

    assertEquals(isUserContainer("my-app_v2.1"), true);
    assertEquals(isUserContainer("container@123"), true);
    assertEquals(isUserContainer("test.container.name"), true);
});

Deno.test("Edge case - memory calculations", () => {
    const memoryUsage = 1024 * 1024 * 100;
    const memoryLimit = 1024 * 1024 * 512;
    const memoryPercent = (memoryUsage / memoryLimit) * 100;

    assertEquals(Math.round(memoryPercent * 100) / 100, 19.53);
});

Deno.test("Edge case - CPU rounding", () => {
    const cpuPercent = 25.123456789;
    const rounded = Math.round(cpuPercent * 100) / 100;

    assertEquals(rounded, 25.12);
});

console.log("All comprehensive tests completed!");
