import { supabase } from "./supabase";

// Hasil: { [product_id]: { masuk, terjual } } untuk satu tanggal
export async function getDayStock(date) {
  const [pi, ds] = await Promise.all([
    supabase
      .from("purchase_items")
      .select("product_id, qty, purchases!inner(purchase_date)")
      .eq("purchases.purchase_date", date),
    supabase
      .from("daily_sales")
      .select("product_id, qty")
      .eq("sale_date", date),
  ]);
  if (pi.error) throw pi.error;
  if (ds.error) throw ds.error;

  const map = {};
  for (const r of pi.data) {
    const s = (map[r.product_id] ||= { masuk: 0, terjual: 0 });
    s.masuk += r.qty;
  }
  for (const r of ds.data) {
    const s = (map[r.product_id] ||= { masuk: 0, terjual: 0 });
    s.terjual += r.qty;
  }
  return map;
}
