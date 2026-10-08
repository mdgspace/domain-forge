<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

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
  <div class="modal-overlay" @click="$emit('close-modal')">
    <div class="modal" @click.stop>
      <div class="modal-header">
        <div class="title-container">
          <div class="terminal-dots">
            <span class="dot-red"></span>
            <span class="dot-yellow"></span>
            <span class="dot-green"></span>
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

          <button class="action-btn auto-btn" :class="{ 'active': autoRefresh }" @click="toggleAutoRefresh">
            <span class="auto-dot" :class="{ 'dot-active': autoRefresh }"></span>
            {{ autoRefresh ? 'Streaming' : 'Paused' }}
          </button>

          <button class="action-btn refresh-btn" @click="fetchLogs">
            <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
              <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
            </svg>
            Refresh
          </button>

          <button class="close-btn" @click="$emit('close-modal')" aria-label="Close modal">
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      <div class="modal-content">
        <pre class="log-container">{{ logs }}</pre>
        <div v-if="error" class="error-banner">
          <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          <span>{{ error }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 1000;
  padding: 24px;
}

.modal {
  background-color: #0b0f19;
  height: 85vh;
  width: 90vw;
  max-width: 1200px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  color: #e2e8f0;
  box-shadow: 0 25px 65px rgba(0, 0, 0, 0.6);
  border: 1px solid #1e293b;
  overflow: hidden;
  animation: modal-appear 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modal-appear {
  from {
    opacity: 0;
    transform: scale(0.97) translateY(6px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px 22px;
  background-color: #0f172a;
  border-bottom: 1px solid #1e293b;
  flex-wrap: wrap;
}

.title-container {
  display: flex;
  align-items: center;
  gap: 14px;
}

.terminal-dots {
  display: flex;
  gap: 6px;
}

.terminal-dots span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.dot-red { background-color: #ef4444; }
.dot-yellow { background-color: #f59e0b; }
.dot-green { background-color: #10b981; }

.title-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-meta h3 {
  margin: 0;
  color: #f8fafc;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.subdomain-badge {
  font-family: var(--font-mono);
  background-color: #1e293b;
  color: #38bdf8;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 0.8rem;
  border: 1px solid #334155;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.log-type-toggle {
  display: flex;
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 3px;
  gap: 3px;
}

.log-type-toggle button {
  background: transparent;
  border: none;
  color: #94a3b8;
  padding: 5px 12px;
  font-size: 0.78rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.log-type-toggle button.active {
  background-color: #2563eb;
  color: #ffffff;
}

.log-type-toggle button:hover:not(.active) {
  color: #f8fafc;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background-color: #1e293b;
  color: #cbd5e1;
  border: 1px solid #334155;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 600;
  transition: all 0.15s ease;
}

.action-btn:hover {
  background-color: #334155;
  color: #ffffff;
}

.auto-btn.active {
  border-color: #065f46;
  background-color: #064e3b;
  color: #6ee7b7;
}

.auto-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #94a3b8;
}

.auto-dot.dot-active {
  background-color: #34d399;
  box-shadow: 0 0 6px #10b981;
}

.close-btn {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.15s ease;
}

.close-btn:hover {
  background-color: #1e293b;
  color: #f8fafc;
}

.modal-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 14px;
  background-color: #050811;
}

.log-container {
  flex: 1;
  background-color: #050811;
  color: #a7f3d0;
  padding: 16px;
  border-radius: 10px;
  overflow-y: auto;
  font-family: var(--font-mono);
  font-size: 0.82rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
  border: 1px solid #111827;
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fca5a5;
  background-color: #450a0a;
  border: 1px solid #7f1d1d;
  padding: 8px 14px;
  border-radius: 8px;
  margin-top: 10px;
  font-size: 0.8rem;
}
</style>
