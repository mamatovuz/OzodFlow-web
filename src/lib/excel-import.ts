// Excel (xlsx) orqali menyu import qilish uchun umumiy ta'riflar.
// Bu fayl ham shablon yaratishda (template route), ham import qilishda
// (import route) ishlatiladi — sarlavhalar bir joyda turishi uchun.

export type ImportColumn = {
  key: "category" | "name" | "price" | "oldPrice" | "weight" | "description" | "imageUrl";
  /** Excel'dagi asosiy sarlavha (shablonga yoziladi) */
  header: string;
  required: boolean;
  /** Sarlavhani tanishda qabul qilinadigan muqobil nomlar */
  aliases: string[];
  /** Shablondagi namuna qiymatlar (2 ta misol qator) */
  examples: [string, string];
  /** "Batafsil" bo'limidagi izoh */
  hint: string;
};

export const IMPORT_COLUMNS: ImportColumn[] = [
  {
    key: "category",
    header: "Kategoriya",
    required: true,
    aliases: ["kategoriya", "kategoriyasi", "category", "bolim", "bo'lim"],
    examples: ["Ichimliklar", "Ichimliklar"],
    hint: "Mahsulot kategoriyasi nomi. Agar bunday kategoriya bo'lmasa — avtomatik yaratiladi.",
  },
  {
    key: "name",
    header: "Mahsulot nomi",
    required: true,
    aliases: ["mahsulot nomi", "mahsulot", "nomi", "nom", "taom", "taom nomi", "name", "product"],
    examples: ["Coca-Cola 0.5L", "Fanta 0.5L"],
    hint: "Taom yoki mahsulot nomi (o'zbekcha). Majburiy.",
  },
  {
    key: "price",
    header: "Narx",
    required: true,
    aliases: ["narx", "narxi", "price", "summa"],
    examples: ["12000", "12000"],
    hint: "Narxi — faqat raqam (so'mda). Masalan: 12000. Majburiy.",
  },
  {
    key: "oldPrice",
    header: "Eski narx",
    required: false,
    aliases: ["eski narx", "eski narxi", "old price", "chegirmadan oldingi narx"],
    examples: ["15000", ""],
    hint: "Chegirmadan oldingi narx (agar bor bo'lsa). Raqam. Ixtiyoriy.",
  },
  {
    key: "weight",
    header: "Og'irligi",
    required: false,
    aliases: ["ogirligi", "og'irligi", "vazni", "weight", "hajmi"],
    examples: ["0.5L", "0.5L"],
    hint: "Og'irligi yoki hajmi. Masalan: 250g, 0.5L. Ixtiyoriy.",
  },
  {
    key: "description",
    header: "Tavsif",
    required: false,
    aliases: ["tavsif", "izoh", "description", "tarkibi"],
    examples: ["Sovuq gazlangan ichimlik", ""],
    hint: "Qisqa tavsif. Ixtiyoriy.",
  },
  {
    key: "imageUrl",
    header: "Rasm URL",
    required: false,
    aliases: ["rasm url", "rasm", "rasm manzili", "image", "image url", "surat", "rasim", "rasim url"],
    examples: [
      "https://example.com/cola.jpg",
      "",
    ],
    hint: "Rasmning to'liq internet manzili (https:// bilan). Rasm shu havoladan olinadi. Ixtiyoriy.",
  },
];

/** Sarlavhani solishtirish uchun normallashtirish */
export function normalizeHeader(v: unknown): string {
  return String(v ?? "")
    .toLowerCase()
    .replace(/[''ʻʼ`]/g, "'") // apostrof variantlari
    .replace(/\s+/g, " ")
    .trim();
}

/** Berilgan sarlavha qatoridan ustun -> indeks xaritasini quradi */
export function mapHeaders(headerRow: unknown[]): Record<ImportColumn["key"], number> {
  const normalized = headerRow.map(normalizeHeader);
  const map = {} as Record<ImportColumn["key"], number>;
  for (const col of IMPORT_COLUMNS) {
    const candidates = [normalizeHeader(col.header), ...col.aliases.map(normalizeHeader)];
    const idx = normalized.findIndex((h) => h !== "" && candidates.includes(h));
    map[col.key] = idx;
  }
  return map;
}

/** Narx matnini raqamga aylantiradi ("12 000", "12,000", "12000 so'm" -> 12000) */
export function parseNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return isFinite(v) ? v : null;
  // So'mda narxlar butun — bo'sh joy va vergul minglik ajratgich, nuqta o'nlik
  const cleaned = String(v)
    .replace(/\s/g, "")
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return isFinite(n) ? n : null;
}
