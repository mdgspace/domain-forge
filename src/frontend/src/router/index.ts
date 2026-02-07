import {
  createRouter,
  createWebHistory,
  NavigationGuardNext,
  RouteLocationNormalized,
} from "vue-router";
import Home from "../components/Home.vue";
import Login from "../components/Login.vue";
import NotFound from "../components/404.vue";
import ContainerHealth from "../components/ContainerHealth.vue";
import { check_jwt } from "../utils/authorize.ts";

// Auth guard for protected routes
async function authGuard(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext,
) {
  if (
    !localStorage.getItem("JWTUser") || !localStorage.getItem("provider")
  ) {
    next({ name: "Login" });
  } else {
    const user = await check_jwt(
      localStorage.getItem("JWTUser")!,
      localStorage.getItem("provider")!,
    );
    console.log(user);
    if (user == "") next({ name: "Login" });
    else next();
  }
}

const routes = [
  {
    path: "/",
    name: "Home",
    component: Home,
    beforeEnter: authGuard,
  },
  {
    path: "/health",
    name: "Health",
    component: ContainerHealth,
    beforeEnter: authGuard,
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
