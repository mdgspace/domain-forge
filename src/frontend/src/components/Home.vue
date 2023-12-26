<script setup type="module">
import { getMaps } from '../utils/maps.ts';
import { check_jwt } from '../utils/authorize.ts';
const token = localStorage.getItem("JWTUser");
const user = await check_jwt(token);
const fields = ["date", "subdomain", "resource", "resource_type", "options"];
const maps = await getMaps(user);
</script>

<template>
  <div id="navbar">
    <h5>Hey {{ user }}!</h5>
  </div>
  <div id="home-container">
    <div id="home-heading">
      <h3>Your subdomains: </h3>
    </div>
    <br>
    <table id="tableComponent" style="display:table; width:100%;border: #FFC947;">
      <thead>
        <tr>
          <th v-for="field in fields" style="padding:1px;background-color: #FFC947; color: #0A1931;">
            <h3>{{ field }}</h3>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in maps" :key='item'>
          <td v-for="field in fields" :key='field'>
            <span v-if="item[field] != undefined && field != 'subdomain'">{{ item[field] }}</span>
            <span v-else-if="field === 'subdomain'">
    <a :href="'https://' + item[field]" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: inherit;">{{ item[field] }}</a>
</span>
            <span v-else>
              <deletemodal v-show="showDeleteModal" @close-modal="showDeleteModal = false" :selectedItem="selectedItem" />
              <button class="delete" @click="showDeleteModal=true;selectedItem=item">Delete !</button>

            </span>
          </td>
        </tr>
      </tbody>
    </table>
    <modal v-show="showModal" @close-modal="showModal = false" />
    <button @click="showModal = true">+ Add</button>
  </div>
</template>
<script>
import modal from './modal.vue'
import deletemodal from './deletemodal.vue'
import { deleteSubDomain } from '../utils/delete.ts'
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
