// Mijoz ko'radigan menyu dizayn temalari
// 2 ta tekin (light, dark) + 5 ta premium (Pro Max)

export type ThemeKey =
  | "light"
  | "dark"
  | "emerald"
  | "sunset"
  | "royal"
  | "coffee"
  | "noir";

export type MenuTheme = {
  key: ThemeKey;
  name: string;
  premium: boolean;
  isDark: boolean;
  /** Agar berilsa, restoran brend rangi o'rniga shu accent ishlatiladi */
  accent?: string;
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
    colors: {
      background: "#ffffff",
      surface: "#f8f9fb",
      surface2: "#f1f3f7",
      card: "#ffffff",
      foreground: "#1f2937",
      muted: "#6b7280",
      border: "#e5e7eb",
    },
  },
  {
    key: "dark",
    name: "Qora",
    premium: false,
    isDark: true,
    colors: {
      background: "#0b0f19",
      surface: "#111827",
      surface2: "#1a2234",
      card: "#111827",
      foreground: "#e5e7eb",
      muted: "#9ca3af",
      border: "#1f2937",
    },
  },
  {
    key: "emerald",
    name: "Zumrad",
    premium: true,
    isDark: false,
    accent: "#059669",
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
    accent: "#ea580c",
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
    accent: "#8b5cf6",
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
    accent: "#b45309",
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
    accent: "#d4af37",
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
];

export function getTheme(key: string | null | undefined): MenuTheme {
  return MENU_THEMES.find((t) => t.key === key) ?? MENU_THEMES[0];
}

export const FREE_THEMES: ThemeKey[] = ["light", "dark"];
