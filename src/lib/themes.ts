// Mijoz ko'radigan menyu dizayn temalari.
// Har bir tema nafaqat rangni, balki kartalar joylashuvi (layout),
// burchak radiusi va uslubni ham o'zgartiradi.
//
// MUHIM: Har bir tema STRUKTURA (layout) jihatidan farq qiladi. Rang esa
// endi to'liq sozlanadi (dashboard/design → rang tanlash + border radius),
// shuning uchun "faqat rangi boshqa" bo'lgan takroriy temalar olib tashlandi.

export type ThemeKey =
  | "light"
  | "dark"
  | "classic"
  | "noir"
  | "restoran"
  | "vitrina"
  | "prestij"
  | "showcase"
  | "bistro"
  | "menubook"
  | "story";

export type ThemeLayout = "list" | "grid";

export type MenuTheme = {
  key: ThemeKey;
  name: string;
  premium: boolean;
  isDark: boolean;
  layout: ThemeLayout; // list = rasm chapda, grid = rasm tepada 2 ustun
  radius: number; // px
  accent: string;
  accentText: string; // accent ustidagi matn rangi
  colors: {
    background: string;
    surface: string;
    surface2: string;
    card: string;
    foreground: string;
    muted: string;
    border: string;
  };
};

export const MENU_THEMES: MenuTheme[] = [
  {
    // Flow Sof — toza oq, ro'yxat layout. Universal, har qanday menyu uchun.
    key: "light",
    name: "Flow Sof",
    premium: false,
    isDark: false,
    layout: "list",
    radius: 16,
    accent: "#111827",
    accentText: "#ffffff",
    colors: {
      background: "#ffffff",
      surface: "#f8f9fb",
      surface2: "#eef1f5",
      card: "#ffffff",
      foreground: "#111827",
      muted: "#6b7280",
      border: "#e8ebf0",
    },
  },
  {
    // Flow Tun — toza qora (dark), ro'yxat layout.
    key: "dark",
    name: "Flow Tun",
    premium: false,
    isDark: true,
    layout: "list",
    radius: 16,
    accent: "#f4f4f5",
    accentText: "#0a0a0b",
    colors: {
      background: "#0a0a0b",
      surface: "#141416",
      surface2: "#1e1e22",
      card: "#141416",
      foreground: "#f4f4f5",
      muted: "#a1a1aa",
      border: "#26262b",
    },
  },
  {
    // Flow Klassik: chapda kategoriyalar "raili", o'ngda mahsulotlar (split layout).
    key: "classic",
    name: "Flow Klassik",
    premium: false,
    isDark: false,
    layout: "grid",
    radius: 14,
    accent: "#111827",
    accentText: "#ffffff",
    colors: {
      background: "#ffffff",
      surface: "#f6f7f9",
      surface2: "#eef0f3",
      card: "#ffffff",
      foreground: "#111827",
      muted: "#6b7280",
      border: "#e6e8ec",
    },
  },
  {
    // Flow Nafis — chuqur qora + oltin urg'u, grid. Premium restoran/steakhouse.
    key: "noir",
    name: "Flow Nafis",
    premium: true,
    isDark: true,
    layout: "grid",
    radius: 12,
    accent: "#d4af37",
    accentText: "#0a0a0b",
    colors: {
      background: "#0a0a0b",
      surface: "#141416",
      surface2: "#1e1e22",
      card: "#141416",
      foreground: "#f5f2ea",
      muted: "#a8a29a",
      border: "#2a2a2e",
    },
  },
  {
    // Flow Restoran — planshet menyusi: uzun kategoriya tablari + scroll-spy,
    // 3 ustunli grid kartalar. SAVATLI — mijoz taom tanlab buyurtma bera oladi.
    key: "restoran",
    name: "Flow Restoran",
    premium: true,
    isDark: false,
    layout: "grid",
    radius: 18,
    accent: "#E1A200",
    accentText: "#231705",
    colors: {
      background: "#ffffff",
      surface: "#f7f7f5",
      surface2: "#efefea",
      card: "#ffffff",
      foreground: "#1a1a1a",
      muted: "#7a7a76",
      border: "#ecece6",
    },
  },
  {
    // Flow Vitrina — Restoran bilan bir xil layout, lekin SAVATSIZ (faqat ko'rish).
    key: "vitrina",
    name: "Flow Vitrina",
    premium: true,
    isDark: false,
    layout: "grid",
    radius: 18,
    accent: "#E1A200",
    accentText: "#231705",
    colors: {
      background: "#ffffff",
      surface: "#f7f7f5",
      surface2: "#efefea",
      card: "#ffffff",
      foreground: "#1a1a1a",
      muted: "#7a7a76",
      border: "#ecece6",
    },
  },
  {
    // Flow Prestij — chuqur qora fon + oltin urg'u, markazlashgan boy header,
    // to'liq enli banner kategoriyalar. Premium/steakhouse uslubi.
    key: "prestij",
    name: "Flow Prestij",
    premium: true,
    isDark: true,
    layout: "grid",
    radius: 20,
    accent: "#E4B24C",
    accentText: "#0a0a0b",
    colors: {
      background: "#0a0a0b",
      surface: "#141416",
      surface2: "#1e1e22",
      card: "#141416",
      foreground: "#f5f2ea",
      muted: "#9a938a",
      border: "#26262b",
    },
  },
  {
    // Flow Salon — katta bir ustunli "showcase" kartalar, uzluksiz bo'limlar.
    key: "showcase",
    name: "Flow Salon",
    premium: true,
    isDark: false,
    layout: "grid",
    radius: 18,
    accent: "#1F2937",
    accentText: "#ffffff",
    colors: {
      background: "#FFFFFF",
      surface: "#F6F7F9",
      surface2: "#EDEFF3",
      card: "#FFFFFF",
      foreground: "#0F172A",
      muted: "#64748B",
      border: "#E7E9EE",
    },
  },
  {
    // Flow Bistro — issiq qog'ozrang, ro'yxat, uzluksiz bo'limli.
    key: "bistro",
    name: "Flow Bistro",
    premium: true,
    isDark: false,
    layout: "list",
    radius: 16,
    accent: "#C2410C",
    accentText: "#ffffff",
    colors: {
      background: "#FBF7F2",
      surface: "#F4EDE3",
      surface2: "#EBE1D3",
      card: "#FFFFFF",
      foreground: "#26201A",
      muted: "#7C6F5F",
      border: "#E8DDCD",
    },
  },
  {
    // Flow Kitob — "menyu kitobi" uslubi: o'tkir burchaklar, jurnal ko'rinishi.
    key: "menubook",
    name: "Flow Kitob",
    premium: true,
    isDark: false,
    layout: "list",
    radius: 6,
    accent: "#7C2D12",
    accentText: "#ffffff",
    colors: {
      background: "#FBF9F4",
      surface: "#F3EEE3",
      surface2: "#E9E2D2",
      card: "#FFFFFF",
      foreground: "#1F1B16",
      muted: "#736A5B",
      border: "#E5DCCB",
    },
  },
  {
    // Flow Hikoya — yumaloq burchakli, ro'yxat, hikoyaviy uzun bo'limlar.
    key: "story",
    name: "Flow Hikoya",
    premium: true,
    isDark: false,
    layout: "list",
    radius: 20,
    accent: "#B45309",
    accentText: "#ffffff",
    colors: {
      background: "#FBF8F3",
      surface: "#F4EEE4",
      surface2: "#EBE2D4",
      card: "#FFFFFF",
      foreground: "#241E17",
      muted: "#7A6F5F",
      border: "#E8DFD0",
    },
  },
];

