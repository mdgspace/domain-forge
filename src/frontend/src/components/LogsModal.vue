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
let refreshInterval = null;

const fetchLogs = async () => {
  try {
    const backend = import.meta.env.VITE_APP_BACKEND;
    const token = localStorage.getItem("JWTUser");
    const provider = localStorage.getItem("provider");

    const baseUrl = backend.replace(/\/$/, "");
    const url = new URL(`${baseUrl}/map/${encodeURIComponent(props.subdomain ?? "")}/logs`);
    url.search = new URLSearchParams({
      user: props.user ?? "",
      token: token ?? "",
      provider: provider ?? ""
    }).toString();

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json"
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
        <h3>Logs for {{ subdomain }}</h3>
        <div class="header-actions">
          <button @click="toggleAutoRefresh" :class="{ 'active': autoRefresh }">
            {{ autoRefresh ? 'Auto-refresh: ON' : 'Auto-refresh: OFF' }}
          </button>
          <button @click="fetchLogs" class="refresh-btn">Refresh</button>
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
  background-color: #000000da;
  z-index: 1000;
}

.modal {
  background-color: #1e1e1e;
  height: 80%;
  width: 80%;
  margin-top: 5%;
  padding: 20px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  color: #d4d4d4;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  border-bottom: 1px solid #333;
  padding-bottom: 10px;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  color: #fff;
}

.close {
  font-size: 28px;
  cursor: pointer;
  color: #888;
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
  background-color: #000;
  color: #0f0;
  padding: 15px;
  border-radius: 4px;
  overflow-y: auto;
  font-family: 'Courier New', Courier, monospace;
  font-size: 13px;
  white-space: pre-wrap;
  word-wrap: break-word;
  text-align: left;
}

.refresh-btn, .header-actions button {
  padding: 5px 12px;
  background-color: #333;
  color: #fff;
  border: 1px solid #555;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.header-actions button.active {
  background-color: #007bff;
  border-color: #0056b3;
}

.error {
  color: #ff4d4d;
  margin-top: 10px;
}
</style>
