<script setup>
import { ref, watch, onMounted } from "vue";
import { fetchPeriod, summarize } from "../lib/finance";
import { startOfMonth, today } from "../lib/dates";
import { rupiah } from "../lib/format";
import { log } from "../lib/log";

const from = ref(startOfMonth());
const to = ref(today());
const sum = ref(null);
const error = ref("");
const loading = ref(false);

async function load() {
  error.value = "";
  if (!from.value || !to.value) return;
  loading.value = true;
  try {
    const data = await fetchPeriod(from.value, to.value);
    sum.value = summarize(data);
    log.info("HPP: dihitung", {
      from: from.value,
      to: to.value,
      baris: sum.value.rows.length,
      hpp: Math.round(sum.value.hpp),
      laba: Math.round(sum.value.grossProfit),
    });
  } catch (e) {
    log.error("HPP: gagal", e);
    error.value = "Gagal menghitung: " + (e.message || e);
  } finally {
    loading.value = false;
  }
}

watch([from, to], load);
onMounted(load);
</script>

<template>
  <section class="card">
    <h1>HPP dan Laba Kotor (Demo)</h1>
    <p class="warn">
      Contoh perhitungan untuk mini project. Metode HPP belum final (Dokumen
      Sakti 8.4): biaya pembelian dialokasikan ke potongan berdasarkan nilai
      jual relatif memakai harga master saat ini, bonus tidak menambah biaya.
      Jangan dianggap akurat.
    </p>
    <label>Dari <input v-model="from" type="date" /></label>
    <label>Sampai <input v-model="to" type="date" /></label>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading" class="muted">Menghitung...</p>
  </section>

  <template v-if="sum">
    <section class="card">
      <h1>Ringkasan</h1>
      <div class="cards">
        <div class="stat">
          <small>Pendapatan (HPP terhitung)</small
          ><strong>{{ rupiah(sum.revenueCounted) }}</strong>
        </div>
        <div class="stat">
          <small>HPP penjualan</small><strong>{{ rupiah(sum.hpp) }}</strong>
        </div>
        <div class="stat wide">
          <small>Laba kotor (demo)</small>
          <strong :class="{ bad: sum.grossProfit < 0 }">{{
            rupiah(sum.grossProfit)
          }}</strong>
        </div>
        <div class="stat">
          <small>Pendapatan tanpa HPP</small
          ><strong>{{ rupiah(sum.revenueUncounted) }}</strong>
        </div>
        <div class="stat">
          <small>Total pembelian ayam</small
          ><strong>{{ rupiah(sum.purchaseTotal) }}</strong>
        </div>
        <div class="stat">
          <small>Pengeluaran operasional</small
          ><strong>{{ rupiah(sum.expenseTotal) }}</strong>
        </div>
        <div class="stat">
          <small>Laba kotor − pengeluaran (indikatif)</small>
          <strong :class="{ bad: sum.afterExpenses < 0 }">{{
            rupiah(sum.afterExpenses)
          }}</strong>
        </div>
      </div>
      <p class="muted">
        "Pendapatan tanpa HPP" = produk yang biayanya tidak bisa dihitung dari
        data pembelian (misalnya Nasi dan Paket). Angka ini tidak ikut laba
        kotor, dan "indikatif" berarti biaya Nasi/Paket belum masuk.
      </p>
      <p v-if="sum.unallocated > 0" class="warn">
        Ada pembelian senilai {{ rupiah(sum.unallocated) }} tanpa rincian
        potongan, jadi biayanya tidak dialokasikan.
      </p>
    </section>

    <section class="card">
      <h1>Per produk</h1>
      <p v-if="!sum.rows.length" class="muted">
        Belum ada penjualan pada periode ini.
      </p>
      <div class="tblwrap" v-else>
        <table class="tbl">
          <thead>
            <tr>
              <th>Produk</th>
              <th>Qty</th>
              <th>Pendapatan</th>
              <th>HPP/unit</th>
              <th>HPP</th>
              <th>Laba</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in sum.rows" :key="r.id">
              <td>{{ r.name }}</td>
              <td>{{ r.qty }}</td>
              <td>{{ rupiah(r.revenue) }}</td>
              <td>{{ r.unitCost == null ? "n/a" : rupiah(r.unitCost) }}</td>
              <td>{{ r.hpp == null ? "n/a" : rupiah(r.hpp) }}</td>
              <td :class="{ bad: r.profit != null && r.profit < 0 }">
                {{ r.profit == null ? "n/a" : rupiah(r.profit) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </template>
</template>
