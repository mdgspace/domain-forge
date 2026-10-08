<template>
  <div class="modal-overlay" v-if="selectedItem" @click.self="closeModal">
    <div class="modal">
      <div class="modal-header">
        <div class="danger-icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <button class="close-btn" @click="closeModal" aria-label="Close modal">
          <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <h3>Delete Deployment</h3>
        <p class="warning-text">
          Are you sure you want to delete this deployment? The container, routing rules, and associated records will be permanently removed.
        </p>

        <div class="target-card">
          <div class="target-field">
            <span class="field-label">Subdomain</span>
            <span class="field-value mono">{{ selectedItem.subdomain }}</span>
          </div>
          <div class="target-field" v-if="selectedItem.resource_type">
            <span class="field-label">Resource Type</span>
            <span class="field-value">{{ selectedItem.resource_type }}</span>
          </div>
          <div class="target-field" v-if="selectedItem.resource">
            <span class="field-label">Resource</span>
            <span class="field-value text-truncate">{{ selectedItem.resource }}</span>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-cancel" @click="closeModal">Cancel</button>
        <button class="btn-delete" @click="deleteItem">Delete Subdomain</button>
      </div>
    </div>
  </div>
</template>

<script>
import { deleteSubDomain } from '../utils/delete.ts';

export default {
  props: {
    selectedItem: {
      type: Object,
      required: true
    }
  },
  methods: {
    deleteItem() {
      deleteSubDomain(this.selectedItem.subdomain).then(() => {
        window.location.reload();
      });
      this.closeModal();
    },
    closeModal() {
      this.$emit('close-modal');
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
  max-width: 460px;
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
  padding: 22px 24px 0;
}

.danger-icon-wrap {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #fee2e2;
  color: #dc2626;
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
  padding: 16px 24px 20px;
  text-align: left;
}

.modal-body h3 {
  margin: 0 0 6px;
  font-size: 1.25rem;
  font-weight: 700;
  color: #172033;
}

.warning-text {
  margin: 0 0 16px;
  color: #64748b;
  font-size: 0.88rem;
  line-height: 1.5;
}

.target-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.target-field {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.84rem;
}

.field-label {
  color: #64748b;
  font-weight: 500;
}

.field-value {
  color: #172033;
  font-weight: 600;
}

.field-value.mono {
  font-family: var(--font-mono);
  color: #dc2626;
  background: #fee2e2;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 0.82rem;
}

.text-truncate {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px 20px;
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

.btn-delete {
  padding: 9px 20px;
  border-radius: 9px;
  background: #dc2626;
  color: #ffffff;
  font-size: 0.88rem;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.25);
  transition: all 0.15s ease;
}

.btn-delete:hover {
  background: #b91c1c;
  box-shadow: 0 4px 14px rgba(220, 38, 38, 0.35);
  transform: translateY(-1px);
}
</style>
