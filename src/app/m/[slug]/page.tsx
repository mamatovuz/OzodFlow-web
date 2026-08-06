import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getMenuBySlug, resolveTable } from "@/lib/menu";
import { PublicMenu } from "@/components/public/public-menu";
import { BlockedMenu } from "@/components/public/blocked-menu";

export const dynamic = "force-dynamic";

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

  return (
    <PublicMenu
      restaurant={data.restaurant}
      categories={data.categories}
      products={data.products}
      theme={data.theme}
      table={table}
      banners={data.banners}
      gallery={data.gallery}
      combos={data.combos}
      serviceEnabled={data.serviceEnabled}
    />
  );
}
