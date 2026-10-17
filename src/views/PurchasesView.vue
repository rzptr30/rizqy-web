<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { supabase } from "../lib/supabase";
import { auth } from "../stores/auth";
import { getDayStock } from "../lib/stock";
import { today } from "../lib/dates";
import { rupiah } from "../lib/format";
import { log } from "../lib/log";

const products = ref([]);
const rows = ref([]);
const error = ref("");
const saving = ref(false);
const form = ref({
  sale_date: today(),
  product_id: "",
  qty: "",
  unit_price: "",
});

const canDelete = (r) =>
  r.created_by === auth.user?.id || auth.role === "owner";
const preview = computed(
  () => Number(form.value.qty || 0) * Number(form.value.unit_price || 0),
);

watch(
  () => form.value.product_id,
  (id) => {
    const p = products.value.find((x) => x.id === Number(id));
    if (p) form.value.unit_price = p.price;
  },
);

const dailyTotals = computed(() => {
  const map = {};
  for (const r of rows.value)
    map[r.sale_date] = (map[r.sale_date] || 0) + Number(r.amount);
  return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
});

async function loadProducts() {
  const { data, error: e } = await supabase
    .from("products")
    .select("id, name, price, is_cut")
    .eq("active", true)
    .order("id");
  if (e) {
    log.error("Penjualan: gagal memuat produk", e);
    error.value = "Gagal memuat produk: " + e.message;
    return;
  }
  products.value = data;
  if (data.length) form.value.product_id = data[0].id;
}

async function load() {
  const { data, error: e } = await supabase
    .from("daily_sales")
    .select("*, products(name)")
    .order("sale_date", { ascending: false })
    .order("id", { ascending: false })
    .limit(60);
  if (e) {
    log.error("Penjualan: gagal memuat riwayat", e);
    error.value = "Gagal memuat data: " + e.message;
    return;
  }
  rows.value = data;
  log.info("Penjualan: riwayat dimuat", data.length);
}

async function save() {
  error.value = "";
  saving.value = true;

  const product = products.value.find(
    (p) => p.id === Number(form.value.product_id),
  );
  const qty = Number(form.value.qty);

  // Peringatan stok hanya untuk potongan ayam
  if (product?.is_cut) {
    try {
      const stock = await getDayStock(form.value.sale_date);
      const s = stock[product.id] || { masuk: 0, terjual: 0 };
      const sisa = s.masuk - s.terjual;
      log.info("Penjualan: cek stok", {
        produk: product.name,
        masuk: s.masuk,
        terjual: s.terjual,
        sisa,
        input: qty,
      });
      if (qty > sisa) {
        const ok = confirm(
          `Stok ${product.name} tanggal ${form.value.sale_date}:\n` +
            `diterima ${s.masuk}, sudah terjual ${s.terjual}, sisa ${sisa}.\n\n` +
            `Kamu mencatat ${qty}. Stok tidak cukup (kurang ${qty - sisa}).\n\nTetap simpan?`,
        );
        if (!ok) {
          log.info("Penjualan: dibatalkan pengguna karena stok kurang");
          saving.value = false;
          return;
        }
      }
    } catch (e) {
      log.error("Penjualan: gagal cek stok", e);
      error.value = "Gagal memeriksa stok: " + (e.message || e);
      saving.value = false;
      return;
    }
  }

  const { error: e } = await supabase.from("daily_sales").insert({
    sale_date: form.value.sale_date,
    product_id: Number(form.value.product_id),
    qty,
    unit_price: Number(form.value.unit_price),
  });
  saving.value = false;
  if (e) {
    log.error("Penjualan: gagal simpan", e);
    error.value = "Gagal menyimpan: " + e.message;
    return;
  }
  log.info("Penjualan: tersimpan", { produk: product?.name, qty });
  form.value.qty = "";
  await load();
}

async function remove(id) {
  if (!confirm("Hapus catatan ini?")) return;
  const { error: e } = await supabase.from("daily_sales").delete().eq("id", id);
  if (e) {
    log.error("Penjualan: gagal hapus", e);
    error.value = "Gagal menghapus: " + e.message;
    return;
  }
  log.info("Penjualan: dihapus", id);
  await load();
}

onMounted(async () => {
  await loadProducts();
  await load();
});
</script>

<template>
  <section class="card">
    <h1>Rekap Penjualan Harian</h1>
    <form @submit.prevent="save">
      <label
        >Tanggal
        <input v-model="form.sale_date" type="date" required />
      </label>
      <label
        >Produk
        <select v-model="form.product_id">
          <option v-for="p in products" :key="p.id" :value="p.id">
            {{ p.name }}
          </option>
        </select>
      </label>
      <label
        >Jumlah terjual
        <input
          v-model="form.qty"
          type="number"
          min="1"
          inputmode="numeric"
          required
        />
      </label>
      <label
        >Harga satuan (Rp)
        <input
          v-model="form.unit_price"
          type="number"
          min="0"
          inputmode="numeric"
          required
        />
      </label>
      <p class="muted">
        Nominal: <strong>{{ rupiah(preview) }}</strong>
      </p>
      <p v-if="error" class="error">{{ error }}</p>
      <button :disabled="saving">
        {{ saving ? "Memproses..." : "Simpan" }}
      </button>
    </form>
  </section>

  <section class="card" v-if="dailyTotals.length">
    <h1>Total per hari</h1>
    <ul class="list">
      <li v-for="[d, t] in dailyTotals" :key="d">
        <span>{{ d }}</span
        ><strong>{{ rupiah(t) }}</strong>
      </li>
    </ul>
  </section>

  <section class="card">
    <h1>Riwayat (60 terakhir)</h1>
    <p v-if="!rows.length" class="muted">Belum ada catatan.</p>
    <ul class="list">
      <li v-for="r in rows" :key="r.id">
        <div>
          <strong>{{ r.products.name }}</strong> · {{ r.qty }} ×
          {{ rupiah(r.unit_price) }} = {{ rupiah(r.amount) }}<br />
          <small class="muted">{{ r.sale_date }}</small>
        </div>
        <button v-if="canDelete(r)" class="link danger" @click="remove(r.id)">
          Hapus
        </button>
      </li>
    </ul>
  </section>
</template>
