<template>
  <div class="flat-modal-overlay" v-if="selectedItem" @click.self="closeModal">
    <div class="flat-modal">
      <div class="modal-header">
        <div class="danger-icon-circle">
          <Trash2 :size="22" :stroke-width="2.5" />
        </div>
        <button class="close-btn" @click="closeModal" aria-label="Close modal">
          <X :size="18" :stroke-width="2.5" />
        </button>
      </div>

      <div class="modal-body">
        <h3>Delete Subdomain</h3>
        <p class="warning-text">
          Are you sure you want to delete this deployment? The container, routing rules, and associated records will be permanently removed.
        </p>

        <div class="target-block">
          <div class="target-row">
            <span class="label">SUBDOMAIN</span>
            <span class="value-mono">{{ selectedItem.subdomain }}</span>
          </div>
          <div class="target-row" v-if="selectedItem.resource_type">
            <span class="label">TYPE</span>
            <span class="value">{{ selectedItem.resource_type }}</span>
          </div>
          <div class="target-row" v-if="selectedItem.resource">
            <span class="label">TARGET</span>
            <span class="value truncate">{{ selectedItem.resource }}</span>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" @click="closeModal">Cancel</button>
        <button class="btn-danger" @click="deleteItem">Delete Subdomain</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Trash2, X } from "lucide-vue-next";
</script>

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
  max-width: 460px;
  width: 100%;
  border: 2px solid var(--color-danger-subtle);
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

.danger-icon-circle {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: var(--color-danger-subtle);
  color: var(--color-danger);
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

.warning-text {
  margin: 0 0 16px;
  color: #4b5563;
  font-size: 0.9rem;
  line-height: 1.5;
}

.target-block {
  background-color: #f9fafb;
  border: 2px solid var(--color-muted);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.target-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.86rem;
}

.label {
  color: #6b7280;
  font-weight: 700;
  font-size: 0.76rem;
  letter-spacing: 0.05em;
}

.value {
  color: var(--color-fg);
  font-weight: 700;
}

.value-mono {
  font-family: var(--font-mono);
  color: var(--color-danger-hover);
  background-color: var(--color-danger-subtle);
  padding: 2px 8px;
  border-radius: var(--radius-md);
  font-size: 0.84rem;
  font-weight: 700;
}

.truncate {
  max-width: 230px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 26px 24px;
  border-top: 2px solid var(--color-muted);
  background-color: #ffffff;
}
</style>
