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
              <span>{{ container.cpuPercent.toFixed(1) }}%</span>
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
              <span>{{ container.memoryUsageMB }}MB</span>
            </div>
          </div>

          <div class="container-stats">
            <span><strong>Restarts:</strong> {{ container.restartCount }}</span> | 
            <span><strong>Stops:</strong> {{ container.stopCount }}</span>
          </div>

          <div class="container-actions">
            <button @click="viewMetrics(container)" class="view-btn">
              View Metrics
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

    <div v-if="selectedContainer" class="modal-overlay" @click.self="closeMetrics">
      <div class="metrics-modal">
        <header class="modal-header">
          <h2>{{ selectedContainer.subdomain }} - Metrics</h2>
          <button @click="closeMetrics" class="close-btn">×</button>
        </header>

        <div class="time-selector">
          <label>Time Range:</label>
          <select v-model="selectedTimeStep" @change="loadMetrics">
            <option value="1s">Per Second (5 min)</option>
            <option value="15s">Per 15 Sec (15 min)</option>
            <option value="1m">Per Minute (1 hour)</option>
            <option value="5m">Per 5 Min (6 hours)</option>
            <option value="1h">Per Hour (24 hours)</option>
            <option value="1d">Per Day (7 days)</option>
          </select>
        </div>

        <div class="charts-container">
          <div class="chart-wrapper">
            <h3>CPU Usage (%)</h3>
            <canvas ref="cpuChart"></canvas>
          </div>
          <div class="chart-wrapper">
            <h3>Memory Usage (MB)</h3>
            <canvas ref="memoryChart"></canvas>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';

let Chart: any = null;

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
  setup() {
    const router = useRouter();
    const loading = ref(false);
    const containers = ref<Container[]>([]);
    const summary = ref<HealthSummary | null>(null);
    const selectedContainer = ref<Container | null>(null);
    const selectedTimeStep = ref('1m');
    const cpuChart = ref<HTMLCanvasElement | null>(null);
    const memoryChart = ref<HTMLCanvasElement | null>(null);
    const username = ref<string>('');
    
    let cpuChartInstance: any = null;
    let memoryChartInstance: any = null;

    const BACKEND_URL = import.meta.env.VITE_APP_BACKEND || 'http://localhost:7000';

    const getAuthParams = () => {
      const token = localStorage.getItem('JWTUser') || '';
      const provider = localStorage.getItem('provider') || '';
      return `user=${encodeURIComponent(username.value)}&token=${encodeURIComponent(token)}&provider=${encodeURIComponent(provider)}`;
    }

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

    const viewMetrics = async (container: Container) => {
      selectedContainer.value = container;
      await nextTick();
      loadMetrics();
    };

    const closeMetrics = () => {
      selectedContainer.value = null;
      if (cpuChartInstance) cpuChartInstance.destroy();
      if (memoryChartInstance) memoryChartInstance.destroy();
    };

    const loadMetrics = async () => {
      if (!selectedContainer.value) return;

      const containerIdentifier = selectedContainer.value.subdomain || selectedContainer.value.name;
      if (!containerIdentifier) {
        console.error('No container identifier available');
        return;
      }

      try {
        const response = await fetch(
          `${BACKEND_URL}/health/${containerIdentifier}/metrics?step=${selectedTimeStep.value}&${getAuthParams()}`
        );
        const data = await response.json();

        if (!Chart) {
          const module = await import('https://cdn.jsdelivr.net/npm/chart.js@4.4.0/+esm');
          Chart = module.Chart;
          const { 
            CategoryScale, 
            LinearScale, 
            PointElement, 
            LineElement, 
            LineController,
            Title, 
            Tooltip, 
            Legend,
            Filler 
          } = module;
          Chart.register(CategoryScale, LinearScale, PointElement, LineElement, LineController, Title, Tooltip, Legend, Filler);
        }

        if (cpuChartInstance) cpuChartInstance.destroy();
        if (memoryChartInstance) memoryChartInstance.destroy();

        const labels = data.cpu.map((d: any) => {
          const date = new Date(d.timestamp);
          return date.toLocaleTimeString();
        });

        if (cpuChart.value) {
          cpuChartInstance = new Chart(cpuChart.value, {
            type: 'line',
            data: {
              labels,
              datasets: [{
                label: 'CPU %',
                data: data.cpu.map((d: any) => d.value),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.3,
              }],
            },
            options: {
              responsive: true,
              scales: {
                y: { beginAtZero: true, max: 100 },
              },
            },
          });
        }

        if (memoryChart.value) {
          memoryChartInstance = new Chart(memoryChart.value, {
            type: 'line',
            data: {
              labels,
              datasets: [{
                label: 'Memory (MB)',
                data: data.memory.map((d: any) => d.valueMB),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.3,
              }],
            },
            options: {
              responsive: true,
              scales: {
                y: { beginAtZero: true },
              },
            },
          });
        }
      } catch (error) {
        console.error('Failed to load metrics:', error);
      }
    };

    const restartContainer = async (container: Container) => {
      const containerIdentifier = container.subdomain || container.name;
      if (!confirm(`Restart container ${containerIdentifier}?`)) return;

      try {
        const token = localStorage.getItem('JWTUser') || '';
        const provider = localStorage.getItem('provider') || '';
        
        await fetch(`${BACKEND_URL}/health/${containerIdentifier}/restart`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ author: username.value, token: token, provider }),
        });

        alert(`Restart initiated for ${containerIdentifier}`);
        fetchHealth();
      } catch (error) {
        console.error('Failed to restart:', error);
        alert('Failed to restart container');
      }
    };

    const stopContainer = async (container: Container) => {
      const containerIdentifier = container.subdomain || container.name;
      if (!confirm(`Stop container ${containerIdentifier}?`)) return;

      try {
        const token = localStorage.getItem('JWTUser') || '';
        const provider = localStorage.getItem('provider') || '';
        
        await fetch(`${BACKEND_URL}/health/${containerIdentifier}/stop`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ author: username.value, token: token, provider }),
        });

        alert(`Stop initiated for ${containerIdentifier}`);
        fetchHealth();
      } catch (error) {
        console.error('Failed to stop:', error);
        alert('Failed to stop container');
      }
    };

    onMounted(async() => {
      await fetchUsername();
      fetchHealth();
    });

    return {
      loading,
      containers,
      summary,
      selectedContainer,
      selectedTimeStep,
      cpuChart,
      memoryChart,
      refreshData,
      goBack,
      getMetricClass,
      viewMetrics,
      closeMetrics,
      loadMetrics,
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
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  width: auto;
}