export function getTheme(key: string | null | undefined): MenuTheme {
  return MENU_THEMES.find((t) => t.key === key) ?? MENU_THEMES[0];
}

// ─── Dizayn "shabloni": nafaqat rang, balki tuzilma ham o'zgaradi ───
// categoryStyle — kategoriyalar qanday ko'rinadi (menyu bosh sahifasida):
//   banner = to'liq enlik katta rasm kartalar (markazda nom)
//   grid   = 2 ustunli ixcham rasm kartalar
//   list   = chapda kichik rasm + nom qatorlar
// headerStyle — restoran profili (tepa qism):
//   overlap = logo kartaning chap tepasida (klassik)
//   center  = logo markazda, nom va tugmalar markazda
//   minimal = kichik logo, chapga tekislangan, ixcham
//   prestij = markazlashgan boy header (oltin urg'u)
export type CategoryStyle = "banner" | "grid" | "list";
export type HeaderStyle = "overlap" | "center" | "minimal" | "prestij";

const CATEGORY_STYLE: Record<ThemeKey, CategoryStyle> = {
  light: "banner",
  dark: "list",
  classic: "list",
  noir: "banner",
  restoran: "grid",
  vitrina: "grid",
  prestij: "banner",
  showcase: "grid",
  bistro: "list",
  menubook: "list",
  story: "list",
};

