
<template>
  <div class="modal-overlay">
    <div class="modal">
      <h5>Enter the details for creating your subdomain:</h5>
      <p>Subdomain:<br><input class="subdomain" v-model="subdomain" />.df.mdgspace.org</p>
      <p>Resource Type:<br>
        <select class="dropdown" v-model="resource_type">
          <option>URL</option>
          <option>PORT</option>
          <option>GITHUB</option>
        </select>
      </p>
      <p>Resource:<br><input class="resource-link" v-model="resource" /></p>
      <p v-show="resource_type =='GITHUB'">Your env contents in format<br>key1=value1<br>key2=value2<br>
        <label for="static">Do you have static content on your repo?</label>
        <br>
<label for="radio">Yes/No</label>
        <input name="radio" type="radio" value="Yes" v-model="static_content">
        <input name="radio" type="radio" value="No" v-model="static_content">
        <textarea name="env" id="" cols="50" rows="10" v-model="env_content" value="key1=value1"></textarea>
      </p>
      <button @click="subimitForm()">Submit</button>
    </div>
    <div class="close">
      <button style="width: 20px;" @click="$emit('close-modal')">X</button>
    </div>
  </div>
</template>
<script>
import { create } from '../utils/create.ts';
export default {
  data() {
    return {
      subdomain: "",
      resource_type: "",
      resource: "",
      env_content: "",
      static_content:"False"

    };
  },
  methods: {
    subimitForm() {
      console.log(this.subdomain, this.resource_type, this.resource)
      create(this.subdomain, this.resource_type, this.resource,this.env_content,this.static_content).then((res) => {
        console.log(res);
        if(res=="Submitted"){
        this.$emit('close-modal');
        window.location.reload();
        }else{
          this.$emit('close-modal');
          alert("failed to create subdomain")
        setTimeout(() => {
          window.location.reload();
        }, 1000);

        }
      })

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
  border-radius: 16px;
  margin-top: 50px;
}</style>
  