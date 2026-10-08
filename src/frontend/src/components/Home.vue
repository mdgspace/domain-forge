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
              <router-link to="/health" class="nav-link-item">Health</router-link>
            </li>
            <li>
              <button @click="showApiKeyModal = true" class="secondary-nav-btn">
                <svg class="btn-icon" viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
                  <path fill-rule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clip-rule="evenodd" />
                </svg>
                API Key
              </button>
            </li>
            <li>
              <button @click="logoutAndRedirect" class="logout-btn">
                Logout
              </button>
            </li>
          </ul>
        </div>
      </nav>
    </header>
    
    <div id="home-container">
      <div id="home-heading">
        <div class="heading-text">
          <p class="eyebrow">Workspace / Overview</p>
          <h1>Good to see you, <span>{{ user }}</span></h1>
          <p class="page-subtitle">Manage subdomains, monitor live container health, and deploy updates seamlessly.</p>
        </div>
        <button class="primary-action" @click="showModal = true">
          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
            <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
          </svg>
          Add Subdomain
        </button>
      </div>

      <div class="summary-grid">
        <div class="summary-card summary-card-primary">
          <div class="summary-icon-wrap primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="20" height="20">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div class="summary-content">
            <strong class="summary-count">{{ maps.length }}</strong>
            <span class="summary-label">Total subdomains</span>
          </div>
        </div>

        <div class="summary-card">
          <div class="summary-icon-wrap success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="20" height="20">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="summary-content">
            <strong class="summary-count">{{ readyCount }}</strong>
            <span class="summary-label">Healthy deployments</span>
          </div>
        </div>

        <div class="summary-card">
          <div class="summary-icon-wrap warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="20" height="20">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="summary-content">
            <strong class="summary-count">{{ activeCount }}</strong>
            <span class="summary-label">Deploying or pending</span>
          </div>
        </div>
      </div>

      <div class="table-card">
        <div class="table-toolbar">
          <div>
            <h2>Deployments</h2>
            <p>{{ maps.length }} {{ maps.length === 1 ? 'subdomain' : 'subdomains' }} configured in this workspace</p>
          </div>
          <span class="live-indicator">
            <span class="pulse-dot"></span> Live status
          </span>
        </div>

        <div class="table-scroll">
          <table id="tableComponent">
            <thead>
              <tr>
                <th v-for="field in fields" :key="field">
                  {{ field === "" ? "Actions" : field.replace("_", " ") }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in maps" :key="item.subdomain">
                <td v-for="field in fields" :key="field">
                  <span v-if="item[field] && field !== 'subdomain' && field !== 'status'" class="cell-value">
                    {{ item[field] }}
                  </span>
                  
                  <span v-else-if="field === 'subdomain'" class="subdomain-cell">
                    <a :href="'https://' + item[field]" target="_blank" rel="noopener noreferrer" class="subdomain-link">
                      {{ item[field] }}
                      <svg class="external-icon" viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
                        <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                        <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                      </svg>
                    </a>
                  </span>

                  <span v-else-if="field === 'status'">
                    <span :class="'status-badge status-' + (item[field] || 'READY').toLowerCase()">
                      <span class="badge-point"></span>
                      {{ item[field] || 'READY' }}
                    </span>
                  </span>

                  <span v-else-if="field === ''">
                    <div class="row-actions">
                      <button class="logs-btn" @click="showLogsModal=true;selectedItem=item">
                        Logs
                      </button>
                      <button
                        v-if="item.resource_type && item.resource_type.toLowerCase().includes('github')"
                        class="redeploy-btn"
                        :disabled="redeploying === item.subdomain"
                        @click="redeployItem(item)"
                      >
                        {{ redeploying === item.subdomain ? 'Redeploying…' : 'Redeploy' }}
                      </button>
                      <button class="delete-btn" @click="showDeleteModal=true;selectedItem=item">
                        Delete
                      </button>
                    </div>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          <div v-if="!maps.length" class="empty-state">
            <div class="empty-state-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="36" height="36">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <strong>No subdomains yet</strong>
            <span>Create your first deployment to get started.</span>
            <button class="empty-cta" @click="showModal = true">+ Add Subdomain</button>
          </div>
        </div>
      </div>

      <!-- Modals rendered at container root level -->
      <modal v-show="showModal" @close-modal="showModal = false" />
      <deletemodal v-show="showDeleteModal" @close-modal="showDeleteModal = false" :selectedItem="selectedItem" />
      <LogsModal v-if="showLogsModal" :subdomain="selectedItem?.subdomain" :user="user" @close-modal="showLogsModal = false" />
      <ApiKeyModal v-show="showApiKeyModal" :apiKey="apiKey" @close-modal="showApiKeyModal = false" />
    </div>

    <footer>
      <div class="footer-content">
        <p>Made with ❤️ by <strong>MDG Space</strong></p>
      </div>
    </footer>
  </div>
</template>

<script>
import { computed, ref } from 'vue';
import { getMaps } from '../utils/maps.ts';
import { check_jwt } from '../utils/authorize.ts';
import modal from './modal.vue';
import deletemodal from './deletemodal.vue';
import ApiKeyModal from './ApiKeyModal.vue';
import LogsModal from './LogsModal.vue';
import { redeploySubdomain } from '../utils/redeploy.ts';

export default {
  components: { modal, deletemodal, ApiKeyModal, LogsModal },
  async setup() {
    const token = localStorage.getItem("JWTUser");
    const provider = localStorage.getItem("provider");
    const user = await check_jwt(token, provider);
    const apiKey = localStorage.getItem("apiKey");
    // Wrap in ref so live status updates from the SSE stream re-render the table.
    const maps = ref(await getMaps(user));
    const fields = ["date", "subdomain", "status", "resource", "resource_type", ""];

    return {
      user,
      apiKey,
      maps,
      fields,
      readyCount: computed(() => maps.value.filter((item) => (item.status || 'READY').toUpperCase() === 'READY').length),
      activeCount: computed(() => maps.value.filter((item) => ['DEPLOYING', 'PENDING'].includes((item.status || '').toUpperCase())).length),
    };
  },
  data() {
    return {
      showDeleteModal: false,
      showModal: false,
      showApiKeyModal: false,
      showLogsModal: false,
      selectedItem: null,
      redeploying: null,
      statusStreamAbortController: null,
      statusReconnectTimer: null,
      statusStreamTimedOut: false,
    };
  },
  methods: {
    logoutAndRedirect() {
      localStorage.clear();
      this.$router.push({ path: '/login' });
    },
    async redeployItem(item) {
      if (!window.confirm(`Redeploy ${item.subdomain}? This will delete its current container and build a new one.`)) {
        return;
      }

      this.redeploying = item.subdomain;
      try {
        await redeploySubdomain(item.subdomain);
        // The host deployment script will replace this with READY or FAILED.
        item.status = 'DEPLOYING';
      } catch (error) {
        window.alert(error instanceof Error ? error.message : 'Could not initiate redeployment.');
      } finally {
        this.redeploying = null;
      }
    },
    async connectStatusStream() {
      const token = localStorage.getItem('JWTUser');
      const provider = localStorage.getItem('provider');
      if (!token || !provider) return;

      const backend = import.meta.env.VITE_APP_BACKEND.replace(/\/$/, '');
      const controller = new AbortController();
      this.statusStreamAbortController = controller;
      this.statusStreamTimedOut = false;

      // Fail fast if the response headers do not arrive (e.g. a buffering proxy).
      // This stops the request from staying "pending" forever on staging.
      const connectTimeout = window.setTimeout(() => {
        this.statusStreamTimedOut = true;
        controller.abort();
      }, 10000);

      try {
        const response = await fetch(`${backend}/map/status-stream`, {
          headers: {
            'Accept': 'text/event-stream',
            'Authorization': `Bearer ${token}`,
            'X-Auth-Provider': provider,
          },
          signal: controller.signal,
        });
        window.clearTimeout(connectTimeout);
        if (!response.ok || !response.body) throw new Error('Unable to open status stream.');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let pending = '';
        while (!controller.signal.aborted) {
          const { value, done } = await reader.read();
          if (done) break;
          pending += decoder.decode(value, { stream: true });
          const events = pending.split('\n\n');
          pending = events.pop() || '';
          for (const event of events) this.applyStatusEvent(event);
        }
      } catch (error) {
        if (!controller.signal.aborted) console.error('Status stream disconnected.', error);
      } finally {
        window.clearTimeout(connectTimeout);
        if (this.statusStreamAbortController === controller) {
          this.statusStreamAbortController = null;
          // Reconnect on unexpected disconnect OR on the connection timeout, but
          // never after an intentional abort from beforeUnmount().
          if (!controller.signal.aborted || this.statusStreamTimedOut) {
            this.statusReconnectTimer = window.setTimeout(() => this.connectStatusStream(), 2000);
          }
        }
      }
    },
    applyStatusEvent(event) {
      const eventType = event.match(/^event:\s*(.+)$/m)?.[1];
      const data = event.match(/^data:\s*(.+)$/m)?.[1];
      if (eventType !== 'status' || !data) return;

      try {
        const update = JSON.parse(data);
        // Case-insensitive match to tolerate subdomain casing differences.
        const map = this.maps.find(
          (item) => item.subdomain?.toLowerCase() === update.subdomain?.toLowerCase(),
        );
        if (map) {
          map.status = update.status;
        } else {
          console.warn('Status event for unknown subdomain:', update);
        }
      } catch (error) {
        console.error('Ignoring malformed deployment status event.', error);
      }
    }
  },
  mounted() {
    this.connectStatusStream();
  },
  beforeUnmount() {
    this.statusStreamAbortController?.abort();
    if (this.statusReconnectTimer) window.clearTimeout(this.statusReconnectTimer);
  }
};
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
.nav-link-item.router-link-active {
  color: #172033;
  background: rgba(0, 0, 0, 0.04);
}

.secondary-nav-btn {
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

.secondary-nav-btn:hover {
  background: #f8fafc;
  border-color: #94a3b8;
  color: #0f172a;
}

.logout-btn {
  padding: 7px 14px;
  font-size: 0.84rem;
  font-weight: 600;
  color: #64748b;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.logout-btn:hover {
  color: #dc2626;
  background: #fef2f2;
}

#home-container {
  width: min(1200px, calc(100% - 48px));
  margin: 0 auto;
  padding: 110px 0 60px;
  display: flex;
  flex-direction: column;
  gap: 28px;
  flex: 1;
}

#home-heading {
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}

