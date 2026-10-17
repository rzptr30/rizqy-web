const fmt = (d) => d.toLocaleDateString("sv-SE"); // YYYY-MM-DD, waktu lokal

export const today = () => fmt(new Date());
export const currentMonth = () => today().slice(0, 7);

export function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return fmt(d);
}

export function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  return fmt(d);
}

export function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return fmt(d);
}

// ym = 'YYYY-MM'
export function monthRange(ym) {
  const [y, m] = ym.split("-").map(Number);
  return { from: `${ym}-01`, to: fmt(new Date(y, m, 0)) };
}
