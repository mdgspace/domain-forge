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
      <p class="hero-eyebrow">The deployment control plane</p>
      <h1 class="main-title">Ship faster.<br><span>Stay in control.</span></h1>
      <h2><span class="highlight">Subdomain generation</span> integrated with robust <span class="highlight">hosting infrastructure</span> for seamless website management.</h2>
      <div class="hero-pills">
        <span>Simple deployments</span>
        <span>Live observability</span>
        <span>Built for teams</span>
      </div>
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

const route = useRouter().currentRoute.value;
const code = route.query.code;
const state = route.query.state;
const savedState = sessionStorage.getItem("oauth_state");
const provider = localStorage.getItem("provider");

if (code && provider) {
  if (savedState && state !== savedState) {
    alert("Invalid OAuth state parameter. Authentication aborted for CSRF protection.");
    sessionStorage.removeItem("oauth_state");
  } else {
    sessionStorage.removeItem("oauth_state");
    authorize(code, provider);
  }
}
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
  z-index: 10;
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid #e7ebf3;
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
  max-width: 1180px;
  margin: 0 auto;
  padding: 14px 24px;
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
  margin-right: 12px;
}

.nav-links li:last-child {
  margin-right: 0;
}

.nav-links a {
  text-decoration: none;
  color: #536074;
  font-weight: 600;
  padding: 10px 12px;
}

.login-button {
  width: auto;
  padding: 9px 20px;
  font-size: 14px;
  background-color: #2563eb;
  color: #fff;
  border: none;
  border-radius: 9px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.login-button:hover {
  background-color: #1d4ed8;
}

main {
  height: 100%; 
}

h1.main-title {
  margin: 0;
  color: #172033;
  font-size: clamp(2.8rem, 7vw, 5.8rem);
  letter-spacing: -0.075em;
  line-height: 0.98;
}

h1.main-title span {
  color: #2563eb;
}

.hero-eyebrow {
  margin: 0 0 18px;
  color: #2563eb;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

main h2 {
  max-width: 680px;
  margin: 28px auto 0;
  color: #667085;
  font-size: clamp(1rem, 2vw, 1.24rem);
  font-weight: 400;
  line-height: 1.65;
}

.hero-pills {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 34px;
}

.hero-pills span {
  padding: 8px 13px;
  border: 1px solid #dce4f0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: #61708a;
  font-size: 0.78rem;
  font-weight: 600;
}

footer {
  width: 100%;
  background-color: #ffffff;
  padding: 20px 0;
  align-items: center;
  align-self: center;
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

@media (max-width: 640px) {
  #container {
    height: auto;
    min-height: calc(100vh - 130px);
    padding: 140px 22px 64px;
  }

  .nav-wrapper {
    padding: 12px 16px;
  }

  .brand {
    font-size: 18px;
  }

  .nav-links li {
    margin-right: 0;
  }

  .nav-links a {
    display: none;
  }

  h1.main-title {
    font-size: clamp(2.8rem, 15vw, 4.4rem);
  }

  main h2 {
    margin-top: 22px;
  }
}
</style>
