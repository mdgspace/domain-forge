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
              <router-link to="/health" class="nav-link-item">
                <HeartPulse :size="16" :stroke-width="2.5" />
                <span>Health</span>
              </router-link>
            </li>
            <li>
              <button @click="showApiKeyModal = true" class="flat-nav-btn">
                <Key :size="15" :stroke-width="2.5" />
                <span>API Key</span>
              </button>
            </li>
            <li>
              <button @click="logoutAndRedirect" class="flat-logout-btn">
                <LogOut :size="15" :stroke-width="2.5" />
                <span>Logout</span>
              </button>
            </li>
          </ul>
        </div>
      </nav>
    </header>
    
    <div id="home-container">
      <div id="home-heading">
        <div class="heading-text">
          <p class="eyebrow">WORKSPACE / OVERVIEW</p>
          <h1>Good to see you, <span class="text-primary">{{ user }}</span></h1>
          <p class="page-subtitle">Manage your subdomains, monitor live container telemetry, and deploy updates.</p>
        </div>
        <button class="primary-action-btn" @click="showModal = true">
          <Plus :size="18" :stroke-width="2.5" />
          <span>Add Subdomain</span>
        </button>
      </div>

      <!-- Color Block Summary Cards -->
      <div class="summary-grid">
        <div class="summary-card block-blue">
          <div class="summary-icon-circle bg-white text-blue">
            <Zap :size="24" :stroke-width="2.5" />
          </div>
          <div class="summary-content">
            <strong class="summary-count">{{ maps.length }}</strong>
            <span class="summary-label">Total subdomains</span>
          </div>
        </div>

        <div class="summary-card block-emerald">
          <div class="summary-icon-circle bg-white text-emerald">
            <CheckCircle2 :size="24" :stroke-width="2.5" />
          </div>
          <div class="summary-content">
            <strong class="summary-count">{{ readyCount }}</strong>
            <span class="summary-label">Healthy deployments</span>
          </div>
        </div>

        <div class="summary-card block-amber">
          <div class="summary-icon-circle bg-white text-amber">
            <Clock :size="24" :stroke-width="2.5" />
          </div>
          <div class="summary-content">
            <strong class="summary-count">{{ activeCount }}</strong>
            <span class="summary-label">Deploying or pending</span>
          </div>
        </div>
      </div>

      <!-- Deployments Table Card (Color Block Flat Structure) -->
      <div class="table-card">
        <div class="table-toolbar">
          <div>
            <h2>Deployments</h2>
            <p>{{ maps.length }} {{ maps.length === 1 ? 'subdomain' : 'subdomains' }} active</p>
          </div>
          <div class="live-pill">
            <span class="live-indicator-dot"></span>
            <span>LIVE STATUS</span>
          </div>
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
                      <span>{{ item[field] }}</span>
                      <ExternalLink :size="13" :stroke-width="2.5" />
                    </a>
                  </span>

                  <span v-else-if="field === 'status'">
                    <span :class="'status-badge status-' + (item[field] || 'READY').toLowerCase()">
                      <span class="badge-dot"></span>
                      {{ item[field] || 'READY' }}
                    </span>
                  </span>

                  <span v-else-if="field === ''">
                    <div class="row-actions">
                      <button class="action-btn logs-btn" @click="showLogsModal=true;selectedItem=item">
                        <Terminal :size="13" :stroke-width="2.5" />
                        <span>Logs</span>
                      </button>
                      <button
                        v-if="item.resource_type && item.resource_type.toLowerCase().includes('github')"
                        class="action-btn redeploy-btn"
                        :disabled="redeploying === item.subdomain"
                        @click="redeployItem(item)"
                      >
                        <RotateCw :size="13" :stroke-width="2.5" :class="{ 'spin': redeploying === item.subdomain }" />
                        <span>{{ redeploying === item.subdomain ? 'Redeploying…' : 'Redeploy' }}</span>
                      </button>
                      <button class="action-btn delete-btn" @click="showDeleteModal=true;selectedItem=item">
                        <Trash2 :size="13" :stroke-width="2.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          <div v-if="!maps.length" class="empty-state">
            <div class="empty-state-circle">
              <Rocket :size="32" :stroke-width="2.5" />
            </div>
            <strong>No subdomains deployed yet</strong>
            <span>Create your first deployment to get started.</span>
            <button class="empty-cta-btn" @click="showModal = true">
              <Plus :size="16" :stroke-width="2.5" />
              <span>Add Subdomain</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Modals rendered at container root level -->
      <modal v-show="showModal" @close-modal="showModal = false" />
      <deletemodal v-show="showDeleteModal" @close-modal="showDeleteModal = false" :selectedItem="selectedItem" />
      <LogsModal v-if="showLogsModal" :subdomain="selectedItem?.subdomain" :user="user" @close-modal="showLogsModal = false" />
      <ApiKeyModal v-show="showApiKeyModal" :apiKey="apiKey" @close-modal="showApiKeyModal = false" />
    </div>

    <!-- Solid High-Contrast Flat Dark Footer -->
    <footer class="flat-footer">
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
import { 
  HeartPulse, 
  Key, 
  LogOut, 
  Plus, 
  Zap, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  Terminal, 
  RotateCw, 
  Trash2, 
  Rocket 
} from 'lucide-vue-next';

