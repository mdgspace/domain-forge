<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { Terminal, RefreshCw, X, AlertCircle } from 'lucide-vue-next';

const props = defineProps({
  subdomain: String,
  user: String
});

const emit = defineEmits(['close-modal']);

const logs = ref("Loading logs...");
const error = ref(null);
const autoRefresh = ref(true);
const logType = ref("all");
let refreshInterval = null;

const fetchLogs = async () => {
  try {
    const backend = import.meta.env.VITE_APP_BACKEND;
    const token = localStorage.getItem("JWTUser") || "";
    const provider = localStorage.getItem("provider") || "github";

    const baseUrl = backend.replace(/\/$/, "");
    const url = new URL(`${baseUrl}/map/${encodeURIComponent(props.subdomain ?? "")}/logs`);
    url.search = new URLSearchParams({
      user: props.user ?? "",
      type: logType.value,
    }).toString();

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "X-Auth-Provider": provider,
      }
    });
    if (!response.ok) throw new Error("Failed to fetch logs");

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      throw new Error("Logs endpoint returned a non-JSON response");
    }

    const data = await response.json();
    logs.value = data.logs || "No logs available.";
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
    logs.value = "Error loading logs.";
  }
};

const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value;
  if (autoRefresh.value) {
    startRefresh();
  } else {
    stopRefresh();
  }
};

const startRefresh = () => {
  stopRefresh();
  refreshInterval = setInterval(fetchLogs, 3000);
};

const stopRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
};

onMounted(() => {
  fetchLogs();
  if (autoRefresh.value) startRefresh();
});

onUnmounted(() => {
  stopRefresh();
});
</script>

<template>
  <div class="flat-modal-overlay" @click="$emit('close-modal')">
    <div class="flat-modal" @click.stop>
      <div class="modal-header">
        <div class="title-container">
          <div class="terminal-icon-wrap">
            <Terminal :size="18" :stroke-width="2.5" />
          </div>
          <div class="title-meta">
            <h3>Live Telemetry Logs</h3>
            <span class="subdomain-badge">{{ subdomain }}</span>
          </div>
        </div>

        <div class="header-actions">
          <div class="log-type-toggle">
            <button :class="{ active: logType === 'all' }" @click="logType = 'all'; fetchLogs()">All</button>
            <button :class="{ active: logType === 'build' }" @click="logType = 'build'; fetchLogs()">Build</button>
            <button :class="{ active: logType === 'runtime' }" @click="logType = 'runtime'; fetchLogs()">Runtime</button>
          </div>

          <button class="flat-action-btn auto-btn" :class="{ 'active': autoRefresh }" @click="toggleAutoRefresh">
            <span class="auto-dot" :class="{ 'dot-active': autoRefresh }"></span>
            <span>{{ autoRefresh ? 'Streaming' : 'Paused' }}</span>
          </button>

          <button class="flat-action-btn refresh-btn" @click="fetchLogs">
            <RefreshCw :size="13" :stroke-width="2.5" />
            <span>Refresh</span>
          </button>

          <button class="close-btn" @click="$emit('close-modal')" aria-label="Close modal">
            <X :size="16" :stroke-width="2.5" />
          </button>
        </div>
      </div>

      <div class="modal-content">
        <pre class="log-container">{{ logs }}</pre>
        <div v-if="error" class="error-banner">
          <AlertCircle :size="16" :stroke-width="2.5" />
          <span>{{ error }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.flat-modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(17, 24, 39, 0.75);
  z-index: 1000;
  padding: 24px;
}

.flat-modal {
  background-color: #111827;
  height: 85vh;
  width: 90vw;
  max-width: 1200px;
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  color: #f3f4f6;
  border: 2px solid #374151;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px 22px;
  background-color: #1f2937;
  border-bottom: 2px solid #374151;
  flex-wrap: wrap;
}

.title-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.terminal-icon-wrap {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  background-color: #374151;
  color: var(--color-primary);
  border-radius: var(--radius-md);
}

.title-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-meta h3 {
  margin: 0;
  color: #ffffff;
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.subdomain-badge {
  font-family: var(--font-mono);
  background-color: #374151;
  color: #60a5fa;
  padding: 2px 8px;
  border-radius: var(--radius-md);
  font-size: 0.82rem;
  font-weight: 700;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.log-type-toggle {
  display: flex;
  background-color: #374151;
  border-radius: var(--radius-md);
  padding: 3px;
  gap: 3px;
}

.log-type-toggle button {
  background: transparent;
  border: 0;
  color: #9ca3af;
  padding: 5px 12px;
  font-size: 0.8rem;
  font-weight: 700;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.log-type-toggle button.active {
  background-color: var(--color-primary);
  color: #ffffff;
}

.log-type-toggle button:hover:not(.active) {
  color: #ffffff;
}

.flat-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  background-color: #374151;
  color: #e5e7eb;
  border-radius: var(--radius-md);
  border: 0;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 700;
  transition: all var(--transition-fast);
}

.flat-action-btn:hover {
  background-color: #4b5563;
  color: #ffffff;
}

.auto-btn.active {
  background-color: #065f46;
  color: #a7f3d0;
}

.auto-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: #9ca3af;
}

.auto-dot.dot-active {
  background-color: #10b981;
}

.close-btn {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background-color: #374151;
  color: #9ca3af;
  border: 0;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.close-btn:hover {
  background-color: #4b5563;
  color: #ffffff;
  transform: scale(1.05);
}

.modal-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 16px;
  background-color: #090d16;
}

.log-container {
  flex: 1;
  background-color: #090d16;
  color: #34d399;
  padding: 16px;
  border-radius: var(--radius-md);
  overflow-y: auto;
  font-family: var(--font-mono);
  font-size: 0.84rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
  border: 1px solid #1f2937;
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fca5a5;
  background-color: #7f1d1d;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  margin-top: 10px;
  font-size: 0.82rem;
  font-weight: 600;
}
</style>
