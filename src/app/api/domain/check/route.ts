import { NextRequest } from "next/server";
import { authGuard, getUserRestaurant, ok, fail } from "@/lib/api";

export const dynamic = "force-dynamic";

// Domen "jonli" ulanganini tekshiradi: serverdan domenga so'rov yuborib,
// javob aynan shu restoran menyusi ekanini aniqlaydi. Foydalanuvchiga aniq
// holat qaytaramiz — DNS tarqalmagan / SSL yo'q / serverga qo'shilmagan / ulangan.
type Status = "connected" | "not_registered" | "no_ssl" | "dns" | "unknown";

async function probe(url: string, marker: string): Promise<{
  reachable: boolean;
  ours: boolean;
  status: number;
}> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 7000);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "user-agent": "OzodFlow-DomainCheck/1.0" },
      cache: "no-store",
    });
    const text = (await res.text()).toLowerCase();
    // Railway/boshqa proksi "topilmadi" javoblari — domen serverga qo'shilmagan
    const notFoundEdge =
      text.includes("application not found") ||
      text.includes("no application") ||
      text.includes("railwayapp") && res.status >= 400;
    const ours = res.ok && (text.includes(marker) || text.includes("ozodflow"));
    return { reachable: true, ours: ours && !notFoundEdge, status: res.status };
  } catch {
    return { reachable: false, ours: false, status: 0 };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(req: NextRequest) {
  const { user, res } = await authGuard();
  if (!user) return res;
  const restaurant = await getUserRestaurant(user.id);
  if (!restaurant) return fail("Restoran topilmadi", 404);

  const domain = (
    req.nextUrl.searchParams.get("domain") ||
    restaurant.customDomain ||
    ""
  )
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");

  if (!domain || !/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(domain)) {
    return fail("Domen noto'g'ri", 422);
  }

  // Menyu sahifasida restoran nomi bo'ladi — shuni belgi (marker) sifatida ishlatamiz
  const marker = restaurant.name.toLowerCase().slice(0, 24);

  const https = await probe(`https://${domain}`, marker);
  let status: Status = "unknown";

  if (https.ours) {
    status = "connected";
  } else if (https.reachable) {
    // Server javob berdi, lekin bizning menyu emas — domen shu servisga qo'shilmagan
    status = "not_registered";
  } else {
    // HTTPS ishlamadi — HTTP'ni sinab ko'ramiz (SSL yo'qmi yoki DNS yo'qmi ajratish uchun)
    const http = await probe(`http://${domain}`, marker);
    if (http.ours) status = "no_ssl";
    else if (http.reachable) status = "not_registered";
    else status = "dns";
  }

  return ok({ domain, status, saved: restaurant.customDomain === domain });
}
