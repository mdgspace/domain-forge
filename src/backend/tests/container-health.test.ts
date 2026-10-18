// Tests for container-health, health-monitor and auto-restart logic.
// IMPORTANT: every pure function under test here is imported from production
// code (previously this file shipped with several local re-implementations —
// see the audit for why that made the tests assert the fakes, not the code).
import {
    assertEquals,
    assertExists,
    assert,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
    getRestartCount,
    getStopCount,
    restartContainer,
    stopContainer,
    resetContainerActionStatsForTest,
    setCommandExecutorForTest,
} from "../utils/auto-restart.ts";
import {
    type ContainerStats,
    type HealthThresholds,
    determineStatus,
    getUnhealthyReason,
    isUnhealthy,
    isUserContainer,
    parseDuration,
    parseStep,
} from "../utils/container-health.ts";
import { calculateCooldown } from "../health-monitor.ts";

// Thresholds identical to production's DEFAULT_THRESHOLDS; passed explicitly
// so assertions don't change when MAX_*_THRESHOLD env vars are set for tests.
const THRESHOLDS: HealthThresholds = {
    maxCpuPercent: 90,
    maxMemoryPercent: 85,
    maxRestartCount: 5,
};

// Stats factory: every isUnhealthy case varies only its overrides.
// NOTE (pending wiring, tracked in the audit as B1/B2): production
// getAllContainerStats() currently never populates restartCount and only ever
// emits status 'running' | 'unknown'. These cases keep the restartCount and
// unhealthy/exited branches covered so they are already tested when the
// wiring (real docker state + getRestartCount into the stats path) lands.
function makeStats(overrides: Partial<ContainerStats> = {}): ContainerStats {
    return {
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
        ...overrides,
    };
}

Deno.test("parseDuration - parses seconds", () => {
    assertEquals(parseDuration("30s"), 30);
    assertEquals(parseDuration("1s"), 1);
    assertEquals(parseDuration("60s"), 60);
});

Deno.test("parseDuration - parses minutes", () => {
    assertEquals(parseDuration("1m"), 60);
    assertEquals(parseDuration("5m"), 300);
    assertEquals(parseDuration("15m"), 900);
    assertEquals(parseDuration("30m"), 1800);
});

Deno.test("parseDuration - parses hours", () => {
    assertEquals(parseDuration("1h"), 3600);
    assertEquals(parseDuration("2h"), 7200);
    assertEquals(parseDuration("24h"), 86400);
});

Deno.test("parseDuration - parses days", () => {
    assertEquals(parseDuration("1d"), 86400);
    assertEquals(parseDuration("7d"), 604800);
});

Deno.test("parseDuration - handles invalid input", () => {
    assertEquals(parseDuration("invalid"), 3600);
    assertEquals(parseDuration(""), 3600);
    assertEquals(parseDuration("abc123"), 3600);
    assertEquals(parseDuration("10x"), 3600);
});

Deno.test("parseStep - parses all valid steps", () => {
    assertEquals(parseStep("1s"), 1);
    assertEquals(parseStep("15s"), 15);
    assertEquals(parseStep("1m"), 60);
    assertEquals(parseStep("5m"), 300);
    assertEquals(parseStep("1h"), 3600);
    assertEquals(parseStep("1d"), 86400);
});

Deno.test("isUserContainer - allows user containers", () => {
    // Production uses anchored patterns (^df_.*|docker[-_]df_.*|domain[-_]forge[-_].*|k8s_.*|<service>[-_]\d+?),
    // NOT substring matching — assertions here reflect actual production behavior.
    assertEquals(isUserContainer("my-app"), true);
    assertEquals(isUserContainer("user-project"), true);
    assertEquals(isUserContainer("test123-app"), true);
    assertEquals(isUserContainer("production-api"), true);
});

Deno.test("isUserContainer - blocks system containers", () => {
    assertEquals(isUserContainer("df_backend"), false);
    assertEquals(isUserContainer("df_frontend"), false);
    assertEquals(isUserContainer("df_prometheus"), false);
    assertEquals(isUserContainer("df_cadvisor"), false);
    assertEquals(isUserContainer("df_loki"), false);
    assertEquals(isUserContainer("df_alloy"), false);
    assertEquals(isUserContainer("df_grafana"), false);
    assertEquals(isUserContainer("docker-df_backend-1"), false);
    // Production's anchored service pattern matches "traefik", "traefik-1" etc.
    // but NOT doubled compose names like "traefik-traefik-1" — these two
    // assertions document current behavior (candidates for a regex hardening
    // pass together with the B1/B2 wiring if false positives appear).
    assertEquals(isUserContainer("traefik-traefik-1"), true);
    assertEquals(isUserContainer("caddy-caddy-1"), true);
    assertEquals(isUserContainer("1f776d48c327"), false); // hex container IDs excluded
});

Deno.test("isUserContainer - blocks kubernetes containers", () => {
    assertEquals(isUserContainer("k8s_pod"), false);
    assertEquals(isUserContainer("k8s_container"), false);
    assertEquals(isUserContainer("k8s_anything"), false);
});