const HEADER_STYLE: Record<ThemeKey, HeaderStyle> = {
  light: "center",
  dark: "overlap",
  classic: "minimal",
  noir: "center",
  restoran: "center",
  vitrina: "center",
  prestij: "prestij",
  showcase: "overlap",
  bistro: "center",
  menubook: "minimal",
  story: "overlap",
};

export function categoryStyleFor(key: string): CategoryStyle {
  return CATEGORY_STYLE[key as ThemeKey] ?? "banner";
}
export function headerStyleFor(key: string): HeaderStyle {
  return HEADER_STYLE[key as ThemeKey] ?? "overlap";
}

// ─── Menyu tuzilishi: browse (kategoriyaga kirish) yoki split (chap kategoriya + o'ng mahsulot) ───
// browse = kategoriyaga kirish; split = chap rail + o'ng mahsulot (bir vaqtda)
// scroll = planshet uslubi: uzun kategoriya tablari + scroll-spy
// showcase/bistro/menubook/story = professional uzluksiz bo'limli layout'lar
// Eslatma: union ataylab keng qoldirilgan — public-menu va theme-picker'da
// eski (endi ishlatilmaydigan) uslublarga taqqoslovchi "o'lik" shoxlar bor,
// ular type xatosi bermasligi uchun. MENU_STYLE map faqat mavjud 11 temani
// bog'laydi, shuning uchun bu qo'shimcha qiymatlar hech qachon qaytmaydi.
export type MenuStyle =
  | "browse"
  | "split"
  | "tabs"
  | "scroll"
  | "signature"
  | "editorial"
  | "showcase"
  | "night"
  | "bistro"
  | "menubook"
  | "compact"
  | "story"
  | "catalog";

const MENU_STYLE: Record<ThemeKey, MenuStyle> = {
  light: "browse",
  dark: "browse",
  classic: "split",
  noir: "browse",
  restoran: "scroll",
  vitrina: "scroll",
  prestij: "browse",
  showcase: "showcase",
  bistro: "bistro",
  menubook: "menubook",
  story: "story",
};

export function menuStyleFor(key: string): MenuStyle {
  return MENU_STYLE[key as ThemeKey] ?? "browse";
}

// ─── Savat bor-yo'qligi: "vitrina" (faqat ko'rish) dizaynida savat yo'q ───
const NO_CART_THEMES: ThemeKey[] = ["vitrina"];

export function menuHasCart(key: string): boolean {
  return !NO_CART_THEMES.includes(key as ThemeKey);
}

export const FREE_THEMES: ThemeKey[] = ["light", "dark", "classic"];

// Restoran alohida sotib olgan premium dizaynlar (JSON massiv) ni xavfsiz o'qish.
export function parsePurchasedThemes(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.filter((k) => typeof k === "string") : [];
  } catch {
    return [];
  }
}

// Dizaynni ishlatish mumkinmi: premium bo'lmasa har doim, premium bo'lsa —
// tarif ochsa (canPremium) yoki alohida sotib olingan bo'lsa.
export function canUseTheme(
  key: string,
  canPremium: boolean,
  purchased: string[]
): boolean {
  const theme = MENU_THEMES.find((t) => t.key === key);
  if (!theme) return false;
  if (!theme.premium) return true;
  return canPremium || purchased.includes(key);
}
