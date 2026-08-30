// Mijoz ko'radigan menyu dizayn temalari.
// Har bir tema nafaqat rangni, balki kartalar joylashuvi (layout),
// burchak radiusi va uslubni ham o'zgartiradi.

export type ThemeKey =
  | "light"
  | "dark"
  | "ziravor"
  | "emerald"
  | "sunset"
  | "royal"
  | "coffee"
  | "noir"
  | "ocean"
  | "classic"
  | "aurora"
  | "carbon"
  | "botanic"
  | "neon"
  | "rose"
  | "mono"
  | "restoran"
  | "vitrina"
  | "nordic"
  | "sahra"
  | "delever"
  | "sultan"
  | "fiesta";

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
    key: "light",
    name: "Oq",
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
    key: "dark",
    name: "Qora",
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
    key: "ziravor",
    name: "Milliy",
    premium: true,
    isDark: false,
    layout: "grid",
    radius: 20,
    accent: "#C26A1A",
    accentText: "#ffffff",
    colors: {
      background: "#F7F3ED",
      surface: "#efe8dd",
      surface2: "#e6dccd",
      card: "#ffffff",
      foreground: "#0D3B34",
      muted: "#6b7d6f",
      border: "#e0d6c6",
    },
  },
  {
    key: "emerald",
    name: "Zumrad",
    premium: true,
    isDark: false,
    layout: "grid",
    radius: 18,
    accent: "#059669",
    accentText: "#ffffff",
    colors: {
      background: "#f4faf6",
      surface: "#eaf5ee",
      surface2: "#dbeee3",
      card: "#ffffff",
      foreground: "#10241a",
      muted: "#4b6b5a",
      border: "#cfe7d8",
    },
  },
  {
    key: "sunset",
    name: "Shafaq",
    premium: true,
    isDark: false,
    layout: "list",
    radius: 22,
    accent: "#ea580c",
    accentText: "#ffffff",
    colors: {
      background: "#fff8f3",
      surface: "#ffefe4",
      surface2: "#ffe3d1",
      card: "#fffdfb",
      foreground: "#3a1d0e",
      muted: "#8a5a3f",
      border: "#ffd9c2",
    },
  },
  {
    key: "royal",
    name: "Shohona",
    premium: true,
    isDark: true,
    layout: "grid",
    radius: 18,
    accent: "#8b5cf6",
    accentText: "#ffffff",
    colors: {
      background: "#0f0b1e",
      surface: "#1a1330",
      surface2: "#241a42",
      card: "#17112b",
      foreground: "#ece7f8",
      muted: "#a99fce",
      border: "#2e2350",
    },
  },
  {
    key: "coffee",
    name: "Qahva",
    premium: true,
    isDark: false,
    layout: "list",
    radius: 14,
    accent: "#b45309",
    accentText: "#ffffff",
    colors: {
      background: "#f7f1ea",
      surface: "#efe5d8",
      surface2: "#e6d8c6",
      card: "#fffaf3",
      foreground: "#2b1d12",
      muted: "#7a6552",
      border: "#ddcab3",
    },
  },
  {
    key: "noir",
    name: "Nafis",
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
    key: "ocean",
    name: "Dengiz",
    premium: true,
    isDark: true,
    layout: "list",
    radius: 20,
    accent: "#06b6d4",
    accentText: "#04222a",
    colors: {
      background: "#081b26",
      surface: "#0d2733",
      surface2: "#123340",
      card: "#0d2733",
      foreground: "#e6f6fb",
      muted: "#8fb3bf",
      border: "#1a3d4a",
    },
  },
  {
    // Klassik: chapda kategoriyalar r"raili", o'ngda mahsulotlar (split layout).
    // Bosh sahifa (hero) + chap-o'ng menyu tuzilishi bilan alohida yangi dizayn.
    key: "classic",
    name: "Klassik",
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
    // Aurora — zamonaviy, havodor, indigo urg'u. Toza SaaS uslubi.
    key: "aurora",
    name: "Aurora",
    premium: true,
    isDark: false,
    layout: "grid",
    radius: 22,
    accent: "#6366f1",
    accentText: "#ffffff",
    colors: {
      background: "#f6f6ff",
      surface: "#eeeefe",
      surface2: "#e3e3fb",
      card: "#ffffff",
      foreground: "#1a1a2e",
      muted: "#71718a",
      border: "#e2e2f5",
    },
  },
  {
    // Carbon — qattiq qora + jonli to'q sariq. Premium fast-food/steak uslubi.
    key: "carbon",
    name: "Carbon",
    premium: true,
    isDark: true,
    layout: "list",
    radius: 10,
    accent: "#f97316",
    accentText: "#1a0f05",
    colors: {
      background: "#101012",
      surface: "#17171a",
      surface2: "#202024",
      card: "#161619",
      foreground: "#f5f5f4",
      muted: "#9a9a9e",
      border: "#28282d",
    },
  },
  {
    // Botanic — yumshoq zaytun/sage, tabiiy va nafis. Kafe/veg uslubi.
    key: "botanic",
    name: "Botanic",
    premium: true,
    isDark: false,
    layout: "grid",
    radius: 24,
    accent: "#4d7c0f",
    accentText: "#ffffff",
    colors: {
      background: "#f4f6ef",
      surface: "#ecefe3",
      surface2: "#e1e6d3",
      card: "#fbfcf8",
      foreground: "#21260f",
      muted: "#6b7355",
      border: "#dde3cd",
    },
  },
  {
    // Neon — to'q qora fon + elektr yashil (lime) urg'u. Zamonaviy dark food-app
    // uslubi: tepada tab qatori, grid kartalar, o'tkir kontrast.
    key: "neon",
    name: "Neon",
    premium: true,
    isDark: true,
    layout: "grid",
    radius: 16,
    accent: "#a3e635",
    accentText: "#14210a",
    colors: {
      background: "#0c0d0a",
      surface: "#14150f",
      surface2: "#1d1f16",
      card: "#131410",
      foreground: "#f2f5ea",
      muted: "#a3a89a",
      border: "#262820",
    },
  },
  {
    // Rose — yumshoq pushti/qaymoqrang, juda yumaloq burchaklar. Shirinlik,
    // qandolat va kafe uslubi: markazlashgan header, banner kategoriyalar.
    key: "rose",
    name: "Rose",
    premium: true,
    isDark: false,
    layout: "grid",
    radius: 26,
    accent: "#e11d48",
    accentText: "#ffffff",
    colors: {
      background: "#fff5f7",
      surface: "#ffe9ef",
      surface2: "#ffdbe6",
      card: "#ffffff",
      foreground: "#3d0713",
      muted: "#9f6478",
      border: "#ffd0dd",
    },
  },
  {
    // Mono — editorial "oq qog'oz" uslubi: o'tkir burchaklar (kichik radius),
    // chapda kategoriya raili + o'ngda mahsulot (split), overlap header, list.
    // Nafis steakhouse/fine-dining ko'rinishi.
    key: "mono",
    name: "Mono",
    premium: true,
    isDark: false,
    layout: "list",
    radius: 6,
    accent: "#1c1917",
    accentText: "#ffffff",
    colors: {
      background: "#faf9f6",
      surface: "#f2f0ea",
      surface2: "#e9e6dd",
      card: "#ffffff",
      foreground: "#1c1917",
      muted: "#78716c",
      border: "#e2ded4",
    },
  },
  {
    // Restoran — planshet menyusi uslubi (rasmdagidek): tepada logo + til +
    // qidiruv, ostida uzun kategoriya tablari, pastga tushgan sari kategoriya
    // avtomatik almashadi (scroll-spy), 3 ustunli grid kartalar. SAVATLI —
    // mijoz taom tanlab buyurtma bera oladi.
    key: "restoran",
    name: "Restoran",
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
      border: "#ececE6",
    },
  },
  {
    // Vitrina — Restoran bilan bir xil ko'rinish, lekin SAVATSIZ (faqat ko'rish).
    // Digital menyu-taxta uslubi: mijoz taomlarni ko'radi, buyurtma bermaydi.
    // Taomga bosilganda batafsil oyna ochiladi ("Savatga" tugmasisiz).
    key: "vitrina",
    name: "Vitrina",
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
      border: "#ececE6",
    },
  },
  {
    // Nordic — skandinav minimalizm: sovuq oq-kulrang, o'tkir (kichik radius),
    // ko'p bo'sh joy, qora urg'u. Tepada toza tab qatori, bitta kategoriya.
    // Nafis va sokin — kofexona/bistro uslubi.
    key: "nordic",
    name: "Nordic",
    premium: true,
    isDark: false,
    layout: "list",
    radius: 8,
    accent: "#1c1c1e",
    accentText: "#ffffff",
    colors: {
      background: "#fafafa",
      surface: "#f2f2f0",
      surface2: "#e9e9e6",
      card: "#ffffff",
      foreground: "#1a1a1a",
      muted: "#8a8a88",
      border: "#eae9e5",
    },
  },
  {
    // Sahra — issiq qog'oz minimalizm: krem/qog'ozrang fon, loyrang urg'u,
    // o'tkir burchaklar, markazlashgan sokin header. Kategoriyalar ro'yxat.
    // Choyxona/qadimiy oshxona uslubining zamonaviy, sof ko'rinishi.
    key: "sahra",
    name: "Sahra",
    premium: true,
    isDark: false,
    layout: "list",
    radius: 6,
    accent: "#9a6a4b",
    accentText: "#ffffff",
    colors: {
      background: "#f6f1e7",
      surface: "#efe8da",
      surface2: "#e6ddcb",
      card: "#fbf7ef",
      foreground: "#2b2117",
      muted: "#8c7a64",
      border: "#e5dac6",
    },
  },
  {
    // Delever — zamonaviy yetkazib berish ilovasi uslubi (delever.io kabi):
    // toza oq fon, jonli marjon urg'u, planshet-uslub uzun kategoriya tablari +
    // katta grid kartalar (scroll-spy). Savatli — buyurtma beriladi.
    key: "delever",
    name: "Delever",
    premium: true,
    isDark: false,
    layout: "grid",
    radius: 20,
    accent: "#ff5a3c",
    accentText: "#ffffff",
    colors: {
      background: "#ffffff",
      surface: "#f6f7f9",
      surface2: "#eef0f3",
      card: "#ffffff",
      foreground: "#16181d",
      muted: "#6b7280",
      border: "#eaecef",
    },
  },
  {
    // Sultan — sharqona premium: to'q zumrad fon + oltin urg'u, krem matn.
    // Katta banner kategoriyalar, markazlashgan boy header. Milliy restoran,
    // ziyofatxona uslubi — hashamat va nafislik.
    key: "sultan",
    name: "Sultan",
    premium: true,
    isDark: true,
    layout: "grid",
    radius: 16,
    accent: "#c9a227",
    accentText: "#171206",
    colors: {
      background: "#0c1a16",
      surface: "#12241e",
      surface2: "#183029",
      card: "#10221c",
      foreground: "#f4eedd",
      muted: "#9fb3a8",
      border: "#1f3a31",
    },
  },
  {
    // Fiesta — jonli va quvnoq: issiq oq fon, moshrang (magenta) urg'u, juda
    // yumaloq burchaklar. Tepada rangli tablar + banner kategoriyalar.
    // Fast-food, shirinlik, quvnoq kafe uslubi.
    key: "fiesta",
    name: "Fiesta",
    premium: true,
    isDark: false,
    layout: "grid",
    radius: 24,
    accent: "#ec4899",
    accentText: "#ffffff",
    colors: {
      background: "#fffdf7",
      surface: "#fbf3ea",
      surface2: "#f6e7dc",
      card: "#ffffff",
      foreground: "#2a0e1e",
      muted: "#8a6b78",
      border: "#f3e4dc",
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
export type CategoryStyle = "banner" | "grid" | "list";
export type HeaderStyle = "overlap" | "center" | "minimal";

const CATEGORY_STYLE: Record<ThemeKey, CategoryStyle> = {
  light: "banner",
  dark: "list",
  ziravor: "grid",
  emerald: "grid",
  sunset: "banner",
  royal: "grid",
  coffee: "list",
  noir: "banner",
  ocean: "list",
  classic: "list",
  aurora: "grid",
  carbon: "list",
  botanic: "banner",
  neon: "grid",
  rose: "banner",
  mono: "list",
  restoran: "grid",
  vitrina: "grid",
  nordic: "list",
  sahra: "list",
  delever: "grid",
  sultan: "banner",
  fiesta: "banner",
};

const HEADER_STYLE: Record<ThemeKey, HeaderStyle> = {
  light: "center",
  dark: "overlap",
  ziravor: "center",
  emerald: "overlap",
  sunset: "center",
  royal: "overlap",
  coffee: "minimal",
  noir: "center",
  ocean: "minimal",
  classic: "minimal",
  aurora: "center",
  carbon: "minimal",
  botanic: "center",
  neon: "minimal",
  rose: "center",
  mono: "overlap",
  restoran: "center",
  vitrina: "center",
  nordic: "minimal",
  sahra: "center",
  delever: "center",
  sultan: "center",
  fiesta: "center",
};

export function categoryStyleFor(key: string): CategoryStyle {
  return CATEGORY_STYLE[key as ThemeKey] ?? "banner";
}
export function headerStyleFor(key: string): HeaderStyle {
  return HEADER_STYLE[key as ThemeKey] ?? "overlap";
}

// ─── Menyu tuzilishi: browse (kategoriyaga kirish) yoki split (chap kategoriya + o'ng mahsulot) ───
// split = chap tomonda kategoriyalar roili, o'ngda tanlangan kategoriya mahsulotlari (bir vaqtda).
// browse = kategoriyaga kirish; split = chap rail; tabs = tepada tab + bitta kategoriya
// scroll = planshet uslubi: uzun kategoriya tablari + scroll-spy (pastga tushgani
//          sari kategoriya avtomatik almashadi), barcha kategoriyalar ketma-ket.
export type MenuStyle = "browse" | "split" | "tabs" | "scroll";

const MENU_STYLE: Record<ThemeKey, MenuStyle> = {
  light: "browse",
  dark: "browse",
  ziravor: "browse",
  emerald: "browse",
  sunset: "browse",
  royal: "browse",
  coffee: "browse",
  noir: "browse",
  ocean: "browse",
  classic: "split",
  aurora: "tabs",
  carbon: "browse",
  botanic: "browse",
  neon: "tabs",
  rose: "browse",
  mono: "split",
  restoran: "scroll",
  vitrina: "scroll",
  nordic: "tabs",
  sahra: "browse",
  delever: "scroll",
  sultan: "browse",
  fiesta: "tabs",
};

export function menuStyleFor(key: string): MenuStyle {
  return MENU_STYLE[key as ThemeKey] ?? "browse";
}

// ─── Savat bor-yo'qligi: "vitrina" (faqat ko'rish) dizaynida savat yo'q ───
// Savatsiz dizaynda mijoz taomlarni ko'radi, lekin buyurtma bermaydi
// (savat tugmasi, "Qo'shish" tugmalari va pastki savat bari ko'rinmaydi).
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
