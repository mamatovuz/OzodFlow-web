// ─────────────────────────────────────────────
// Manager tasdig'i (server) — PIN tekshirish.
// Ofitsant limitdan oshgan chegirma yoki oshxonaga ketgan void qilmoqchi bo'lsa,
// manager o'z 4 xonali PIN'ini kiritadi. Bu yerda PIN restoran MANAGER'lariga
// (bcrypt hash) solishtiriladi.
// ─────────────────────────────────────────────
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

// PIN restorandagi biror MANAGER'ga tegishlimi? Ha bo'lsa — manager ismini
// qaytaradi (audit uchun), aks holda null.
export async function verifyManagerPin(
  restaurantId: string,
  pin: string | undefined | null
): Promise<string | null> {
  if (!pin || !/^\d{4}$/.test(pin)) return null;

  const managers = await prisma.membership.findMany({
    where: { restaurantId, role: "MANAGER", pin: { not: null } },
    select: { pin: true, user: { select: { name: true } } },
  });

  for (const m of managers) {
    if (m.pin && (await bcrypt.compare(pin, m.pin))) {
      return m.user?.name ?? "Manager";
    }
  }
  return null;
}

// 4 xonali PIN'ni hash qiladi (o'rnatishda)
export function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}
