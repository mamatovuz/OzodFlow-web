// Xodim rollari va huquqlari

export type StaffRole = "MANAGER" | "OPERATOR" | "CASHIER" | "KITCHEN" | "WAITER";

export const STAFF_ROLES: {
  key: StaffRole;
  label: string;
  desc: string;
}[] = [
  { key: "MANAGER", label: "Menejer", desc: "Menyu va restoranni boshqaradi" },
  { key: "OPERATOR", label: "Operator", desc: "Buyurtmalarni qabul qiladi" },
  { key: "CASHIER", label: "Kassir", desc: "To'lov va buyurtmalar" },
  { key: "KITCHEN", label: "Oshxona", desc: "Faqat buyurtmalarni ko'radi" },
  { key: "WAITER", label: "Ofitsiant", desc: "Tayyor buyurtmalarni yetkazadi" },
];

export function staffRoleLabel(role: string) {
  return STAFF_ROLES.find((r) => r.key === role)?.label ?? role;
}

// MANAGER to'liq dashboardga kiradi, qolganlar /staff paneliga
export function isManager(role: string) {
  return role === "MANAGER";
}
