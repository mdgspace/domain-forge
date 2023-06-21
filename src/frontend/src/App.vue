<script setup>
import {githubUrl} from './utils/github-url';
</script>
<template>
  <main>
    <div id="container">
      <h1>Domain Forge</h1>
      <a :href="githubUrl(from)"><button>Login with Github</button></a>
    </div>
  </main>
</template>