// ─────────────────────────────────────────────
// Menyu dizaynini moslash (customization) tizimi.
//
// Har bir restoran tayyor template (MenuTheme) ni tanlaydi, so'ng uni
// o'z brendiga moslaydi: ranglar, fon, bosh sahifa (hero) media, tugmalar.
//
// Moslashuvlar Restaurant.designConfig (JSON string) da saqlanadi.
// Bo'sh {} bo'lsa — template original ko'rinishida qoladi (hech narsa buzilmaydi).
// resolveDesign() template + config ni birlashtirib "effektiv dizayn" beradi,
// uni public menyu to'g'ridan-to'g'ri iste'mol qiladi.
// ─────────────────────────────────────────────

import { getTheme, type MenuTheme } from "./themes";

export type DesignColors = {
  accent: string;
  accentText: string;
  background: string;
  surface: string;
  surface2: string;
  card: string;
  foreground: string;
  muted: string;
  border: string;
};

export type BackgroundType = "theme" | "color" | "image" | "gradient";

export type DesignBackground = {
  type: BackgroundType;
  color: string;
  image: string;
  gradientFrom: string;
  gradientTo: string;
  gradientAngle: number;
  overlay: number; // 0–80 (%) — rasm/gradient ustidagi qoraytirish
};

export type CardShadow = "none" | "soft" | "medium";

export type DesignCard = {
  radius: number; // px
  shadow: CardShadow;
};

export type HeroMediaKind = "image" | "video";

export type HeroMedia = {
  id: string;
  kind: HeroMediaKind;
  url: string;
};

export type DesignHero = {
  enabled: boolean; // QR ochilganda birinchi to'liq ekran (intro)
  media: HeroMedia[]; // slider rasm/videolar (birinchisi = asosiy)
  autoplay: boolean; // slayd avtomatik almashishi
  ctaText: string; // tugma matni ("Menyuni ko'rish")
};

// Foydalanuvchi saqlaydigan qism (barchasi ixtiyoriy — bo'sh {} = template asl holati)
export type DesignConfig = {
  colors?: Partial<DesignColors>;
  radius?: number; // umumiy burchak radiusi (template radiusini ustidan bosadi)
  background?: Partial<DesignBackground>;
  card?: Partial<DesignCard>;
  hero?: Partial<DesignHero>;
};

// Public menyu iste'mol qiladigan to'liq (birlashtirilgan) dizayn
export type EffectiveDesign = {
  colors: DesignColors;
  radius: number;
  background: DesignBackground;
  card: DesignCard;
  hero: DesignHero;
};

// ─── Tayyor rang paletralari (section 7) ───
export type Palette = {
  key: string;
  name: string;
  swatch: [string, string]; // UI'da ko'rsatish uchun 2 rang
  colors: DesignColors;
};

