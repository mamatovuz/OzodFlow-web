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
