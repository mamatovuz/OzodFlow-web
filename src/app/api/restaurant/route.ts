import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";
import { restaurantSchema } from "@/lib/validation";
import { getEffectivePlan } from "@/lib/plans";
import { getTheme, FREE_THEMES, parsePurchasedThemes, type ThemeKey } from "@/lib/themes";
import { isValidDesignConfigJson } from "@/lib/design";

export async function GET() {
  const { user, res } = await authGuard();
  if (!user) return res;

  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);
  return ok(restaurant);
}

export async function PATCH(req: NextRequest) {
  const { user, res } = await authGuard();
  if (!user) return res;

  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const body = await req.json().catch(() => null);
  const parsed = restaurantSchema.partial().safeParse(body);
  if (!parsed.success) {
    return fail("Ma'lumotlar noto'g'ri", 422, parsed.error.flatten().fieldErrors);
  }

  const data = { ...parsed.data };
  const access = getEffectivePlan(restaurant);

  // Premium tema: tarif ochsa (Business/Enterprise) yoki alohida sotib olingan bo'lsa
  if (data.menuTheme !== undefined) {
    const theme = getTheme(data.menuTheme);
    const isFree = FREE_THEMES.includes(theme.key as ThemeKey);
    const purchased = parsePurchasedThemes(restaurant.purchasedThemes);
    if (theme.premium && !access.canPremiumThemes && !purchased.includes(theme.key)) {
      return fail(
        "Bu premium dizayn hali sotib olinmagan",
        403
      );
    }
    if (!isFree && !theme.premium) {
      // noma'lum tema — light'ga qaytaramiz
      data.menuTheme = "light";
    }
  }

  // Dizaynni moslash (JSON) — hajm va format tekshiruvi
  if (data.designConfig !== undefined) {
    if (!isValidDesignConfigJson(data.designConfig)) {
      return fail("Dizayn sozlamalari noto'g'ri yoki juda katta", 422);
    }
  }

  // Custom domain endi barcha tariflarda ochiq (o'zi DNS orqali ulaydi — tekin).
  if (data.customDomain !== undefined) {
    const domain = (data.customDomain || "").trim().toLowerCase();
    if (domain) {
      // Oddiy validatsiya
      if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(domain)) {
        return fail("Domen noto'g'ri (masalan: menu.restoran.uz)", 422);
      }
      // Band emasligini tekshirish
      const taken = await prisma.restaurant.findFirst({
        where: { customDomain: domain, NOT: { id: restaurant.id } },
      });
      if (taken) return fail("Bu domen band", 409);
      data.customDomain = domain;
    } else {
      data.customDomain = null;
    }
  }

  const updated = await prisma.restaurant.update({
    where: { id: restaurant.id },
    data,
  });
  return ok(updated);
}
