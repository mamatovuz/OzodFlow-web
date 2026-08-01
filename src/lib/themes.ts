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
  | "ocean";

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
];

export function getTheme(key: string | null | undefined): MenuTheme {
  return MENU_THEMES.find((t) => t.key === key) ?? MENU_THEMES[0];
}

export const FREE_THEMES: ThemeKey[] = ["light", "dark"];

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
