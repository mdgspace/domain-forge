<template>
  <header>
    <nav>
      <div class="nav-wrapper">
        <router-link to="/" class="brand-container">
          <img src="/df-logo.png" class="brand-logo" alt="logo">
          <p class="brand">Domain Forge</p>
        </router-link>
        <ul class="nav-links">
          <li><a href="https://github.com/mdgspace/domain-forge/blob/master/docs/users/README.md">Docs</a></li>
          <li><router-link to="/health" class="health-link">Health</router-link></li>
          <li class="login-provider">
            <button @click="showApiKeyModal = true" class="logout-button">Api Key</button>
          </li>
          <li class="login-provider">
            <button @click="logoutAndRedirect" class="logout-button">Logout</button>
          </li>
        </ul>
      </div>
    </nav>
  </header>
  
  <div id="home-container">
    <div id="home-heading">
      <div>
        <p class="eyebrow">Workspace / Overview</p>
        <h1>Good to see you, <span>{{ user }}</span></h1>
        <p class="page-subtitle">Everything you need to manage your domains and deployments in one place.</p>
      </div>
      <button class="primary-action" @click="showModal = true">+ Add subdomain</button>
    </div>
    <div class="summary-grid">
      <div class="summary-card summary-card-primary">
        <span class="summary-icon">⌁</span>
        <div>
          <strong>{{ maps.length }}</strong>
          <span>Total subdomains</span>
        </div>
      </div>
      <div class="summary-card">
        <span class="summary-icon summary-icon-success">✓</span>
        <div>
          <strong>{{ readyCount }}</strong>
          <span>Healthy deployments</span>
        </div>
      </div>
      <div class="summary-card">
        <span class="summary-icon summary-icon-warning">◷</span>
        <div>
          <strong>{{ activeCount }}</strong>
          <span>Deploying or pending</span>
        </div>
      </div>
    </div>
    <div class="table-card">
      <div class="table-toolbar">
        <div>
          <h2>Deployments</h2>
          <p>{{ maps.length }} {{ maps.length === 1 ? 'subdomain' : 'subdomains' }} configured</p>
        </div>
        <span class="live-indicator"><span></span> Live status</span>
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
            <span v-if="item[field] && field !== 'subdomain' && field !== 'status'" class="cell-value">{{ item[field] }}</span>
            <span v-else-if="field === 'subdomain'">
              <a :href="'https://' + item[field]" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: inherit;">{{ item[field] }}</a>
            </span>
            <span v-else-if="field === 'status'">
              <span :class="'status-badge status-' + (item[field] || 'READY').toLowerCase()">
                {{ item[field] || 'READY' }}
              </span>
            </span>
            <span v-else-if="field === ''">
              <deletemodal v-show="showDeleteModal" @close-modal="showDeleteModal = false" :selectedItem="selectedItem" />
              <div class="row-actions">
                <button class="logs-btn" @click="showLogsModal=true;selectedItem=item">Logs</button>
                <button
                  v-if="item.resource_type && item.resource_type.toLowerCase().includes('github')"
                  class="redeploy-btn"
                  :disabled="redeploying === item.subdomain"
                  @click="redeployItem(item)"
                >
                  {{ redeploying === item.subdomain ? 'Redeploying…' : 'Redeploy' }}
                </button>
                <button class="delete" @click="showDeleteModal=true;selectedItem=item">Delete!</button>
              </div>
            </span>
          </td>
        </tr>
      </tbody>
        </table>
        <div v-if="!maps.length" class="empty-state">
          <strong>No subdomains yet</strong>
          <span>Create your first deployment to get started.</span>
        </div>
      </div>
    </div>

    <modal v-show="showModal" @close-modal="showModal = false" />
    <LogsModal v-if="showLogsModal" :subdomain="selectedItem?.subdomain" :user="user" @close-modal="showLogsModal = false" />
  </div>

  <ApiKeyModal v-show="showApiKeyModal" :apiKey="apiKey" @close-modal="showApiKeyModal = false" />

  <footer>
    <p>Made with ❤️ by MDG Space</p>
  </footer>
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
.brand-logo {
  height: 30px;
  margin-right: 10px; 
}

body {
  overflow: hidden; 
  margin: 0; 
}

nav {
  width: 100%; 
  position: fixed; 
  top: 0;
  z-index: 10;
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid #e7ebf3;
}

header {
  margin-bottom: 20px;
}

.nav-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1180px;
  margin: 0 auto;
  padding: 14px 24px;
}

.brand {
  margin: 0;
  font-size: 24px;
}
.brand-container {
  display: flex;
  align-items: center;
  color: inherit;
  text-decoration: none;
}
.nav-links {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
}

.nav-links li {
  margin-right: 12px;
}

.nav-links li:last-child {
  margin-right: 0;
}

.nav-links a {
  text-decoration: none;
  color: #536074;
  font-weight: 600;
  padding: 10px 12px;
}

.logout-button {
  width: auto;
  padding: 9px 16px;
  font-size: 13px;
  background-color: #2563eb;
  color: #fff;
  border: none;
  border-radius: 9px;
  font-weight: 600;
  box-shadow: 0 5px 12px rgba(37, 99, 235, 0.18);
}

