import { prisma } from "@/lib/prisma";
import { packageNameFor } from "@/lib/mobile-app";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Digital Asset Links (/.well-known/assetlinks.json — next.config rewrite orqali).
// TWA ilova domen bilan bog'langanini tasdiqlaydi → Chrome manzil paneli
// (URL bar) ko'rinmaydi, ilova to'liq "native" ko'rinadi.
//
// Barcha ilovalar BITTA imzo kaliti bilan imzolanadi; o'sha kalitning SHA-256
// barmoq izi `ANDROID_CERT_SHA256` env'da (masalan: "AB:CD:...:12").
export async function GET() {
  const sha = (process.env.ANDROID_CERT_SHA256 || "").trim();

  // Kalit hali sozlanmagan bo'lsa — bo'sh (lekin to'g'ri) ro'yxat.
  if (!sha) {
    return json([]);
  }

  const restaurants = await prisma.restaurant
    .findMany({
      where: { isActive: true, isBlocked: false },
      select: { slug: true },
    })
    .catch(() => [] as { slug: string }[]);

  // Har restoran paketi uchun bittadan statement.
  const packages = Array.from(
    new Set(restaurants.map((r) => packageNameFor(r.slug)))
  );

  const statements = packages.map((pkg) => ({
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: pkg,
      sha256_cert_fingerprints: [sha],
    },
  }));

  return json(statements);
}

function json(body: unknown) {
  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
