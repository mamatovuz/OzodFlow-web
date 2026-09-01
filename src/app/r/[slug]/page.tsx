import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ReviewForm } from "@/components/taplink/review-form";

export const dynamic = "force-dynamic";

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
  const r = await prisma.restaurant.findUnique({ where: { slug }, select: { name: true } });
  return { title: r ? `${r.name} — Izoh qoldiring` : "Izoh" };
}

export default async function ReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: {
      name: true,
      slug: true,
      logo: true,
      primaryColor: true,
      reviewEnabled: true,
      isBlocked: true,
    },
  });
  if (!restaurant || restaurant.isBlocked) notFound();

  return (
    <ReviewForm
      slug={restaurant.slug}
      name={restaurant.name}
      logo={restaurant.logo}
      accent={restaurant.primaryColor || "#2563EB"}
      enabled={restaurant.reviewEnabled}
    />
  );
}
