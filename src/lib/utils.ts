export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
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
