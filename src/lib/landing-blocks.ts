// ─────────────────────────────────────────────
// Ariza (landing) sahifasi bloklari.
// Admin konstruktordan bloklar yig'adi, ular JSON sifatida LandingPage.blocks da
// saqlanadi. Public sahifa shu bloklarni ketma-ket chizadi. "field" bloklari
// forma maydonlarini hosil qiladi; "submit" — yuborish tugmasi.
// ─────────────────────────────────────────────

// Ma'lum (standart) maydon kalitlari — bular to'g'ridan-to'g'ri LandingSubmission
// ustunlariga tushadi. Boshqa (custom) maydonlar `extra` JSON'ga yoziladi.
export type FieldKey = "name" | "lastName" | "phone" | "brand" | "telegram" | "custom";

export type LandingBlock =
  | { id: string; type: "heading"; text: string }
  | { id: string; type: "text"; text: string }
  | { id: string; type: "image"; url: string }
  | {
      id: string;
      type: "field";
      field: FieldKey;
      label: string;
      placeholder: string;
      required: boolean;
    }
  | { id: string; type: "submit"; text: string };

export type FieldBlock = Extract<LandingBlock, { type: "field" }>;

// Standart maydonlarning odatiy nom/placeholder'lari (palitrada va default'da)
export const FIELD_META: Record<
  Exclude<FieldKey, "custom">,
  { label: string; placeholder: string }
> = {
  name: { label: "Ism", placeholder: "Ismingiz" },
  lastName: { label: "Familiya", placeholder: "Familiyangiz" },
  phone: { label: "Telefon raqam", placeholder: "+998 90 123 45 67" },
  brand: { label: "Brend nomi", placeholder: "Restoran / brend nomi" },
  telegram: { label: "Telegram username", placeholder: "@username" },
};

let counter = 0;
export function newBlockId(): string {
  counter += 1;
  return `b${Date.now().toString(36)}${counter}`;
}

// ─── Tayyor shablonlar (konstruktorda "Shablon tanlash") ───
export type Template = { key: string; name: string; desc: string; blocks: () => LandingBlock[] };

function field(field: Exclude<FieldKey, "custom">, required = false): FieldBlock {
  return {
    id: newBlockId(),
    type: "field",
    field,
    label: FIELD_META[field].label,
    placeholder: FIELD_META[field].placeholder,
    required,
  };
}

export const TEMPLATES: Template[] = [
  {
    key: "simple",
    name: "Oddiy ariza",
    desc: "Ism va telefon — eng tez",
    blocks: () => [
      { id: newBlockId(), type: "heading", text: "Ariza qoldiring" },
      { id: newBlockId(), type: "text", text: "Ma'lumotlaringizni qoldiring, tez orada bog'lanamiz." },
      field("name", true),
      field("phone", true),
      { id: newBlockId(), type: "submit", text: "Yuborish" },
    ],
  },
  {
    key: "full",
    name: "To'liq ariza",
    desc: "Ism, familiya, telefon, brend, telegram",
    blocks: () => [
      { id: newBlockId(), type: "heading", text: "Bepul konsultatsiya olish" },
      {
        id: newBlockId(),
        type: "text",
        text: "Quyidagi shaklni to'ldiring — mutaxassisimiz siz bilan bog'lanadi.",
      },
      field("name", true),
      field("lastName", false),
      field("phone", true),
      field("brand", false),
      field("telegram", false),
      { id: newBlockId(), type: "submit", text: "Arizani yuborish" },
    ],
  },
  {
    key: "brand",
    name: "Brend arizasi",
    desc: "Restoran/brend uchun",
    blocks: () => [
      { id: newBlockId(), type: "heading", text: "OzodFlow'ga qo'shiling" },
      { id: newBlockId(), type: "text", text: "Restoraningiz uchun raqamli menyu — ariza qoldiring." },
      field("name", true),
      field("brand", true),
      field("phone", true),
      field("telegram", false),
      { id: newBlockId(), type: "submit", text: "Ro'yxatdan o'tish" },
    ],
  },
  {
    key: "blank",
    name: "Bo'sh",
    desc: "Noldan boshlash",
    blocks: () => [
      { id: newBlockId(), type: "heading", text: "Sarlavha" },
      { id: newBlockId(), type: "submit", text: "Yuborish" },
    ],
  },
];

// blocks JSON'ni xavfsiz o'qish
export function parseBlocks(json: string | null | undefined): LandingBlock[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (b): b is LandingBlock => b && typeof b === "object" && typeof b.type === "string"
    );
  } catch {
    return [];
  }
}

// Bloklar orasidan forma maydonlarini ajratib olish (public render + submit uchun)
export function fieldBlocks(blocks: LandingBlock[]): FieldBlock[] {
  return blocks.filter((b): b is FieldBlock => b.type === "field");
}
