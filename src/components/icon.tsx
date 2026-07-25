import {
  Bot,
  Boxes,
  BrainCircuit,
  Briefcase,
  Brush,
  ChartNoAxesCombined,
  Code,
  Database,
  Figma,
  Film,
  Globe,
  LayoutGrid,
  Megaphone,
  PenLine,
  Search,
  Server,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { createElement } from "react";

/**
 * Ikonka nomidan komponentga xarita.
 *
 * Kategoriya va xizmatlarning ikonkasi databaseda MATN sifatida saqlanadi
 * ("Globe", "Bot"). Admin panelda ikonkani tanlash mumkin bo'lishi kerak,
 * lekin komponentni DB'ga yozib bo'lmaydi — shuning uchun bu xarita.
 *
 * Ro'yxatga kirmagan nom kelsa `Boxes` (neytral) qaytadi, sahifa yiqilmaydi.
 */
const ICONS = {
  Globe,
  Bot,
  Smartphone,
  LayoutGrid,
  Figma,
  Brush,
  PenLine,
  Search,
  Megaphone,
  Film,
  ShoppingCart,
  ShieldCheck,
  Server,
  Database,
  Code,
  Workflow,
  BrainCircuit,
  ChartNoAxesCombined,
  Briefcase,
  Sparkles,
  Boxes,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

/** Barcha mavjud ikonka nomlari — admin panelidagi tanlov ro'yxati uchun. */
export const ICON_NAMES = Object.keys(ICONS) as IconName[];

export function resolveIcon(name: string | null | undefined): LucideIcon {
  if (!name) return Boxes;
  return ICONS[name as IconName] ?? Boxes;
}

/**
 * Nomi bo'yicha ikonka chizadi.
 *
 * `createElement` ataylab ishlatilgan, JSX emas. Sabab: ikonkani katta
 * harfli o'zgaruvchiga olib (`const Component = resolveIcon(name)`) keyin
 * `<Component />` deb yozsak, React linteri buni "render paytida yangi
 * komponent yaratilgan" deb hisoblaydi (`react-hooks/static-components`).
 * Bu yerda komponent yaratilmaydi — xaritadan barqaror havola olinadi,
 * lekin linterga buni isbotlash imkoni yo'q. `createElement` bilan
 * niyat aniq ko'rinadi.
 */
export function Icon({
  name,
  className,
  strokeWidth = 1.75,
}: {
  name: string | null | undefined;
  className?: string;
  strokeWidth?: number;
}) {
  return createElement(resolveIcon(name), {
    className,
    strokeWidth,
    "aria-hidden": true,
  });
}
