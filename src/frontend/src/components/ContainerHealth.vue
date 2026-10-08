<template>
  <div class="page-layout">
    <header>
      <nav>
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
              <router-link to="/health" class="nav-link-item active">Health</router-link>
            </li>
            <li>
              <button @click="refreshData" :disabled="loading" class="refresh-nav-btn">
                <svg :class="{ 'spin': loading }" viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                  <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
                </svg>
                {{ loading ? 'Refreshing…' : 'Refresh' }}
              </button>
            </li>
          </ul>
        </div>
      </nav>
    </header>

    <div class="health-container">
      <div class="dashboard-header">
        <div>
          <p class="eyebrow">System / Observability</p>
          <h1>Container Health Dashboard</h1>
          <p class="page-subtitle">Real-time resource utilization, runtime telemetry, and container controls.</p>
        </div>
        <div class="header-actions">
          <button @click="goBack" class="back-btn">
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
            </svg>
            Back to Overview
          </button>
        </div>
      </div>

      <section class="summary-section" v-if="summary">
        <div class="summary-card">
          <div class="summary-icon-wrap primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div class="summary-content">
            <strong class="summary-count">{{ summary.total }}</strong>
            <span class="summary-label">Total Containers</span>
          </div>
        </div>

        <div class="summary-card">
          <div class="summary-icon-wrap success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="summary-content">
            <strong class="summary-count text-success">{{ summary.healthy }}</strong>
            <span class="summary-label">Healthy</span>
          </div>
        </div>

        <div class="summary-card">
          <div class="summary-icon-wrap danger">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div class="summary-content">
            <strong class="summary-count text-danger">{{ summary.unhealthy }}</strong>
            <span class="summary-label">Unhealthy</span>
          </div>
        </div>

        <div class="summary-card">
          <div class="summary-icon-wrap purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div class="summary-content">
            <strong class="summary-count">{{ summary.healthPercent }}%</strong>
            <span class="summary-label">Health Score</span>
          </div>
        </div>
      </section>

      <section class="containers-section">
        <div class="section-heading">
          <h2>Active Containers</h2>
          <span class="count-pill">{{ containers.length }} tracked</span>
        </div>
        
        <div v-if="containers.length === 0 && !loading" class="no-containers">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="40" height="40">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <strong>No containers deployed yet</strong>
          <p>Containers will automatically show telemetry once created in your workspace.</p>
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
                <span class="service-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                    <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                    <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                    <line x1="6" y1="6" x2="6.01" y2="6"></line>
                    <line x1="6" y1="18" x2="6.01" y2="18"></line>
                  </svg>
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

            <div class="metrics-container">
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
                <span class="stat-label">State</span>
                <span class="stat-number" :class="container.isHealthy ? 'text-success' : 'text-danger'">
                  {{ container.isHealthy ? 'Passing' : 'Failing' }}
                </span>
              </div>
            </div>

            <div class="container-actions">
              <button @click="openGrafana(container)" class="action-btn metrics-btn">
                <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
                Metrics
              </button>
              <button @click="openLogs(container)" class="action-btn logs-btn">
                <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
                  <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
                </svg>
                Logs
              </button>
              <button @click="restartContainer(container)" class="action-btn restart-btn">
                <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
                  <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
                </svg>
                Restart
              </button>
              <button @click="stopContainer(container)" class="action-btn stop-btn">
                <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clip-rule="evenodd" />
                </svg>
                Stop
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

    <footer>
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
  background-color: #f5f7fb;
}

nav {
  width: 100%; 
  position: fixed; 
  top: 0;
  left: 0;
  z-index: 50;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid #e2e8f0;
}

.nav-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  padding: 14px 28px;
}

.brand-container {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
}

.brand-logo {
  height: 32px;
  width: auto;
  object-fit: contain;
}

.brand {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: #172033;
}

.nav-links {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.nav-links a {
  text-decoration: none;
  color: #64748b;
  font-weight: 600;
  font-size: 0.9rem;
  padding: 8px 14px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.nav-links a:hover,
.nav-link-item.active {
  color: #172033;
  background: rgba(0, 0, 0, 0.04);
}

.refresh-nav-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  font-size: 0.84rem;
  font-weight: 600;
  color: #334155;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transition: all 0.2s ease;
}

.refresh-nav-btn:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #94a3b8;
  color: #0f172a;
}

.refresh-nav-btn:disabled {
  opacity: 0.6;
  cursor: wait;
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
  margin-bottom: 8px;
  color: #2563eb;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.dashboard-header h1 {
  margin: 0;
  font-size: clamp(1.9rem, 3.5vw, 2.75rem);
  line-height: 1.1;
  color: #172033;
  letter-spacing: -0.04em;
  font-weight: 700;
}

