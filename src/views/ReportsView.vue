<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { auth } from "../stores/auth";
import { fetchPeriod, summarize } from "../lib/finance";
import { today, currentMonth, addDays, monthRange } from "../lib/dates";
import { rupiah } from "../lib/format";
import { log } from "../lib/log";

const isOwner = computed(() => auth.role === "owner");
const jenis = ref("harian");
const tanggal = ref(today());
const bulan = ref(currentMonth());
const data = ref(null);
const sum = ref(null);
const error = ref("");
const loading = ref(false);

const range = computed(() => {
  if (jenis.value === "harian" || !isOwner.value)
    return { from: tanggal.value, to: tanggal.value };
  if (jenis.value === "mingguan")
    return { from: addDays(tanggal.value, -6), to: tanggal.value };
  return monthRange(bulan.value);
});

async function load() {
  error.value = "";
  const { from, to } = range.value;
  if (!from || !to || to.includes("NaN")) return;
  loading.value = true;
  try {
    data.value = await fetchPeriod(from, to);
    sum.value = summarize(data.value);
    log.info("Laporan: dimuat", { jenis: jenis.value, from, to });
  } catch (e) {
    log.error("Laporan: gagal", e);
    error.value = "Gagal memuat laporan: " + (e.message || e);
  } finally {
    loading.value = false;
  }
}

const perHari = computed(() => {
  if (!data.value) return [];
  const m = {};
  for (const s of data.value.sales)
    m[s.sale_date] = (m[s.sale_date] || 0) + Number(s.amount);
  return Object.entries(m).sort((a, b) => a[0].localeCompare(b[0]));
});

const perKategori = computed(() => {
  if (!data.value) return [];
  const m = {};
  for (const e of data.value.expenses)
    m[e.category] = (m[e.category] || 0) + Number(e.amount);
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
});

watch([jenis, tanggal, bulan], load);
onMounted(load);
</script>

<template>
  <section class="card">
    <h1>Laporan</h1>
    <div class="tabs" v-if="isOwner">
      <button :class="{ on: jenis === 'harian' }" @click="jenis = 'harian'">
        Harian
      </button>
      <button :class="{ on: jenis === 'mingguan' }" @click="jenis = 'mingguan'">
        Mingguan
      </button>
      <button :class="{ on: jenis === 'bulanan' }" @click="jenis = 'bulanan'">
        Bulanan
      </button>
    </div>
    <p v-else class="muted">Karyawan hanya dapat melihat laporan harian.</p>

    <label v-if="jenis !== 'bulanan' || !isOwner">
      {{
        jenis === "mingguan" && isOwner ? "Berakhir pada tanggal" : "Tanggal"
      }}
      <input v-model="tanggal" type="date" />
    </label>
    <label v-else>Bulan <input v-model="bulan" type="month" /></label>

    <p class="muted">Periode: {{ range.from }} s/d {{ range.to }}</p>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading" class="muted">Memuat...</p>
  </section>

  <template v-if="sum && data">
    <section class="card">
      <h1>Ringkasan</h1>
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
    </section>

    <section class="card">
      <h1>Penjualan per produk</h1>
      <p v-if="!sum.rows.length" class="muted">Tidak ada penjualan.</p>
      <ul class="list">
        <li v-for="r in sum.rows" :key="r.id">
          <span>{{ r.name }} · {{ r.qty }}</span
          ><strong>{{ rupiah(r.revenue) }}</strong>
        </li>
      </ul>
    </section>

    <section class="card" v-if="perHari.length > 1">
      <h1>Penjualan per hari</h1>
      <ul class="list">
        <li v-for="[d, t] in perHari" :key="d">
          <span>{{ d }}</span
          ><strong>{{ rupiah(t) }}</strong>
        </li>
      </ul>
    </section>

    <section class="card">
      <h1>Pengeluaran per kategori</h1>
      <p v-if="!perKategori.length" class="muted">Tidak ada pengeluaran.</p>
      <ul class="list">
        <li v-for="[k, t] in perKategori" :key="k">
          <span>{{ k }}</span
          ><strong>{{ rupiah(t) }}</strong>
        </li>
      </ul>
    </section>

    <section class="card">
      <h1>Pembelian ayam</h1>
      <p v-if="!data.purchases.length" class="muted">Tidak ada pembelian.</p>
      <ul class="list">
        <li v-for="p in data.purchases" :key="p.id">
          <span>{{ p.purchase_date }} · {{ p.whole_chickens }} ekor</span
          ><strong>{{ rupiah(p.total_cost) }}</strong>
        </li>
      </ul>
    </section>
  </template>
</template>
