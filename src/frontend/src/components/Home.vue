<script setup type="module">
const user = localStorage.getItem("LoggedUser");
const fields = ["Date","Subdomain","Resource", "Resource Type", "Options"];
const maps = [
  {
    "_id":"1234",
    "Date":"14/7/23",
    "Subdomain":"domain-forge.mdgspace.org",
    "Resource":"www.google.com",
    "Resource Type":"URL",
    "Options":""
  },
];
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
<script>

</script>
