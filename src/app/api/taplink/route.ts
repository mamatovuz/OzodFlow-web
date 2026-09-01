import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";
import { getOrCreateTaplink } from "@/lib/taplink-db";
import { LINK_TYPES, type LinkType } from "@/lib/taplink";

// Joriy restoranning taplinkini olish (yo'q bo'lsa yaratadi)
export async function GET() {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);
  const taplink = await getOrCreateTaplink(restaurant);
  return ok({ taplink });
}

// Taplinkni yangilash (profil, tugmalar, dizayn, vizitka)
export async function PATCH(req: NextRequest) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);
  const current = await getOrCreateTaplink(restaurant);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return fail("Noto'g'ri ma'lumot", 422);

  const data: Record<string, unknown> = {};

  if (typeof body.enabled === "boolean") data.enabled = body.enabled;
  if (typeof body.displayName === "string") data.displayName = body.displayName.slice(0, 80) || restaurant.name;
  if (typeof body.firstName === "string") data.firstName = body.firstName.slice(0, 60) || null;
  if (typeof body.lastName === "string") data.lastName = body.lastName.slice(0, 60) || null;
  if (typeof body.bio === "string") data.bio = body.bio.slice(0, 200) || null;
  if (typeof body.logo === "string") data.logo = body.logo || null;
  if (typeof body.videoUrl === "string") data.videoUrl = body.videoUrl || null;
  if (typeof body.showMenuButton === "boolean") data.showMenuButton = body.showMenuButton;

  // Tugmalar — validatsiya + tozalash
  if (Array.isArray(body.links)) {
    const clean = body.links
      .filter((l: unknown): l is Record<string, unknown> => !!l && typeof l === "object")
      .filter((l: Record<string, unknown>) => typeof l.type === "string" && (l.type as string) in LINK_TYPES)
      .slice(0, 30)
      .map((l: Record<string, unknown>, i: number) => ({
        id: String(l.id ?? `l${i}`),
        type: l.type as LinkType,
        label: String(l.label ?? "").slice(0, 40),
        value: String(l.value ?? "").slice(0, 300),
      }));
    data.links = JSON.stringify(clean);
  }

  // Dizayn / vizitka — JSON hajmi cheklovi
  if (body.design && typeof body.design === "object") {
    const json = JSON.stringify(body.design);
    if (json.length > 8000) return fail("Dizayn ma'lumoti juda katta", 422);
    data.design = json;
  }
  if (body.cardConfig && typeof body.cardConfig === "object") {
    const json = JSON.stringify(body.cardConfig);
    if (json.length > 4000) return fail("Vizitka ma'lumoti juda katta", 422);
    data.cardConfig = json;
  }

  const updated = await prisma.taplink.update({
    where: { id: current.id },
    data,
  });
  return ok({ taplink: updated });
}
