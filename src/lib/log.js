const fmt = (a) => {
  if (a instanceof Error) return a.stack || a.message;
  if (typeof a === "object" && a !== null) {
    try {
      return JSON.stringify(a);
    } catch {
      return String(a);
    }
  }
  return String(a);
};

function send(level, args) {
  if (!import.meta.env.DEV) return; // di production tidak melakukan apa-apa
  console[level === "info" ? "log" : level](...args);
  fetch("/__log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ level, msg: args.map(fmt).join(" ") }),
  }).catch(() => {});
}

export const log = {
  info: (...a) => send("info", a),
  warn: (...a) => send("warn", a),
  error: (...a) => send("error", a),
};
