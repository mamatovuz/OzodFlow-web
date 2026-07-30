import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PublicMenu } from "@/components/public/public-menu";

export const dynamic = "force-dynamic";

async function getData(slug: string) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
  });
  if (!restaurant || !restaurant.isActive) return null;

  const categories = await prisma.category.findMany({
    where: { restaurantId: restaurant.id, isVisible: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });

  const products = await prisma.product.findMany({
    where: { restaurantId: restaurant.id, isVisible: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return { restaurant, categories, products };
}

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
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getData(slug);
  if (!data) notFound();

  return (
    <PublicMenu
      restaurant={data.restaurant}
      categories={data.categories}
      products={data.products}
    />
  );
}
