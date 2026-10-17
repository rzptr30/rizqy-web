<script setup>
import { auth } from "../stores/auth";
</script>

<template>
  <section class="card">
    <h1>Menu</h1>
    <ul class="list menu">
      <li><RouterLink :to="{ name: 'expenses' }">Pengeluaran</RouterLink></li>
      <li><RouterLink :to="{ name: 'productions' }">Produksi</RouterLink></li>
      <li><RouterLink :to="{ name: 'reports' }">Laporan</RouterLink></li>
      <template v-if="auth.role === 'owner'">
        <li>
          <RouterLink :to="{ name: 'products' }">Kelola Produk</RouterLink>
        </li>
        <li>
          <RouterLink :to="{ name: 'hpp' }">HPP dan Laba (Demo)</RouterLink>
        </li>
        <li><RouterLink :to="{ name: 'export' }">Ekspor Data</RouterLink></li>
      </template>
    </ul>
  </section>
</template>
