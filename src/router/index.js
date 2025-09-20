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
router.beforeEach((to) => {
  const loggedIn = !!localStorage.getItem("token");

  if (to.meta.requiresAuth && !loggedIn) {
    return { path: "/login" };
  }
  if (to.path === "/login" && loggedIn) {
    return { path: "/home" };
  }
  return true;
});

export default router;
