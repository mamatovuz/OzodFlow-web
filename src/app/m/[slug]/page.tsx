import { notFound } from "next/navigation";
import type { Metadata, Viewport } from "next";
import { prisma } from "@/lib/prisma";
import { getMenuBySlug, resolveTable } from "@/lib/menu";
import { PublicMenu } from "@/components/public/public-menu";
import { BlockedMenu } from "@/components/public/blocked-menu";
import { restaurantJsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

// Menyuda mijoz sahifani yaqin-uzoq (pinch/double-tap zoom) qila olmasin —
// menyu telefonda ilova kabi barqaror ko'rinsin. Faqat shu sahifaga tegishli.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { name: true, description: true, logo: true },
  });
  if (!restaurant) return { title: "Menyu topilmadi" };

  const title = `${restaurant.name} — Menyu`;
  const description =
    restaurant.description || `${restaurant.name} elektron menyusi`;

  // og:image va twitter:image avtomatik `opengraph-image.tsx` orqali qo'shiladi.
  // Bu yerda faqat favicon'ni restoran logosiga almashtiramiz — brauzer tabida
  // OzodFlow logosi emas, aynan shu restoranning logosi ko'rinadi.
  return {
    title,
    description,
    // Har restoran uchun alohida PWA manifest (nom + logo bilan o'rnatiladi)
    manifest: `/m/${slug}/manifest.webmanifest`,
    appleWebApp: { capable: true, title: restaurant.name },
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
    ...(restaurant.logo
      ? {
          icons: {
            icon: [{ url: restaurant.logo }],
            shortcut: [{ url: restaurant.logo }],
            apple: [{ url: restaurant.logo }],
          },
        }
      : {}),
  };
}

export default async function PublicMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { slug } = await params;
  const { t } = await searchParams;
  const data = await getMenuBySlug(slug);
  if (!data) notFound();

  if ("blocked" in data) {
    return <BlockedMenu name={data.restaurant.name} slug={data.restaurant.slug} />;
  }

  const table = await resolveTable(data.restaurant.id, t);

  const jsonLd = restaurantJsonLd(
    data.restaurant,
    data.categories,
    data.products
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicMenu
        restaurant={data.restaurant}
        categories={data.categories}
        products={data.products}
        theme={data.theme}
        table={table}
        banners={data.banners}
        gallery={data.gallery}
        combos={data.combos}
      />
    </>
  );
}
