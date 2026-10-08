<script setup>
const domain = import.meta.env.VITE_APP_DOMAIN
</script>

<template>
  <div class="modal-overlay" @click.self="closeModal">
    <div class="modal">
      <div class="modal-header">
        <div>
          <h3>Create Subdomain</h3>
          <p class="modal-subtitle">Configure routing and deployment settings for your service.</p>
        </div>
        <button class="close-btn" @click="closeModal" aria-label="Close modal">
          <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label class="form-label" for="subdomain-input">Subdomain</label>
          <div class="subdomain-input-group">
            <input 
              id="subdomain-input" 
              class="form-input subdomain-input" 
              v-model="subdomain" 
              placeholder="e.g. my-app" 
            />
            <span class="subdomain-addon">.{{ domain }}</span>
          </div>
          <span class="form-hint">Only alphanumeric characters and hyphens allowed.</span>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label" for="resource-type">Resource Type</label>
            <div class="select-wrapper">
              <select id="resource-type" class="form-select" v-model="resource_type">
                <option value="" disabled selected>Select resource type</option>
                <option v-for="option in resourceTypes" :key="option" :value="option">{{ option }}</option>
              </select>
            </div>
          </div>

          <div class="form-group flex-2">
            <label class="form-label" for="resource-input">Resource Target</label>
            <input 
              id="resource-input" 
              class="form-input" 
              v-model="resource" 
              :placeholder="resource_type === 'GITHUB' ? 'e.g. https://github.com/org/repo' : resource_type === 'PORT' ? 'e.g. 8080' : 'e.g. https://target-host.com'" 
            />
          </div>
        </div>

        <div v-if="resource_type === 'GITHUB'" class="github-section">
          <div class="section-divider">
            <span>GitHub Configuration</span>
          </div>

          <div class="form-group">
            <label class="form-label">Environment Variables (.env)</label>
            <textarea 
              class="code-textarea" 
              rows="4" 
              v-model="env_content" 
              placeholder="KEY=value&#10;PORT=3000"
            ></textarea>
            <span class="form-hint">Variables injected into the container environment.</span>
          </div>

          <div class="segmented-control-group">
            <label class="form-label">Is this a static site?</label>
            <div class="segmented-control">
              <button 
                type="button" 
                class="segment-btn" 
                :class="{ active: static_content === 'Yes' }" 
                @click="static_content = 'Yes'"
              >
                Yes (Static)
              </button>
              <button 
                type="button" 
                class="segment-btn" 
                :class="{ active: static_content === 'No' }" 
                @click="static_content = 'No'"
              >
                No (Backend / Dynamic)
              </button>
            </div>
          </div>

          <div v-if="static_content === 'No'" class="stack-section">
            <div class="segmented-control-group">
              <label class="form-label">Does the repository include a Dockerfile?</label>
              <div class="segmented-control">
                <button 
                  type="button" 
                  class="segment-btn" 
                  :class="{ active: dockerfile_present === 'Yes' }" 
                  @click="dockerfile_present = 'Yes'"
                >
                  Yes (Custom Dockerfile)
                </button>
                <button 
                  type="button" 
                  class="segment-btn" 
                  :class="{ active: dockerfile_present === 'No' }" 
                  @click="dockerfile_present = 'No'"
                >
                  No (Use Buildpack)
                </button>
              </div>
            </div>

            <div v-if="dockerfile_present === 'No'" class="form-group">
              <label class="form-label">Runtime Stack</label>
              <div class="select-wrapper">
                <select class="form-select" v-model="stack">
                  <option value="" disabled selected>Select technology stack</option>
                  <option v-for="option in stacks" :key="option" :value="option">{{ option }}</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="container-port">Container Port</label>
              <input id="container-port" class="form-input" v-model="port" placeholder="e.g. 3000 or 8080" />
            </div>

            <div v-if="dockerfile_present === 'No'" class="form-group">
              <label class="form-label">Build Commands</label>
              <textarea 
                class="code-textarea" 
                rows="3" 
                v-model="build_cmds" 
                placeholder="npm install &amp;&amp; npm run build"
              ></textarea>
            </div>
          </div>

          <div class="ci-toggle-box">
            <label class="ci-checkbox-label">
              <input type="checkbox" id="ci-checkbox" v-model="enable_ci" class="custom-checkbox">
              <div class="ci-label-content">
                <strong>Enable Continuous Deployment (CI/CD)</strong>
                <span>Automatically trigger redeployment on push to default branch.</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-cancel" @click="closeModal">Cancel</button>
        <button class="btn-submit" @click="submitForm">Create Subdomain</button>
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
      dockerfile_present: 'No',
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
      create(this.subdomain, this.resource_type, this.resource, this.env_content, this.static_content, this.dockerfile_present, this.port, this.stack, this.build_cmds, this.enable_ci)
        .then((res) => {
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
  max-width: 620px;
  width: 100%;
  max-height: 88vh;
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
  align-items: flex-start;
  padding: 24px 28px 18px;
  border-bottom: 1px solid #f1f5f9;
}

.modal-header h3 {
  margin: 0;
  color: #172033;
  font-size: 1.3rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.modal-subtitle {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 0.86rem;
}

.close-btn {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: transparent;
  color: #94a3b8;
  transition: all 0.15s ease;
}

.close-btn:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.modal-body {
  padding: 24px 28px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-row {
  display: flex;
  gap: 14px;
}

.flex-1 { flex: 1; }
.flex-2 { flex: 2; }

.form-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #334155;
}

.form-hint {
  font-size: 0.76rem;
  color: #94a3b8;
}

.form-input {
  width: 100%;
  padding: 9px 13px;
  border: 1px solid #cbd5e1;
  border-radius: 9px;
  font-size: 0.9rem;
  color: #1e293b;
  background: #ffffff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.form-input:focus,
.form-select:focus,
.code-textarea:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
}

.subdomain-input-group {
  display: flex;
  align-items: stretch;
}

.subdomain-input {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  font-family: var(--font-mono);
  font-size: 0.9rem;
}

.subdomain-addon {
  display: inline-flex;
  align-items: center;
  padding: 0 14px;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-left: none;
  border-top-right-radius: 9px;
  border-bottom-right-radius: 9px;
  color: #64748b;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  font-weight: 500;
  white-space: nowrap;
}

.select-wrapper {
  position: relative;
}

.form-select {
  width: 100%;
  padding: 9px 13px;
  border: 1px solid #cbd5e1;
  border-radius: 9px;
  font-size: 0.9rem;
  color: #1e293b;
  background-color: #ffffff;
  cursor: pointer;
  transition: border-color 0.15s ease;
}

.code-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 9px;
  font-family: var(--font-mono);
  font-size: 0.82rem;
  line-height: 1.5;
  color: #0f172a;
  background-color: #f8fafc;
  resize: vertical;
}

.section-divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 10px 0;
}

