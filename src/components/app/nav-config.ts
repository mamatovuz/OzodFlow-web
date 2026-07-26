import {
  Banknote,
  Briefcase,
  FileText,
  LayoutDashboard,
  Search,
  type LucideIcon,
} from "lucide-react";

import { UserRole } from "@/lib/enums";

/**
 * KABINET NAVIGATSIYASI
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  QOIDA: FAQAT MAVJUD SAHIFALAR
 *
 *  Bu ro'yxatga hali yozilmagan sahifa QO'SHILMAYDI. Ishlamaydigan havola
 *  foydalanuvchini 404 ga olib boradi va mahsulot buzuq degan taassurot
 *  qoldiradi — bo'lmagan bo'limdan ko'ra yomonroq.
 *
 *  Yangi sahifa yozilgach shu yerga qo'shiladi.
 *
 *  Rejalashtirilgan, LEKIN HALI YO'Q bo'lgani uchun kiritilmagan:
 *    • /messages          — chat
 *    • /settings          — profil va xavfsizlik sozlamalari
 *    • /favorites         — sevimli mutaxassislar
 *    • /calendar          — muddatlar kalendari
 *    • /wallet/invoices   — hisob-fakturalar
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Matnlar `messages/uz.json` dagi `appNav` bo'limidan olinadi — bu yerda
 * faqat kalit turadi.
 */

export type NavItem = {
  /** `messages` dagi kalit: appNav.<key> */
  key: string;
  href: string;
  icon: LucideIcon;
  /**
   * Yonida raqam ko'rsatiladigan bo'lim. Server tomonda hisoblanadi
   * (`lib/queries/nav-badges.ts`).
   */
  badge?: "unreadMessages" | "activeProjects" | "pendingProposals";
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
    ],
  },
  {
    key: "finance",
    items: [{ key: "wallet", href: "/wallet", icon: Banknote }],
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
    ],
  },
  {
    key: "finance",
    items: [{ key: "wallet", href: "/wallet", icon: Banknote }],
  },
];

/**
 * Rolga mos navigatsiyani qaytaradi.
 *
 * Admin uchun alohida qobiq bor (`/admin`), shuning uchun bu yerda admin
 * ham mijoz navigatsiyasini oladi — u admin panelga foydalanuvchi
 * menyusidan o'tadi.
 */
export function navForRole(role: string): NavGroup[] {
  return role === UserRole.DEVELOPER ? DEVELOPER_NAV : CUSTOMER_NAV;
}

/**
 * Hozirgi yo'l shu havolaga mos keladimi.
 *
 * Aniq moslik VA ichki yo'llar hisobga olinadi: `/wallet/invoices`
 * sahifasida `/wallet` ham faol ko'rinishi kerak. Lekin `/dashboard`
 * uchun faqat aniq moslik — aks holda u har doim faol bo'lib qolardi.
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
