<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { supabase } from "../lib/supabase";
import { getDayStock } from "../lib/stock";
import { today } from "../lib/dates";
import { log } from "../lib/log";

const date = ref(today());
const products = ref([]);
const stock = ref({});
const error = ref("");

async function load() {
  error.value = "";
  if (!date.value) return;
  try {
    const { data, error: e } = await supabase
      .from("products")
      .select("id, name, is_cut, active")
      .order("id");
    if (e) throw e;
    products.value = data;
    stock.value = await getDayStock(date.value);
    log.info("Stok: dimuat", date.value);
  } catch (e) {
    log.error("Stok: gagal memuat", e);
    error.value = "Gagal memuat stok: " + (e.message || e);
  }
}

const cutRows = computed(() =>
  products.value
    .filter((p) => p.is_cut && (p.active || stock.value[p.id]))
    .map((p) => {
      const s = stock.value[p.id] || { masuk: 0, terjual: 0 };
      return {
        id: p.id,
        name: p.name,
        masuk: s.masuk,
        terjual: s.terjual,
        saldo: s.masuk - s.terjual,
      };
    }),
);
const untracked = computed(() =>
  products.value.filter((p) => !p.is_cut && p.active),
);

watch(date, load);
onMounted(load);
</script>

<template>
  <section class="card">
    <h1>Stok Harian</h1>
    <label
      >Tanggal
      <input v-model="date" type="date" />
    </label>
    <p class="muted">
      Saldo = diterima − terjual pada tanggal yang sama. Ayam dianggap habis
      dijual di hari yang sama, jadi saldo positif berarti sisa atau penjualan
      belum direkap.
    </p>
    <p v-if="error" class="error">{{ error }}</p>

    <div class="tblwrap">
      <table class="tbl">
        <thead>
          <tr>
            <th>Produk</th>
            <th>Masuk</th>
            <th>Terjual</th>
            <th>Saldo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in cutRows" :key="r.id">
            <td>{{ r.name }}</td>
            <td>{{ r.masuk }}</td>
            <td>{{ r.terjual }}</td>
            <td :class="{ bad: r.saldo < 0 }">{{ r.saldo }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="cutRows.some((r) => r.saldo < 0)" class="warn">
      Saldo merah = penjualan melebihi barang yang tercatat masuk. Cek apakah
      ada pembelian yang lupa dicatat.
    </p>
  </section>

  <section class="card" v-if="untracked.length">
    <h1>Tidak dilacak</h1>
    <p class="muted">
      Stok tidak dihitung untuk: {{ untracked.map((p) => p.name).join(", ") }}.
    </p>
  </section>
</template>
