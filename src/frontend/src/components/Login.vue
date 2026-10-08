<template>
  <div class="page-wrapper">
    <header>
      <nav>
        <div class="nav-wrapper">
          <div class="brand-container">
            <img src="/df-logo.png" class="brand-logo" alt="logo">
            <p class="brand">Domain Forge</p>
          </div>
          <ul class="nav-links">
            <li><a href="https://github.com/mdgspace/domain-forge/blob/master/docs/users/README.md" target="_blank" rel="noopener noreferrer">Docs</a></li>
            <li class="login-provider">
              <button @click="showModal = true" class="login-button">Login</button>
            </li>
          </ul>
        </div>
      </nav>
    </header>

    <div id="container">
      <div class="grid-background"></div>
      <div class="radial-glow"></div>
      <main class="hero-content">
        <div class="hero-badge">
          <span class="badge-dot"></span>
          <span>The deployment control plane</span>
        </div>
        <h1 class="main-title">
          Ship faster.<br>
          <span class="title-gradient">Stay in control.</span>
        </h1>
        <h2 class="hero-description">
          <span class="highlight">Subdomain generation</span> integrated with robust
          <span class="highlight">hosting infrastructure</span> for seamless website management.
        </h2>
        
        <div class="cta-actions">
          <button @click="showModal = true" class="primary-hero-btn">
            Get Started
            <svg class="arrow-icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
          <a href="https://github.com/mdgspace/domain-forge/blob/master/docs/users/README.md" target="_blank" rel="noopener noreferrer" class="secondary-hero-btn">
            Documentation
          </a>
        </div>

        <div class="hero-pills">
          <span class="pill-item">
            <span class="pill-dot green"></span> Simple deployments
          </span>
          <span class="pill-item">
            <span class="pill-dot blue"></span> Live observability
          </span>
          <span class="pill-item">
            <span class="pill-dot purple"></span> Built for teams
          </span>
        </div>
      </main>

      <loginmodal v-show="showModal" @close-modal="showModal = false" />
    </div>

    <footer>
      <div class="footer-content">
        <p>Made with ❤️ by <strong>MDG Space</strong></p>
      </div>
    </footer>
  </div>
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
.page-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  position: relative;
  background-color: #f5f7fb;
}

nav {
  width: 100%; 
  position: fixed; 
  top: 0;
  left: 0;
  z-index: 50;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid #e2e8f0;
}

.nav-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1180px;
  margin: 0 auto;
  padding: 14px 28px;
}

.brand-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-logo {
  height: 32px;
  width: auto;
  object-fit: contain;
}

.brand {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: #172033;
}

.nav-links {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-links a {
  text-decoration: none;
  color: #64748b;
  font-weight: 600;
  font-size: 0.92rem;
  padding: 8px 14px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.nav-links a:hover {
  color: #172033;
  background: rgba(0, 0, 0, 0.04);
}

.login-button {
  padding: 9px 20px;
  font-size: 0.88rem;
  background-color: #2563eb;
  color: #ffffff;
  border-radius: 9px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.login-button:hover {
  background-color: #1d4ed8;
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.28);
  transform: translateY(-1px);
}

#container {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 130px 24px 70px;
  overflow: hidden;
}

.grid-background {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(rgba(23, 32, 51, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(23, 32, 51, 0.04) 1px, transparent 1px);
  background-size: 40px 40px;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, #000 70%, transparent 100%);
  -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, #000 70%, transparent 100%);
  pointer-events: none;
}

.radial-glow {
  position: absolute;
  top: 25%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  height: 400px;
  background: radial-gradient(circle, rgba(37, 99, 235, 0.08) 0%, rgba(245, 247, 251, 0) 70%);
  filter: blur(40px);
  pointer-events: none;
}

.hero-content {
  position: relative;
  z-index: 2;
  max-width: 860px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  margin-bottom: 24px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
  font-size: 0.8rem;
  font-weight: 600;
  color: #2563eb;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.badge-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
}

.main-title {
  margin: 0;
  color: #172033;
  font-size: clamp(2.8rem, 6.5vw, 5.2rem);
  letter-spacing: -0.05em;
  line-height: 1.04;
  font-weight: 700;
}

.title-gradient {
  color: #2563eb;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-description {
  max-width: 660px;
  margin: 24px auto 0;
  color: #64748b;
  font-size: clamp(1.05rem, 1.8vw, 1.25rem);
  font-weight: 400;
  line-height: 1.6;
}

.highlight {
  position: relative;
  color: #172033;
  font-weight: 600;
}

.cta-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin-top: 36px;
}

.primary-hero-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 28px;
  border-radius: 10px;
  background: #2563eb;
  color: #ffffff;
  font-size: 0.96rem;
  font-weight: 600;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.primary-hero-btn:hover {
  background: #1d4ed8;
  box-shadow: 0 8px 22px rgba(37, 99, 235, 0.38);
  transform: translateY(-2px);
}

.arrow-icon {
  transition: transform 0.2s ease;
}

.primary-hero-btn:hover .arrow-icon {
  transform: translateX(3px);
}

.secondary-hero-btn {
  padding: 12px 24px;
  border-radius: 10px;
  background: #ffffff;
  color: #172033;
  border: 1px solid #e2e8f0;
  font-size: 0.96rem;
  font-weight: 600;
  text-decoration: none;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04);
  transition: all 0.2s ease;
}

.secondary-hero-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  transform: translateY(-2px);
}

.hero-pills {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 40px;
}

.pill-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: #ffffff;
  color: #475569;
  font-size: 0.82rem;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}

.pill-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.pill-dot.green { background-color: #16a34a; }
.pill-dot.blue { background-color: #2563eb; }
.pill-dot.purple { background-color: #7c3aed; }

footer {
  width: 100%;
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
  padding: 20px 0;
  margin-top: auto;
}

.footer-content {
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 28px;
  text-align: center;
}

footer p {
  margin: 0;
  color: #64748b;
  font-size: 0.86rem;
}

footer strong {
  color: #172033;
}

@media (max-width: 640px) {
  #container {
    padding: 110px 20px 50px;
  }

  .nav-wrapper {
    padding: 12px 16px;
  }

  .nav-links a {
    display: none;
  }

  .cta-actions {
    flex-direction: column;
    width: 100%;
  }

  .primary-hero-btn,
  .secondary-hero-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
