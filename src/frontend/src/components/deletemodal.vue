<template>
  <div class="modal-overlay" v-if="selectedItem">
    <div class="modal">
      <div class="close">
        <button class="close-button" @click="closeModal">X</button>
      </div>
      <h5>Delete Item</h5>
      <p>Are you sure you want to delete this item?</p>
      <p>Subdomain: {{ selectedItem.subdomain }}</p>
      <p>Resource Type: {{ selectedItem.resource_type }}</p>
      <p>Resource: {{ selectedItem.resource }}</p>
      <div class="button-container">
        <button class="cancel-button" @click="closeModal">Cancel</button>
        <button class="delete-button" @click="deleteItem">Delete</button>
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
      console.log(`Deleting item: ${JSON.stringify(this.selectedItem)}`);
      deleteSubDomain(this.selectedItem.subdomain).then((response) => {
        console.log(response);
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
  text-align: center;
  padding: 20px;
  max-width: 600px;
  width: 90%;
  overflow-y: auto; 
  max-height: 80vh;
  box-shadow: 0px 0px 20px rgba(0, 0, 0, 0.2);
  position: relative;
}

.close {
  position: absolute;
  top: 10px;
  right: 10px;
}

.close-button {
  border: none;
  background-color: transparent;
  color: #777;
  font-size: 24px;
  width: 30px; 
  height: 30px; 
  cursor: pointer;
}

.close-button:hover {
  color: #333;
}

.button-container {
  display: flex;
  justify-content: center;
  margin-top: 30px;
}

.cancel-button,
.delete-button {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.cancel-button {
  background-color: #ccc;
  color: #000;
}

.delete-button {
  background-color: #2080f6;
  color: #fff;
}
</style>
