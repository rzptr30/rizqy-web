<script setup>
import { ref, onMounted } from "vue";
import { supabase } from "../lib/supabase";
import { auth } from "../stores/auth";
import { today } from "../lib/dates";
import { log } from "../lib/log";

const form = ref({
  production_date: today(),
  materials_used: "",
  output_note: "",
});
const rows = ref([]);
const error = ref("");
const saving = ref(false);

const canDelete = (r) =>
  r.created_by === auth.user?.id || auth.role === "owner";

async function load() {
  const { data, error: e } = await supabase
    .from("productions")
    .select("*")
    .order("production_date", { ascending: false })
    .order("id", { ascending: false })
    .limit(30);
  if (e) {
    log.error("Produksi: gagal memuat", e);
    error.value = "Gagal memuat data: " + e.message;
    return;
  }
  rows.value = data;
  log.info("Produksi: dimuat", data.length);
}

async function save() {
  error.value = "";
  saving.value = true;
  const { error: e } = await supabase.from("productions").insert({
    production_date: form.value.production_date,
    materials_used: form.value.materials_used.trim() || null,
    output_note: form.value.output_note.trim() || null,
  });
  saving.value = false;
  if (e) {
    log.error("Produksi: gagal simpan", e);
    error.value = "Gagal menyimpan: " + e.message;
    return;
  }
  log.info("Produksi: tersimpan");
  form.value.materials_used = "";
  form.value.output_note = "";
  await load();
}

async function remove(id) {
  if (!confirm("Hapus catatan ini?")) return;
  const { error: e } = await supabase.from("productions").delete().eq("id", id);
  if (e) {
    log.error("Produksi: gagal hapus", e);
    error.value = "Gagal menghapus: " + e.message;
    return;
  }
  log.info("Produksi: dihapus", id);
  await load();
}

onMounted(load);
</script>

<template>
  <section class="card">
    <h1>Produksi / Penggorengan</h1>
    <form @submit.prevent="save">
      <label
        >Tanggal
        <input v-model="form.production_date" type="date" required />
      </label>
      <label
        >Bahan terpakai
        <textarea
          v-model="form.materials_used"
          rows="3"
          placeholder="contoh: tepung 2 kg, minyak 3 liter, bumbu 2 sachet"
        ></textarea>
      </label>
      <label
        >Hasil / catatan
        <textarea
          v-model="form.output_note"
          rows="3"
          placeholder="contoh: 3 kali goreng, 1 batch gagal"
        ></textarea>
      </label>
      <p class="muted">Versi mini: teks bebas, belum memengaruhi stok.</p>
      <p v-if="error" class="error">{{ error }}</p>
      <button :disabled="saving">
        {{ saving ? "Menyimpan..." : "Simpan" }}
      </button>
    </form>
  </section>

  <section class="card">
    <h1>Riwayat (30 terakhir)</h1>
    <p v-if="!rows.length" class="muted">Belum ada catatan.</p>
    <ul class="list">
      <li v-for="r in rows" :key="r.id">
        <div>
          <strong>{{ r.production_date }}</strong
          ><br />
          <small v-if="r.materials_used"
            >Bahan: {{ r.materials_used }}<br
          /></small>
          <small v-if="r.output_note" class="muted">{{ r.output_note }}</small>
        </div>
        <button v-if="canDelete(r)" class="link danger" @click="remove(r.id)">
          Hapus
        </button>
      </li>
    </ul>
  </section>
</template>
