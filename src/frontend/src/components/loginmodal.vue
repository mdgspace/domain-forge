<template>
  <div class="flat-modal-overlay" @click.self="closeModal">
    <div class="flat-modal">
      <button class="close-btn" @click="closeModal" aria-label="Close modal">
        <X :size="18" :stroke-width="2.5" />
      </button>
      
      <div class="logo-circle">
        <img src="/df-logo.png" alt="Domain Forge Logo" class="logo">
      </div>

      <h2 class="title">Sign in to Domain Forge</h2>
      <p class="subtitle">Select your identity provider to access deployments and telemetry.</p>

      <div class="button-container">
        <button class="oauth-button github-btn" @click="loginWith('github')">
          <img src="/github-logo.png" alt="GitHub Logo" class="oauth-icon">
          <span>Continue with GitHub</span>
        </button>

        <button class="oauth-button gitlab-btn" @click="loginWith('gitlab')">
          <img src="/gitlab-logo.png" alt="GitLab Logo" class="oauth-icon">
          <span>Continue with GitLab</span>
        </button>
      </div>

      <p class="modal-footnote">
        Secure OAuth authentication directly through your Git provider.
      </p>
    </div>
  </div>
</template>

<script setup>
import { oauthUrl } from '../utils/oauth-urls';
import { X } from 'lucide-vue-next';
</script>

<script>
export default {
  methods: {
    closeModal() {
      this.$emit('close-modal');
    },
    closeModalAndReload() {
      this.closeModal();
      window.location.reload();
    },
    loginWith(service) {
      localStorage.setItem("provider", service);
      window.location.href = oauthUrl(service);
    }
  }
};
</script>

<style scoped>
.flat-modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(17, 24, 39, 0.7);
  z-index: 100;
  padding: 20px;
}

.flat-modal {
  background-color: #ffffff;
  border-radius: var(--radius-lg);
  padding: 36px 32px 30px;
  max-width: 420px;
  width: 100%;
  border: 2px solid var(--color-muted);
  text-align: center;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background-color: var(--color-muted);
  color: var(--color-fg);
  border: 0;
}

.close-btn:hover {
  background-color: var(--color-muted-hover);
  transform: scale(1.05);
}

.logo-circle {
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background-color: var(--color-muted);
  margin-bottom: 20px;
}

.logo {
  width: 44px;
  height: 44px;
  object-fit: contain;
}

.title {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--color-fg);
  margin: 0 0 6px;
  letter-spacing: -0.02em;
}

.subtitle {
  color: #6b7280;
  font-size: 0.9rem;
  margin: 0 0 26px;
  max-width: 300px;
  line-height: 1.45;
}

.button-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.oauth-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  padding: 14px 18px;
  border-radius: var(--radius-md);
  font-size: 0.95rem;
  font-weight: 700;
  border: 0;
  transition: all var(--transition-fast);
}

.github-btn {
  background-color: var(--color-dark);
  color: #ffffff;
}

.github-btn:hover {
  background-color: #000000;
  transform: scale(1.05);
}

.gitlab-btn {
  background-color: var(--color-muted);
  color: var(--color-fg);
}

.gitlab-btn:hover {
  background-color: var(--color-muted-hover);
  transform: scale(1.05);
}

.oauth-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.modal-footnote {
  margin: 24px 0 0;
  color: #9ca3af;
  font-size: 0.78rem;
  line-height: 1.4;
}
</style>
