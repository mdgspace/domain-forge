import {
  createRouter,
  createWebHistory,
  NavigationGuardNext,
  RouteLocationNormalized,
} from "vue-router";
import { isAuthenticated } from "../utils/authorize.ts";
import Home from "../components/Home.vue";
import Login from "../components/Login.vue";
import NotFound from "../components/404.vue";

const routes = [
  {
    path: "/",
    name: "Home",
    component: Home,
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

router.beforeEach((to: RouteLocationNormalized, next: NavigationGuardNext) => {
  if (to.name !== "Login" && !isAuthenticated) next({ name: "Login" });
  next();
});
export default router;
