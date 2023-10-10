<template>
    <div class="modal-overlay">
      <div class="modal">
        <h5>Enter the details for creating your subdomain:</h5>
        <p>Subdomain:<br><input v-model="subdomain"/>.mdgspace.org</p>
        <p>Resource Type:<br>
            <select v-model="resource_type">
            <option>URL</option>
            <option>PORT</option>
            <option>GITHUB</option>
          </select>
        </p>
        <p>Resource:<br><input v-model="resource"/></p>
        <button @click="$emit('close-modal')">Submit</button>
      </div>
      <div class="close">
        <button style="width: 20px;" @click="$emit('close-modal')">X</button>
      </div>
    </div>
  </template>
<script>
  export default {
    data() {
      return {
        subdomain: "",
        resource_type: "",
        resource: "",
      };
    },
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
  background-color: #000000da;
}

.modal {
  text-align: center;
  background-color: #0A1931;
  height: 60%;
  width: 500px;
  margin-top: 8%;
  padding: 10px 0;
  border-radius: 20px;
}
.close {
  margin: 5% 0 0 16px;
  cursor: pointer;
  color: #FFC947;
}

p {
  font-size: 16px;
  color: #FFC947;
  margin: 30px 25px;
}

h5{
    font-size: 20px;
    margin: 20px 20px;
}

label{
    margin: 5px 5px;
}

button {
  text-align: center;
  padding: 2%;
  margin: 1%;
  font-size: 14px;
  border-radius: 16px;
  margin-top: 50px;
}
</style>
  