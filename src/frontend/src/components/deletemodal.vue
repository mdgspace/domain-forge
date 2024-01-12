  <template>
    <div class="modal-overlay" v-if="selectedItem != null">
      <div class="modal">
        <h5>Delete Item</h5>
        <p>Are you sure you want to delete this item?</p>
        <p>Subdomain: {{ selectedItem.subdomain }}</p>
        <p>Resource Type: {{ selectedItem.resource_type }}</p>
        <p>Resource: {{ selectedItem.resource }}</p>
      <table style="width: 100%;">
        <tr>
          <td style="text-align: center;"><button style="background-color: #ffffff; color: #2080F6;" @click="$emit('close-modal')">Cancel</button></td>
          <td style="text-align: center;"><button @click="deleteItem">Delete</button></td>
        </tr>
      </table>
      </div>
      <div class="close">
        <button style="width: 20px;" @click="$emit('close-modal')">X</button>
      </div>
    </div>
  </template>
  
  <script>
import { deleteSubDomain } from '../utils/delete.ts'

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
        console.log(response)
        window.location.reload()
      })
        this.$emit('close-modal');
      }
    }
  };
  </script>

<style scoped>
.subdomain {
  width: 75%;
}

.dropdown {
  width: 100%;
}

.resource-link {
  width: 100%;
}

.modal-overlay {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  background-color: #00000000;
}

.modal {
  text-align: center;
  background-color: #ffffff;
  height: 60%;
  width: 600px;
  margin-top: 8%;
  padding: 10px 0;
  border-radius: 20px;
}

.close {
  margin: 9% 0 0 15px;
  cursor: pointer;
}

p {
  font-size: 16px;
  color: #121212;
  margin: 30px 25px;
}

.modal h5 {
  font-size: 20px;
  margin: 20px 20px;
}

label {
  margin: 5px 5px;
}

button {
  text-align: center;
  padding: 2%;
  margin: 1%;
  font-size: 14px;
  margin-top: 30px;
  width: 250px;
}</style>