export const PALETTES: Palette[] = [
  {
    key: "elegant",
    name: "Elegant",
    swatch: ["#8B5E3C", "#F5EFE6"],
    colors: {
      accent: "#8B5E3C",
      accentText: "#FFFFFF",
      background: "#F8F5F0",
      surface: "#F1EADF",
      surface2: "#E8DECE",
      card: "#FFFFFF",
      foreground: "#2A2018",
      muted: "#8A7A68",
      border: "#E5D9C7",
    },
  },
  {
    key: "fresh",
    name: "Fresh",
    swatch: ["#2E9E5B", "#FFFFFF"],
    colors: {
      accent: "#2E9E5B",
      accentText: "#FFFFFF",
      background: "#F6FBF7",
      surface: "#EDF6EF",
      surface2: "#DEEEE2",
      card: "#FFFFFF",
      foreground: "#12281B",
      muted: "#5C7A65",
      border: "#D6EADD",
    },
  },
  {
    key: "dark",
    name: "Dark",
    swatch: ["#0A0A0B", "#D4AF37"],
    colors: {
      accent: "#D4AF37",
      accentText: "#0A0A0B",
      background: "#0A0A0B",
      surface: "#151517",
      surface2: "#1F1F23",
      card: "#151517",
      foreground: "#F5F2EA",
      muted: "#A8A29A",
      border: "#2A2A2E",
    },
  },
  {
    key: "modern",
    name: "Modern",
    swatch: ["#2563EB", "#FFFFFF"],
    colors: {
      accent: "#2563EB",
      accentText: "#FFFFFF",
      background: "#F7F9FC",
      surface: "#EEF2F8",
      surface2: "#E2E8F2",
      card: "#FFFFFF",
      foreground: "#111827",
      muted: "#64748B",
      border: "#E2E8F0",
    },
  },
  {
    key: "warm",
    name: "Warm",
    swatch: ["#EA580C", "#FFF3E6"],
    colors: {
      accent: "#EA580C",
      accentText: "#FFFFFF",
      background: "#FFF8F1",
      surface: "#FFEFE2",
      surface2: "#FFE2CD",
      card: "#FFFDFB",
      foreground: "#3A1D0E",
      muted: "#916A50",
      border: "#FFD9BF",
    },
  },
  {
    key: "ocean",
    name: "Ocean",
    swatch: ["#0891B2", "#F0FBFD"],
    colors: {
      accent: "#0891B2",
      accentText: "#FFFFFF",
      background: "#F3FAFC",
      surface: "#E6F4F8",
      surface2: "#D3EBF1",
      card: "#FFFFFF",
      foreground: "#0B2A33",
      muted: "#5A8592",
      border: "#CDE7EE",
    },
  },
  {
    key: "sunset",
    name: "Sunset",
    swatch: ["#E11D48", "#FFF1F0"],
    colors: {
      accent: "#E11D48",
      accentText: "#FFFFFF",
      background: "#FFF6F3",
      surface: "#FFEAE4",
      surface2: "#FFD9CF",
      card: "#FFFFFF",
      foreground: "#3B1518",
      muted: "#9C6A63",
      border: "#FBD5CB",
    },
  },
  {
    key: "rose",
    name: "Rose",
    swatch: ["#DB2777", "#FEF2F8"],
    colors: {
      accent: "#DB2777",
      accentText: "#FFFFFF",
      background: "#FDF5F9",
      surface: "#FBE9F2",
      surface2: "#F7D6E7",
      card: "#FFFFFF",
      foreground: "#3A1225",
      muted: "#9A6480",
      border: "#F4D3E3",
    },
  },
  {
    key: "forest",
    name: "Forest",
    swatch: ["#0B3D2E", "#59D499"],
    colors: {
      accent: "#4ADE80",
      accentText: "#06231A",
      background: "#0C1F18",
      surface: "#122A21",
      surface2: "#1A362B",
      card: "#122A21",
      foreground: "#E8F5EE",
      muted: "#8FB3A3",
      border: "#204034",
    },
  },
  {
    key: "mono",
    name: "Mono",
    swatch: ["#111827", "#F5F5F5"],
    colors: {
      accent: "#111827",
      accentText: "#FFFFFF",
      background: "#FAFAFA",
      surface: "#F2F2F3",
      surface2: "#E7E7E9",
      card: "#FFFFFF",
      foreground: "#141416",
      muted: "#71717A",
      border: "#E4E4E7",
    },
  },
  {
    key: "coffee",
    name: "Coffee",
    swatch: ["#6F4E37", "#F6EEE3"],
    colors: {
      accent: "#6F4E37",
      accentText: "#FFFFFF",
      background: "#F7F1E8",
      surface: "#EFE5D6",
      surface2: "#E4D6C1",
      card: "#FFFDF9",
      foreground: "#2E2117",
      muted: "#8A7358",
      border: "#E1D2BC",
    },
  },
  {
    key: "midnight",
    name: "Midnight",
    swatch: ["#0B1220", "#38BDF8"],
    colors: {
      accent: "#38BDF8",
      accentText: "#04121F",
      background: "#0B1220",
      surface: "#111A2B",
      surface2: "#182338",
      card: "#111A2B",
      foreground: "#E6EEF9",
      muted: "#8397B4",
      border: "#1E2C44",
    },
  },
  {
    key: "grape",
    name: "Grape",
    swatch: ["#7C3AED", "#F5F0FF"],
    colors: {
      accent: "#7C3AED",
      accentText: "#FFFFFF",
      background: "#F8F5FF",
      surface: "#EFE8FD",
      surface2: "#E2D6FB",
      card: "#FFFFFF",
      foreground: "#241041",
      muted: "#7A6699",
      border: "#E1D5F7",
    },
  },
  {
    key: "mint",
    name: "Mint",
    swatch: ["#0D9488", "#EFFDFA"],
    colors: {
      accent: "#0D9488",
      accentText: "#FFFFFF",
      background: "#F1FBF9",
      surface: "#E2F5F1",
      surface2: "#CFEDE6",
      card: "#FFFFFF",
      foreground: "#0E2C28",
      muted: "#5E8A83",
      border: "#CDEAE4",
    },
  },
  {
    key: "royal",
    name: "Royal",
    swatch: ["#0A1834", "#E4B24C"],
    colors: {
      accent: "#E4B24C",
      accentText: "#1A1204",
      background: "#0A1430",
      surface: "#0F1C3E",
      surface2: "#16264F",
      card: "#0F1C3E",
      foreground: "#F3EFE4",
      muted: "#9AA6C2",
      border: "#1D2E58",
    },
  },
  {
    key: "sakura",
    name: "Sakura",
    swatch: ["#F472B6", "#FFF5FA"],
    colors: {
      accent: "#F472B6",
      accentText: "#3B0A22",
      background: "#FFF6FB",
      surface: "#FDEAF4",
      surface2: "#FBD9EB",
      card: "#FFFFFF",
      foreground: "#40182C",
      muted: "#A9748E",
      border: "#F7D6E7",
    },
  },
];

