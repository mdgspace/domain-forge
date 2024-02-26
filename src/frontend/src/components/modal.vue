<template>
  <div class="modal-overlay">
    <div class="modal">
      <h5>Enter the details for creating your subdomain:</h5>
      <p>Subdomain:<br><input class="input-field" v-model="subdomain" />.df.mdgspace.org</p>
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
        <p>Stack:</p>
        <select class="dropdown" v-model="stack">
          <option v-for="option in stacks" :key="option">{{ option }}</option>
        </select>
        <p>Port:<br><input class="input-field" v-model="port" /></p>
        <p>Build Commands:<br><textarea class="textarea-field" cols="50" rows="10" v-model="build_cmds"></textarea></p>
      </div>
      </div>
      <div class="button-container">
        <button class="cancel-button" @click="closeModal">Cancel</button>
        <button class="submit-button" @click="submitForm">Submit</button>
      </div>
    </div>
    <div class="close">
      <button class="close-button" @click="closeModal">X</button>
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
      port: '',
      stack: '',
      build_cmds: '',
      resourceTypes: ['URL', 'PORT', 'GITHUB'],
      stacks: ['Python', 'NodeJS']
    };
  },
  methods: {
    submitForm() {
      console.log(this.subdomain, this.resource_type, this.resource);
      create(this.subdomain, this.resource_type, this.resource, this.env_content, this.static_content, this.port, this.stack, this.build_cmds)
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
  box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.3);
  overflow-y: auto; /* Enable vertical scroll if content exceeds height */
  max-height: 80vh; /* Limit height and enable scroll if content exceeds viewport height */
}

.modal h5 {
  font-size: 18px;
  margin-bottom: 15px;
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

.close {
  position: absolute;
  top: 10px;
  right: 10px;
}

.close-button {
  border: none;
  background-color: transparent;
  font-size: 20px;
  cursor: pointer;
}
</style>
