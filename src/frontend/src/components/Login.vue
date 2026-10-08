<template>
  <div class="page-wrapper">
    <header>
      <nav class="flat-nav">
        <div class="nav-wrapper">
          <div class="brand-container">
            <img src="/df-logo.png" class="brand-logo" alt="logo">
            <span class="brand">Domain Forge</span>
          </div>
          <ul class="nav-links">
            <li>
              <a href="https://github.com/mdgspace/domain-forge/blob/master/docs/users/README.md" target="_blank" rel="noopener noreferrer">
                Docs
              </a>
            </li>
            <li class="login-provider">
              <button @click="showModal = true" class="nav-login-btn">
                <LogIn :size="16" :stroke-width="2.5" />
                <span>Login</span>
              </button>
            </li>
          </ul>
        </div>
      </nav>
    </header>

    <div id="container">
      <!-- Strategic Flat Geometric Background Shapes (Poster Inspired) -->
      <div class="geom-shape geom-circle"></div>
      <div class="geom-shape geom-square"></div>
      <div class="geom-shape geom-dot-grid"></div>

      <main class="hero-content">
        <div class="hero-badge">
          <span class="badge-dot"></span>
          <span>THE DEPLOYMENT CONTROL PLANE</span>
        </div>

        <h1 class="main-title">
          Ship faster.<br>
          <span class="title-highlight">Stay in control.</span>
        </h1>

        <p class="hero-description">
          <strong>Subdomain generation</strong> integrated with robust <strong>hosting infrastructure</strong> for seamless website and container management.
        </p>

        <div class="cta-actions">
          <button @click="showModal = true" class="cta-primary-btn">
            <span>Get Started</span>
            <ArrowRight :size="18" :stroke-width="2.5" />
          </button>
          <a href="https://github.com/mdgspace/domain-forge/blob/master/docs/users/README.md" target="_blank" rel="noopener noreferrer" class="cta-outline-btn">
            <BookOpen :size="18" :stroke-width="2.5" />
            <span>Read Documentation</span>
          </a>
        </div>

        <!-- Solid Flat Color Block Feature Cards with Lucide Icons -->
        <div class="feature-blocks">
          <div class="feature-block block-blue">
            <div class="feature-icon-circle bg-blue">
              <Rocket :size="20" :stroke-width="2.5" />
            </div>
            <div class="feature-text">
              <strong>Instant Deployment</strong>
              <span>Subdomains live in seconds</span>
            </div>
          </div>

          <div class="feature-block block-emerald">
            <div class="feature-icon-circle bg-emerald">
              <Activity :size="20" :stroke-width="2.5" />
            </div>
            <div class="feature-text">
              <strong>Live Telemetry</strong>
              <span>Real-time container metrics</span>
            </div>
          </div>

          <div class="feature-block block-amber">
            <div class="feature-icon-circle bg-amber">
              <ShieldCheck :size="20" :stroke-width="2.5" />
            </div>
            <div class="feature-text">
              <strong>Secure Routing</strong>
              <span>Built for engineering teams</span>
            </div>
          </div>
        </div>
      </main>

      <loginmodal v-show="showModal" @close-modal="showModal = false" />
    </div>

    <!-- Solid High-Contrast Flat Dark Footer -->
    <footer class="flat-footer">
      <div class="footer-content">
        <p>Made with ❤️ by <strong>MDG Space</strong></p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { authorize } from '../utils/authorize';
import { useRouter } from "vue-router";
import { ArrowRight, BookOpen, LogIn, Rocket, Activity, ShieldCheck } from "lucide-vue-next";

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
  background-color: var(--color-canvas);
  overflow-x: hidden;
}

.flat-nav {
  width: 100%;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 50;
  background-color: #ffffff;
  border-bottom: 2px solid var(--color-muted);
}

.nav-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 28px;
}

.brand-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-logo {
  height: 34px;
  width: auto;
}

.brand {
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-fg);
}

.nav-links {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  gap: 16px;
}

.nav-links a {
  text-decoration: none;
  color: #4b5563;
  font-weight: 600;
  font-size: 0.95rem;
  padding: 8px 14px;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.nav-links a:hover {
  background-color: var(--color-muted);
  color: var(--color-fg);
}

.nav-login-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 22px;
  background-color: var(--color-primary);
  color: #ffffff;
  font-weight: 700;
  font-size: 0.92rem;
  border-radius: var(--radius-md);
  border: 0;
}

