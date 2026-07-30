import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getMenuBySlug, resolveTable } from "@/lib/menu";
import { PublicMenu } from "@/components/public/public-menu";

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
  return {
    title: `${restaurant.name} — Menyu`,
    description: restaurant.description || `${restaurant.name} elektron menyusi`,
    openGraph: {
      title: `${restaurant.name} — Menyu`,
      description: restaurant.description || "",
      images: restaurant.logo ? [restaurant.logo] : [],
    },
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

  const table = await resolveTable(data.restaurant.id, t);

  return (
    <PublicMenu
      restaurant={data.restaurant}
      categories={data.categories}
      products={data.products}
      theme={data.theme}
      table={table}
      banners={data.banners}
    />
  );
}