.refresh-btn {
  background: #3b82f6;
  color: white;
  border: none;
}

.back-btn {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.summary-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.summary-card {
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
}

.summary-card.total { border-left: 4px solid #6366f1; }
.summary-card.healthy { border-left: 4px solid #10b981; }
.summary-card.unhealthy { border-left: 4px solid #ef4444; }
.summary-card.percent { border-left: 4px solid #f59e0b; }

.summary-value {
  display: block;
  font-size: 2.5rem;
  font-weight: 700;
  color: #111827;
}

.summary-label {
  color: #6b7280;
  font-size: 0.875rem;
}

.containers-section h2 {
  margin-bottom: 1rem;
}

.container-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.container-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  transition: box-shadow 0.2s;
}

.container-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.container-card.unhealthy {
  border-color: #fecaca;
  background: #fef2f2;
}

.container-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.container-header h3 {
  margin: 0;
  font-size: 1.25rem;
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
  width: 60px;
  text-align: right;
  font-size: 0.875rem;
  font-weight: 500;
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
  gap: 0.75rem;
}

.view-btn, .restart-btn, .stop-btn {
  flex: 1;
  padding: 0.5rem;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  width: auto;
}

.view-btn {
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
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

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.metrics-modal {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 2rem;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.modal-header h2 {
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #6b7280;
  width: auto;
  padding: 0;
}

.time-selector {
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.time-selector select {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  font-size: 1rem;
}

.charts-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.chart-wrapper {
  background: #f9fafb;
  padding: 1rem;
  border-radius: 12px;
}

.chart-wrapper h3 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: #374151;
}

.no-containers {
  text-align: center;
  padding: 3rem;
  color: #6b7280;
  font-size: 1.125rem;
}

@media (max-width: 768px) {
  .summary-section {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .charts-container {
    grid-template-columns: 1fr;
  }
  
  .container-grid {
    grid-template-columns: 1fr;
  }
}
</style>
