<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { auth } from "../stores/auth";
import { fetchPeriod, summarize } from "../lib/finance";
import { getDayStock } from "../lib/stock";
import { today, daysAgo, startOfMonth } from "../lib/dates";
import { rupiah } from "../lib/format";
import { log } from "../lib/log";

const periods = { hari: "Hari ini", minggu: "7 hari", bulan: "Bulan ini" };
const period = ref("hari");
const sum = ref(null);
const alerts = ref([]);
const error = ref("");
const loading = ref(false);
const isOwner = computed(() => auth.role === "owner");

function range() {
  if (period.value === "hari") return { from: today(), to: today() };
  if (period.value === "minggu") return { from: daysAgo(6), to: today() };
  return { from: startOfMonth(), to: today() };
}

async function load() {
  error.value = "";
  loading.value = true;
  try {
    const { from, to } = range();
    const data = await fetchPeriod(from, to);
    sum.value = summarize(data);

    // Selisih stok hari ini (hanya potongan ayam)
    const cut = new Set(data.products.filter((p) => p.is_cut).map((p) => p.id));
    const names = Object.fromEntries(data.products.map((p) => [p.id, p.name]));
    const stock = await getDayStock(today());
    alerts.value = Object.entries(stock)
      .filter(([id]) => cut.has(Number(id)))
      .map(([id, s]) => ({ name: names[id], saldo: s.masuk - s.terjual }))
      .filter((a) => a.saldo < 0);

    log.info("Dashboard: dimuat", {
      periode: period.value,
      from,
      to,
      penjualan: sum.value.revenue,
    });
  } catch (e) {
    log.error("Dashboard: gagal", e);
    error.value = "Gagal memuat dashboard: " + (e.message || e);
  } finally {
    loading.value = false;
  }
}

watch(period, load);
onMounted(load);
</script>

<template>
  <section class="card">
    <h1>Halo, {{ auth.name }}</h1>
    <div class="tabs">
      <button
        v-for="(label, key) in periods"
        :key="key"
        :class="{ on: period === key }"
        @click="period = key"
      >
        {{ label }}
      </button>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading" class="muted">Memuat...</p>

    <template v-if="sum">
      <div class="cards">
        <div class="stat">
          <small>Penjualan</small><strong>{{ rupiah(sum.revenue) }}</strong>
        </div>
        <div class="stat">
          <small>Pengeluaran</small
          ><strong>{{ rupiah(sum.expenseTotal) }}</strong>
        </div>
        <div class="stat wide">
          <small>Pembelian ayam</small
          ><strong>{{ rupiah(sum.purchaseTotal) }}</strong>
        </div>
        <template v-if="isOwner">
          <div class="stat">
            <small>HPP (demo)</small><strong>{{ rupiah(sum.hpp) }}</strong>
          </div>
          <div class="stat">
            <small>Laba kotor (demo)</small>
            <strong :class="{ bad: sum.grossProfit < 0 }">{{
              rupiah(sum.grossProfit)
            }}</strong>
          </div>
        </template>
      </div>
      <p v-if="isOwner" class="muted">
        HPP dan laba adalah demo, metode belum final. Detail di Menu → HPP dan
        Laba.
      </p>
    </template>
  </section>

  <section class="card" v-if="alerts.length">
    <h1>Perlu dicek</h1>
    <p v-for="a in alerts" :key="a.name" class="warn">
      Stok {{ a.name }} hari ini selisih
      <strong class="bad">{{ a.saldo }}</strong
      >: penjualan melebihi barang yang tercatat masuk.
    </p>
  </section>

  <section class="card" v-if="sum && sum.rows.length">
    <h1>Produk terlaris</h1>
    <ul class="list">
      <li v-for="r in sum.rows.slice(0, 5)" :key="r.id">
        <span>{{ r.name }} · {{ r.qty }}</span
        ><strong>{{ rupiah(r.revenue) }}</strong>
      </li>
    </ul>
  </section>
</template>
