import { supabase } from "./supabase";

export async function fetchPeriod(from, to) {
  const [pu, sa, ex, pr] = await Promise.all([
    supabase
      .from("purchases")
      .select(
        "id, purchase_date, whole_chickens, total_cost, purchase_items(product_id, qty)",
      )
      .gte("purchase_date", from)
      .lte("purchase_date", to)
      .order("purchase_date"),
    supabase
      .from("daily_sales")
      .select("sale_date, product_id, qty, unit_price, amount")
      .gte("sale_date", from)
      .lte("sale_date", to)
      .order("sale_date"),
    supabase
      .from("expenses")
      .select("expense_date, category, amount, note")
      .gte("expense_date", from)
      .lte("expense_date", to)
      .order("expense_date"),
    supabase.from("products").select("id, name, price, is_cut"),
  ]);
  for (const r of [pu, sa, ex, pr]) if (r.error) throw r.error;
  return {
    purchases: pu.data,
    sales: sa.data,
    expenses: ex.data,
    products: pr.data,
  };
}

export function summarize({ purchases, sales, expenses, products }) {
  const price = {};
  const name = {};
  for (const p of products) {
    price[p.id] = Number(p.price);
    name[p.id] = p.name;
  }

  // Alokasi biaya pembelian ke potongan (nilai jual relatif)
  const alloc = {};
  let purchaseTotal = 0;
  let unallocated = 0;
  for (const pu of purchases) {
    const cost = Number(pu.total_cost);
    purchaseTotal += cost;
    const items = pu.purchase_items || [];
    const totalValue = items.reduce(
      (s, i) => s + i.qty * (price[i.product_id] || 0),
      0,
    );
    if (totalValue <= 0) {
      unallocated += cost;
      continue;
    }
    for (const i of items) {
      const a = (alloc[i.product_id] ||= { qty: 0, cost: 0 });
      a.qty += i.qty;
      a.cost += (cost * (i.qty * (price[i.product_id] || 0))) / totalValue;
    }
  }

  // Penjualan per produk
  const sold = {};
  for (const s of sales) {
    const a = (sold[s.product_id] ||= { qty: 0, revenue: 0 });
    a.qty += s.qty;
    a.revenue += Number(s.amount);
  }

  const rows = [];
  let revenue = 0,
    revenueCounted = 0,
    hpp = 0;
  for (const [pid, s] of Object.entries(sold)) {
    const id = Number(pid);
    const al = alloc[id];
    const unitCost = al && al.qty > 0 ? al.cost / al.qty : null;
    const rowHpp = unitCost == null ? null : unitCost * s.qty;
    revenue += s.revenue;
    if (rowHpp != null) {
      revenueCounted += s.revenue;
      hpp += rowHpp;
    }
    rows.push({
      id,
      name: name[id] ?? `#${id}`,
      qty: s.qty,
      revenue: s.revenue,
      unitCost,
      hpp: rowHpp,
      profit: rowHpp == null ? null : s.revenue - rowHpp,
    });
  }
  rows.sort((a, b) => b.revenue - a.revenue);

  const expenseTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const grossProfit = revenueCounted - hpp;

  return {
    rows,
    revenue,
    revenueCounted,
    revenueUncounted: revenue - revenueCounted,
    hpp,
    grossProfit,
    purchaseTotal,
    unallocated,
    expenseTotal,
    afterExpenses: grossProfit - expenseTotal,
  };
}