.heading-text {
  display: flex;
  flex-direction: column;
}

.eyebrow {
  margin-bottom: 8px;
  color: #2563eb;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

#home-heading h1 {
  margin: 0;
  font-size: clamp(1.9rem, 3.5vw, 2.75rem);
  line-height: 1.1;
  color: #172033;
  letter-spacing: -0.04em;
  font-weight: 700;
}

#home-heading h1 span {
  color: #2563eb;
}

.page-subtitle {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 0.95rem;
}

.primary-action {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  padding: 11px 20px;
  border-radius: 10px;
  background: #2563eb;
  color: #ffffff;
  font-size: 0.92rem;
  font-weight: 600;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.24);
  transition: all 0.2s ease;
}

.primary-action:hover {
  background: #1d4ed8;
  box-shadow: 0 6px 20px rgba(37, 99, 235, 0.32);
  transform: translateY(-1px);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
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

.summary-card-primary {
  border-color: #bfdbfe;
  background: linear-gradient(145deg, #eff6ff 0%, #ffffff 100%);
}

.summary-icon-wrap {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  flex-shrink: 0;
}

.summary-icon-wrap.primary {
  background: #dbeafe;
  color: #2563eb;
}

.summary-icon-wrap.success {
  background: #dcfce7;
  color: #16a34a;
}

.summary-icon-wrap.warning {
  background: #fef3c7;
  color: #d97706;
}

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

.summary-label {
  margin-top: 4px;
  color: #64748b;
  font-size: 0.8rem;
  font-weight: 600;
}

.table-card {
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05);
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #f1f5f9;
}

.table-toolbar h2 {
  margin: 0 0 2px;
  color: #172033;
  font-size: 1.1rem;
  font-weight: 700;
}

.table-toolbar p {
  margin: 0;
  color: #64748b;
  font-size: 0.84rem;
}

.live-indicator {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 999px;
  color: #15803d;
  font-size: 0.78rem;
  font-weight: 600;
}

.pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.25);
  animation: pulse-ring 2s infinite ease-in-out;
}

