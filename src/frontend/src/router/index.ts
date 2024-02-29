import {
  createRouter,
  createWebHistory,
  NavigationGuardNext,
  RouteLocationNormalized,
} from "vue-router";
import Home from "../components/Home.vue";
import Login from "../components/Login.vue";
import NotFound from "../components/404.vue";
import { check_jwt } from "../utils/authorize.ts";

const routes = [
  {
    path: "/",
    name: "Home",
    component: Home,
    async beforeEnter(
      to: RouteLocationNormalized,
      from: RouteLocationNormalized,
      next: NavigationGuardNext,
    ) {
      if (!localStorage.getItem("JWTUser") || !localStorage.getItem("provider")) next({ name: "Login" });
      else {
        const user = await check_jwt(localStorage.getItem("JWTUser")!,localStorage.getItem("provider")!);
        console.log(user);
        if (user == "") next({ name: "Login" });
        else next();
      }
    },
  },
  {
    path: "/login",
    name: "Login",
    component: Login,
  },
  {
    path: "/:pathMatch(.*)*",
    component: NotFound,
  },
];

const router = createRouter({
  history: createWebHistory("/"),
  routes,
});

export default router;
