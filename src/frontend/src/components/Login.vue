<script setup>
import { oauthUrl } from '../utils/oauth-urls';
import { authorize } from '../utils/authorize';
import { useRouter } from "vue-router";

const route = useRouter().currentRoute.value;
const code = route.query.code;
const provider = route.query.provider;

console.log(code);
console.log(provider);

const authUrl = oauthUrl(provider);

if (code && provider) {
  authorize(code, provider);
}
</script>

<template>
  <div id="container">
    <div id="login-heading">
      <h1>Domain Forge</h1>
    </div>
    <div id="login-link">
      <a :href="oauthUrl('github')"><button>Login with Github</button></a>
    </div>
    <div id="login-link">
      <a :href="oauthUrl('gitlab')"><button>Login with Gitlab</button></a>
    </div>
  </div>
</template>
