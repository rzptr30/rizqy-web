<script setup>
import { ref } from "vue";
import JSZip from "jszip";
import { supabase } from "../lib/supabase";
import { log } from "../lib/log";

const TABLES = [
  { key: "daily_sales", label: "Penjualan harian" },
  { key: "purchases", label: "Pembelian (induk)" },
  { key: "purchase_items", label: "Pembelian (rincian potongan)" },
  { key: "expenses", label: "Pengeluaran" },
  { key: "productions", label: "Produksi" },
  { key: "products", label: "Produk" },
];

const busy = ref(false);
const error = ref("");
const info = ref("");

async function fetchAll(table) {
  const size = 1000;
  let from = 0;
  const out = [];
  while (true) {
    const { data, error: e } = await supabase
      .from(table)
      .select("*")
      .order("id")
      .range(from, from + size - 1);
    if (e) throw e;
    out.push(...data);
    if (data.length < size) break;
    from += size;
  }
  return out;
}

function toCsv(rows) {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const cell = (v) => {
    if (v === null || v === undefined) return "";
    let s = String(v);
    // cegah rumus Excel dari teks bebas (=, +, -, @)
    if (typeof v === "string" && /^[=+\-@]/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g, '""')}"`;
  };
  return [
    cols.join(","),
    ...rows.map((r) => cols.map((c) => cell(r[c])).join(",")),
  ].join("\r\n");
}

function download(filename, content, type) {
  const blob =
    content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const stamp = () => new Date().toLocaleDateString("sv-SE");

function withNames(key, rows, names) {
  if (key === "daily_sales" || key === "purchase_items") {
    return rows.map((r) => ({ ...r, product_name: names[r.product_id] ?? "" }));
  }
  return rows;
}

async function exportAll() {
  error.value = "";
  info.value = "";
  busy.value = true;
  try {
    const data = {};
    for (const t of TABLES) data[t.key] = await fetchAll(t.key);
    const names = Object.fromEntries(data.products.map((p) => [p.id, p.name]));

    const zip = new JSZip();
    const counts = {};
    for (const t of TABLES) {
      const rows = withNames(t.key, data[t.key], names);
      counts[t.key] = rows.length;
      if (rows.length) zip.file(`${t.key}.csv`, "\uFEFF" + toCsv(rows));
    }
    const blob = await zip.generateAsync({ type: "blob" });
    download(`rizqy-semua-csv-${stamp()}.zip`, blob);
    log.info("Ekspor ZIP CSV", counts);
    const kosong = TABLES.filter((t) => !counts[t.key]).map((t) => t.label);
    info.value =
      "ZIP diunduh." +
      (kosong.length
        ? ` Tabel kosong tidak disertakan: ${kosong.join(", ")}.`
        : "");
  } catch (e) {
    log.error("Ekspor ZIP gagal", e);
    error.value = "Gagal ekspor: " + (e.message || e);
  } finally {
    busy.value = false;
  }
}

async function exportCsv(t) {
  error.value = "";
  info.value = "";
  busy.value = true;
  try {
    let rows = await fetchAll(t.key);
    if (t.key === "daily_sales" || t.key === "purchase_items") {
      const prods = await fetchAll("products");
      rows = withNames(
        t.key,
        rows,
        Object.fromEntries(prods.map((p) => [p.id, p.name])),
      );
    }
    download(
      `rizqy-${t.key}-${stamp()}.csv`,
      "\uFEFF" + toCsv(rows),
      "text/csv;charset=utf-8",
    );
    log.info("Ekspor CSV", t.key, rows.length);
    info.value = `${t.label}: ${rows.length} baris diunduh.`;
  } catch (e) {
    log.error("Ekspor CSV gagal", t.key, e);
    error.value = "Gagal ekspor: " + (e.message || e);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="card">
    <h1>Ekspor Data</h1>
    <p class="muted">Berkas ekspor memuat data usaha, simpan di tempat aman.</p>
    <button :disabled="busy" @click="exportAll">
      Unduh semua (ZIP berisi CSV)
    </button>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="info" class="ok">{{ info }}</p>
  </section>

  <section class="card">
    <h1>Unduh per tabel (CSV)</h1>
    <ul class="list">
      <li v-for="t in TABLES" :key="t.key">
        <span>{{ t.label }}</span>
        <button class="link" :disabled="busy" @click="exportCsv(t)">
          Unduh
        </button>
      </li>
    </ul>
    <p class="muted">
      Jika Excel menampilkan semua kolom dalam satu kolom, gunakan Data → Text
      to Columns (pemisah koma). Ini sering terjadi di Excel berbahasa Indonesia
      yang memakai titik koma.
    </p>
  </section>
</template>
