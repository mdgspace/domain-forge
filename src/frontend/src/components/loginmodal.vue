<template>
  <div class="modal-overlay">
    <div class="modal">
      <button class="close-button" @click="closeModal">X</button>
      <img src="/df-logo.png" alt="Domain Forge Logo" class="logo">
      <h2 class="title">Login to Domain Forge</h2>
      <div class="button-container">
        <button class="button" @click="loginWith('github')">
          <img src="/github-logo.png" alt="GitHub Logo" class="icon">Login with GitHub
        </button>
        <button class="button" @click="loginWith('gitlab')">
          <img src="/gitlab-logo.png" alt="GitLab Logo" class="icon">Login with GitLab
        </button>
      </div>
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
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.5);
}

.modal {
  background-color: #f5f5f5;
  border-radius: 10px;
  padding: 30px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0px 0px 20px rgba(0, 0, 0, 0.2);
  text-align: center;
  position: relative;
}

.close-button {
  position: absolute;
  top: 10px;
  right: 10px;
  border: none;
  background-color: transparent;
  color: #777;
  font-size: 24px;
  width: 30px; 
  height: 30px; 
  cursor: pointer;
}

.close-button:hover {
  color: #333;
}

.logo {
  width: 120px;
  height: auto;
}

.title {
  font-size: 24px;
  margin-top: 20px;
  margin-bottom: 30px;
}

.button-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.button {
  background-color: #007bff;
  color: #fff;
  border: none;
  border-radius: 5px;
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.button:hover {
  background-color: #0056b3;
}

.icon {
  width: 20px;
  height: auto;
  margin-right: 10px;
}
</style>
