<template>
  <div class="page-layout">
    <header>
      <nav class="flat-nav">
        <div class="nav-wrapper">
          <router-link to="/" class="brand-container">
            <img src="/df-logo.png" class="brand-logo" alt="Domain Forge logo">
            <span class="brand">Domain Forge</span>
          </router-link>
          <ul class="nav-links">
            <li>
              <a href="https://github.com/mdgspace/domain-forge/blob/master/docs/users/README.md" target="_blank" rel="noopener noreferrer">Docs</a>
            </li>
            <li>
              <router-link to="/" class="nav-link-item">Overview</router-link>
            </li>
            <li>
              <router-link to="/health" class="nav-link-item active">
                <Activity :size="16" :stroke-width="2.5" />
                <span>Health</span>
              </router-link>
            </li>
            <li>
              <button @click="refreshData" :disabled="loading" class="flat-nav-btn">
                <RefreshCw :size="14" :stroke-width="2.5" :class="{ 'spin': loading }" />
                <span>{{ loading ? 'Refreshing…' : 'Refresh' }}</span>
              </button>
            </li>
          </ul>
        </div>
      </nav>
    </header>

    <div class="health-container">
      <div class="dashboard-header">
        <div>
          <p class="eyebrow">SYSTEM / OBSERVABILITY</p>
          <h1>Container Health Dashboard</h1>
          <p class="page-subtitle">Real-time resource utilization, runtime telemetry, and container lifecycle actions.</p>
        </div>
        <div class="header-actions">
          <button @click="goBack" class="back-btn">
            <ArrowLeft :size="16" :stroke-width="2.5" />
            <span>Back to Overview</span>
          </button>
        </div>
      </div>

      <!-- Color Block Summary Cards -->
      <section class="summary-section" v-if="summary">
        <div class="summary-card block-blue">
          <div class="summary-icon-circle bg-white text-blue">
            <Layers :size="22" :stroke-width="2.5" />
          </div>
          <div class="summary-content">
            <strong class="summary-count">{{ summary.total }}</strong>
            <span class="summary-label">Total Containers</span>
          </div>
        </div>

        <div class="summary-card block-emerald">
          <div class="summary-icon-circle bg-white text-emerald">
            <CheckCircle2 :size="22" :stroke-width="2.5" />
          </div>
          <div class="summary-content">
            <strong class="summary-count text-emerald">{{ summary.healthy }}</strong>
            <span class="summary-label">Healthy</span>
          </div>
        </div>

        <div class="summary-card block-red">
          <div class="summary-icon-circle bg-white text-red">
            <AlertTriangle :size="22" :stroke-width="2.5" />
          </div>
          <div class="summary-content">
            <strong class="summary-count text-red">{{ summary.unhealthy }}</strong>
            <span class="summary-label">Unhealthy</span>
          </div>
        </div>

        <div class="summary-card block-amber">
          <div class="summary-icon-circle bg-white text-amber">
            <Activity :size="22" :stroke-width="2.5" />
          </div>
          <div class="summary-content">
            <strong class="summary-count">{{ summary.healthPercent }}%</strong>
            <span class="summary-label">Health Score</span>
          </div>
        </div>
      </section>

      <!-- Containers Section -->
      <section class="containers-section">
        <div class="section-heading">
          <h2>Active Containers</h2>
          <span class="count-pill">{{ containers.length }} tracked</span>
        </div>
        
        <div v-if="containers.length === 0 && !loading" class="no-containers">
          <div class="empty-icon-circle">
            <Box :size="36" :stroke-width="2.5" />
          </div>
          <strong>No containers deployed yet</strong>
          <p>Containers will automatically show telemetry once deployed in your workspace.</p>
        </div>

        <div class="container-grid">
          <div 
            v-for="container in containers" 
            :key="container.name"
            class="container-card"
            :class="{ 'card-unhealthy': !container.isHealthy }"
          >
            <div class="container-card-header">
              <div class="container-title-group">
                <span class="server-icon-wrap">
                  <Server :size="16" :stroke-width="2.5" />
                </span>
                <h3 class="container-title" :title="container.subdomain || container.name">
                  {{ container.subdomain || container.name }}
                </h3>
              </div>
              <span class="status-badge" :class="container.status.toLowerCase()">
                <span class="badge-dot"></span>
                {{ container.status }}
              </span>
            </div>

            <!-- Flat Metric Gauges -->
            <div class="metrics-block">
              <div class="metric-row">
                <div class="metric-header">
                  <span class="metric-label">CPU Usage</span>
                  <span class="metric-value">{{ (container.cpuPercent * 10).toFixed(1) }} mCPU</span>
                </div>
                <div class="progress-track">
                  <div 
                    class="progress-fill" 
                    :style="{ width: Math.min(container.cpuPercent, 100) + '%' }"
                    :class="getMetricClass(container.cpuPercent, 90)"
                  ></div>
                </div>
              </div>
              
              <div class="metric-row">
                <div class="metric-header">
                  <span class="metric-label">Memory Usage</span>
                  <span class="metric-value">{{ container.memoryUsageMB.toFixed(1) }} MB</span>
                </div>
                <div class="progress-track">
                  <div 
                    class="progress-fill" 
                    :style="{ width: Math.min(container.memoryPercent, 100) + '%' }"
                    :class="getMetricClass(container.memoryPercent, 85)"
                  ></div>
                </div>
              </div>
            </div>

            <!-- Flat Telemetry Stats -->
            <div class="container-stats">
              <div class="stat-item">
                <span class="stat-label">Restarts</span>
                <span class="stat-number">{{ container.restartCount }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Stops</span>
                <span class="stat-number">{{ container.stopCount }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Health</span>
                <span class="stat-number" :class="container.isHealthy ? 'text-emerald' : 'text-red'">
                  {{ container.isHealthy ? 'Passing' : 'Failing' }}
                </span>
              </div>
            </div>

            <!-- Flat Action Buttons with Lucide Icons -->
            <div class="container-actions">
              <button @click="openGrafana(container)" class="action-btn metrics-btn">
                <BarChart3 :size="14" :stroke-width="2.5" />
                <span>Metrics</span>
              </button>
              <button @click="openLogs(container)" class="action-btn logs-btn">
                <Terminal :size="14" :stroke-width="2.5" />
                <span>Logs</span>
              </button>
              <button @click="restartContainer(container)" class="action-btn restart-btn">
                <RotateCw :size="14" :stroke-width="2.5" />
                <span>Restart</span>
              </button>
              <button @click="stopContainer(container)" class="action-btn stop-btn">
                <Square :size="14" :stroke-width="2.5" />
                <span>Stop</span>
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

    <!-- Solid High-Contrast Flat Dark Footer -->
    <footer class="flat-footer">
      <div class="footer-content">
        <p>Made with ❤️ by <strong>MDG Space</strong></p>
      </div>
    </footer>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import LogsModal from './LogsModal.vue';
import { 
  Activity, 
  RefreshCw, 
  ArrowLeft, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Box, 
  Server, 
  BarChart3, 
  Terminal, 
  RotateCw, 
  Square 
} from 'lucide-vue-next';

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
  components: { 
    LogsModal,
    Activity, 
    RefreshCw, 
    ArrowLeft, 
    Layers, 
    CheckCircle2, 
    AlertTriangle, 
    Box, 
    Server, 
    BarChart3, 
    Terminal, 
    RotateCw, 
    Square 
  },
  setup() {
    const router = useRouter();
    const loading = ref(false);
    const containers = ref<Container[]>([]);
    const summary = ref<HealthSummary | null>(null);
    const username = ref<string>('');
    const showLogsModal = ref(false);
    const selectedLogSubdomain = ref('');

    const BACKEND_URL = import.meta.env.VITE_APP_BACKEND || 'http://localhost:7000';

    const getAuthHeaders = () => {
      const token = localStorage.getItem('JWTUser') || '';
      const provider = localStorage.getItem('provider') || 'github';
      return {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Auth-Provider': provider,
      };
    };

    const fetchUsername = async () => {
      const token = localStorage.getItem('JWTUser');
      const provider = localStorage.getItem('provider') || 'github';
      if (!token) {
        router.push('/login');
        return;
      }
      
      try {
        const resp = await fetch(`${BACKEND_URL}/auth/jwt`, {
          method: 'POST',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
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
        const response = await fetch(`${BACKEND_URL}/health?user=${encodeURIComponent(username.value)}`, {
          headers: getAuthHeaders(),
        });
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

        const resp = await fetch(
          `${BACKEND_URL}/auth/grafana-token?user=${encodeURIComponent(username.value)}&subdomain=${encodeURIComponent(subdomain)}`,
          { headers: getAuthHeaders() },
        );
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
        const provider = localStorage.getItem('provider') || 'github';

        const response = await fetch(`${BACKEND_URL}/health/${containerIdentifier}/restart`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Auth-Provider': provider,
          },
          body: JSON.stringify({ author: username.value, token, provider }),
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
        const provider = localStorage.getItem('provider') || 'github';

        const response = await fetch(`${BACKEND_URL}/health/${containerIdentifier}/stop`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Auth-Provider': provider,
          },
          body: JSON.stringify({ author: username.value, token, provider }),
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
.page-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--color-canvas);
}

.flat-nav {
  width: 100%;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 50;
  background-color: #ffffff;
  border-bottom: 2px solid var(--color-muted);
}

.nav-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 28px;
}

.brand-container {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
}

.brand-logo {
  height: 34px;
  width: auto;
}

.brand {
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-fg);
}

.nav-links {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-links a {
  text-decoration: none;
  color: #4b5563;
  font-weight: 600;
  font-size: 0.95rem;
  padding: 8px 14px;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.nav-links a:hover,
.nav-link-item.active {
  background-color: var(--color-muted);
  color: var(--color-fg);
}

.nav-link-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.flat-nav-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--color-fg);
  background-color: var(--color-muted);
  border-radius: var(--radius-md);
  border: 0;
}

.flat-nav-btn:hover:not(:disabled) {
  background-color: var(--color-muted-hover);
  transform: scale(1.05);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.health-container {
  width: min(1200px, calc(100% - 48px));
  margin: 0 auto;
  padding: 110px 0 60px;
  display: flex;
  flex-direction: column;
  gap: 28px;
  flex: 1;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 20px;
}

.eyebrow {
  margin-bottom: 6px;
  color: var(--color-primary);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.dashboard-header h1 {
  margin: 0;
  font-size: clamp(2rem, 3.8vw, 2.9rem);
  line-height: 1.1;
  color: var(--color-fg);
  letter-spacing: -0.03em;
  font-weight: 800;
}

.page-subtitle {
  margin: 8px 0 0;
  color: #6b7280;
  font-size: 0.98rem;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: var(--radius-md);
  background-color: var(--color-muted);
  color: var(--color-fg);
  font-size: 0.9rem;
  font-weight: 700;
  border: 0;
}

.back-btn:hover {
  background-color: var(--color-muted-hover);
  transform: scale(1.05);
}

/* Color Block Summary Cards */
.summary-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 22px;
  border-radius: var(--radius-lg);
  transition: transform var(--transition-fast);
}

.summary-card:hover {
  transform: scale(1.02);
}

.block-blue { background-color: var(--color-blue-subtle); }
.block-emerald { background-color: var(--color-emerald-subtle); }
.block-red { background-color: var(--color-danger-subtle); }
.block-amber { background-color: var(--color-amber-subtle); }

.summary-icon-circle {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: #ffffff;
  flex-shrink: 0;
}

.text-blue { color: var(--color-primary); }
.text-emerald { color: var(--color-secondary); }
.text-red { color: var(--color-danger); }
.text-amber { color: var(--color-accent); }

.summary-content {
  display: flex;
  flex-direction: column;
}

.summary-count {
  color: var(--color-fg);
  font-size: 2rem;
  line-height: 1;
  font-weight: 800;
}

.summary-label {
  margin-top: 4px;
  color: #4b5563;
  font-size: 0.82rem;
  font-weight: 600;
}

/* Containers Section */
.containers-section {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.section-heading {
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-heading h2 {
  margin: 0;
  font-size: 1.3rem;
  color: var(--color-fg);
  font-weight: 800;
}

.count-pill {
  padding: 4px 12px;
  background-color: var(--color-muted);
  color: #374151;
  border-radius: var(--radius-full);
  font-size: 0.76rem;
  font-weight: 800;
}

.container-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 18px;
}

.container-card {
  background-color: #ffffff;
  border-radius: var(--radius-lg);
  border: 2px solid var(--color-muted);
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  transition: transform var(--transition-fast);
}

.container-card:hover {
  transform: scale(1.02);
}

.container-card.card-unhealthy {
  border-color: #fecaca;
  background-color: #fffafb;
}

.container-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.container-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.server-icon-wrap {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  background-color: var(--color-muted);
  color: var(--color-primary);
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.container-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
  color: var(--color-fg);
  font-family: var(--font-mono);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Status Badges */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--radius-md);
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-badge.running,
.status-badge.healthy {
  background-color: var(--color-emerald-subtle);
  color: #065f46;
}
.status-badge.running .badge-dot,
.status-badge.healthy .badge-dot { background-color: var(--color-secondary); }

.status-badge.exited,
.status-badge.unhealthy {
  background-color: var(--color-danger-subtle);
  color: #991b1b;
}
.status-badge.exited .badge-dot,
.status-badge.unhealthy .badge-dot { background-color: var(--color-danger); }

.status-badge.unknown {
  background-color: var(--color-muted);
  color: #374151;
}
.status-badge.unknown .badge-dot { background-color: #9ca3af; }

/* Flat Metrics Gauges */
.metrics-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background-color: var(--color-muted);
  padding: 14px 16px;
  border-radius: var(--radius-md);
}

.metric-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
}

.metric-label {
  color: #4b5563;
  font-weight: 600;
}

.metric-value {
  color: var(--color-fg);
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 0.82rem;
}

.progress-track {
  width: 100%;
  height: 8px;
  background-color: #e5e7eb;
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.3s cubic-bezier(0, 0, 0.2, 1);
}

.progress-fill.normal { background-color: var(--color-secondary); }
.progress-fill.warning { background-color: var(--color-accent); }
.progress-fill.critical { background-color: var(--color-danger); }

/* Flat Stats */
.container-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 10px;
  background-color: #ffffff;
  border: 2px solid var(--color-muted);
  border-radius: var(--radius-md);
  text-align: center;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-size: 0.72rem;
  color: #6b7280;
  font-weight: 700;
  text-transform: uppercase;
}

.stat-number {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--color-fg);
  font-family: var(--font-mono);
}

/* Action Buttons */
.container-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-btn {
  flex: 1 1 calc(50% - 4px);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: var(--radius-md);
  font-size: 0.82rem;
  font-weight: 700;
  border: 0;
  transition: all var(--transition-fast);
}

.metrics-btn {
  background-color: var(--color-blue-subtle);
  color: var(--color-primary);
}
.metrics-btn:hover { background-color: #dbeafe; }

.logs-btn {
  background-color: var(--color-muted);
  color: var(--color-fg);
}
.logs-btn:hover { background-color: var(--color-muted-hover); }

.restart-btn {
  background-color: var(--color-amber-subtle);
  color: #92400e;
}
.restart-btn:hover { background-color: #fef08a; }

.stop-btn {
  background-color: var(--color-danger-subtle);
  color: var(--color-danger-hover);
}
.stop-btn:hover { background-color: #fecaca; }

.no-containers {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  background-color: #ffffff;
  border: 2px dashed #d1d5db;
  border-radius: var(--radius-lg);
  text-align: center;
}

.empty-icon-circle {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: var(--color-muted);
  color: #9ca3af;
  margin-bottom: 14px;
}

.no-containers strong {
  font-size: 1.15rem;
  color: var(--color-fg);
  margin-bottom: 4px;
}

.no-containers p {
  color: #6b7280;
  font-size: 0.9rem;
  margin: 0;
}

/* Flat High-Contrast Dark Footer */
.flat-footer {
  width: 100%;
  background-color: var(--color-dark);
  padding: 24px 0;
  margin-top: auto;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 28px;
  text-align: center;
}

.flat-footer p {
  margin: 0;
  color: #9ca3af;
  font-size: 0.9rem;
}

.flat-footer strong {
  color: #ffffff;
}

@media (max-width: 900px) {
  .summary-section {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .health-container {
    padding-top: 96px;
  }

  .dashboard-header {
    flex-direction: column;
    align-items: stretch;
  }

  .summary-section {
    grid-template-columns: 1fr;
  }

  .container-grid {
    grid-template-columns: 1fr;
  }

  .nav-links a {
    display: none;
  }
}
</style>
