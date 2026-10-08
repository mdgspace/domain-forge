<template>
  <div class="page-layout">
    <header>
      <nav>
        <div class="nav-wrapper">
          <router-link to="/" class="brand-container">
            <img src="/df-logo.png" class="brand-logo" alt="Domain Forge logo">
            <span class="brand">Domain Forge</span>
          </router-link>
        </div>
      </nav>
    </header>

    <div class="not-found-container">
      <div class="grid-background"></div>
      <div class="not-found-card">
        <div class="code-badge">404 ERROR</div>
        <h1 class="error-code">404</h1>
        <h2>Page not found</h2>
        <p class="error-description">
          The deployment route or page you are looking for doesn't exist, has been removed, or was relocated.
        </p>
        <router-link to="/" class="home-btn">
          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
            <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
          </svg>
          Back to Overview
        </router-link>
      </div>
    </div>

    <footer>
      <div class="footer-content">
        <p>Made with ❤️ by <strong>MDG Space</strong></p>
      </div>
    </footer>
  </div>
</template>

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
  background-color: #f5f7fb;
  position: relative;
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
  max-width: 1200px;
  margin: 0 auto;
  padding: 14px 28px;
}

.brand-container {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
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

.not-found-container {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120px 24px 60px;
  overflow: hidden;
}

.grid-background {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(rgba(23, 32, 51, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(23, 32, 51, 0.04) 1px, transparent 1px);
  background-size: 40px 40px;
  mask-image: radial-gradient(ellipse 60% 50% at 50% 50%, #000 70%, transparent 100%);
  -webkit-mask-image: radial-gradient(ellipse 60% 50% at 50% 50%, #000 70%, transparent 100%);
  pointer-events: none;
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
  padding: 4px 12px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #2563eb;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  margin-bottom: 12px;
}

.error-code {
  font-size: clamp(5.5rem, 12vw, 8rem);
  font-weight: 800;
  letter-spacing: -0.06em;
  line-height: 0.95;
  margin: 0;
  color: #172033;
  background: linear-gradient(135deg, #172033 40%, #2563eb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.not-found-card h2 {
  margin: 16px 0 8px;
  font-size: 1.5rem;
  font-weight: 700;
  color: #172033;
}

.error-description {
  color: #64748b;
  font-size: 0.95rem;
  line-height: 1.5;
  margin: 0 0 28px;
}

.home-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 22px;
  border-radius: 10px;
  background: #2563eb;
  color: #ffffff;
  font-size: 0.92rem;
  font-weight: 600;
  text-decoration: none;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.28);
  transition: all 0.2s ease;
}

.home-btn:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(37, 99, 235, 0.35);
}

footer {
  width: 100%;
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
  padding: 20px 0;
  margin-top: auto;
}

.footer-content {
  max-width: 1200px;
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
</style>