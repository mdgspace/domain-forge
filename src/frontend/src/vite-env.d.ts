/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

interface ImportMetaEnv {
  readonly VUE_APP_GITHUB_OAUTH_CLIENT_ID: string;
  readonly VUE_APP_GITHUB_OAUTH_CLIENT_SECRET: string;
  readonly VUE_APP_GITHUB_OAUTH_REDIRECT_URL: string;
}
