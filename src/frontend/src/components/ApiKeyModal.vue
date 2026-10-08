<template>
  <div class="flat-modal-overlay" @click.self="$emit('close-modal')">
    <div class="flat-modal">
      <div class="modal-header">
        <div class="key-icon-circle">
          <Key :size="22" :stroke-width="2.5" />
        </div>
        <button class="close-btn" @click="$emit('close-modal')" aria-label="Close modal">
          <X :size="18" :stroke-width="2.5" />
        </button>
      </div>

      <div class="modal-body">
        <h3>API Key</h3>
        <p class="modal-subtitle">
          Use this key to authenticate your sessions with the Domain Forge CLI.
        </p>

        <div class="api-key-container">
          <input 
            :value="apiKey || 'No API key generated yet'" 
            readonly 
            ref="apiInput" 
            class="flat-api-input"
            type="text"
          />
          <button @click="copyApiKey" class="copy-btn" :class="{ copied: copiedState }">
            <Check v-if="copiedState" :size="16" :stroke-width="2.5" />
            <Copy v-else :size="16" :stroke-width="2.5" />
            <span>{{ copiedState ? 'Copied!' : 'Copy' }}</span>
          </button>
        </div>

        <div class="cli-info-block">
          <div class="cli-header">
            <Terminal :size="15" :stroke-width="2.5" />
            <span>INSTALL CLI</span>
          </div>
          <div class="cli-code-line">
            <code>npm i -g domainforge-cli</code>
          </div>
          <p class="cli-tip">Run this command in your terminal to install the CLI tool.</p>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="$emit('close-modal')" class="btn-primary">Done</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Key, Copy, Check, X, Terminal } from "lucide-vue-next";
</script>

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
  max-width: 480px;
  width: 100%;
  border: 2px solid var(--color-muted);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 26px 0;
}

.key-icon-circle {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: var(--color-blue-subtle);
  color: var(--color-primary);
}

.close-btn {
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

.modal-body {
  padding: 18px 26px 20px;
  text-align: left;
}

.modal-body h3 {
  margin: 0 0 6px;
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--color-fg);
}

.modal-subtitle {
  margin: 0 0 18px;
  color: #6b7280;
  font-size: 0.9rem;
  line-height: 1.45;
}

.api-key-container {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
}

.flat-api-input {
  flex: 1;
  padding: 11px 14px;
  background-color: var(--color-muted);
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--color-fg);
}

.copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 11px 18px;
  background-color: var(--color-primary);
  color: #ffffff;
  border-radius: var(--radius-md);
  font-size: 0.88rem;
  font-weight: 700;
  white-space: nowrap;
  border: 0;
  transition: all var(--transition-fast);
}

.copy-btn:hover {
  background-color: var(--color-primary-hover);
  transform: scale(1.05);
}

.copy-btn.copied {
  background-color: var(--color-secondary);
}

.cli-info-block {
  background-color: var(--color-dark);
  border-radius: var(--radius-md);
  padding: 16px 18px;
  color: #e5e7eb;
}

.cli-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 0.74rem;
  color: #9ca3af;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.cli-code-line code {
  font-family: var(--font-mono);
  color: #38bdf8;
  font-size: 0.88rem;
  font-weight: 600;
}

.cli-tip {
  margin: 10px 0 0;
  color: #9ca3af;
  font-size: 0.8rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  padding: 16px 26px 24px;
  border-top: 2px solid var(--color-muted);
}
</style>
