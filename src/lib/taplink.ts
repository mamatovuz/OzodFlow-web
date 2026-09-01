// ─────────────────────────────────────────────
// Taplink (link-in-bio) tizimi.
//
// Restoran egasi commonda ochiladigan sahifa yaratadi: ozodflow.uz/<handle>.
// Logo, ism/familiya, tugmalar (telefon/telegram/instagram...), video, menyu
// tugmasi, QR va tanlanadigan dizayn. Vizitka ham shu ma'lumotlardan quriladi.
//
// Bu modul SERVER-SAFE (React/DOM ishlatmaydi) — ikonkalar string kalit sifatida
// saqlanadi va komponentlarda lucide komponentiga bog'lanadi.
// ─────────────────────────────────────────────

import { slugify } from "./utils";

// ─── Havola (tugma) turlari ───
export type LinkType =
  | "phone"
  | "telegram"
  | "instagram"
  | "whatsapp"
  | "website"
  | "location"
  | "youtube"
  | "facebook"
  | "email"
  | "tiktok"
  | "custom";

export type TaplinkLink = {
  id: string;
  type: LinkType;
  label: string; // ko'rinadigan matn (bo'sh bo'lsa default ishlatiladi)
  value: string; // raqam / username / URL
};

// Har bir tur uchun meta: ikonka kaliti (lucide), brend rangi, default matn,
// input placeholder va href generatori.
export type LinkTypeMeta = {
  type: LinkType;
  label: string; // default tugma matni
  icon: string; // lucide ikonka kaliti (komponentda resolve qilinadi)
  color: string; // brend rangi (tugma "brand" rejimida)
  placeholder: string;
  hint: string;
};

export const LINK_TYPES: Record<LinkType, LinkTypeMeta> = {
  phone: {
    type: "phone",
    label: "Telefon",
    icon: "phone",
    color: "#16A34A",
    placeholder: "+998 90 123 45 67",
    hint: "Telefon raqam",
  },
  telegram: {
    type: "telegram",
    label: "Telegram",
    icon: "telegram",
    color: "#229ED9",
    placeholder: "@username yoki t.me/username",
    hint: "Telegram username yoki havola",
  },
  instagram: {
    type: "instagram",
    label: "Instagram",
    icon: "instagram",
    color: "#E1306C",
    placeholder: "@username",
    hint: "Instagram username",
  },
  whatsapp: {
    type: "whatsapp",
    label: "WhatsApp",
    icon: "whatsapp",
    color: "#25D366",
    placeholder: "+998 90 123 45 67",
    hint: "WhatsApp raqami",
  },
  website: {
    type: "website",
    label: "Veb-sayt",
    icon: "website",
    color: "#2563EB",
    placeholder: "https://sayt.uz",
    hint: "Sayt havolasi",
  },
  location: {
    type: "location",
    label: "Manzil (xarita)",
    icon: "location",
    color: "#EA4335",
    placeholder: "https://maps.google.com/...",
    hint: "Google Maps yoki Yandex havolasi",
  },
  youtube: {
    type: "youtube",
    label: "YouTube",
    icon: "youtube",
    color: "#FF0000",
    placeholder: "https://youtube.com/@kanal",
    hint: "YouTube kanal havolasi",
  },
  facebook: {
    type: "facebook",
    label: "Facebook",
    icon: "facebook",
    color: "#1877F2",
    placeholder: "https://facebook.com/sahifa",
    hint: "Facebook sahifa havolasi",
  },
  email: {
    type: "email",
    label: "Email",
    icon: "email",
    color: "#7C3AED",
    placeholder: "info@sayt.uz",
    hint: "Email manzil",
  },
  tiktok: {
    type: "tiktok",
    label: "TikTok",
    icon: "tiktok",
    color: "#111111",
    placeholder: "@username",
    hint: "TikTok username",
  },
  custom: {
    type: "custom",
    label: "Boshqa havola",
    icon: "link",
    color: "#64748B",
    placeholder: "https://...",
    hint: "Ixtiyoriy havola",
  },
};

export const LINK_TYPE_ORDER: LinkType[] = [
  "phone",
  "telegram",
  "instagram",
  "whatsapp",
  "youtube",
  "facebook",
  "tiktok",
  "location",
  "website",
  "email",
  "custom",
];