// ─── Template'dan standart (default) dizayn ───
export function defaultDesignFromTheme(theme: MenuTheme): EffectiveDesign {
  return {
    colors: {
      accent: theme.accent,
      accentText: theme.accentText,
      background: theme.colors.background,
      surface: theme.colors.surface,
      surface2: theme.colors.surface2,
      card: theme.colors.card,
      foreground: theme.colors.foreground,
      muted: theme.colors.muted,
      border: theme.colors.border,
    },
    radius: theme.radius,
    background: {
      type: "theme",
      color: theme.colors.background,
      image: "",
      gradientFrom: theme.accent,
      gradientTo: theme.colors.background,
      gradientAngle: 135,
      overlay: 30,
    },
    card: {
      radius: theme.radius,
      shadow: "soft",
    },
    hero: {
      enabled: false,
      media: [],
      autoplay: true,
      ctaText: "Menyuni ko'rish",
    },
  };
}

// designConfig JSON stringini xavfsiz o'qish
export function parseDesignConfig(json: string | null | undefined): DesignConfig {
  if (!json) return {};
  try {
    const v = JSON.parse(json);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as DesignConfig) : {};
  } catch {
    return {};
  }
}

// Template + config → effektiv dizayn (public menyu shu obyektni ishlatadi)
export function resolveDesign(
  theme: MenuTheme,
  configOrJson: DesignConfig | string | null | undefined
): EffectiveDesign {
  const base = defaultDesignFromTheme(theme);
  const cfg =
    typeof configOrJson === "string" || configOrJson == null
      ? parseDesignConfig(configOrJson as string)
      : configOrJson;

  const colors: DesignColors = { ...base.colors, ...clean(cfg.colors) };
  const radius = num(cfg.radius, base.radius);

  const background: DesignBackground = {
    ...base.background,
    ...clean(cfg.background),
  };
  // rang tipi "color" bo'lsa lekin rang berilmagan bo'lsa — colors.background
  if (background.type === "color" && !cfg.background?.color) {
    background.color = colors.background;
  }

  const card: DesignCard = { ...base.card, radius, ...clean(cfg.card) };

  const hero: DesignHero = {
    ...base.hero,
    ...clean(cfg.hero),
    media: Array.isArray(cfg.hero?.media)
      ? cfg.hero!.media.filter((m) => m && typeof m.url === "string" && m.url).slice(0, 8)
      : base.hero.media,
  };

  return { colors, radius, background, card, hero };
}

