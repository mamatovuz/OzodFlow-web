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
  price: number; // asosiy narx + tanlangan modifierlar summasi (bir dona uchun)
  qty: number;
  categoryName?: string | null; // oshxona bo'lim (stansiya) filtri uchun
  comment?: string | null; // taomga izoh (masalan "achchiqroq")
  done?: boolean; // oshxonada shu taom tayyor bo'ldimi (item-level KDS)
  modifiers?: SelectedModifier[]; // tanlangan variant/qo'shimchalar (chek/oshxona uchun)
};

// ─── Modifierlar (variant/qo'shimcha) ───
// Egasi menyuda har taomga guruh belgilaydi: Porsiya (Oddiy/Katta), Qo'shimcha (Non...).
export type ModifierOption = { name: string; price: number };
export type ModifierGroup = {
  name: string; // guruh nomi (masalan "Porsiya")
  required: boolean; // majburiy tanlov (kamida bittasi)
  multi: boolean; // bir nechta tanlanadimi (checkbox) yoki bitta (radio)
  options: ModifierOption[];
};
// Buyurtmada tanlangan modifier (denormalizatsiya — nom + narx saqlanadi)
export type SelectedModifier = { group: string; name: string; price: number };

// Product.modifiers (JSON) ni xavfsiz o'qish
export function parseModifiers(json: string | null | undefined): ModifierGroup[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((g) => g && typeof g.name === "string" && Array.isArray(g.options))
      .map((g) => ({
        name: String(g.name).slice(0, 60),
        required: !!g.required,
        multi: !!g.multi,
        options: (g.options as unknown[])
          .filter((o): o is ModifierOption =>
            !!o && typeof (o as ModifierOption).name === "string")
          .map((o) => ({ name: String(o.name).slice(0, 60), price: Number(o.price) || 0 }))
          .slice(0, 30),
      }))
      .filter((g) => g.options.length > 0)
      .slice(0, 12);
  } catch {
    return [];
  }
}

// Tanlangan modifierlarni mahsulot ta'rifiga solishtirib, narxni ishonchli
// (server tomonda) hisoblaydi. Client narx yubormaydi — faqat guruh+nom.
export function resolveModifiers(
  groups: ModifierGroup[],
  selected: { group: string; name: string }[] | undefined
): { modifiers: SelectedModifier[]; extra: number } {
  if (!selected || selected.length === 0) return { modifiers: [], extra: 0 };
  const out: SelectedModifier[] = [];
  let extra = 0;
  for (const sel of selected) {
    const g = groups.find((x) => x.name === sel.group);
    if (!g) continue;
    const opt = g.options.find((o) => o.name === sel.name);
    if (!opt) continue;
    out.push({ group: g.name, name: opt.name, price: opt.price });
    extra += opt.price;
  }
  return { modifiers: out, extra };
}
