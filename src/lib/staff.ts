// Xodim rollari va huquqlari

// Faqat 2 ta operatsion rol: Oshxona (oshpaz) va Ofitsant.
// Kassa/to'lov ishlari restoran egasi panelida bo'ladi.
export type StaffRole = "MANAGER" | "KITCHEN" | "WAITER";

export const STAFF_ROLES: {
  key: StaffRole;
  label: string;
  desc: string;
}[] = [
  { key: "MANAGER", label: "Menejer", desc: "Menyu va restoranni boshqaradi" },
  { key: "KITCHEN", label: "Oshxona", desc: "Buyurtmalarni tayyorlaydi (oshpaz ekrani)" },
  { key: "WAITER", label: "Ofitsant", desc: "Stolga xizmat, buyurtma oladi va to'lovni yakunlaydi" },
];

export function staffRoleLabel(role: string) {
  return STAFF_ROLES.find((r) => r.key === role)?.label ?? role;
}

// MANAGER to'liq dashboardga kiradi, qolganlar /staff paneliga
export function isManager(role: string) {
  return role === "MANAGER";
}

// ─── Chegirma limitlari (rol bo'yicha, % da) ───
// Boshqa POS tizimlariga moslab: ofitsant kichik chegirma bera oladi, undan
// yuqorisi manager tasdig'i (PIN) bilan. Egasi kelajakda o'zgartira oladi.
export const DISCOUNT_LIMIT: Record<StaffRole, number> = {
  WAITER: 5,
  KITCHEN: 0,
  MANAGER: 25,
};

// Berilgan rol shu foizli chegirmani o'zi bera oladimi (tasdiqsiz)?
export function discountNeedsApproval(role: string, percent: number): boolean {
  const limit = DISCOUNT_LIMIT[role as StaffRole] ?? 0;
  return percent > limit + 0.0001; // suzuvchi xatolikka chidamli
}

// Void (bekor qilish) tasdiq talab qiladimi? Oshxonaga ketgan (NEW emas)
// buyurtmadan taom bekor qilish manager tasdig'ini talab qiladi.
export function voidNeedsApproval(orderStatus: string): boolean {
  return orderStatus !== "NEW";
}
