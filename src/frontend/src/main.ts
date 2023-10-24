import { createApp, Vue } from "vue";
import "./style.css";
import App from "./App.vue";
import router from "./router/index";

const app = createApp(App);
app.use(router);
app.mount("#app");

export { app };
