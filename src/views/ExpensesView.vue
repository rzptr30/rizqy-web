<script setup>
import { ref, computed, onMounted } from "vue";
import { supabase } from "../lib/supabase";
import { auth } from "../stores/auth";

const categories = [
  "Gas",
  "Minyak goreng",
  "Bumbu",
  "Kemasan",
  "Listrik/Air",
  "Lainnya",
];
const today = () => new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD (waktu lokal)

const form = ref({
  expense_date: today(),
  category: categories[0],
  amount: "",
  note: "",
});
const rows = ref([]);
const error = ref("");
const saving = ref(false);

const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

const total = computed(() =>
  rows.value.reduce((s, r) => s + Number(r.amount), 0),
);
const canDelete = (r) =>
  r.created_by === auth.user?.id || auth.role === "owner";

async function load() {
  const { data, error: e } = await supabase
    .from("expenses")
    .select("*")
    .order("expense_date", { ascending: false })
    .order("id", { ascending: false })
    .limit(50);
  if (e) {
    error.value = "Gagal memuat data: " + e.message;
    return;
  }
  rows.value = data;
}

async function save() {
  error.value = "";
  saving.value = true;
  const { error: e } = await supabase.from("expenses").insert({
    expense_date: form.value.expense_date,
    category: form.value.category,
    amount: Number(form.value.amount),
    note: form.value.note || null,
  });
  saving.value = false;
  if (e) {
    error.value = "Gagal menyimpan: " + e.message;
    return;
  }
  form.value.amount = "";
  form.value.note = "";
  await load();
}

async function remove(id) {
  if (!confirm("Hapus catatan ini?")) return;
  const { error: e } = await supabase.from("expenses").delete().eq("id", id);
  if (e) {
    error.value = "Gagal menghapus: " + e.message;
    return;
  }
  await load();
}

onMounted(load);
</script>

<template>
  <section class="card">
    <h1>Pengeluaran Operasional</h1>
    <form @submit.prevent="save">
      <label
        >Tanggal
        <input v-model="form.expense_date" type="date" required />
      </label>
      <label
        >Kategori
        <select v-model="form.category">
          <option v-for="c in categories" :key="c">{{ c }}</option>
        </select>
      </label>
      <label
        >Nominal (Rp)
        <input
          v-model="form.amount"
          type="number"
          min="0"
          inputmode="numeric"
          required
        />
      </label>
      <label
        >Keterangan
        <input v-model="form.note" type="text" placeholder="opsional" />
      </label>
      <p v-if="error" class="error">{{ error }}</p>
      <button :disabled="saving">
        {{ saving ? "Menyimpan..." : "Simpan" }}
      </button>
    </form>
  </section>

  <section class="card">
    <h1>Riwayat (50 terakhir)</h1>
    <p class="muted">
      Total yang tampil: <strong>{{ rupiah(total) }}</strong>
    </p>
    <p v-if="!rows.length" class="muted">Belum ada catatan.</p>
    <ul class="list">
      <li v-for="r in rows" :key="r.id">
        <div>
          <strong>{{ r.category }}</strong> · {{ rupiah(r.amount) }}<br />
          <small class="muted"
            >{{ r.expense_date
            }}<span v-if="r.note"> · {{ r.note }}</span></small
          >
        </div>
        <button v-if="canDelete(r)" class="link danger" @click="remove(r.id)">
          Hapus
        </button>
      </li>
    </ul>
  </section>
</template>
