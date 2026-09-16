<script setup>
const domain = import.meta.env.VITE_APP_DOMAIN
</script>
<template>
  <div class="modal-overlay">
    <div class="modal">
      <div class="close">
        <button class="close-button" @click="closeModal">X</button>
      </div>
      <h5>Enter the details for creating your subdomain:</h5>
      <p>Subdomain:<br><input class="input-field" v-model="subdomain" />.{{ domain }}</p>
      <p>Resource Type:<br>
        <select class="dropdown" v-model="resource_type">
          <option v-for="option in resourceTypes" :key="option">{{ option }}</option>
        </select>
      </p>
      <p>Resource:<br><input class="input-field" v-model="resource" /></p>
      <div v-if="resource_type === 'GITHUB'" class="github-section">
        <p>Your env contents:</p>
        <textarea class="code-textarea" cols="50" rows="10" v-model="env_content"></textarea>
        <div class="static-content">
          <label for="static">Do you have static content on your repo?</label><br>
          <input name="radio" type="radio" value="Yes" v-model="static_content"> Yes
          <input name="radio" type="radio" value="No" v-model="static_content"> No
        </div>
        <div v-if="static_content === 'No'" class="stack-section">
          <div class="docker-content">
            <label for="dockerfile-content">Do you have dockerfile in your repo ?</label><br>
            <input name="radio" type="radio" value="Yes" v-model="dockerfile_present"> Yes
            <input name="radio" type="radio" value="No" v-model="dockerfile_present"> No
          </div>
          <div v-if="dockerfile_present === 'No'" class="dockerfile-section">
        <p>Stack:</p>
        <select class="dropdown" v-model="stack">
          <option v-for="option in stacks" :key="option">{{ option }}</option>
        </select>
        </div>
        <p>Port:<br><input class="input-field" v-model="port" /></p>
        <div v-if="dockerfile_present === 'No'" class="dockerfile-section">
        <p>Build Commands:<br><textarea class="textarea-field" cols="50" rows="10" v-model="build_cmds"></textarea></p>
        </div>
        </div>
      </div>
      <div v-if="resource_type === 'GITHUB'" class="ci-section" style="margin-top: 15px;">
        <label for="ci-checkbox" style="font-weight: bold; cursor: pointer;">
          <input type="checkbox" id="ci-checkbox" v-model="enable_ci" style="margin-right: 8px;">
          Enable auto-deploy on main branch pushes (CI/CD)
        </label>
      </div>
      <div class="button-container">
        <button class="cancel-button" @click="closeModal">Cancel</button>
        <button class="submit-button" @click="submitForm">Submit</button>
      </div>
    </div>
  </div>
</template>

<script>
import { create } from '../utils/create.ts';

export default {
  data() {
    return {
      subdomain: '',
      resource_type: '',
      resource: '',
      env_content: 'key1 = value1', // Default prompt text
      static_content: 'No',
      dockerfile_present :'No',
      port: '',
      stack: '',
      build_cmds: '',
      enable_ci: false,
      resourceTypes: ['URL', 'PORT', 'GITHUB'],
      stacks: ['Python', 'NodeJS', 'Go', 'Rust', 'React']
    };
  },
  methods: {
    isValidSubdomain(subdomain) {
      // Strict allowlist: alphanumeric, dots, and hyphens. Length between 1 and 63.
      const regex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
      return regex.test(subdomain);
    },
    submitForm() {
      if (!this.subdomain) {
        alert('Subdomain is required');
        return;
      }
      if (!this.isValidSubdomain(this.subdomain)) {
        alert('Invalid subdomain format. Use alphanumeric characters, hyphens, or dots.');
        return;
      }
      console.log(this.subdomain, this.resource_type, this.resource);
      create(this.subdomain, this.resource_type, this.resource, this.env_content, this.static_content,this.dockerfile_present,this.port, this.stack, this.build_cmds, this.enable_ci)
        .then((res) => {
          console.log(res);
          if (res === 'Submitted') {
            this.closeModalAndReload();
          } else {
            this.closeModal();
            alert('Failed to create subdomain');
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          }
        });
    },
    closeModal() {
      this.$emit('close-modal');
    },
    closeModalAndReload() {
      this.closeModal();
      window.location.reload();
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
  background-color: #ffffff;
  border-radius: 10px;
  padding: 20px;
  max-width: 600px;
  width: 90%;
  overflow-y: auto; 
  max-height: 80vh;
  box-shadow: 0px 0px 20px rgba(0, 0, 0, 0.2);
  position: relative;
}

.close {
  position: absolute;
  top: 10px;
  right: 10px;
}

.close-button {
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

.input-field,
.dropdown,
.textarea-field,
.code-textarea {
  width: 100%;
  margin-bottom: 15px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 14px;
}

.code-textarea {
  font-family: 'Courier New', Courier, monospace;
  background-color: #f7f7f7;
}

.github-section {
  margin-top: 15px;
}

.stack-section {
  margin-top: 15px;
}

.static-content {
  margin-top: 10px;
  margin-bottom: 15px;
}

.button-container {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}

.cancel-button,
.submit-button {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.cancel-button {
  background-color: #ccc;
  color: #000;
}

.submit-button {
  background-color: #2080f6;
  color: #fff;
}
</style>