export default {
  components: { 
    modal, 
    deletemodal, 
    ApiKeyModal, 
    LogsModal,
    HeartPulse, 
    Key, 
    LogOut, 
    Plus, 
    Zap, 
    CheckCircle2, 
    Clock, 
    ExternalLink, 
    Terminal, 
    RotateCw, 
    Trash2, 
    Rocket 
  },
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
.nav-link-item.router-link-active {
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

.flat-nav-btn:hover {
  background-color: var(--color-muted-hover);
  transform: scale(1.05);
}

.flat-logout-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--color-danger);
  background-color: var(--color-danger-subtle);
  border-radius: var(--radius-md);
  border: 0;
}

.flat-logout-btn:hover {
  background-color: #fecaca;
  transform: scale(1.05);
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
  margin-bottom: 6px;
  color: var(--color-primary);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

#home-heading h1 {
  margin: 0;
  font-size: clamp(2rem, 3.8vw, 2.9rem);
  line-height: 1.1;
  color: var(--color-fg);
  letter-spacing: -0.03em;
  font-weight: 800;
}

.text-primary {
  color: var(--color-primary);
}

.page-subtitle {
  margin: 8px 0 0;
  color: #6b7280;
  font-size: 0.98rem;
}

.primary-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  padding: 13px 24px;
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: #ffffff;
  font-size: 0.96rem;
  font-weight: 700;
  border: 0;
}

.primary-action-btn:hover {
  background-color: var(--color-primary-hover);
  transform: scale(1.05);
}

/* Color Block Summary Cards */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 22px 24px;
  border-radius: var(--radius-lg);
  transition: transform var(--transition-fast);
}

.summary-card:hover {
  transform: scale(1.02);
}

.block-blue { background-color: var(--color-blue-subtle); }
.block-emerald { background-color: var(--color-emerald-subtle); }
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
  font-size: 0.84rem;
  font-weight: 600;
}

/* Table Flat Structure */
.table-card {
  background-color: #ffffff;
  border: 2px solid var(--color-muted);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 2px solid var(--color-muted);
}

.table-toolbar h2 {
  margin: 0;
  color: var(--color-fg);
  font-size: 1.2rem;
  font-weight: 800;
}

.table-toolbar p {
  margin: 3px 0 0;
  color: #6b7280;
  font-size: 0.85rem;
}

.live-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background-color: var(--color-emerald-subtle);
  border-radius: var(--radius-full);
  color: #065f46;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.05em;
}

.live-indicator-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--color-secondary);
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
  background-color: var(--color-muted);
  color: #374151;
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border-bottom: 2px solid #e5e7eb;
}

#tableComponent td {
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-muted);
  color: #374151;
  font-size: 0.9rem;
  vertical-align: middle;
  white-space: nowrap;
}

#tableComponent tbody tr:hover {
  background-color: #f9fafb;
}

#tableComponent td:first-child {
  color: #6b7280;
  font-family: var(--font-mono);
  font-size: 0.84rem;
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
  color: var(--color-primary);
  font-weight: 700;
  font-size: 0.92rem;
  text-decoration: none;
}

.subdomain-link:hover {
  text-decoration: underline;
}

.cell-value {
  display: block;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Flat Status Badges */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--radius-md);
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-ready {
  background-color: var(--color-emerald-subtle);
  color: #065f46;
}
.status-ready .badge-dot { background-color: var(--color-secondary); }

.status-deploying {
  background-color: var(--color-amber-subtle);
  color: #92400e;
}
.status-deploying .badge-dot { background-color: var(--color-accent); }

.status-failed {
  background-color: var(--color-danger-subtle);
  color: #991b1b;
}
.status-failed .badge-dot { background-color: var(--color-danger); }

.status-pending {
  background-color: var(--color-muted);
  color: #374151;
}
.status-pending .badge-dot { background-color: #9ca3af; }

/* Flat Row Action Buttons */
.row-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-md);
  font-size: 0.8rem;
  font-weight: 700;
  border: 0;
}

.logs-btn {
  background-color: var(--color-muted);
  color: var(--color-fg);
}
.logs-btn:hover { background-color: var(--color-muted-hover); }

.redeploy-btn {
  background-color: var(--color-blue-subtle);
  color: var(--color-primary);
}
.redeploy-btn:hover:not(:disabled) { background-color: #dbeafe; }

.delete-btn {
  background-color: var(--color-danger-subtle);
  color: var(--color-danger-hover);
}
.delete-btn:hover { background-color: #fecaca; }

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  text-align: center;
}

.empty-state-circle {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: var(--color-muted);
  color: #9ca3af;
  margin-bottom: 16px;
}

.empty-state strong {
  color: var(--color-fg);
  font-size: 1.15rem;
  font-weight: 800;
  margin-bottom: 4px;
}

.empty-state span {
  color: #6b7280;
  font-size: 0.9rem;
  margin-bottom: 20px;
}

.empty-cta-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background-color: var(--color-primary);
  color: white;
  border-radius: var(--radius-md);
  font-size: 0.88rem;
  font-weight: 700;
}

.empty-cta-btn:hover {
  background-color: var(--color-primary-hover);
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

@media (max-width: 768px) {
  #home-container {
    padding-top: 96px;
  }

  #home-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .primary-action-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
