<template>
  <div class="modal-overlay" @click.self="$emit('close-modal')">
    <div class="modal">
      <div class="modal-header">
        <div class="key-icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <button class="close-btn" @click="$emit('close-modal')" aria-label="Close modal">
          <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <h3>API Key</h3>
        <p class="modal-subtitle">
          Use this secret key to authenticate your sessions with the Domain Forge CLI.
        </p>

        <div class="api-key-container">
          <input 
            :value="apiKey || 'No API key generated yet'" 
            readonly 
            ref="apiInput" 
            class="api-key-input"
            type="text"
          />
          <button @click="copyApiKey" class="copy-btn" :class="{ copied: copiedState }">
            <svg v-if="!copiedState" viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
              <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
              <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
            </svg>
            <svg v-else viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
            {{ copiedState ? 'Copied!' : 'Copy' }}
          </button>
        </div>

        <div class="cli-info-card">
          <div class="cli-info-header">
            <span class="terminal-dots">
              <span></span><span></span><span></span>
            </span>
            <span class="cli-info-title">Install CLI</span>
          </div>
          <div class="cli-command">
            <code>npm i -g domainforge-cli</code>
          </div>
          <p class="cli-tip">Run this command in your terminal to install the CLI tool.</p>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="$emit('close-modal')" class="btn-done">Done</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: ['apiKey'],
  data() {
    return {
      copiedState: false
    };
  },
  methods: {
    async copyApiKey() {
      const input = this.$refs.apiInput;
      if (!input || !this.apiKey) return;

      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(this.apiKey);
        } else {
          input.select();
          document.execCommand("copy");
        }
        this.copiedState = true;
        setTimeout(() => {
          this.copiedState = false;
        }, 2200);
      } catch {
        input.select();
        document.execCommand("copy");
        this.copiedState = true;
        setTimeout(() => {
          this.copiedState = false;
        }, 2200);
      }
    }
  }
}
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
  border-radius: 18px;
  max-width: 480px;
  width: 100%;
  box-shadow: 0 24px 60px -12px rgba(15, 23, 42, 0.22);
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 26px 0;
}

.key-icon-wrap {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #eff6ff;
  color: #2563eb;
}

.close-btn {
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

.modal-body {
  padding: 18px 26px 20px;
  text-align: left;
}

.modal-body h3 {
  margin: 0 0 6px;
  font-size: 1.25rem;
  font-weight: 700;
  color: #172033;
}

.modal-subtitle {
  margin: 0 0 18px;
  color: #64748b;
  font-size: 0.88rem;
  line-height: 1.45;
}

.api-key-container {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
}

.api-key-input {
  flex: 1;
  padding: 10px 14px;
  background-color: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 9px;
  font-family: var(--font-mono);
  font-size: 0.86rem;
  color: #0f172a;
}

.copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background-color: #2563eb;
  color: #ffffff;
  border-radius: 9px;
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.2);
  transition: all 0.15s ease;
}

.copy-btn:hover {
  background-color: #1d4ed8;
}

.copy-btn.copied {
  background-color: #16a34a;
  box-shadow: 0 2px 8px rgba(22, 163, 74, 0.25);
}

.cli-info-card {
  background: #0f172a;
  border-radius: 12px;
  padding: 14px 16px;
  color: #e2e8f0;
}

.cli-info-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.terminal-dots {
  display: flex;
  gap: 5px;
}

.terminal-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #334155;
}

.cli-info-title {
  font-size: 0.76rem;
  color: #94a3b8;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.cli-command code {
  font-family: var(--font-mono);
  color: #38bdf8;
  font-size: 0.85rem;
}

.cli-tip {
  margin: 8px 0 0;
  color: #94a3b8;
  font-size: 0.78rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  padding: 16px 26px 22px;
  border-top: 1px solid #f1f5f9;
}

.btn-done {
  padding: 9px 22px;
  border-radius: 9px;
  background: #172033;
  color: #ffffff;
  font-size: 0.88rem;
  font-weight: 600;
  transition: all 0.15s ease;
}

.btn-done:hover {
  background: #0b0f19;
}
</style>
