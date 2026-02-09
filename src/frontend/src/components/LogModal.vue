<template>
  <div class="modal-overlay" v-if="logs">
    <div class="modal">
      <div class="close">
        <button class="close-button" @click="$emit('close')">X</button>
      </div>
      <h3>Build Failure Logs</h3>
      <div class="log-container">
        <pre>{{ logs }}</pre>
      </div>
      <button class="copy-btn" @click="copyLogs">Copy Logs</button>
    </div>
  </div>
</template>

<script>
export default {
  props: ['logs'],
  methods: {
    copyLogs() {
      navigator.clipboard.writeText(this.logs);
      alert("Logs copied!");
    }
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center;
}
.modal {
  background: white; padding: 20px; border-radius: 8px; width: 80%; max-width: 800px;
}
.log-container {
  background: #1e1e1e; color: #ff5555; padding: 15px; 
  border-radius: 4px; overflow: auto; max-height: 400px; margin: 15px 0;
  text-align: left;
}
pre { white-space: pre-wrap; font-family: monospace; }
.close-button { float: right; border: none; background: none; font-size: 20px; cursor: pointer; }
.copy-btn { background: #555; color: white; border: none; padding: 8px 16px; cursor: pointer; }
</style>