.nav-login-btn:hover {
  background-color: var(--color-primary-hover);
  transform: scale(1.05);
}

#container {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 130px 24px 70px;
  background-color: #ffffff;
}

/* Strategic Flat Geometric Shapes (Poster Design) */
.geom-shape {
  position: absolute;
  pointer-events: none;
  z-index: 0;
}

.geom-circle {
  top: 10%;
  right: -5%;
  width: 480px;
  height: 480px;
  border-radius: 50%;
  background-color: #eff6ff; /* Soft flat blue */
}

.geom-square {
  bottom: 8%;
  left: -4%;
  width: 320px;
  height: 320px;
  background-color: #ecfdf5; /* Soft flat emerald */
  transform: rotate(12deg);
}

.geom-dot-grid {
  top: 15%;
  left: 6%;
  width: 180px;
  height: 180px;
  background-image: radial-gradient(#d1d5db 2px, transparent 2px);
  background-size: 18px 18px;
  opacity: 0.7;
}

.hero-content {
  position: relative;
  z-index: 2;
  max-width: 900px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  margin-bottom: 24px;
  background-color: var(--color-muted);
  border-radius: var(--radius-full);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--color-primary);
}

.badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--color-primary);
}

.main-title {
  margin: 0;
  color: var(--color-fg);
  font-size: clamp(2.8rem, 6.8vw, 5.4rem);
  letter-spacing: -0.03em;
  line-height: 1.05;
  font-weight: 800;
}

.title-highlight {
  color: var(--color-primary);
}

.hero-description {
  max-width: 680px;
  margin: 24px auto 0;
  color: #4b5563;
  font-size: clamp(1.05rem, 1.8vw, 1.25rem);
  font-weight: 400;
  line-height: 1.6;
}

.hero-description strong {
  color: var(--color-fg);
}

.cta-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 36px;
}

.cta-primary-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 15px 32px;
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: #ffffff;
  font-size: 1.05rem;
  font-weight: 700;
  border: 0;
  transition: all var(--transition-fast);
}

.cta-primary-btn:hover {
  background-color: var(--color-primary-hover);
  transform: scale(1.05);
}

.cta-outline-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 28px;
  border-radius: var(--radius-md);
  background-color: transparent;
  border: 4px solid var(--color-fg);
  color: var(--color-fg);
  font-size: 1rem;
  font-weight: 700;
  text-decoration: none;
  transition: all var(--transition-fast);
}

.cta-outline-btn:hover {
  background-color: var(--color-fg);
  color: #ffffff;
  transform: scale(1.05);
}

/* Color Block Feature Cards */
.feature-blocks {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 52px;
  width: 100%;
}

.feature-block {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  border-radius: var(--radius-lg);
  text-align: left;
  transition: transform var(--transition-fast);
}

.feature-block:hover {
  transform: scale(1.03);
}

.block-blue {
  background-color: var(--color-blue-subtle);
}

.block-emerald {
  background-color: var(--color-emerald-subtle);
}

.block-amber {
  background-color: var(--color-amber-subtle);
}

.feature-icon-circle {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  flex-shrink: 0;
}

.bg-blue {
  background-color: #ffffff;
  color: var(--color-primary);
}

.bg-emerald {
  background-color: #ffffff;
  color: var(--color-secondary);
}

.bg-amber {
  background-color: #ffffff;
  color: var(--color-accent);
}

.feature-text {
  display: flex;
  flex-direction: column;
}

.feature-text strong {
  color: var(--color-fg);
  font-size: 0.96rem;
  font-weight: 700;
}

.feature-text span {
  color: #6b7280;
  font-size: 0.8rem;
}

/* Flat High-Contrast Dark Footer */
.flat-footer {
  width: 100%;
  background-color: var(--color-dark);
  padding: 24px 0;
  margin-top: auto;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 28px;
  text-align: center;
}

.flat-footer p {
  margin: 0;
  color: #9ca3af;
  font-size: 0.9rem;
}

.flat-footer strong {
  color: #ffffff;
}

@media (max-width: 768px) {
  .feature-blocks {
    grid-template-columns: 1fr;
  }

  .cta-actions {
    flex-direction: column;
    width: 100%;
  }

  .cta-primary-btn,
  .cta-outline-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
