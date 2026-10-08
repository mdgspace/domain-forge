<script setup>
import { X, Check } from "lucide-vue-next";
const domain = import.meta.env.VITE_APP_DOMAIN;
</script>

<template>
  <div class="flat-modal-overlay" @click.self="closeModal">
    <div class="flat-modal">
      <div class="modal-header">
        <div>
          <h3>Create Subdomain</h3>
          <p class="modal-subtitle">Configure routing and deployment parameters for your service.</p>
        </div>
        <button class="close-btn" @click="closeModal" aria-label="Close modal">
          <X :size="18" :stroke-width="2.5" />
        </button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label class="form-label" for="subdomain-input">SUBDOMAIN</label>
          <div class="subdomain-input-group">
            <input 
              id="subdomain-input" 
              class="flat-input subdomain-input" 
              v-model="subdomain" 
              placeholder="my-service" 
            />
            <span class="subdomain-addon">.{{ domain }}</span>
          </div>
          <span class="form-hint">Alphanumeric characters, dots, and hyphens allowed.</span>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label" for="resource-type">RESOURCE TYPE</label>
            <select id="resource-type" class="flat-select" v-model="resource_type">
              <option value="" disabled selected>Select type</option>
              <option v-for="option in resourceTypes" :key="option" :value="option">{{ option }}</option>
            </select>
          </div>

          <div class="form-group flex-2">
            <label class="form-label" for="resource-input">RESOURCE TARGET</label>
            <input 
              id="resource-input" 
              class="flat-input" 
              v-model="resource" 
              :placeholder="resource_type === 'GITHUB' ? 'https://github.com/org/repo' : resource_type === 'PORT' ? '8080' : 'https://target-url.com'" 
            />
          </div>
        </div>

        <!-- GitHub Section (Flat Color Block) -->
        <div v-if="resource_type === 'GITHUB'" class="github-block">
          <div class="block-heading">
            <span>GITHUB CONFIGURATION</span>
          </div>

          <div class="form-group">
            <label class="form-label">ENVIRONMENT VARIABLES (.env)</label>
            <textarea 
              class="flat-code-textarea" 
              rows="4" 
              v-model="env_content" 
              placeholder="KEY=value&#10;PORT=3000"
            ></textarea>
            <span class="form-hint">Injected directly into your container environment.</span>
          </div>

          <div class="segmented-control-group">
            <label class="form-label">IS THIS A STATIC SITE?</label>
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
              <label class="form-label">DOES THE REPO HAVE A DOCKERFILE?</label>
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
              <label class="form-label">RUNTIME STACK</label>
              <select class="flat-select" v-model="stack">
                <option value="" disabled selected>Select technology stack</option>
                <option v-for="option in stacks" :key="option" :value="option">{{ option }}</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="container-port">CONTAINER PORT</label>
              <input id="container-port" class="flat-input" v-model="port" placeholder="3000" />
            </div>

            <div v-if="dockerfile_present === 'No'" class="form-group">
              <label class="form-label">BUILD COMMANDS</label>
              <textarea 
                class="flat-code-textarea" 
                rows="3" 
                v-model="build_cmds" 
                placeholder="npm install &amp;&amp; npm run build"
              ></textarea>
            </div>
          </div>

          <div class="ci-toggle-card">
            <label class="ci-label">
              <input type="checkbox" id="ci-checkbox" v-model="enable_ci" class="flat-checkbox">
              <div class="ci-text">
                <strong>Enable Continuous Deployment (CI/CD)</strong>
                <span>Automatically deploy new commits pushed to the main branch.</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" @click="closeModal">Cancel</button>
        <button class="btn-primary" @click="submitForm">Create Subdomain</button>
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
      env_content: 'key1 = value1',
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
  max-width: 620px;
  width: 100%;
  max-height: 88vh;
  border: 2px solid var(--color-muted);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 22px 28px 18px;
  border-bottom: 2px solid var(--color-muted);
}

.modal-header h3 {
  margin: 0;
  color: var(--color-fg);
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.modal-subtitle {
  margin: 4px 0 0;
  color: #6b7280;
  font-size: 0.88rem;
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
  font-size: 0.76rem;
  font-weight: 800;
  color: #374151;
  letter-spacing: 0.05em;
}

.form-hint {
  font-size: 0.78rem;
  color: #6b7280;
}

.flat-input,
.flat-select {
  width: 100%;
  padding: 10px 14px;
  background-color: var(--color-muted);
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  font-size: 0.92rem;
  color: var(--color-fg);
}

.flat-input:focus,
.flat-select:focus,
.flat-code-textarea:focus {
  background-color: #ffffff;
  border-color: var(--color-primary);
  outline: none;
}

.subdomain-input-group {
  display: flex;
  align-items: stretch;
}

.subdomain-input {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  font-family: var(--font-mono);
  font-size: 0.92rem;
  font-weight: 600;
}

.subdomain-addon {
  display: inline-flex;
  align-items: center;
  padding: 0 16px;
  background-color: #e5e7eb;
  border-top-right-radius: var(--radius-md);
  border-bottom-right-radius: var(--radius-md);
  color: #374151;
  font-family: var(--font-mono);
  font-size: 0.88rem;
  font-weight: 700;
}

.flat-code-textarea {
  width: 100%;
  padding: 12px 14px;
  background-color: var(--color-muted);
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: 0.84rem;
  line-height: 1.5;
  color: var(--color-fg);
  resize: vertical;
}

.github-block {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background-color: #f9fafb;
  border: 2px solid var(--color-muted);
  padding: 20px;
  border-radius: var(--radius-lg);
}

.block-heading {
  font-size: 0.76rem;
  font-weight: 800;
  color: var(--color-primary);
  letter-spacing: 0.08em;
}

.segmented-control-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.segmented-control {
  display: flex;
  background-color: #e5e7eb;
  padding: 4px;
  border-radius: var(--radius-md);
  gap: 4px;
}

.segment-btn {
  flex: 1;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  font-size: 0.84rem;
  font-weight: 700;
  background: transparent;
  color: #4b5563;
  border: 0;
}

.segment-btn.active {
  background-color: var(--color-primary);
  color: #ffffff;
}

.stack-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.ci-toggle-card {
  background-color: #ffffff;
  border: 2px solid var(--color-muted);
  border-radius: var(--radius-md);
  padding: 14px 16px;
}

.ci-label {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
}

.flat-checkbox {
  margin-top: 3px;
  width: 18px;
  height: 18px;
  accent-color: var(--color-primary);
  cursor: pointer;
}

.ci-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ci-text strong {
  font-size: 0.88rem;
  color: var(--color-fg);
}

.ci-text span {
  font-size: 0.8rem;
  color: #6b7280;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 18px 28px;
  border-top: 2px solid var(--color-muted);
  background-color: #ffffff;
}
</style>
