<script setup type="module">
import { getMaps } from '../utils/maps.ts';
import { check_jwt } from '../utils/authorize.ts';
import modal from './modal.vue';
import deletemodal from './deletemodal.vue';
import ApiKeyModal from './ApiKeyModal.vue';
import DeploymentLogModal from './DeploymentLogModal.vue';
import { getDeploymentLogs } from '../utils/deployment-logs.ts';

const token = localStorage.getItem("JWTUser");
const provider = localStorage.getItem("provider");
const user = await check_jwt(token, provider);
const apiKey = localStorage.getItem("apiKey");
const fields = ["date", "subdomain", "resource", "resource_type", ""];
const maps = await getMaps(user);

// Fetch deployment logs and build a status lookup map.
let deploymentStatusMap = {};
try {
  const logsData = await getDeploymentLogs(user);
  if (logsData?.logs) {
    for (const log of logsData.logs) {
      deploymentStatusMap[log.subdomain] = {
        status: log.status,
        errorSummary: log.errorSummary,
      };
    }
  }
} catch (e) {
  // Deployment logs are a non-critical enhancement; don't block page load.
  console.warn('Failed to load deployment logs:', e);
}
</script>

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
    <div v-if="failureNotice" class="failure-notice">
      <span>{{ failureNotice }}</span>
      <button @click="dismissFailureNotice" aria-label="Dismiss deployment error">✕</button>
    </div>
    <div id="home-heading">
      <h3>{{ user }}'s subdomains:</h3>
    </div>
    <br>
    <table id="tableComponent" style="display:table; width:100%; padding: 0px 30px">
      <thead>
        <tr>
          <th v-for="field in fields" :key="field" style="padding:5px;background-color: #ffffff; color: #121212;border-bottom: 1px solid #121212; border-top:1px solid #121212;font-weight: 900;">
            <h3>{{ field }}</h3>
          </th>
          <th style="padding:5px;background-color: #ffffff; color: #121212;border-bottom: 1px solid #121212; border-top:1px solid #121212;font-weight: 900;">
            <h3>status</h3>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in maps" :key="item">
          <td v-for="field in fields" :key="field" style="border-bottom: 1px solid #121212">
            <span v-if="item[field] && field !== 'subdomain'">{{ item[field] }}</span>
            <span v-else-if="field === 'subdomain'">
              <a :href="'https://' + item[field]" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: inherit;">{{ item[field] }}</a>
            </span>
            <span v-else>
              <deletemodal v-show="showDeleteModal" @close-modal="showDeleteModal = false" :selectedItem="selectedItem" />
              <div style="text-align: center;"><button class="delete" @click="showDeleteModal=true;selectedItem=item">Delete!</button></div>
            </span>
          </td>
          <!-- Deployment Status Column -->
          <td style="border-bottom: 1px solid #121212; text-align: center;">
            <span
              class="deploy-status-badge"
              :class="getDeployStatusClass(item.subdomain)"
              @click="showLogForSubdomain(item.subdomain)"
              :title="getDeployStatusTooltip(item.subdomain)"
            >
              {{ getDeployStatusLabel(item.subdomain) }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>

    <modal v-show="showModal" @close-modal="showModal = false" />
    <div style="text-align: center;"><button @click="showModal = true">+ Add</button></div>
  </div>

  <ApiKeyModal v-show="showApiKeyModal" :apiKey="apiKey" @close-modal="showApiKeyModal = false" />

  <!-- Deployment Log Modal -->
  <DeploymentLogModal
    v-if="showLogModal && logSubdomain"
    :subdomain="logSubdomain"
    :user="user"
    @close-modal="showLogModal = false"
  />

  <footer>
    <p>Made with ❤️ by MDG Space</p>
  </footer>
</template>

<script>
import { getDeploymentLog, getDeploymentStatus } from '../utils/deployment-logs.ts';

export default {
  components: { modal, deletemodal, ApiKeyModal, DeploymentLogModal },
  data() {
    return {
      showDeleteModal: false,
      showModal: false,
      showApiKeyModal: false,
      showLogModal: false,
      selectedItem: null,
      logSubdomain: '',
      pendingDeploymentPoller: null,
      failureNotice: '',
    };
  },
  mounted() {
    this.resumePendingDeploymentWatch();
  },
  beforeUnmount() {
    if (this.pendingDeploymentPoller) {
      clearInterval(this.pendingDeploymentPoller);
    }
  },
  methods: {
    logoutAndRedirect() {
      localStorage.clear();
      this.$router.push({ path: '/login' });
    },
    getDeployStatusClass(subdomain) {
      const info = deploymentStatusMap[subdomain];
      if (!info) return 'deploy-status-default';
      switch (info.status) {
        case 'success': return 'deploy-status-success';
        case 'failed': return 'deploy-status-failed';
        case 'pending': return 'deploy-status-pending';
        case 'building': return 'deploy-status-building';
        default: return 'deploy-status-default';
      }
    },
    getDeployStatusLabel(subdomain) {
      const info = deploymentStatusMap[subdomain];
      if (!info) return '—';
      switch (info.status) {
        case 'success': return '✅ Success';
        case 'failed': return '❌ Failed';
        case 'pending': return '⏳ Pending';
        case 'building': return '🔨 Building';
        default: return '—';
      }
    },
    getDeployStatusTooltip(subdomain) {
      const info = deploymentStatusMap[subdomain];
      if (!info) return 'No deployment log available';
      if (info.status === 'failed' && info.errorSummary) {
        return `Failed: ${info.errorSummary}`;
      }
      return `Status: ${info.status} — Click to view logs`;
    },
    showLogForSubdomain(subdomain) {
      this.logSubdomain = subdomain;
      this.showLogModal = true;
    },
    async resumePendingDeploymentWatch() {
      const pendingSubdomain = sessionStorage.getItem('pendingDeploymentSubdomain');
      if (!pendingSubdomain) {
        return;
      }

      const poll = async () => {
        const status = await getDeploymentStatus(user, pendingSubdomain);
        deploymentStatusMap[pendingSubdomain] = {
          status: status?.status || 'unknown',
          errorSummary: status?.errorSummary || null,
        };

        if (status?.status === 'failed') {
          const log = await getDeploymentLog(user, pendingSubdomain);
          this.failureNotice = status.errorSummary || log?.errorSummary || `Deployment failed for ${pendingSubdomain}.`;
          this.logSubdomain = pendingSubdomain;
          this.showLogModal = true;
          sessionStorage.removeItem('pendingDeploymentSubdomain');
          if (this.pendingDeploymentPoller) {
            clearInterval(this.pendingDeploymentPoller);
            this.pendingDeploymentPoller = null;
          }
          return;
        }

        if (status?.status === 'success' || status?.status === 'unknown') {
          sessionStorage.removeItem('pendingDeploymentSubdomain');
          if (this.pendingDeploymentPoller) {
            clearInterval(this.pendingDeploymentPoller);
            this.pendingDeploymentPoller = null;
          }
        }
      };

      await poll();
      if (!sessionStorage.getItem('pendingDeploymentSubdomain')) {
        return;
      }

      this.pendingDeploymentPoller = setInterval(() => {
        poll();
      }, 5000);
    },
    dismissFailureNotice() {
      this.failureNotice = '';
    },
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

.failure-notice {
  margin: 5.5rem auto 1rem;
  width: min(960px, calc(100% - 2rem));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 1rem;
  border: 1px solid #fecaca;
  border-radius: 12px;
  background: #fef2f2;
  color: #991b1b;
}

.failure-notice button {
  border: none;
  background: transparent;
  color: inherit;
  font-size: 1rem;
  cursor: pointer;
}

/* Deployment Status Badge */
.deploy-status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease;
  white-space: nowrap;
}

.deploy-status-badge:hover {
  opacity: 0.8;
}

.deploy-status-success {
  background: #d1fae5;
  color: #065f46;
}

.deploy-status-failed {
  background: #fee2e2;
  color: #991b1b;
}

.deploy-status-pending {
  background: #fef3c7;
  color: #92400e;
}

.deploy-status-building {
  background: #dbeafe;
  color: #1e40af;
}

.deploy-status-default {
  background: #f3f4f6;
  color: #6b7280;
}

</style>
