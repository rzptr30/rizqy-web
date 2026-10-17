import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import { initAuth } from "./stores/auth";
import { log } from "./lib/log";
import "./style.css";

if (import.meta.env.DEV) {
  window.addEventListener("error", (e) =>
    log.error("Error global:", e.message, `${e.filename}:${e.lineno}`),
  );
  window.addEventListener("unhandledrejection", (e) =>
    log.error("Promise gagal:", e.reason),
  );
}

async function start() {
  log.info("Aplikasi mulai");
  await initAuth();
  const app = createApp(App);
  app.config.errorHandler = (err, _vm, info) =>
    log.error("Error Vue:", info, err);
  app.use(router).mount("#app");
}
start();
