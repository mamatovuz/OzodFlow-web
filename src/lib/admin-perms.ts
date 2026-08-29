// ─────────────────────────────────────────────
// Admin panel ruxsatlari (RBAC).
//
// Bosh admin (isSuperAdmin) — hamma narsani qila oladi va qo'shimcha adminlarni
// boshqaradi. Qo'shimcha (sub) admin — faqat unga yoqilgan bo'limlarni ko'radi va
// o'zgartira oladi. Ruxsatlar User.adminPerms (JSON massiv) da saqlanadi.
// ─────────────────────────────────────────────

export type AdminPerm =
  | "analytics"
  | "payments"
  | "cards"
  | "plans"
  | "promos"
  | "domains"
  | "restaurants"
  | "partners"
  | "stats"
  | "messages";

// Har bir ruxsat: kaliti, nomi va qisqacha izohi (UI'da toggle uchun).
export const ADMIN_PERMS: { key: AdminPerm; label: string; desc: string }[] = [
  { key: "analytics", label: "Analitika", desc: "Daromad va statistikani ko'rish" },
  { key: "payments", label: "To'lovlar", desc: "To'lovlarni tasdiqlash/rad etish" },
  { key: "cards", label: "Kartalar", desc: "To'lov kartalarini boshqarish" },
  { key: "plans", label: "Tariflar", desc: "Tarif narxlarini o'zgartirish" },
  { key: "promos", label: "Promo kodlar", desc: "Promo kod yaratish/o'chirish" },
  { key: "domains", label: "Domenlar", desc: "Domen so'rovlarini boshqarish" },
  { key: "restaurants", label: "Restoranlar", desc: "Restoranlarni ko'rish/boshqarish" },
  { key: "partners", label: "Hamkorlar", desc: "Hamkorlarni boshqarish" },
  { key: "stats", label: "Ko'rsatkichlar", desc: "Umumiy ko'rsatkichlarni ko'rish" },
  { key: "messages", label: "Xabarlar", desc: "Qo'llab-quvvatlash xabarlari" },
];

export const ALL_PERM_KEYS: AdminPerm[] = ADMIN_PERMS.map((p) => p.key);

/** adminPerms JSON stringini xavfsiz massivga o'girish. */
export function parseAdminPerms(json: string | null | undefined): AdminPerm[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr.filter((k): k is AdminPerm => ALL_PERM_KEYS.includes(k as AdminPerm));
  } catch {
    return [];
  }
}

/** Faqat haqiqiy ruxsat kalitlarini qoldiradi (kiruvchini tozalash). */
export function sanitizePerms(input: unknown): AdminPerm[] {
  if (!Array.isArray(input)) return [];
  return Array.from(
    new Set(input.filter((k): k is AdminPerm => ALL_PERM_KEYS.includes(k as AdminPerm)))
  );
}

/** Foydalanuvchi (admin) shu ruxsatga egami? Super admin — har doim ha. */
export function hasPerm(
  u: { isSuperAdmin?: boolean; adminPerms?: string[] | null },
  perm: AdminPerm
): boolean {
  if (u.isSuperAdmin) return true;
  return (u.adminPerms || []).includes(perm);
}
