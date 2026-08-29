<template>
  <div class="health-dashboard">
    <header class="dashboard-header">
      <h1>Container Health Dashboard</h1>
      <div class="header-actions">
        <button @click="refreshData" :disabled="loading" class="refresh-btn">
          {{ loading ? 'Refreshing...' : 'Refresh' }}
        </button>
        <button @click="goBack" class="back-btn">Back to Home</button>
      </div>
    </header>

    <section class="summary-section" v-if="summary">
      <div class="summary-card total">
        <span class="summary-value">{{ summary.total }}</span>
        <span class="summary-label">Total Containers</span>
      </div>
      <div class="summary-card healthy">
        <span class="summary-value">{{ summary.healthy }}</span>
        <span class="summary-label">Healthy</span>
      </div>
      <div class="summary-card unhealthy">
        <span class="summary-value">{{ summary.unhealthy }}</span>
        <span class="summary-label">Unhealthy</span>
      </div>
      <div class="summary-card percent">
        <span class="summary-value">{{ summary.healthPercent }}%</span>
        <span class="summary-label">Health Score</span>
      </div>
    </section>

    <section class="containers-section">
      <h2>Containers</h2>
      
      <div v-if="containers.length === 0 && !loading" class="no-containers">
        No containers deployed yet.
      </div>

      <div class="container-grid">
        <div 
          v-for="container in containers" 
          :key="container.name"
          class="container-card"
          :class="{ unhealthy: !container.isHealthy }"
        >
          <div class="container-header">
            <h3>{{ container.subdomain || container.name }}</h3>
            <span class="status-badge" :class="container.status">
              {{ container.status }}
            </span>
          </div>

          <div class="metrics-bar">
            <div class="metric">
              <label>CPU</label>
              <div class="progress-bar">
                <div 
                  class="progress-fill cpu" 
                  :style="{ width: Math.min(container.cpuPercent, 100) + '%' }"
                  :class="getMetricClass(container.cpuPercent, 90)"
                ></div>
              </div>
              <span>{{ (container.cpuPercent * 10).toFixed(2) }} mCPU</span>
            </div>
            
            <div class="metric">
              <label>Memory</label>
              <div class="progress-bar">
                <div 
                  class="progress-fill memory" 
                  :style="{ width: Math.min(container.memoryPercent, 100) + '%' }"
                  :class="getMetricClass(container.memoryPercent, 85)"
                ></div>
              </div>
              <span>{{ container.memoryUsageMB.toFixed(2) }}MB</span>
            </div>
          </div>

          <div class="container-stats">
            <span><strong>Restarts:</strong> {{ container.restartCount }}</span>
            <span><strong>Stops:</strong> {{ container.stopCount }}</span>
          </div>

          <div class="container-actions">
            <button @click="openGrafana(container)" class="view-btn">
              View Metrics
            </button>
            <button @click="openLogs(container)" class="logs-btn">
              View Logs
            </button>
            <button @click="stopContainer(container)" class="stop-btn">
              Stop
            </button>
            <button @click="restartContainer(container)" class="restart-btn">
              Restart
            </button>
          </div>
        </div>
      </div>
    </section>

    <LogsModal 
      v-if="showLogsModal" 
      :subdomain="selectedLogSubdomain" 
      :user="username" 
      @close-modal="showLogsModal = false" 
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import LogsModal from './LogsModal.vue';

interface Container {
  name: string;
  subdomain: string;
  status: string;
  cpuPercent: number;
  memoryPercent: number;
  memoryUsageMB: number;
  restartCount: number;
  stopCount: number;
  isHealthy: boolean;
  lastUpdated: string;
}

interface HealthSummary {
  total: number;
  healthy: number;
  unhealthy: number;
  healthPercent: number;
}

