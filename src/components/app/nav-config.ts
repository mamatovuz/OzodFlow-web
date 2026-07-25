import {
  Banknote,
  Briefcase,
  Calendar,
  FileText,
  Heart,
  LayoutDashboard,
  MessageSquare,
  Search,
  Settings,
  Star,
  Trophy,
  type LucideIcon,
} from "lucide-react";

import { UserRole } from "@/lib/enums";

/**
 * KABINET NAVIGATSIYASI
 *
 * Nega alohida konfiguratsiya fayli: navigatsiya uch joyda kerak bo'ladi —
 * yon panel (desktop), mobil menyu va tezkor qidiruv (⌘K). Uchtasida
 * qo'lda yozilsa vaqt o'tib ular bir-biriga mos kelmay qoladi.
 *
 * `messages/uz.json` dagi `appNav` bo'limi bilan bog'langan: bu yerda
 * faqat kalit turadi, matn tarjima faylida.
 */

export type NavItem = {
  /** `messages` dagi kalit: appNav.<key> */
  key: string;
  href: string;
  icon: LucideIcon;
  /**
   * Yonida raqam ko'rsatiladigan bo'lim (o'qilmagan xabarlar,
   * yangi takliflar). Server tomonda hisoblanadi.
   */
  badge?: "unreadMessages" | "activeProjects" | "pendingProposals";
  /** Ichki bo'limlar — ochilib turadigan guruh */
  children?: Array<{ key: string; href: string }>;
};

export type NavGroup = {
  /** Guruh sarlavhasi. `null` bo'lsa sarlavhasiz (birinchi guruh). */
  key: string | null;
  items: NavItem[];
};

/** Mijoz kabineti. */
const CUSTOMER_NAV: NavGroup[] = [
  {
    key: null,
    items: [
      { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
      {
        key: "myProjects",
        href: "/my-projects",
        icon: Briefcase,
        badge: "activeProjects",
      },
      { key: "messages", href: "/messages", icon: MessageSquare, badge: "unreadMessages" },
    ],
  },
  {
    key: "discover",
    items: [
      { key: "findDevelopers", href: "/developers", icon: Search },
      { key: "favorites", href: "/favorites", icon: Heart },
    ],
  },
  {
    key: "finance",
    items: [
      { key: "wallet", href: "/wallet", icon: Banknote },
      { key: "invoices", href: "/wallet/invoices", icon: FileText },
    ],
  },
  {
    key: "account",
    items: [{ key: "settings", href: "/settings", icon: Settings }],
  },
];

/** Developer kabineti. */
const DEVELOPER_NAV: NavGroup[] = [
  {
    key: null,
    items: [
      { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
      { key: "openProjects", href: "/projects", icon: Search },
      {
        key: "proposals",
        href: "/proposals",
        icon: FileText,
        badge: "pendingProposals",
      },
      {
        key: "myWork",
        href: "/my-projects",
        icon: Briefcase,
        badge: "activeProjects",
      },
      { key: "messages", href: "/messages", icon: MessageSquare, badge: "unreadMessages" },
    ],
  },
  {
    key: "profile",
    items: [
      { key: "portfolio", href: "/settings/portfolio", icon: Star },
      { key: "reviews", href: "/settings/reviews", icon: Star },
      { key: "achievements", href: "/settings/achievements", icon: Trophy },
    ],
  },
  {
    key: "finance",
    items: [{ key: "wallet", href: "/wallet", icon: Banknote }],
  },
  {
    key: "planning",
    items: [{ key: "calendar", href: "/calendar", icon: Calendar }],
  },
  {
    key: "account",
    items: [{ key: "settings", href: "/settings", icon: Settings }],
  },
];

/**
 * Rolga mos navigatsiyani qaytaradi.
 *
 * Admin uchun alohida qobiq bor (`/admin`), shuning uchun bu yerda admin
 * ham mijoz navigatsiyasini oladi — u admin panelga topbar orqali o'tadi.
 */
export function navForRole(role: string): NavGroup[] {
  return role === UserRole.DEVELOPER ? DEVELOPER_NAV : CUSTOMER_NAV;
}

/**
 * Hozirgi yo'l shu havolaga mos keladimi.
 *
 * Aniq moslik VA ichki yo'llar hisobga olinadi: `/wallet/invoices` sahifasida
 * `/wallet` ham faol ko'rinishi kerak. Lekin `/dashboard` uchun faqat aniq
 * moslik — aks holda u har doim faol bo'lib qolardi (barcha yo'llar `/`
 * bilan boshlanadi).
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
