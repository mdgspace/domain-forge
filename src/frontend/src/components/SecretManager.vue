<template>
  <div class="modal-overlay" @click.self="closeModal">
    <div class="secret-modal">
      <div class="close">
        <button class="close-button" @click="closeModal">×</button>
      </div>
      <h3>Manage Secrets for {{ subdomain }}</h3>
      <p class="secret-warning">
        Secrets are encrypted and injected at runtime. They will override regular environment variables.
      </p>

      <div v-if="existingKeys.length > 0" class="existing-secrets">
        <h4>Existing Secret Keys ({{ existingKeys.length }})</h4>
        <div class="keys-list">
          <div v-for="key in existingKeys" :key="key" class="key-item">
            <span class="key-name">{{ key }}</span>
            <button class="remove-key-btn" @click="removeKey(key)" title="Remove this secret">×</button>
          </div>
        </div>
      </div>

      <div class="secrets-editor">
        <h4>{{ existingKeys.length > 0 ? 'Add or Update Secrets' : 'Add Secrets' }}</h4>
        <div class="secret-pairs">
          <div v-for="(pair, index) in secretPairs" :key="index" class="secret-pair">
            <input
              v-model="pair.key"
              class="secret-key-input"
              placeholder="Secret key (e.g., API_KEY)"
              :class="{ 'error': pair.errors.key }"
            />
            <input
              v-model="pair.value"
              type="password"
              class="secret-value-input"
              placeholder="Secret value"
              :class="{ 'error': pair.errors.value }"
            />
            <button class="remove-pair-btn" @click="removePair(index)" title="Remove this pair">×</button>
          </div>
          <div v-if="pairErrors.length > 0" class="errors">
            <div v-for="(error, idx) in pairErrors" :key="idx" class="error-message">{{ error }}</div>
          </div>
        </div>
        <button class="add-pair-btn" @click="addPair">+ Add Secret Pair</button>
      </div>

      <div class="button-container">
        <button class="cancel-button" @click="closeModal">Cancel</button>
        <button v-if="existingKeys.length > 0" class="delete-all-button" @click="confirmDeleteAll">
          Delete All Secrets
        </button>
        <button class="submit-button" @click="submitSecrets" :disabled="isSubmitting">
          {{ isSubmitting ? 'Saving...' : 'Save Secrets' }}
        </button>
      </div>

      <div v-if="showDeleteConfirm" class="delete-confirm-overlay">
        <div class="delete-confirm">
          <h4>Delete All Secrets?</h4>
          <p>This will permanently delete all secrets for this project. This action cannot be undone.</p>
          <div class="confirm-buttons">
            <button class="cancel-button" @click="showDeleteConfirm = false">Cancel</button>
            <button class="delete-button" @click="deleteAllSecrets">Delete All</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getSecretKeys, upsertSecrets, deleteSecrets } from '../utils/secrets.ts';

