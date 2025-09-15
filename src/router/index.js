// router/index.js
import { createRouter, createWebHistory } from "vue-router";
import Login from "../views/Login.vue";
import Home from "../views/Home.vue";
import Pernataan from "../views/Pernataan.vue";
import Absensi from "../views/Absensi.vue";
import api from "../api/axios";

const routes = [
  { path: "/login", component: Login },
  { path: "/home", component: Home, meta: { requiresAuth: true } },
  { path: "/pernataan", component: Pernataan, meta: { requiresAuth: true } },
  { path: "/absensi", component: Absensi, meta: { requiresAuth: true } },
  { path: "/", redirect: "/login" },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// ✅ Navigation Guard (full mock)
router.beforeEach(async (to) => {
  try {
    const res = await api.get("/auth/session");
    const loggedIn = res.data.loggedIn;

    if (to.meta.requiresAuth && !loggedIn) {
      return "/login";
    }
    if (to.path === "/login" && loggedIn) {
      return "/home";
    }
    return true;
  } catch (err) {
    console.error("[beforeEach] Session check failed:", err);
    return "/login";
  }
});

export default router;
