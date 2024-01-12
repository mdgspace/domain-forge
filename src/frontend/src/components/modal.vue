
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
        <textarea name="env" id="" cols="50" rows="10" v-model="env_content" value="key1=value1"></textarea>
      </p>
      <table style="width: 100%;">
        <tr>
          <td style="text-align: center;"><button style="background-color: #ffffff; color: #2080F6;" @click="$emit('close-modal')">Cancel</button></td>
          <td style="text-align: center;"><button @click="subimitForm()">Submit</button></td>
        </tr>
      </table>
    </div>
    <div class="close">
      <button style="width: 20px;background-color: #ffffff; color: #121212; " @click="$emit('close-modal')">X</button>
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
      env_content: ""

    };
  },
  methods: {
    subimitForm() {
      console.log(this.subdomain, this.resource_type, this.resource)
      create(this.subdomain, this.resource_type, this.resource,this.env_content).then((res) => {
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
  background-color: #ffffff;
  height: 75%;
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
  margin-top: 10px;
  width: 250px;
}</style>
  