export default defineComponent({
  name: 'ContainerHealth',
  components: { LogsModal },
  setup() {
    const router = useRouter();
    const loading = ref(false);
    const containers = ref<Container[]>([]);
    const summary = ref<HealthSummary | null>(null);
    const username = ref<string>('');
    const showLogsModal = ref(false);
    const selectedLogSubdomain = ref('');

    const BACKEND_URL = import.meta.env.VITE_APP_BACKEND || 'http://localhost:7000';

    const getAuthParams = () => {
      const token = localStorage.getItem('JWTUser') || '';
      const provider = localStorage.getItem('provider') || '';
      return `user=${encodeURIComponent(username.value)}&token=${encodeURIComponent(token)}&provider=${encodeURIComponent(provider)}`;
    };

    const fetchUsername = async () => {
      const token = localStorage.getItem('JWTUser');
      const provider = localStorage.getItem('provider');
      if (!token || !provider) {
        router.push('/login');
        return;
      }
      
      try {
        const resp = await fetch(`${BACKEND_URL}/auth/jwt`, {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: JSON.stringify({ jwt_token: token, provider }),
        });
        const data = await resp.json();
        if (data.user && data.user !== 'not verified') {
          username.value = data.user;
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Failed to verify JWT:', error);
        router.push('/login');
      }
    };

    const fetchHealth = async () => {
      if (!username.value) return;

      loading.value = true;
      try {
        const response = await fetch(`${BACKEND_URL}/health?${getAuthParams()}`);
        const data = await response.json();
        
        containers.value = data.containers || [];
        summary.value = {
          total: data.total,
          healthy: data.healthy,
          unhealthy: data.unhealthy,
          healthPercent: data.total > 0 
            ? Math.round((data.healthy / data.total) * 100) 
            : 100,
        };
      } catch (error) {
        console.error('Failed to fetch health data:', error);
      } finally {
        loading.value = false;
      }
    };

    const refreshData = () => {
      fetchHealth();
    };

    const goBack = () => {
      router.push('/');
    };

    const getMetricClass = (value: number, threshold: number) => {
      if (value > threshold) return 'critical';
      if (value > threshold * 0.8) return 'warning';
      return 'normal';
    };

    const openLogs = (container: Container) => {
      selectedLogSubdomain.value = container.subdomain || container.name;
      showLogsModal.value = true;
    };

    const openGrafana = async (container: Container) => {
      const subdomain = container.subdomain || container.name;
      try {
        if (!username.value) {
          await fetchUsername();
        }
        const token = localStorage.getItem('JWTUser') || '';
        const provider = localStorage.getItem('provider') || '';

        const resp = await fetch(`${BACKEND_URL}/auth/grafana-token?user=${encodeURIComponent(username.value)}&token=${encodeURIComponent(token)}&provider=${encodeURIComponent(provider)}`);
        if (!resp.ok) {
          throw new Error(`Failed to fetch Grafana token (HTTP ${resp.status})`);
        }
        const data = await resp.json();
        if (!data?.token) {
          throw new Error('No Grafana token received from server');
        }

        const host = window.location.hostname;
        const port = import.meta.env.VITE_APP_GRAFANA_PORT || '3000';
        const url = `http://${host}:${port}/d/container-telemetry?var-subdomain=${encodeURIComponent(subdomain)}&auth_token=${encodeURIComponent(data.token)}&kiosk=tv`;

        window.open(url, '_blank');
      } catch (err) {
        console.error('Failed to open Grafana:', err);
        alert(err instanceof Error ? err.message : 'Failed to launch Grafana dashboard');
      }
    };

    const restartContainer = async (container: Container) => {
      const containerIdentifier = container.subdomain || container.name;
      if (!confirm(`Restart container ${containerIdentifier}?`)) return;

      try {
        const token = localStorage.getItem('JWTUser') || '';
        const provider = localStorage.getItem('provider') || '';

        const response = await fetch(`${BACKEND_URL}/health/${containerIdentifier}/restart`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ author: username.value, token: token, provider }),
        });

        if (!response.ok) {
          let message = `Failed to restart ${containerIdentifier}`;
          try {
            const data = await response.json();
            if (data?.message && typeof data.message === 'string') {
              message = data.message;
            }
          } catch {
            message = `${message} (HTTP ${response.status})`;
          }
          throw new Error(message);
        }

        alert(`Restart initiated for ${containerIdentifier}`);
        fetchHealth();
      } catch (error) {
        console.error('Failed to restart:', error);
        alert(error instanceof Error ? error.message : 'Failed to restart container');
      }
    };

    const stopContainer = async (container: Container) => {
      const containerIdentifier = container.subdomain || container.name;
      if (!confirm(`Stop container ${containerIdentifier}?`)) return;

      try {
        const token = localStorage.getItem('JWTUser') || '';
        const provider = localStorage.getItem('provider') || '';

        const response = await fetch(`${BACKEND_URL}/health/${containerIdentifier}/stop`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ author: username.value, token: token, provider }),
        });

        if (!response.ok) {
          let message = `Failed to stop ${containerIdentifier}`;
          try {
            const data = await response.json();
            if (data?.message && typeof data.message === 'string') {
              message = data.message;
            }
          } catch {
            message = `${message} (HTTP ${response.status})`;
          }
          throw new Error(message);
        }

        alert(`Stop initiated for ${containerIdentifier}`);
        fetchHealth();
      } catch (error) {
        console.error('Failed to stop:', error);
        alert(error instanceof Error ? error.message : 'Failed to stop container');
      }
    };

    onMounted(async () => {
      await fetchUsername();
      fetchHealth();
    });

    return {
      loading,
      containers,
      summary,
      username,
      showLogsModal,
      selectedLogSubdomain,
      refreshData,
      goBack,
      getMetricClass,
      openLogs,
      openGrafana,
      restartContainer,
      stopContainer,
    };
  },
});
</script>

