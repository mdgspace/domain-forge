<template>
  <header>
    <nav>
      <div class="nav-wrapper">
        <div class="brand-container">
          <img src="/df-logo.png" class="brand-logo" alt="logo">
          <p class="brand">Domain Forge</p>
        </div>
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
      <h3>{{ user }}'s subdomains:</h3>
    </div>
    <br>
    <table id="tableComponent" style="display:table; width:100%; padding: 0px 30px">
      <thead>
        <tr>
          <th v-for="field in fields" :key="field" style="padding:5px;background-color: #ffffff; color: #121212;border-bottom: 1px solid #121212; border-top:1px solid #121212;font-weight: 900;">
            <h3>{{ field === "" ? "Actions" : field.replace("_", " ") }}</h3>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in maps" :key="item.subdomain">
          <td v-for="field in fields" :key="field" style="border-bottom: 1px solid #121212">
            <span v-if="item[field] && field !== 'subdomain' && field !== 'status'">{{ item[field] }}</span>
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
              <div style="display: flex; gap: 10px; justify-content: center;">
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

    <modal v-show="showModal" @close-modal="showModal = false" />
    <LogsModal v-if="showLogsModal" :subdomain="selectedItem?.subdomain" :user="user" @close-modal="showLogsModal = false" />
    <div style="text-align: center;"><button @click="showModal = true">+ Add</button></div>
  </div>

  <ApiKeyModal v-show="showApiKeyModal" :apiKey="apiKey" @close-modal="showApiKeyModal = false" />

  <footer>
    <p>Made with ❤️ by MDG Space</p>
  </footer>
</template>

<script>
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
    const maps = await getMaps(user);
    const fields = ["date", "subdomain", "status", "resource", "resource_type", ""];

    return {
      user,
      apiKey,
      maps,
      fields
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

      try {
        const response = await fetch(`${backend}/map/status-stream`, {
          headers: {
            'Accept': 'text/event-stream',
            'Authorization': `Bearer ${token}`,
            'X-Auth-Provider': provider,
          },
          signal: controller.signal,
        });
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
        if (this.statusStreamAbortController === controller) {
          this.statusStreamAbortController = null;
          if (!controller.signal.aborted) {
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
        const map = this.maps.find((item) => item.subdomain === update.subdomain);
        if (map) map.status = update.status;
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
  padding-bottom: 5px;
  padding-top: 5px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

header {
  margin-bottom: 20px;
}

.nav-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px; 
}

.brand {
  margin: 0;
  font-size: 24px;
}
.brand-container {
  display: flex;
  align-items: center;
}
.nav-links {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
}

.nav-links li {
  margin-right: 20px;
}

.nav-links li:last-child {
  margin-right: 0;
}

.nav-links a {
  text-decoration: none;
  color: #333;
  font-weight: bold;
  padding: 10px; 
}

.logout-button {
  width: 10rem;
  padding: 8px 4px;
  font-size: 14px;
  background-color: #007bff;
  color: #fff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.logout-button:hover {
  background-color: #0056b3;
}

.logs-btn {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
}

.logs-btn:hover {
  background-color: #5a6268;
}

.redeploy-btn {
  background-color: #7c3aed;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
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
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
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

</style>
