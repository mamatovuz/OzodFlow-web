// Buyurtma holatlari — label, rang, ketma-ketlik

export type OrderStatus =
  | "NEW"
  | "ACCEPTED"
  | "PREPARING"
  | "READY"
  | "DELIVERED"
  | "CANCELLED";

export const ORDER_STATUSES: {
  key: OrderStatus;
  label: string;
  // Tailwind rang klasslari (badge uchun)
  badge: string;
  dot: string;
}[] = [
  { key: "NEW", label: "Yangi", badge: "bg-accent-soft text-accent", dot: "bg-accent" },
  { key: "ACCEPTED", label: "Qabul qilindi", badge: "bg-warning/10 text-warning", dot: "bg-warning" },
  { key: "PREPARING", label: "Tayyorlanmoqda", badge: "bg-warning/10 text-warning", dot: "bg-warning" },
  { key: "READY", label: "Tayyor", badge: "bg-success/10 text-success", dot: "bg-success" },
  { key: "DELIVERED", label: "Yetkazildi", badge: "bg-surface-2 text-muted", dot: "bg-muted" },
  { key: "CANCELLED", label: "Bekor qilindi", badge: "bg-error/10 text-error", dot: "bg-error" },
];

export function statusMeta(status: string) {
  return ORDER_STATUSES.find((s) => s.key === status) ?? ORDER_STATUSES[0];
}

// Faol (yakunlanmagan) buyurtmalar
export const ACTIVE_STATUSES: OrderStatus[] = [
  "NEW",
  "ACCEPTED",
  "PREPARING",
  "READY",
];

export type OrderItem = {
  productId: string;
  name: string;
  price: number;
  qty: number;
};
