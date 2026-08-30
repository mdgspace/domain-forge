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
          <h3>Logs for <span class="subdomain-highlight">{{ subdomain }}</span></h3>
        </div>
        <div class="header-actions">
          <div class="log-type-toggle">
            <button :class="{ active: logType === 'all' }" @click="logType = 'all'; fetchLogs()">All</button>
            <button :class="{ active: logType === 'build' }" @click="logType = 'build'; fetchLogs()">Build</button>
            <button :class="{ active: logType === 'runtime' }" @click="logType = 'runtime'; fetchLogs()">Runtime</button>
          </div>
          <button class="action-btn" :class="{ 'active': autoRefresh }" @click="toggleAutoRefresh">
            {{ autoRefresh ? 'Auto: ON' : 'Auto: OFF' }}
          </button>
          <button class="action-btn refresh-btn" @click="fetchLogs">Refresh</button>
          <span class="close" @click="$emit('close-modal')">&times;</span>
        </div>
      </div>
      <div class="modal-content">
        <pre class="log-container">{{ logs }}</pre>
        <p v-if="error" class="error">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.75);
  z-index: 1000;
}

.modal {
  background-color: #1e1e1e;
  height: 85vh;
  width: 85vw;
  max-width: 1200px;
  padding: 20px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  color: #d4d4d4;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  border: 1px solid #333;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
  border-bottom: 1px solid #333;
  padding-bottom: 12px;
  flex-wrap: wrap;
}

.title-container h3 {
  margin: 0;
  color: #fff;
  font-size: 1.1rem;
  font-weight: 600;
}

.subdomain-highlight {
  color: #60a5fa;
  word-break: break-all;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.log-type-toggle {
  display: flex;
  background-color: #111;
  border: 1px solid #383838;
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
}

.log-type-toggle button {
  background: transparent;
  border: none;
  color: #9ca3af;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s;
}

.log-type-toggle button.active {
  background-color: #3b82f6;
  color: #ffffff;
  font-weight: 600;
}

.log-type-toggle button:hover:not(.active) {
  color: #ffffff;
  background-color: #262626;
}

.action-btn {
  padding: 5px 12px;
  background-color: #262626;
  color: #e5e5e5;
  border: 1px solid #404040;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
}

.action-btn:hover {
  background-color: #333;
  border-color: #555;
}

.action-btn.active {
  background-color: #047857;
  border-color: #10b981;
  color: #ffffff;
}

.close {
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  color: #888;
  padding: 0 4px;
  transition: color 0.2s;
}

.close:hover {
  color: #fff;
}

.modal-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.log-container {
  flex: 1;
  background-color: #0c0c0c;
  color: #4ade80;
  padding: 16px;
  border-radius: 6px;
  overflow-y: auto;
  font-family: 'Courier New', Courier, monospace;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
  text-align: left;
  border: 1px solid #262626;
}

.error {
  color: #f87171;
  margin-top: 10px;
  font-size: 13px;
}
</style>
