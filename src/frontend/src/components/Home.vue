<script setup type="module">
const user = localStorage.getItem("LoggedUser");
</script>
<template>
  <div id = "navbar">
    <h5>Hey {{user}}!</h5>
  </div>
    <div id="container">
      <h3>Your subdomains: </h3>
    </div>
</template>
