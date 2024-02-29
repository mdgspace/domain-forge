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
            <button @click="showModal = true" class="login-button">Login</button>
          </li>
        </ul>
      </div>
    </nav>
  </header>
  <div id="container">
    <div class="grid-background"></div>
    <main>
      <h1 class="main-title">Empower your online presence with Domain Forge</h1>  
      <h2><span class="highlight">Subdomain generation</span> integrated with robust <span class="highlight">hosting infrastructure</span> for seamless website management</h2>
    </main>
    <loginmodal v-show="showModal" @close-modal="showModal = false" />
  </div>
  <footer>
    <p>Made with ❤️ by MDG Space</p>
  </footer>
</template>

<script setup>
import { authorize } from '../utils/authorize';
import { useRouter } from "vue-router";

const code = useRouter().currentRoute.value.query.code;
authorize(code);
</script>
<script>
import loginmodal from './loginmodal.vue';
export default {
  components: { loginmodal },
  data() {
    return {
      showModal: false,
    }
  },
}
</script>

<style scoped>
button {
  width: 10rem;
}

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

#container {
  position: relative;
  text-align: center;
  height: 63.5vh;
}

.grid-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: linear-gradient(rgba(0, 0, 0, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.1) 1px, transparent 1px);
  background-size: 50px 50px;
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

.login-button {
  padding: 8px 4px;
  font-size: 14px;
  background-color: #007bff;
  color: #fff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.login-button:hover {
  background-color: #0056b3;
}

main {
  height: 100%; 
}

h1.main-title {
  margin-top: 100px; 
}

footer {
  width: 100%;
  background-color: #ffffff;
  padding: 20px 0;
}

footer p {
  margin: 0;
  text-align: center;
}


.highlight {
  position: relative;
  color: #007bff;
  font-weight: bold;
}

.highlight::before,
.highlight::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -2px;
  width: 100%;
  height: 2px;
  background-color: #007bff; 
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.highlight::before {
  transform-origin: left;
}

.highlight::after {
  transform-origin: right;
}

.highlight:hover::before,
.highlight:hover::after {
  transform: scaleX(1);
}
</style>