.section-divider::before,
.section-divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid #e2e8f0;
}

.section-divider span {
  padding: 0 12px;
  color: #2563eb;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.github-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #f8fafc;
  padding: 18px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.segmented-control-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.segmented-control {
  display: flex;
  background: #e2e8f0;
  padding: 3px;
  border-radius: 9px;
  gap: 3px;
}

.segment-btn {
  flex: 1;
  padding: 7px 12px;
  border-radius: 7px;
  font-size: 0.82rem;
  font-weight: 600;
  background: transparent;
  color: #64748b;
  transition: all 0.15s ease;
}

.segment-btn.active {
  background: #ffffff;
  color: #172033;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

.stack-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.ci-toggle-box {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px 14px;
}

.ci-checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
}

.custom-checkbox {
  margin-top: 3px;
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #2563eb;
}

.ci-label-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ci-label-content strong {
  font-size: 0.84rem;
  color: #1e293b;
}

.ci-label-content span {
  font-size: 0.76rem;
  color: #64748b;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 18px 28px;
  border-top: 1px solid #f1f5f9;
  background: #ffffff;
}

.btn-cancel {
  padding: 9px 18px;
  border-radius: 9px;
  background: #f1f5f9;
  color: #475569;
  font-size: 0.88rem;
  font-weight: 600;
  transition: all 0.15s ease;
}

.btn-cancel:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.btn-submit {
  padding: 9px 20px;
  border-radius: 9px;
  background: #2563eb;
  color: #ffffff;
  font-size: 0.88rem;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
  transition: all 0.15s ease;
}

.btn-submit:hover {
  background: #1d4ed8;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
  transform: translateY(-1px);
}
</style>
