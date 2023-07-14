<script setup type="module">
import {getMaps} from '../utils/maps.ts';
const user = localStorage.getItem("LoggedUser");
const fields = ["date","subdomain","resource", "resource_type", "options"];
const maps = await getMaps("Abhijna-Raghavendra");
</script>

<template>
  <div id = "navbar">
    <h5>Hey {{user}}!</h5>
  </div>
    <div id="container">
      <h3>Your subdomains: </h3>
    <br>
    <table id="tableComponent" style="display:table; width:100%; padding: 1%;border: #FFC947;">
  <thead>
    <tr>
      <th  v-for="field in fields" style="padding:1px;background-color: #FFC947; color: #0A1931;"> 
        <h3>{{field}}</h3>
       </th>
    </tr>
  </thead>
  <tbody>
      <tr v-for="item in maps" :key='item'>
      <td v-for="field in fields" :key='field'>{{item[field]}}</td>
      </tr>
  </tbody>
</table> 

    <button>+ Add</button>
    </div>
</template>
