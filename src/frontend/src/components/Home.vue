<script setup type="module">
import { getMaps } from '../utils/maps.ts';
import { check_jwt } from '../utils/authorize.ts';
const token = localStorage.getItem("JWTUser");
const user = await check_jwt(token);
const fields = ["date", "subdomain", "resource", "resource_type", ""];
const maps = await getMaps(user);
</script>

<template>
  <header>
    <nav>
      <div class="nav-wrapper">
        <p class="brand">Domain Forge</p>
        <ul class="nav-links">
          <li><a href="https://github.com/mdgspace/domain-forge/blob/master/docs/users/README.md">Docs</a></li>
        </ul>
      </div>
    </nav>
  </header>
  <div id="home-container">
    <div id="home-heading">
      <h3>{{ user }}'s subdomains: </h3>
    </div>
    <br>
    <table id="tableComponent" style="display:table; width:100%; padding: 0px 30px">
      <thead>
        <tr>
          <th v-for="field in fields" style="padding:5px;background-color: #ffffff; color: #121212;border-bottom: 1px solid #121212; border-top:1px solid #121212;font-weight: 900;">
            <h3>{{ field }}</h3>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in maps" :key='item'>
          <td v-for="field in fields" :key='field' style="border-bottom: 1px solid #121212">
            <span v-if="item[field] != undefined && field != 'subdomain'">{{ item[field] }}</span>
            <span v-else-if="field === 'subdomain'">
    <a :href="'https://' + item[field]" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: inherit;">{{ item[field] }}</a>
</span>

            <span v-else>
              <deletemodal v-show="showDeleteModal" @close-modal="showDeleteModal = false" :selectedItem="selectedItem" />
              <div style="text-align: center;"><button class="delete" @click="showDeleteModal=true;selectedItem=item">Delete !</button></div>

            </span>
          </td>
        </tr>
      </tbody>
    </table>
    <modal v-show="showModal" @close-modal="showModal = false" />
    <div style="text-align: center;"><button @click="showModal = true">+ Add</button></div>
  </div>
  <footer>
    <p>Made with ❤️ by MDG Space</p>
  </footer>
</template>
<script>
import modal from './modal.vue'
import deletemodal from './deletemodal.vue'
export default {
  components: { modal,deletemodal },
  data() {
    return {
      showDeleteModal: false,
      showModal: false,
      selectedItem : null,
    }
  },
}
</script>
<style scoped>

nav {
  width: 100%; 
  position: fixed; 
  top: 0;
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
footer {
  position: fixed;
  bottom: 0;
  width: 100%;
  background-color: #ffffff;
  padding: 20px 0;
}

footer p {
  margin: 0;
  text-align: center;
}
</style>