.page-subtitle {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 0.95rem;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border: 1px solid #cbd5e1;
  border-radius: 9px;
  background: #ffffff;
  color: #334155;
  font-size: 0.88rem;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  transition: all 0.2s ease;
}

.back-btn:hover {
  background: #f8fafc;
  color: #0f172a;
  border-color: #94a3b8;
}

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
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.summary-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
}

.summary-icon-wrap {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  flex-shrink: 0;
}

.summary-icon-wrap.primary { background: #dbeafe; color: #2563eb; }
.summary-icon-wrap.success { background: #dcfce7; color: #16a34a; }
.summary-icon-wrap.danger { background: #fee2e2; color: #dc2626; }
.summary-icon-wrap.purple { background: #ede9fe; color: #7c3aed; }

.summary-content {
  display: flex;
  flex-direction: column;
}

.summary-count {
  color: #172033;
  font-size: 1.75rem;
  line-height: 1;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.text-success { color: #16a34a !important; }
.text-danger { color: #dc2626 !important; }

.summary-label {
  margin-top: 4px;
  color: #64748b;
  font-size: 0.8rem;
  font-weight: 600;
}

.containers-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-heading {
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-heading h2 {
  margin: 0;
  font-size: 1.25rem;
  color: #172033;
  font-weight: 700;
}

.count-pill {
  padding: 3px 10px;
  background: #e2e8f0;
  color: #475569;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 600;
}

.container-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 18px;
}

.container-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 22px;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05);
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 18px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.container-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.08);
}

.container-card.card-unhealthy {
  border-color: #fecdd3;
  background: linear-gradient(180deg, #fff5f5 0%, #ffffff 40%);
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

.service-icon {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  background: #f1f5f9;
  color: #2563eb;
  border-radius: 8px;
  flex-shrink: 0;
}

.container-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #172033;
  font-family: var(--font-mono);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
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
  background: #dcfce7;
  color: #15803d;
}
.status-badge.running .badge-dot,
.status-badge.healthy .badge-dot { background: #22c55e; }

.status-badge.exited,
.status-badge.unhealthy {
  background: #fee2e2;
  color: #b91c1c;
}
.status-badge.exited .badge-dot,
.status-badge.unhealthy .badge-dot { background: #ef4444; }

.status-badge.unknown {
  background: #f1f5f9;
  color: #475569;
}
.status-badge.unknown .badge-dot { background: #94a3b8; }

.metrics-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #f8fafc;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid #f1f5f9;
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
  font-size: 0.78rem;
}

.metric-label {
  color: #64748b;
  font-weight: 600;
}

.metric-value {
  color: #1e293b;
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 0.8rem;
}

.progress-track {
  width: 100%;
  height: 6px;
  background: #e2e8f0;
  border-radius: 999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.progress-fill.normal { background: #22c55e; }
.progress-fill.warning { background: #f59e0b; }
.progress-fill.critical { background: #ef4444; }

.container-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 10px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  text-align: center;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-size: 0.72rem;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
}

.stat-number {
  font-size: 0.88rem;
  font-weight: 700;
  color: #1e293b;
  font-family: var(--font-mono);
}

.container-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 4px;
}

.action-btn {
  flex: 1 1 calc(50% - 4px);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 10px;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 600;
  transition: all 0.15s ease;
}

.metrics-btn {
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
}
.metrics-btn:hover {
  background: #dbeafe;
  color: #1d4ed8;
}

.logs-btn {
  background: #f1f5f9;
  color: #334155;
  border: 1px solid #cbd5e1;
}
.logs-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.restart-btn {
  background: #fefce8;
  color: #ca8a04;
  border: 1px solid #fef08a;
}
.restart-btn:hover {
  background: #fef08a;
  color: #a16207;
}

.stop-btn {
  background: #fff1f2;
  color: #e11d48;
  border: 1px solid #fecdd3;
}
.stop-btn:hover {
  background: #ffe4e6;
  color: #be123c;
}

.no-containers {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 56px 24px;
  background: #ffffff;
  border: 1px dashed #cbd5e1;
  border-radius: 16px;
  text-align: center;
}

.empty-icon {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: #f1f5f9;
  color: #94a3b8;
  margin-bottom: 14px;
}

.no-containers strong {
  font-size: 1.1rem;
  color: #1e293b;
  margin-bottom: 4px;
}

.no-containers p {
  color: #64748b;
  font-size: 0.88rem;
  margin: 0;
}

footer {
  width: 100%;
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
  padding: 20px 0;
  margin-top: auto;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 28px;
  text-align: center;
}

footer p {
  margin: 0;
  color: #64748b;
  font-size: 0.86rem;
}

footer strong {
  color: #172033;
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
