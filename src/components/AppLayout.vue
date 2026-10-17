<script setup>
import { useRouter } from "vue-router";
import { auth, logout } from "../stores/auth";

const router = useRouter();
async function keluar() {
  await logout();
  router.push({ name: "login" });
}
</script>

<template>
  <header class="topbar">
    <img src="/logo.svg" class="logo" alt="" />
    <strong>Rizqy Barokah</strong>
    <span class="who">{{ auth.name }} · {{ auth.role }}</span>
    <button class="link" @click="keluar">Keluar</button>
  </header>

  <main class="content">
    <RouterView />
  </main>

  <nav class="bottomnav">
    <RouterLink :to="{ name: 'home' }">Beranda</RouterLink>
    <RouterLink :to="{ name: 'purchases' }">Pembelian</RouterLink>
    <RouterLink :to="{ name: 'sales' }">Penjualan</RouterLink>
    <RouterLink :to="{ name: 'stock' }">Stok</RouterLink>
    <RouterLink :to="{ name: 'menu' }">Menu</RouterLink>
  </nav>
</template>