.logout-button:hover {
  background-color: #1d4ed8;
}

#home-container {
  width: min(1240px, calc(100% - 64px));
  margin: 0 auto;
  padding: 128px 0 54px;
  gap: 24px;
}

#home-heading {
  width: 100%;
  margin: 0;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}

#home-heading h1 {
  margin: 0;
  font-size: clamp(2rem, 4vw, 3.2rem);
  line-height: 1.05;
  text-align: left;
  letter-spacing: -0.06em;
}

#home-heading h1 span {
  color: #2563eb;
}

.eyebrow {
  margin-bottom: 10px;
  color: #2563eb;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.page-subtitle {
  max-width: 620px;
  margin: 14px 0 0;
  color: #718096;
  font-size: 0.98rem;
}

.primary-action {
  width: auto;
  flex: 0 0 auto;
  padding: 12px 18px;
  border-radius: 10px;
  background: #172033;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 600;
  box-shadow: 0 8px 18px rgba(23, 32, 51, 0.16);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 104px;
  padding: 18px 20px;
  border: 1px solid #e5eaf2;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 10px 28px rgba(34, 48, 79, 0.05);
}

.summary-card-primary {
  border-color: #d5e2ff;
  background: linear-gradient(135deg, #eff5ff, #fff);
}

.summary-icon {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 12px;
  background: #dce9ff;
  color: #2563eb;
  font-size: 1.4rem;
  font-weight: 700;
}

.summary-icon-success {
  background: #dcfce7;
  color: #16a34a;
}

.summary-icon-warning {
  background: #fef3c7;
  color: #d97706;
}

.summary-card div {
  display: grid;
  gap: 2px;
}

.summary-card strong {
  color: #172033;
  font-size: 1.65rem;
  line-height: 1;
}

.summary-card span:last-child {
  color: #7a8699;
  font-size: 0.78rem;
  font-weight: 600;
}

.table-card {
  overflow: hidden;
  border: 1px solid #e5eaf2;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 18px 45px rgba(34, 48, 79, 0.08);
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 22px 24px;
  border-bottom: 1px solid #edf0f5;
}

.table-toolbar h2 {
  margin: 0 0 3px;
  color: #172033;
  font-size: 1.05rem;
  text-align: left;
}

.table-toolbar p {
  margin: 0;
  color: #8a94a6;
  font-size: 0.82rem;
}

.live-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 600;
}

.live-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 4px #dcfce7;
}

.table-scroll {
  overflow-x: auto;
}

#tableComponent {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
  text-align: left;
}

#tableComponent th {
  padding: 14px 18px;
  background: #fafbfc;
  color: #8490a3;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

#tableComponent td {
  padding: 17px 18px;
  border-top: 1px solid #edf0f5;
  color: #4b5870;
  font-size: 0.88rem;
  white-space: nowrap;
}

.cell-value {
  display: block;
  max-width: 210px;
  overflow: hidden;
  text-overflow: ellipsis;
}

#tableComponent td:first-child {
  color: #8791a2;
  font-family: 'DM Mono', monospace;
  font-size: 0.78rem;
}

#tableComponent td a {
  color: #2563eb !important;
  font-weight: 600;
}

.row-actions {
  display: flex;
  justify-content: flex-start;
  gap: 7px;
}

.logs-btn {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 7px 11px;
  border-radius: 7px;
  font-size: 0.76rem;
  font-weight: 600;
}

.logs-btn:hover {
  background-color: #5a6268;
}

.redeploy-btn {
  background-color: #7c3aed;
  color: white;
  border: none;
  padding: 7px 11px;
  border-radius: 7px;
  font-size: 0.76rem;
  font-weight: 600;
}

.redeploy-btn:hover:not(:disabled) {
  background-color: #6d28d9;
}

.redeploy-btn:disabled {
  cursor: wait;
  opacity: 0.7;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
}

.delete {
  width: auto;
  margin: 0;
  height: auto;
  padding: 7px 11px;
  border: 0;
  border-radius: 7px;
  background: #fff1f2;
  color: #be123c;
  font-size: 0.76rem;
  font-weight: 600;
}

.delete:hover {
  background: #ffe4e6;
}

.empty-state {
  display: grid;
  justify-items: center;
  gap: 5px;
  padding: 52px 24px;
  color: #8791a2;
}

.empty-state strong {
  color: #344054;
}

.status-ready {
  background-color: #d4edda;
  color: #155724;
}

.status-deploying {
  background-color: #fff3cd;
  color: #856404;
  animation: pulse 2s infinite;
}

.status-failed {
  background-color: #f8d7da;
  color: #721c24;
}

.status-pending {
  background-color: #e2e3e5;
  color: #383d41;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

footer {
  width: 100%;
  background-color: #ffffff;
  padding: 20px 0;
  bottom: 0;
}

footer p {
  margin: 0;
  text-align: center;
}

@media (max-width: 700px) {
  #home-container {
    width: min(100% - 28px, 1180px);
    padding-top: 112px;
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
  }

  .table-toolbar {
    padding: 18px;
  }
}

</style>