export default {
  name: 'SecretManager',
  props: {
    subdomain: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      existingKeys: [],
      secretPairs: [{ key: '', value: '', errors: {} }],
      isSubmitting: false,
      showDeleteConfirm: false,
      pairErrors: []
    };
  },
  async mounted() {
    await this.loadExistingKeys();
  },
  methods: {
    async loadExistingKeys() {
      try {
        const result = await getSecretKeys(this.subdomain);
        this.existingKeys = result.keys || [];
      } catch (error) {
        console.error('Error loading secret keys:', error);
      }
    },
    addPair() {
      this.secretPairs.push({ key: '', value: '', errors: {} });
    },
    removePair(index) {
      this.secretPairs.splice(index, 1);
      if (this.secretPairs.length === 0) {
        this.addPair();
      }
    },
    removeKey(key) {
      const index = this.existingKeys.indexOf(key);
      if (index > -1) {
        this.existingKeys.splice(index, 1);
      }
    },
    validatePairs() {
      this.pairErrors = [];
      const seenKeys = new Set();
      
      this.secretPairs.forEach((pair, index) => {
        pair.errors = {};
        
        if (!pair.key.trim()) {
          if (this.secretPairs.length > 1 || pair.value.trim()) {
            pair.errors.key = 'Key is required';
            this.pairErrors.push(`Pair ${index + 1}: Key is required`);
          }
        } else {
          if (seenKeys.has(pair.key.trim().toUpperCase())) {
            pair.errors.key = 'Duplicate key';
            this.pairErrors.push(`Pair ${index + 1}: Duplicate key "${pair.key}"`);
          } else {
            seenKeys.add(pair.key.trim().toUpperCase());
          }
          
          if (!/^[A-Z_][A-Z0-9_]*$/i.test(pair.key.trim())) {
            pair.errors.key = 'Invalid key format (use letters, numbers, underscores)';
            this.pairErrors.push(`Pair ${index + 1}: Invalid key format`);
          }
          
          if (!pair.value.trim()) {
            pair.errors.value = 'Value is required';
            this.pairErrors.push(`Pair ${index + 1}: Value is required`);
          }
        }
      });
      
      return this.pairErrors.length === 0;
    },
    async submitSecrets() {
      if (!this.validatePairs()) {
        alert('Please fix the errors before submitting:\n' + this.pairErrors.join('\n'));
        return;
      }

      const secrets = {};
      this.secretPairs.forEach(pair => {
        if (pair.key.trim() && pair.value.trim()) {
          secrets[pair.key.trim()] = pair.value.trim();
        }
      });

      // Merge with existing keys that weren't removed
      // (keys in existingKeys but not in secrets will be removed)
      // Actually, we need to preserve existing keys that aren't being updated
      // For simplicity, we're replacing all secrets with current pairs
      // In a production system, you might want to fetch current secrets and merge

      // if (Object.keys(secrets).length === 0) {
      //   await this.loadExistingKeys();
      //   this.$emit('');
      //   return;
      // }

      // this.isSubmitting = true;
      // try {
      //   await upsertSecrets(this.subdomain);
      //   alert('Secrets saved successfully!');
      //   this.secretPairs = [{ key: '', value: '', errors: {} }];
      //   this.$emit('secrets-updated');
      // } catch (error) {
      //   alert('Failed to save secrets: ' + (error.message || 'Unknown error'));
      //   console.error('Error saving secrets:');
      // } finally {
      //   this.isSubmitting = false;
      // }

      if (Object.keys(secrets).length === 0) {
        await this.loadExistingKeys();
        this.$emit('close-modal');
        return;
      }

      this.isSubmitting = true;
      try {
        await upsertSecrets(this.subdomain, secrets);
        alert('Secrets saved successfully!');
        await this.loadExistingKeys();
        this.secretPairs = [{ key: '', value: '', errors: {} }];
        this.$emit('secrets-updated');
      } catch (error) {
        alert('Failed to save secrets: ' + (error.message || 'Unknown error'));
        console.error('Error saving secrets:', error);
      } finally {
        this.isSubmitting = false;
      }
    },
    confirmDeleteAll() {
      this.showDeleteConfirm = true;
    },
    async deleteAllSecrets() {
      try {
        await deleteSecrets(this.subdomain);
        alert('All secrets deleted successfully!');
        this.existingKeys = [];
        this.secretPairs = [{ key: '', value: '', errors: {} }];
        this.showDeleteConfirm = false;
        this.$emit('secrets-updated');
      } catch (error) {
        alert('Failed to delete secrets: ' + (error.message || 'Unknown error'));
        console.error('Error deleting secrets:', error);
      }
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
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.secret-modal {
  background: white;
  border-radius: 8px;
  padding: 24px;
  max-width: 700px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.close {
  text-align: right;
  margin-bottom: 16px;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 32px;
  height: 32px;
}

.close-button:hover {
  color: #000;
}

h3 {
  margin: 0 0 16px 0;
  color: #121212;
}

.secret-warning {
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 20px;
  color: #856404;
  font-size: 14px;
}

.existing-secrets {
  margin-bottom: 24px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 4px;
}

.existing-secrets h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
}

.keys-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.key-item {
  display: flex;
  align-items: center;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 6px 12px;
  gap: 8px;
}

.key-name {
  font-family: monospace;
  font-weight: 600;
  color: #333;
}

.remove-key-btn {
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 0;
}

.remove-key-btn:hover {
  background: #c82333;
}

.secrets-editor {
  margin-bottom: 24px;
}

.secrets-editor h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
}

.secret-pairs {
  margin-bottom: 12px;
}

.secret-pair {
  display: grid;
  grid-template-columns: 1fr 2fr auto;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}

.secret-key-input,
.secret-value-input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.secret-key-input.error,
.secret-value-input.error {
  border-color: #dc3545;
}

.remove-pair-btn {
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  width: 32px;
  height: 32px;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
}

.remove-pair-btn:hover {
  background: #c82333;
}

.errors {
  margin-bottom: 8px;
}

.error-message {
  color: #dc3545;
  font-size: 12px;
  margin-bottom: 4px;
}

.add-pair-btn {
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
}

.add-pair-btn:hover {
  background: #218838;
}

.button-container {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.cancel-button,
.submit-button,
.delete-all-button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.cancel-button {
  background: #6c757d;
  color: white;
}

.cancel-button:hover {
  background: #5a6268;
}

.submit-button {
  background: #007bff;
  color: white;
}

.submit-button:hover:not(:disabled) {
  background: #0056b3;
}

.submit-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.delete-all-button {
  background: #dc3545;
  color: white;
}

.delete-all-button:hover {
  background: #c82333;
}

.delete-confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1001;
}

.delete-confirm {
  background: white;
  border-radius: 8px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
}

.delete-confirm h4 {
  margin: 0 0 12px 0;
  color: #dc3545;
}

.delete-confirm p {
  margin: 0 0 20px 0;
  color: #666;
}

.confirm-buttons {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.delete-button {
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 10px 20px;
  cursor: pointer;
}

.delete-button:hover {
  background: #c82333;
}
</style>

