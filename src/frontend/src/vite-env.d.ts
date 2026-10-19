/// <reference types="vite/client" />

// deno-lint-ignore-file ban-types no-explicit-any
// The `{}` / `any` generics are Vue/Vite's own module-shim template — changing
// them here would diverge from the upstream scaffold for no runtime gain.
declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