<style scoped>
.health-dashboard {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.dashboard-header h1 {
  margin: 0;
  font-size: 2rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.refresh-btn, .back-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-weight: 500;
  color: #121212;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.summary-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.summary-card {
  padding: 1.5rem;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.summary-value {
  font-size: 2.5rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
  color: #121212;
}

.summary-label {
  color: #666;
  font-size: 0.875rem;
  text-transform: uppercase;
}

.summary-card.total { border-top: 4px solid #3b82f6; }
.summary-card.healthy { border-top: 4px solid #10b981; }
.summary-card.unhealthy { border-top: 4px solid #ef4444; }
.summary-card.percent { border-top: 4px solid #8b5cf6; }

.containers-section h2 {
  margin-bottom: 1.5rem;
}

.container-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.container-card {
  background: #fff;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  border: 1px solid #e5e7eb;
}

.container-card.unhealthy {
  border-color: #ef4444;
}

.container-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.container-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #121212;
  word-break: break-all;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.running { background: #d1fae5; color: #065f46; }
.status-badge.exited { background: #fee2e2; color: #991b1b; }
.status-badge.unhealthy { background: #fef3c7; color: #92400e; }
.status-badge.unknown { background: #e5e7eb; color: #374151; }

.metrics-bar {
  margin-bottom: 1rem;
}

.metric {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.metric label {
  width: 60px;
  font-size: 0.875rem;
  color: #6b7280;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-fill.normal { background: #10b981; }
.progress-fill.warning { background: #f59e0b; }
.progress-fill.critical { background: #ef4444; }

.metric span:last-child {
  width: 70px;
  text-align: right;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.container-stats {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.container-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.view-btn, .logs-btn, .restart-btn, .stop-btn {
  flex: 1;
  min-width: 70px;
  padding: 0.45rem 0.5rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
}

.view-btn {
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
}

.logs-btn {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.stop-btn {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.restart-btn {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fcd34d;
}

.no-containers {
  text-align: center;
  padding: 3rem;
  color: #6b7280;
  font-size: 1.1rem;
}
</style>
