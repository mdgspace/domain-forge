<script setup>
  import {githubUrl} from '../utils/github-url';
  import {authorize} from '../utils/authorize'
  import {useRouter} from "vue-router";
  const code = useRouter().currentRoute.value.query.code
  console.log(code);
  authorize(code);
</script>
<template>
    <div id="container">
      <h1>Domain Forge</h1>
      <a :href="githubUrl()"><button>Login with Github</button></a>
    </div>
</template>