@keyframes pulse-ring {
  0% { transform: scale(0.95); opacity: 0.8; }
  50% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.8; }
}

.table-scroll {
  overflow-x: auto;
}

#tableComponent {
  width: 100%;
  min-width: 820px;
  border-collapse: collapse;
  text-align: left;
}

#tableComponent th {
  padding: 14px 20px;
  background: #f8fafc;
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border-bottom: 1px solid #e2e8f0;
}

#tableComponent td {
  padding: 16px 20px;
  border-top: 1px solid #f1f5f9;
  color: #334155;
  font-size: 0.88rem;
  vertical-align: middle;
  white-space: nowrap;
}

#tableComponent tbody tr {
  transition: background-color 0.15s ease;
}

#tableComponent tbody tr:hover {
  background-color: #f8fafc;
}

#tableComponent td:first-child {
  color: #64748b;
  font-family: var(--font-mono);
  font-size: 0.8rem;
}

.subdomain-cell {
  display: inline-flex;
  align-items: center;
}

.subdomain-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  color: #2563eb;
  font-weight: 600;
  font-size: 0.88rem;
  text-decoration: none;
  transition: color 0.15s ease;
}

.subdomain-link:hover {
  color: #1d4ed8;
  text-decoration: underline;
}

.external-icon {
  opacity: 0.6;
}

