<script setup>
import { useRegisterSW } from "virtual:pwa-register/vue";
import { log } from "../lib/log";

const { needRefresh, updateServiceWorker } = useRegisterSW({
  onRegisteredSW(_url, reg) {
    if (!reg) return;
    log.info("PWA: service worker terdaftar");
    // cek versi baru tiap jam dan setiap aplikasi dibuka kembali dari latar belakang
    setInterval(() => reg.update(), 60 * 60 * 1000);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") reg.update();
    });
  },
  onRegisterError(e) {
    log.error("PWA: gagal mendaftarkan service worker", e);
  },
});

function later() {
  needRefresh.value = false;
}
</script>

<template>
  <div v-if="needRefresh" class="update-banner">
    <span>Versi baru tersedia.</span>
    <button class="mini" @click="updateServiceWorker(true)">Perbarui</button>
    <button class="mini ghost" @click="later">Nanti</button>
  </div>
</template>
