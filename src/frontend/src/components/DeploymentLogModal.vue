<template>
  <div class="modal-overlay" @click.self="closeModal">
    <div class="log-modal">
      <div class="log-modal-header">
        <div class="header-left">
          <h2>Deployment Log</h2>
          <span class="subdomain-badge">{{ subdomain }}</span>
        </div>
        <button class="close-btn" @click="closeModal">&times;</button>
      </div>

      <!-- Status Banner -->
      <div class="status-banner" :class="statusClass">
        <span class="status-icon">{{ statusIcon }}</span>
        <div class="status-info">
          <span class="status-label">{{ statusLabel }}</span>
          <span class="status-time" v-if="logData?.startedAt">
            Started: {{ formatDate(logData.startedAt) }}
            <span v-if="logData.completedAt"> · Completed: {{ formatDate(logData.completedAt) }}</span>
          </span>
        </div>
      </div>

      <!-- Error Summary -->
      <div v-if="logData?.errorSummary" class="error-summary">
        <strong>Error:</strong> {{ logData.errorSummary }}
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-container">
        <div class="spinner"></div>
        <p>Loading deployment log...</p>
      </div>

      <!-- No Log Available -->
      <div v-else-if="!logData || logData.status === 'unknown'" class="no-log">
        <p>No deployment log available for this subdomain.</p>
        <p class="no-log-hint">
          Logs are captured for GITHUB deployments that include container builds.
          URL and PORT deployments complete instantly and don't generate build logs.
        </p>
      </div>

      <!-- Log Content -->
      <div v-else class="log-content-section">
        <div class="log-toolbar">
          <h3>Build Output</h3>
          <div class="toolbar-actions">
            <button @click="refreshLog" class="toolbar-btn" :disabled="refreshing">
              {{ refreshing ? 'Refreshing...' : 'Refresh' }}
            </button>
            <button @click="copyLog" class="toolbar-btn">
              {{ copied ? 'Copied!' : 'Copy' }}
            </button>
          </div>
        </div>

        <div class="log-terminal" ref="logTerminal">
          <pre>{{ logData.logContent || '(No output captured yet)' }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch } from 'vue';
import { getDeploymentLog } from '../utils/deployment-logs';

