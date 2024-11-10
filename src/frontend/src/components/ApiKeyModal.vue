<template>
  <div class="api-key-modal">
    <div class="modal-content">
      <h3>Your API Key</h3>
      <div class="api-key-container">
        <input :value="apiKey" readonly ref="apiInput" />
        <button @click="copyApiKey">Copy</button>
      </div>
      <div>
        <p>You can use this Api key for accesing doamin forge through cli</p>
        <P>You can run "npm i -g domainforge-cli" to use domain forge cli</p>
      </div>
      <button @click="$emit('close-modal') class="close-button">Close</button>
    </div>
  </div>
</template>

<script>
export default {
  props: ['apiKey'],
  methods: {
    copyApiKey() {
      const input = this.$refs.apiInput;
      input.select();
      document.execCommand("copy");
      alert("API Key copied to clipboard!");
    }
  }
}
</script>

<style scoped>
.api-key-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #F5F5DC;
  padding: 20px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.3);
  border-radius: 10px;
}
.close-button {
  width : 50%;
}
.api-key-container {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
input {
  width: 80%;
  padding: 5px;
}
</style>
