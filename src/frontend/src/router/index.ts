import {
  createRouter,
  createWebHistory,
  NavigationGuardNext,
  RouteLocationNormalized,
} from "vue-router";
import Home from "../components/Home.vue";
import Login from "../components/Login.vue";
import NotFound from "../components/404.vue";

const routes = [
  {
    path: "/",
    name: "Home",
    component: Home,
    beforeEnter(
      to: RouteLocationNormalized,
      from: RouteLocationNormalized,
      next: NavigationGuardNext,
    ) {
      if (!localStorage.getItem("LoggedUser")) next({ name: "Login" });
      else {
        next();
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
