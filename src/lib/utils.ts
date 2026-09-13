export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// Katta summani ixcham ko'rinishga keltiradi: 8_420_000 → "8.4M", 66_300 → "66.3K".
// Tor joylarda (grafik o'qi, kichik kartalar) to'liq raqam sig'maganda ishlatiladi.
export function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    const v = n / 1_000_000;
    return `${(v >= 10 ? Math.round(v) : Number(v.toFixed(1)))}M`;
  }
  if (abs >= 1_000) {
    const v = n / 1_000;
    return `${(v >= 100 ? Math.round(v) : Number(v.toFixed(1)))}K`;
  }
  return `${Math.round(n)}`;
}

export function slugify(text: string) {
  const map: Record<string, string> = {
    ў: "o", қ: "q", ғ: "g", ҳ: "h", ъ: "", ь: "",
  };
  return text
    .toLowerCase()
    .trim()
    .split("")
    .map((c) => map[c] ?? c)
    .join("")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function formatPrice(amount: number, currency = "UZS") {
  const formatted = new Intl.NumberFormat("ru-RU").format(Math.round(amount));
  const symbols: Record<string, string> = {
    UZS: "so'm",
    USD: "$",
    RUB: "₽",
    EUR: "€",
  };
  const sym = symbols[currency] ?? currency;
  return currency === "USD" || currency === "EUR"
    ? `${sym}${formatted}`
    : `${formatted} ${sym}`;
}

/**
 * Narxni qismlarga ajratadi: son + valyuta belgisi + belgisi old/keyinmi.
 * Prestij uslubida son katta/oltin, valyuta esa kichik yuqori indeks (сум) qilib
 * ko'rsatish uchun ishlatiladi.
 */
export function formatPriceParts(amount: number, currency = "UZS") {
  const num = new Intl.NumberFormat("ru-RU").format(Math.round(amount));
  const symbols: Record<string, string> = {
    UZS: "so'm",
    USD: "$",
    RUB: "₽",
    EUR: "€",
  };
  const sym = symbols[currency] ?? currency;
  const prefix = currency === "USD" || currency === "EUR";
  return { num, sym, prefix };
}

export function randomCode(len = 6) {
  const chars = "ABCDEFGHIJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

/** JSON string maydonlarni xavfsiz parse qilish */
export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
