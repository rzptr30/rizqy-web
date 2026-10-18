<script setup>
import { ref, computed, onMounted } from "vue";
import { supabase } from "../lib/supabase";
import { auth } from "../stores/auth";
import { log } from "../lib/log";

const today = () => new Date().toLocaleDateString("sv-SE");

const products = ref([]);
const rows = ref([]);
const error = ref("");
const saving = ref(false);

const form = ref({
  purchase_date: today(),
  whole_chickens: "",
  total_cost: "",
});
const qty = ref({});

const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

const cutProducts = computed(() =>
  products.value.filter((p) => p.is_cut && p.active),
);
const canDelete = (r) =>
  r.created_by === auth.user?.id || auth.role === "owner";

async function loadProducts() {
  const { data, error: e } = await supabase
    .from("products")
    .select("id, name, is_cut, active")
    .order("id");
  if (e) {
    log.error("Pembelian: gagal memuat produk", e);
    error.value = "Gagal memuat produk: " + e.message;
    return;
  }
  products.value = data;
  log.info("Pembelian: produk dimuat", data.length);
}

async function load() {
  const { data, error: e } = await supabase
    .from("purchases")
    .select("*, purchase_items(qty, products(name))")
    .order("purchase_date", { ascending: false })
    .order("id", { ascending: false })
    .limit(30);
  if (e) {
    log.error("Pembelian: gagal memuat riwayat", e);
    error.value = "Gagal memuat data: " + e.message;
    return;
  }
  rows.value = data;
  log.info("Pembelian: riwayat dimuat", data.length);
}

async function save() {
  error.value = "";
  saving.value = true;

  const { data: purchase, error: e1 } = await supabase
    .from("purchases")
    .insert({
      purchase_date: form.value.purchase_date,
      whole_chickens: Number(form.value.whole_chickens),
      total_cost: Number(form.value.total_cost),
    })
    .select()
    .single();
  if (e1) {
    saving.value = false;
    log.error("Pembelian: gagal simpan induk", e1);
    error.value = "Gagal menyimpan: " + e1.message;
    return;
  }

  const items = cutProducts.value
    .filter((p) => Number(qty.value[p.id]) > 0)
    .map((p) => ({
      purchase_id: purchase.id,
      product_id: p.id,
      qty: Number(qty.value[p.id]),
    }));

  if (items.length) {
    const { error: e2 } = await supabase.from("purchase_items").insert(items);
    if (e2) {
      log.error("Pembelian: gagal simpan rincian, induk dibatalkan", e2);
      await supabase.from("purchases").delete().eq("id", purchase.id);
      saving.value = false;
      error.value = "Gagal menyimpan rincian potongan: " + e2.message;
      return;
    }
  }

  log.info("Pembelian: tersimpan", { id: purchase.id, rincian: items.length });
  saving.value = false;
  form.value.whole_chickens = "";
  form.value.total_cost = "";
  qty.value = {};
  await load();
}

async function remove(id) {
  if (!confirm("Hapus pembelian ini beserta rincian potongannya?")) return;
  const { error: e } = await supabase.from("purchases").delete().eq("id", id);
  if (e) {
    log.error("Pembelian: gagal hapus", e);
    error.value = "Gagal menghapus: " + e.message;
    return;
  }
  log.info("Pembelian: dihapus", id);
  await load();
}

const itemsText = (r) =>
  r.purchase_items.map((i) => `${i.products.name} ${i.qty}`).join(", ") ||
  "tanpa rincian potongan";

onMounted(async () => {
  await loadProducts();
  await load();
});
</script>

<template>
  <section class="card">
    <h1>Pembelian Ayam</h1>
    <form @submit.prevent="save">
      <label
        >Tanggal
        <input v-model="form.purchase_date" type="date" required />
      </label>
      <label
        >Jumlah ekor
        <input
          v-model="form.whole_chickens"
          type="number"
          min="1"
          inputmode="numeric"
          required
        />
      </label>
      <label
        >Total biaya pembelian (Rp)
        <input
          v-model="form.total_cost"
          type="number"
          min="0"
          inputmode="numeric"
          required
        />
      </label>

      <p class="muted">
        Jumlah tiap potongan yang diterima (termasuk bonus pemasok):
      </p>
      <div class="grid2">
        <label v-for="p in cutProducts" :key="p.id"
          >{{ p.name }}
          <input
            v-model="qty[p.id]"
            type="number"
            min="0"
            inputmode="numeric"
            placeholder="0"
          />
        </label>
      </div>

      <p v-if="error" class="error">{{ error }}</p>
      <button :disabled="saving">
        {{ saving ? "Menyimpan..." : "Simpan" }}
      </button>
    </form>
  </section>

  <section class="card">
    <h1>Riwayat (30 terakhir)</h1>
    <p v-if="!rows.length" class="muted">Belum ada pembelian.</p>
    <ul class="list">
      <li v-for="r in rows" :key="r.id">
        <div>
          <strong>{{ r.purchase_date }}</strong> · {{ r.whole_chickens }} ekor ·
          {{ rupiah(r.total_cost) }}<br />
          <small class="muted">{{ itemsText(r) }}</small>
        </div>
        <button v-if="canDelete(r)" class="link danger" @click="remove(r.id)">
          Hapus
        </button>
      </li>
    </ul>
  </section>
</template>