export default defineComponent({
  name: 'DeploymentLogModal',
  props: {
    subdomain: {
      type: String,
      required: true,
    },
    user: {
      type: String,
      required: true,
    },
  },
  emits: ['close-modal'],
  setup(props, { emit }) {
    const logData = ref<any>(null);
    const loading = ref(true);
    const refreshing = ref(false);
    const copied = ref(false);
    const logTerminal = ref<HTMLElement | null>(null);

    const statusClass = ref('status-unknown');
    const statusIcon = ref('❓');
    const statusLabel = ref('Unknown');

    function updateStatusDisplay() {
      const status = logData.value?.status || 'unknown';
      switch (status) {
        case 'success':
          statusClass.value = 'status-success';
          statusIcon.value = '✅';
          statusLabel.value = 'Deployment Successful';
          break;
        case 'failed':
          statusClass.value = 'status-failed';
          statusIcon.value = '❌';
          statusLabel.value = 'Deployment Failed';
          break;
        case 'pending':
          statusClass.value = 'status-pending';
          statusIcon.value = '⏳';
          statusLabel.value = 'Deployment Pending';
          break;
        case 'building':
          statusClass.value = 'status-building';
          statusIcon.value = '🔨';
          statusLabel.value = 'Building...';
          break;
        default:
          statusClass.value = 'status-unknown';
          statusIcon.value = '❓';
          statusLabel.value = 'No Deployment Info';
      }
    }

    function formatDate(dateStr: string): string {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toLocaleString();
    }

    async function fetchLog() {
      try {
        const data = await getDeploymentLog(props.user, props.subdomain);
        logData.value = data;
        updateStatusDisplay();
      } catch (error) {
        console.error('Failed to fetch deployment log:', error);
      }
    }

    async function refreshLog() {
      refreshing.value = true;
      await fetchLog();
      refreshing.value = false;
      // Auto-scroll to bottom of log.
      if (logTerminal.value) {
        logTerminal.value.scrollTop = logTerminal.value.scrollHeight;
      }
    }

    async function copyLog() {
      if (logData.value?.logContent) {
        try {
          await navigator.clipboard.writeText(logData.value.logContent);
          copied.value = true;
          setTimeout(() => { copied.value = false; }, 2000);
        } catch {
          // Fallback for older browsers.
          const textarea = document.createElement('textarea');
          textarea.value = logData.value.logContent;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          copied.value = true;
          setTimeout(() => { copied.value = false; }, 2000);
        }
      }
    }

    function closeModal() {
      emit('close-modal');
    }

    onMounted(async () => {
      await fetchLog();
      loading.value = false;

      // If status is pending or building, auto-refresh every 5 seconds.
      const autoRefreshInterval = setInterval(async () => {
        if (logData.value?.status === 'pending' || logData.value?.status === 'building') {
          await fetchLog();
        } else {
          clearInterval(autoRefreshInterval);
        }
      }, 5000);
    });

    return {
      logData,
      loading,
      refreshing,
      copied,
      logTerminal,
      statusClass,
      statusIcon,
      statusLabel,
      formatDate,
      refreshLog,
      copyLog,
      closeModal,
    };
  },
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.log-modal {
  background: #ffffff;
  border-radius: 16px;
  width: 90%;
  max-width: 800px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
}

.log-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-left h2 {
  margin: 0;
  font-size: 1.25rem;
  color: #111827;
}

.subdomain-badge {
  background: #eff6ff;
  color: #1d4ed8;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.75rem;
  cursor: pointer;
  color: #9ca3af;
  width: auto;
  padding: 0 0.25rem;
  line-height: 1;
}

.close-btn:hover {
  color: #374151;
}

/* Status Banner */
.status-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  margin: 0;
}

.status-icon {
  font-size: 1.5rem;
}

.status-info {
  display: flex;
  flex-direction: column;
}

.status-label {
  font-weight: 600;
  font-size: 1rem;
}

.status-time {
  font-size: 0.8rem;
  opacity: 0.8;
  margin-top: 2px;
}

.status-success {
  background: #ecfdf5;
  color: #065f46;
}

.status-failed {
  background: #fef2f2;
  color: #991b1b;
}

.status-pending {
  background: #fffbeb;
  color: #92400e;
}

.status-building {
  background: #eff6ff;
  color: #1e40af;
}

.status-unknown {
  background: #f3f4f6;
  color: #4b5563;
}

/* Error Summary */
.error-summary {
  margin: 0;
  padding: 0.75rem 1.5rem;
  background: #fef2f2;
  border-top: 1px solid #fecaca;
  border-bottom: 1px solid #fecaca;
  color: #991b1b;
  font-size: 0.9rem;
  line-height: 1.5;
}

/* Loading */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem;
  color: #6b7280;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* No Log */
.no-log {
  text-align: center;
  padding: 2rem 1.5rem;
  color: #6b7280;
}

.no-log-hint {
  font-size: 0.85rem;
  opacity: 0.7;
  margin-top: 0.5rem;
}

/* Log Content */
.log-content-section {
  padding: 0;
}

.log-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.log-toolbar h3 {
  margin: 0;
  font-size: 0.95rem;
  color: #374151;
}

.toolbar-actions {
  display: flex;
  gap: 0.5rem;
}

.toolbar-btn {
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #374151;
  cursor: pointer;
  width: auto;
}

.toolbar-btn:hover {
  background: #f3f4f6;
}

.toolbar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.log-terminal {
  background: #1e1e2e;
  color: #cdd6f4;
  padding: 1rem 1.5rem;
  max-height: 400px;
  overflow-y: auto;
  border-bottom-left-radius: 16px;
  border-bottom-right-radius: 16px;
}

.log-terminal pre {
  margin: 0;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', monospace;
  font-size: 0.8rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