.subdomain-link:hover .external-icon {
  opacity: 1;
}

.cell-value {
  display: block;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.88rem;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.badge-point {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-ready {
  background-color: #dcfce7;
  color: #15803d;
}
.status-ready .badge-point { background-color: #22c55e; }

.status-deploying {
  background-color: #fef3c7;
  color: #b45309;
}
.status-deploying .badge-point { background-color: #f59e0b; animation: pulse-ring 1.5s infinite; }

.status-failed {
  background-color: #fee2e2;
  color: #b91c1c;
}
.status-failed .badge-point { background-color: #ef4444; }

.status-pending {
  background-color: #f1f5f9;
  color: #475569;
}
.status-pending .badge-point { background-color: #94a3b8; }

.row-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logs-btn {
  background-color: #f1f5f9;
  color: #334155;
  border: 1px solid #cbd5e1;
  padding: 6px 12px;
  border-radius: 7px;
  font-size: 0.78rem;
  font-weight: 600;
}

.logs-btn:hover {
  background-color: #e2e8f0;
  color: #0f172a;
}

.redeploy-btn {
  background-color: #f5f3ff;
  color: #6d28d9;
  border: 1px solid #ddd6fe;
  padding: 6px 12px;
  border-radius: 7px;
  font-size: 0.78rem;
  font-weight: 600;
}

.redeploy-btn:hover:not(:disabled) {
  background-color: #ede9fe;
  color: #5b21b6;
}

.redeploy-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

.delete-btn {
  background-color: #fff1f2;
  color: #e11d48;
  border: 1px solid #fecdd3;
  padding: 6px 12px;
  border-radius: 7px;
  font-size: 0.78rem;
  font-weight: 600;
}

.delete-btn:hover {
  background-color: #ffe4e6;
  color: #be123c;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 56px 24px;
  text-align: center;
}

.empty-state-icon {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: #f1f5f9;
  color: #94a3b8;
  margin-bottom: 16px;
}

.empty-state strong {
  color: #1e293b;
  font-size: 1.1rem;
  margin-bottom: 4px;
}

.empty-state span {
  color: #64748b;
  font-size: 0.88rem;
  margin-bottom: 18px;
}

.empty-cta {
  padding: 9px 18px;
  background: #2563eb;
  color: white;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
}

.empty-cta:hover {
  background: #1d4ed8;
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

@media (max-width: 768px) {
  #home-container {
    width: min(100% - 32px, 1200px);
    padding-top: 96px;
  }

  #home-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .primary-action {
    width: 100%;
    justify-content: center;
  }

  .table-toolbar {
    padding: 16px 18px;
  }
}
</style>