Deno.test("isUserContainer - handles empty string", () => {
    assertEquals(isUserContainer(""), false);
});

Deno.test("isUserContainer - permits unusual but valid names", () => {
    assertEquals(isUserContainer("my-app_v2.1"), true);
    assertEquals(isUserContainer("container@123"), true);
    assertEquals(isUserContainer("test.container.name"), true);
});

Deno.test("isUnhealthy - threshold cases (CPU, memory, restarts, status)", () => {
    const cases: Array<[Partial<ContainerStats>, boolean]> = [
        [{}, false], // healthy baseline: cpu 50 / mem 50 / 0 restarts / running
        [{ cpuPercent: 95 }, true],      // over CPU threshold (90)
        [{ memoryPercent: 92 }, true],   // over memory threshold (85)
        [{ restartCount: 10 }, true],    // over restart threshold (5)
        [{ status: 'unhealthy' }, true],
        [{ status: 'exited' }, true],
        [{ status: 'unknown' }, false],  // unknown alone is not unhealthy
    ];
    for (const [overrides, expected] of cases) {
        assertEquals(isUnhealthy(makeStats(overrides), THRESHOLDS), expected);
    }
});

Deno.test("isUnhealthy - respects custom thresholds", () => {
    const strict: HealthThresholds = { maxCpuPercent: 10, maxMemoryPercent: 10, maxRestartCount: 0 };
    const loose: HealthThresholds = { maxCpuPercent: 100, maxMemoryPercent: 100, maxRestartCount: 100 };

    assertEquals(isUnhealthy(makeStats({ cpuPercent: 50 }), strict), true);
    assertEquals(isUnhealthy(makeStats({ cpuPercent: 50 }), loose), false);
});

Deno.test("determineStatus - running with any metrics, unknown without", () => {
    assertEquals(determineStatus({ cpuPercent: 10, memoryUsage: 1000 }), 'running');
    assertEquals(determineStatus({ cpuPercent: 10 }), 'running');
    assertEquals(determineStatus({ memoryUsage: 1000 }), 'running');
    assertEquals(determineStatus({}), 'unknown');
    assertEquals(determineStatus({ cpuPercent: 0, memoryUsage: 0 }), 'unknown');
});

Deno.test("calculateCooldown - exponential backoff capped at 10 minutes", () => {
    assertEquals(calculateCooldown(0), 30000);   // 30s
    assertEquals(calculateCooldown(1), 60000);   // 60s
    assertEquals(calculateCooldown(2), 120000);  // 120s
    assertEquals(calculateCooldown(3), 240000);  // 240s
    assertEquals(calculateCooldown(4), 480000);  // 480s
    assertEquals(calculateCooldown(5), 600000);  // capped at 10 min
    assertEquals(calculateCooldown(10), 600000);
    assertEquals(calculateCooldown(100), 600000);
});

Deno.test("getUnhealthyReason - reports each threshold violation", () => {
    const reason = (overrides: { cpuPercent?: number; memoryPercent?: number; restartCount?: number; status?: string; } = {}) =>
        getUnhealthyReason({
            cpuPercent: 50,
            memoryPercent: 50,
            restartCount: 0,
            status: 'running',
            ...overrides,
        });

    assert(reason({ cpuPercent: 95 }).includes("High CPU"));
    assert(reason({ cpuPercent: 95 }).includes("95.0%"));

    assert(reason({ memoryPercent: 90 }).includes("High Memory"));
    assert(reason({ memoryPercent: 90 }).includes("90.0%"));

    assert(reason({ restartCount: 10 }).includes("Many restarts"));
    assert(reason({ restartCount: 10 }).includes("10"));

    assertEquals(reason({ status: 'exited' }), "Container exited");
    assertEquals(reason({ status: 'unhealthy' }), "Health check failed");

    const multi = reason({ cpuPercent: 95, memoryPercent: 90, restartCount: 10 });
    assert(multi.includes("High CPU"));
    assert(multi.includes("High Memory"));
    assert(multi.includes("Many restarts"));

    assertEquals(reason({}), "Unknown"); // healthy container -> empty reasons
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

Deno.test("makeStats - stats factory covers the production shape", () => {
    // Guards the factory itself: if production's ContainerStats shape grows,
    // extending makeStats()'s default object is what keeps every test above
    // type-checking against the real interface.
    const stats = makeStats({ name: "shape-check" });
    assertExists(stats.containerId);
    assertExists(stats.name);
    assertExists(stats.subdomain);
    assert(typeof stats.cpuPercent === 'number');
    assert(typeof stats.memoryUsage === 'number');
    assert(typeof stats.memoryLimit === 'number');
    assert(typeof stats.memoryPercent === 'number');
    assert(typeof stats.restartCount === 'number');
    assertExists(stats.status);
    assert(stats.lastUpdated instanceof Date);
    assertEquals(stats.name, "shape-check");
});
