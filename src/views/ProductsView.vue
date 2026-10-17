<script setup>
import { ref, onMounted } from "vue";
import { supabase } from "../lib/supabase";
import { log } from "../lib/log";

const rows = ref([]);
const error = ref("");
const info = ref("");
const saving = ref(false);
const form = ref({ name: "", price: "", is_cut: false });

const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

async function load() {
  const { data, error: e } = await supabase
    .from("products")
    .select("id, name, price, is_cut, active")
    .order("id");
  if (e) {
    log.error("Produk: gagal memuat", e);
    error.value = "Gagal memuat produk: " + e.message;
    return;
  }
  rows.value = data;
  log.info("Produk: dimuat", data.length);
}

function pesan(e) {
  return e.code === "23505" ? "Nama produk sudah ada." : e.message;
}

async function add() {
  error.value = "";
  info.value = "";
  saving.value = true;
  const { error: e } = await supabase.from("products").insert({
    name: form.value.name.trim(),
    price: Number(form.value.price),
    is_cut: form.value.is_cut,
  });
  saving.value = false;
  if (e) {
    log.error("Produk: gagal tambah", e);
    error.value = "Gagal menambah: " + pesan(e);
    return;
  }
  log.info("Produk: ditambah", form.value.name);
  form.value = { name: "", price: "", is_cut: false };
  await load();
}

async function update(r) {
  error.value = "";
  info.value = "";
  const { error: e } = await supabase
    .from("products")
    .update({
      name: String(r.name).trim(),
      price: Number(r.price),
      is_cut: r.is_cut,
      active: r.active,
    })
    .eq("id", r.id);
  if (e) {
    log.error("Produk: gagal ubah", r.id, e);
    error.value = "Gagal menyimpan: " + pesan(e);
    await load();
    return;
  }
  log.info("Produk: diubah", {
    id: r.id,
    name: r.name,
    price: r.price,
    is_cut: r.is_cut,
    active: r.active,
  });
  info.value = `"${r.name}" tersimpan.`;
  await load();
}

onMounted(load);
</script>

<template>
  <section class="card">
    <h1>Tambah Produk</h1>
    <form @submit.prevent="add">
      <label
        >Nama produk
        <input v-model="form.name" type="text" required />
      </label>
      <label
        >Harga jual (Rp)
        <input
          v-model="form.price"
          type="number"
          min="0"
          inputmode="numeric"
          required
        />
      </label>
      <label class="check">
        <input v-model="form.is_cut" type="checkbox" />
        Berasal dari potongan ayam (dicatat di Pembelian)
      </label>
      <p v-if="error" class="error">{{ error }}</p>
      <button :disabled="saving">
        {{ saving ? "Menyimpan..." : "Tambah" }}
      </button>
    </form>
  </section>

  <section class="card">
    <h1>Daftar Produk</h1>
    <p class="muted">
      Produk tidak dihapus, hanya dinonaktifkan, supaya riwayat lama tetap utuh.
      Mengubah harga tidak mengubah catatan penjualan lama.
    </p>
    <p v-if="info" class="ok">{{ info }}</p>
    <div
      v-for="r in rows"
      :key="r.id"
      class="prow"
      :class="{ inactive: !r.active }"
    >
      <input v-model="r.name" type="text" />
      <input v-model="r.price" type="number" min="0" inputmode="numeric" />
      <label class="check"
        ><input v-model="r.is_cut" type="checkbox" /> Potongan ayam</label
      >
      <label class="check"
        ><input v-model="r.active" type="checkbox" /> Aktif dijual</label
      >
      <button @click="update(r)">Simpan</button>
    </div>
  </section>
</template>
