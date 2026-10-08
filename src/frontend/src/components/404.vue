<template>
  <div class="page-layout">
    <header>
      <nav class="flat-nav">
        <div class="nav-wrapper">
          <router-link to="/" class="brand-container">
            <img src="/df-logo.png" class="brand-logo" alt="Domain Forge logo">
            <span class="brand">Domain Forge</span>
          </router-link>
        </div>
      </nav>
    </header>

    <div class="not-found-container">
      <div class="geom-shape geom-circle"></div>
      <div class="geom-shape geom-square"></div>

      <div class="not-found-card">
        <div class="code-badge">404 ERROR</div>
        <h1 class="error-code">404</h1>
        <h2>Page not found</h2>
        <p class="error-description">
          The requested deployment route or resource does not exist, has been removed, or was relocated.
        </p>
        <router-link to="/" class="btn-primary">
          <ArrowLeft :size="16" :stroke-width="2.5" />
          <span>Back to Overview</span>
        </router-link>
      </div>
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
import { ArrowLeft } from 'lucide-vue-next';
</script>

<script>
export default {
  name: "NotFound"
};
</script>

<style scoped>
.page-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--color-canvas);
  position: relative;
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
  text-decoration: none;
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

.not-found-container {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120px 24px 60px;
}

.geom-shape {
  position: absolute;
  pointer-events: none;
  z-index: 0;
}

.geom-circle {
  top: 20%;
  left: 10%;
  width: 380px;
  height: 380px;
  border-radius: 50%;
  background-color: var(--color-blue-subtle);
}

.geom-square {
  bottom: 15%;
  right: 12%;
  width: 260px;
  height: 260px;
  background-color: var(--color-amber-subtle);
  transform: rotate(15deg);
}

.not-found-card {
  position: relative;
  z-index: 2;
  text-align: center;
  max-width: 520px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.code-badge {
  display: inline-block;
  padding: 6px 16px;
  background-color: var(--color-blue-subtle);
  color: var(--color-primary);
  border-radius: var(--radius-full);
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  margin-bottom: 12px;
}

.error-code {
  font-size: clamp(6rem, 14vw, 9.5rem);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 0.95;
  margin: 0;
  color: var(--color-fg);
}

.not-found-card h2 {
  margin: 16px 0 8px;
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--color-fg);
}

.error-description {
  color: #6b7280;
  font-size: 0.98rem;
  line-height: 1.5;
  margin: 0 0 28px;
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
</style>