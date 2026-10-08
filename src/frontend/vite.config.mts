import { defineConfig } from "npm:vite@^5.4.14";
import vue from "npm:@vitejs/plugin-vue@^5.2.1";

import "npm:vue@^3.5.13";
import "npm:vue-router@^4.5.0";
import "npm:lucide-vue-next@^0.469.0";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
});