// Tugma qiymatini bosiladigan href ga aylantirish.
export function linkHref(type: LinkType, value: string): string {
  const v = (value || "").trim();
  if (!v) return "#";
  const digits = v.replace(/[^\d+]/g, "");
  const user = v.replace(/^@/, "").replace(/^https?:\/\/[^/]+\//, "");
  switch (type) {
    case "phone":
      return `tel:${digits}`;
    case "whatsapp":
      return `https://wa.me/${digits.replace(/\D/g, "")}`;
    case "email":
      return `mailto:${v}`;
    case "telegram":
      if (v.startsWith("http")) return v;
      return `https://t.me/${user}`;
    case "instagram":
      if (v.startsWith("http")) return v;
      return `https://instagram.com/${user}`;
    case "tiktok":
      if (v.startsWith("http")) return v;
      return `https://tiktok.com/@${user}`;
    case "youtube":
    case "facebook":
    case "location":
    case "website":
    case "custom":
    default:
      return v.startsWith("http") ? v : `https://${v}`;
  }
}

// Tugmaning ko'rinadigan matni (label bo'sh bo'lsa qiymat/turdan olamiz).
export function linkLabel(link: TaplinkLink): string {
  if (link.label?.trim()) return link.label.trim();
  const meta = LINK_TYPES[link.type];
  if (link.type === "phone" || link.type === "whatsapp") return link.value || meta.label;
  return meta.label;
}

// ─── Dizayn ───
export type ButtonShape = "rounded" | "pill" | "sharp";
export type ButtonFill = "solid" | "outline" | "soft" | "glass";
export type BgType = "solid" | "gradient" | "image";
export type FontKey = "sans" | "serif" | "rounded" | "mono";

export type TaplinkDesign = {
  bgType: BgType;
  bgColor: string;
  bgColor2: string; // gradient uchun 2-rang
  bgAngle: number;
  bgImage: string;
  bgOverlay: number; // 0–80 rasm ustidagi qoraytirish
  buttonColor: string; // tugma asosiy rangi
  buttonTextColor: string;
  buttonShape: ButtonShape;
  buttonFill: ButtonFill;
  brandIcons: boolean; // tugma ikonkasi brend rangida bo'lsinmi
  textColor: string; // sarlavha/matn rangi
  font: FontKey;
  avatarShape: "circle" | "rounded" | "square";
};

export const DEFAULT_DESIGN: TaplinkDesign = {
  bgType: "gradient",
  bgColor: "#0F172A",
  bgColor2: "#1E293B",
  bgAngle: 160,
  bgImage: "",
  bgOverlay: 40,
  buttonColor: "#FFFFFF",
  buttonTextColor: "#0F172A",
  buttonShape: "pill",
  buttonFill: "solid",
  brandIcons: true,
  textColor: "#FFFFFF",
  font: "sans",
  avatarShape: "circle",
};

// Tayyor dizayn presetlari (galereyada tanlash uchun).
export type TaplinkPreset = {
  key: string;
  name: string;
  design: TaplinkDesign;
};

export const TAPLINK_PRESETS: TaplinkPreset[] = [
  {
    key: "midnight",
    name: "Tungi",
    design: { ...DEFAULT_DESIGN },
  },
  {
    key: "gold",
    name: "Prestij (oltin)",
    design: {
      ...DEFAULT_DESIGN,
      bgType: "gradient",
      bgColor: "#0B0B0B",
      bgColor2: "#1A1408",
      bgAngle: 150,
      buttonColor: "#D4AF37",
      buttonTextColor: "#0B0B0B",
      buttonShape: "sharp",
      buttonFill: "solid",
      brandIcons: false,
      textColor: "#F5E7C1",
      font: "serif",
    },
  },
  {
    key: "cream",
    name: "Nafis krem",
    design: {
      ...DEFAULT_DESIGN,
      bgType: "solid",
      bgColor: "#F5EFE6",
      bgColor2: "#EDE3D3",
      buttonColor: "#8B5E3C",
      buttonTextColor: "#FFFFFF",
      buttonShape: "rounded",
      buttonFill: "solid",
      brandIcons: false,
      textColor: "#2A2018",
      font: "serif",
      avatarShape: "rounded",
    },
  },
  {
    key: "fresh",
    name: "Yashil",
    design: {
      ...DEFAULT_DESIGN,
      bgType: "gradient",
      bgColor: "#065F46",
      bgColor2: "#10B981",
      bgAngle: 160,
      buttonColor: "#FFFFFF",
      buttonTextColor: "#065F46",
      buttonShape: "pill",
      buttonFill: "solid",
      textColor: "#FFFFFF",
      font: "rounded",
    },
  },
  {
    key: "sunset",
    name: "Shafaq",
    design: {
      ...DEFAULT_DESIGN,
      bgType: "gradient",
      bgColor: "#7C2D12",
      bgColor2: "#F97316",
      bgAngle: 165,
      buttonColor: "#FFFFFF",
      buttonTextColor: "#7C2D12",
      buttonShape: "pill",
      buttonFill: "glass",
      textColor: "#FFF7ED",
      font: "sans",
    },
  },
  {
    key: "ocean",
    name: "Okean",
    design: {
      ...DEFAULT_DESIGN,
      bgType: "gradient",
      bgColor: "#0C4A6E",
      bgColor2: "#0EA5E9",
      bgAngle: 160,
      buttonColor: "#FFFFFF",
      buttonTextColor: "#0C4A6E",
      buttonShape: "rounded",
      buttonFill: "soft",
      textColor: "#F0F9FF",
      font: "sans",
    },
  },
  {
    key: "mono",
    name: "Minimal oq",
    design: {
      ...DEFAULT_DESIGN,
      bgType: "solid",
      bgColor: "#FFFFFF",
      bgColor2: "#F4F4F5",
      buttonColor: "#111111",
      buttonTextColor: "#FFFFFF",
      buttonShape: "sharp",
      buttonFill: "solid",
      brandIcons: false,
      textColor: "#111111",
      font: "mono",
      avatarShape: "square",
    },
  },
  {
    key: "berry",
    name: "Magenta",
    design: {
      ...DEFAULT_DESIGN,
      bgType: "gradient",
      bgColor: "#831843",
      bgColor2: "#DB2777",
      bgAngle: 160,
      buttonColor: "#FFFFFF",
      buttonTextColor: "#831843",
      buttonShape: "pill",
      buttonFill: "solid",
      textColor: "#FDF2F8",
      font: "rounded",
    },
  },
];

export function parseDesign(json: string | null | undefined): TaplinkDesign {
  if (!json) return { ...DEFAULT_DESIGN };
  try {
    const obj = JSON.parse(json);
    if (!obj || typeof obj !== "object") return { ...DEFAULT_DESIGN };
    return { ...DEFAULT_DESIGN, ...obj };
  } catch {
    return { ...DEFAULT_DESIGN };
  }
}

export function parseLinks(json: string | null | undefined): TaplinkLink[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((l) => l && typeof l === "object" && l.type in LINK_TYPES)
      .map((l, i) => ({
        id: String(l.id ?? `l${i}`),
        type: l.type as LinkType,
        label: String(l.label ?? ""),
        value: String(l.value ?? ""),
      }));
  } catch {
    return [];
  }
}

