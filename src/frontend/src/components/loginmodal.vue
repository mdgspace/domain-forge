<template>
  <div class="modal-overlay" @click.self="closeModal">
    <div class="modal">
      <button class="close-btn" @click="closeModal" aria-label="Close modal">
        <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
      
      <div class="logo-wrapper">
        <img src="/df-logo.png" alt="Domain Forge Logo" class="logo">
      </div>

      <h2 class="title">Sign in to Domain Forge</h2>
      <p class="subtitle">Choose your provider to access deployments and telemetry.</p>

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
        By continuing, you authenticate securely through your Git provider.
      </p>
    </div>
  </div>
</template>

<script setup>
import { oauthUrl } from '../utils/oauth-urls';
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
.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 100;
  padding: 20px;
}

.modal {
  background-color: #ffffff;
  border-radius: 20px;
  padding: 36px 32px 30px;
  max-width: 420px;
  width: 100%;
  box-shadow: 0 24px 60px -12px rgba(15, 23, 42, 0.22);
  border: 1px solid #e2e8f0;
  text-align: center;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: modal-appear 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modal-appear {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.15s ease;
}

.close-btn:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.logo-wrapper {
  display: grid;
  place-items: center;
  width: 68px;
  height: 68px;
  border-radius: 18px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  margin-bottom: 20px;
}

.logo {
  width: 42px;
  height: 42px;
  object-fit: contain;
}

.title {
  font-size: 1.35rem;
  font-weight: 700;
  color: #172033;
  margin: 0 0 6px;
  letter-spacing: -0.02em;
}

.subtitle {
  color: #64748b;
  font-size: 0.88rem;
  margin: 0 0 24px;
  max-width: 280px;
  line-height: 1.4;
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
  padding: 12px 18px;
  border-radius: 10px;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.github-btn {
  background-color: #171d2b;
  color: #ffffff;
  border: 1px solid #171d2b;
  box-shadow: 0 2px 8px rgba(23, 29, 43, 0.18);
}

.github-btn:hover {
  background-color: #0b0f19;
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(23, 29, 43, 0.25);
}

.gitlab-btn {
  background-color: #ffffff;
  color: #1f2937;
  border: 1px solid #d1d5db;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.gitlab-btn:hover {
  background-color: #f9fafb;
  border-color: #9ca3af;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.oauth-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.modal-footnote {
  margin: 22px 0 0;
  color: #94a3b8;
  font-size: 0.76rem;
  line-height: 1.4;
}
</style>
