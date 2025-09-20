// main.js
import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";

// aktifkan mock hanya kalau pakai env mock
if (import.meta.env.VITE_USE_MOCK === "true") {
  await import("./api/mock")
}

const app = createApp(App);
app.use(router);
app.mount("#app");