// ─── Vizitka (business card) ───
export type CardTemplate = "classic" | "modern" | "dark" | "minimal" | "gold";
export type CardContactKey = "phone" | "telegram" | "instagram" | "whatsapp" | "website" | "location" | "email";

export type TaplinkCard = {
  template: CardTemplate;
  bgColor: string;
  accentColor: string;
  textColor: string;
  contacts: CardContactKey[]; // orqa tomonda ko'rsatiladigan kontaktlar
  tagline: string; // nom ostidagi matn (masalan "Milliy taomlar")
};

export type CardTemplateMeta = {
  key: CardTemplate;
  name: string;
  bgColor: string;
  accentColor: string;
  textColor: string;
};

export const CARD_TEMPLATES: CardTemplateMeta[] = [
  { key: "classic", name: "Klassik", bgColor: "#FFFFFF", accentColor: "#2563EB", textColor: "#111827" },
  { key: "modern", name: "Zamonaviy", bgColor: "#0F172A", accentColor: "#38BDF8", textColor: "#F8FAFC" },
  { key: "dark", name: "Qora", bgColor: "#111111", accentColor: "#22C55E", textColor: "#FFFFFF" },
  { key: "gold", name: "Oltin", bgColor: "#0B0B0B", accentColor: "#D4AF37", textColor: "#F5E7C1" },
  { key: "minimal", name: "Minimal", bgColor: "#F5F5F4", accentColor: "#111111", textColor: "#1C1917" },
];

export const DEFAULT_CARD: TaplinkCard = {
  template: "classic",
  bgColor: "#FFFFFF",
  accentColor: "#2563EB",
  textColor: "#111827",
  contacts: ["phone", "telegram", "instagram"],
  tagline: "",
};

export function parseCard(json: string | null | undefined): TaplinkCard {
  if (!json) return { ...DEFAULT_CARD };
  try {
    const obj = JSON.parse(json);
    if (!obj || typeof obj !== "object") return { ...DEFAULT_CARD };
    return {
      ...DEFAULT_CARD,
      ...obj,
      contacts: Array.isArray(obj.contacts) ? obj.contacts : DEFAULT_CARD.contacts,
    };
  } catch {
    return { ...DEFAULT_CARD };
  }
}

// ─── Handle (manzil) generatsiyasi ───
// Restoran nomidan handle yasaydi; band bo'lsa raqam qo'shadi (safirun → safirun1).
export async function generateHandle(
  base: string,
  isTaken: (handle: string) => Promise<boolean>
): Promise<string> {
  let root = slugify(base).slice(0, 30);
  if (root.length < 3) root = `taplink-${root}`.slice(0, 30);
  if (!(await isTaken(root))) return root;
  for (let i = 1; i < 1000; i++) {
    const candidate = `${root}${i}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  // juda kam ehtimol — tasodifiy qo'shimcha
  return `${root}${Date.now().toString(36).slice(-4)}`;
}

// Fon uchun CSS (taplink va preview'da bir xil ishlatiladi).
export function taplinkBgCss(d: TaplinkDesign): string {
  if (d.bgType === "gradient") {
    return `linear-gradient(${d.bgAngle}deg, ${d.bgColor}, ${d.bgColor2})`;
  }
  return d.bgColor;
}

export const FONT_STACK: Record<FontKey, string> = {
  sans: "'Inter', system-ui, sans-serif",
  serif: "'Playfair Display', Georgia, serif",
  rounded: "'Nunito', 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
};
