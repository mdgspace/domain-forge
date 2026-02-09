<script setup type="module">
import { ref, onMounted, onUnmounted } from 'vue';
import { getMaps } from '../utils/maps.ts';
import { check_jwt } from '../utils/authorize.ts';
import modal from './modal.vue';
import deletemodal from './deletemodal.vue';
import ApiKeyModal from './ApiKeyModal.vue';
import LogModal from './LogModal.vue';

const token = localStorage.getItem("JWTUser");
const provider = localStorage.getItem("provider");
const user = await check_jwt(token, provider);
const apiKey = localStorage.getItem("apiKey");
const fields = ["date", "subdomain", "resource", "resource_type", "status", ""];
const maps = ref(await getMaps(user));

let pollingInterval = null;

const updateMaps = async () => {
  const newData = await getMaps(user);
  maps.value = newData;
  const hasActiveBuild = newData.some(item => item.status === 'building');

  if (hasActiveBuild && !pollingInterval) {
    startPolling();
  } else if (!hasActiveBuild && pollingInterval) {
    stopPolling();
  }
};

const startPolling = () => {
  if (pollingInterval) return;
  pollingInterval = setInterval(updateMaps, 5000); // Poll every 5s
};

const stopPolling = () => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
};

onMounted(() => {
  // Check immediately if we need to start polling (e.g., if user refreshed page during a build)
  const hasActiveBuild = maps.value.some(item => item.status === 'building');
  if (hasActiveBuild) {
    startPolling();
  }
});

onUnmounted(() => {
  stopPolling();
});

const showLogModal = ref(false);
const currentLogs = ref("");
const selectedItem = ref(null); // Ensure this exists for delete modal too

const viewLogs = (item) => {
  currentLogs.value = item.build_logs || "No logs available.";
  showLogModal.value = true;
};
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
            <h3>{{ field }}</h3>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in maps" :key="item">
          <td v-for="field in fields" :key="field" style="border-bottom: 1px solid #121212">
            <span v-if="field === 'subdomain'">
              <a :href="'https://' + item[field]" target="_blank" rel="noopener noreferrer" 
                style="text-decoration: none; color: inherit;">
                {{ item[field] }}
              </a>
            </span>
            <span v-else-if="field === 'status'">
              <span v-if="item.status === 'building'" style="color: orange;">⏳ Building...</span>
              <span v-else-if="item.status === 'success'" style="color: green;">✅ Live</span>
              <span v-else-if="item.status === 'failed'" style="color: red; cursor: pointer; text-decoration: underline;" 
                    @click="viewLogs(item)">
                ❌ Failed (View Logs)
              </span>
              <span v-else>Active</span> </span>
            <span v-else-if="field === ''">
              <deletemodal v-show="showDeleteModal" @close-modal="showDeleteModal = false" :selectedItem="selectedItem" />
              <div style="text-align: center;">
                <button class="delete" @click="showDeleteModal=true;selectedItem=item">Delete!</button>
              </div>
            </span>
            <span v-else>{{ item[field] }}</span>
          </td>
        </tr>
      </tbody>
    </table>

    <modal v-show="showModal" @close-modal="showModal = false" />
    <div style="text-align: center;"><button @click="showModal = true">+ Add</button></div>
  </div>

  <ApiKeyModal v-show="showApiKeyModal" :apiKey="apiKey" @close-modal="showApiKeyModal = false" />

  <LogModal v-if="showLogModal" :logs="currentLogs" @close="showLogModal = false" />

  <footer>
    <p>Made with ❤️ by MDG Space</p>
  </footer>
</template>

<script>
export default {
  components: { modal, deletemodal, ApiKeyModal },
  data() {
    return {
      showDeleteModal: false,
      showModal: false,
      showApiKeyModal: false,
      selectedItem: null,
    };
  },
  methods: {
    logoutAndRedirect() {
      localStorage.clear();
      this.$router.push({ path: '/login' });
    }
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

</style>