// undefined qiymatlarni tashlab, faqat berilgan kalitlarni qaytaradi
function clean<T extends object>(obj: Partial<T> | undefined): Partial<T> {
  if (!obj || typeof obj !== "object") return {};
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

// designConfig ning maqbul hajmda ekanini tekshirish (API validatsiyasi uchun)
export function isValidDesignConfigJson(json: string): boolean {
  if (json.length > 40_000) return false; // ~40KB limit (media URL lar bo'lsa ham yetarli)
  try {
    const v = JSON.parse(json);
    return v && typeof v === "object" && !Array.isArray(v);
  } catch {
    return false;
  }
}

// CSS burilish burchagi kabi shadow → CSS box-shadow
export function shadowCss(shadow: CardShadow, isDark: boolean): string {
  if (shadow === "none") return "none";
  const c = isDark ? "0,0,0,0.5" : "17,24,39,0.08";
  if (shadow === "soft") return `0 1px 3px rgba(${c})`;
  return isDark ? "0 6px 20px rgba(0,0,0,0.6)" : "0 8px 24px rgba(17,24,39,0.12)";
}

// Fon (background) uchun CSS qiymatlarini beradi
export function backgroundCss(
  bg: DesignBackground,
  fallback: string
): { backgroundColor?: string; backgroundImage?: string } {
  if (bg.type === "color") return { backgroundColor: bg.color || fallback };
  if (bg.type === "gradient") {
    return {
      backgroundColor: bg.gradientFrom,
      backgroundImage: `linear-gradient(${bg.gradientAngle}deg, ${bg.gradientFrom}, ${bg.gradientTo})`,
    };
  }
  if (bg.type === "image" && bg.image) {
    return { backgroundColor: fallback, backgroundImage: `url("${bg.image}")` };
  }
  return { backgroundColor: fallback };
}

// ─── Hero video: YouTube / to'g'ridan-to'g'ri havola ───

// YouTube video ID ni turli havola ko'rinishlaridan ajratadi
export function youtubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/v\/)([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = p.exec(url);
    if (m) return m[1];
  }
  return null;
}

// YouTube uchun autoplay/muted/loop embed havolasi
export function youtubeEmbed(url: string): string | null {
  const id = youtubeId(url);
  if (!id) return null;
  const params =
    "autoplay=1&mute=1&loop=1&controls=0&modestbranding=1&rel=0&playsinline=1&showinfo=0&iv_load_policy=3&playlist=" +
    id;
  return `https://www.youtube.com/embed/${id}?${params}`;
}

// Media turi: youtube | file (yuklangan yoki to'g'ridan-to'g'ri video) | image
export function heroMediaType(m: { kind: string; url: string }): "youtube" | "video" | "image" {
  if (m.kind === "video") {
    return youtubeId(m.url) ? "youtube" : "video";
  }
  return "image";
}

// getTheme + resolveDesign qisqartma
export function getDesign(
  themeKey: string | null | undefined,
  configJson: string | null | undefined
): { theme: MenuTheme; design: EffectiveDesign } {
  const theme = getTheme(themeKey);
  return { theme, design: resolveDesign(theme, configJson) };
}
