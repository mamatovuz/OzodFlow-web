import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isReservedSlug } from "@/lib/reserved-slugs";
import { parseBlocks } from "@/lib/landing-blocks";
import { LandingRenderer } from "@/components/landing/landing-renderer";

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (isReservedSlug(slug)) return {};
  const page = await prisma.landingPage.findUnique({
    where: { slug },
    select: { title: true, isPublished: true },
  });
  if (!page || !page.isPublished) return { title: "Sahifa topilmadi" };
  return { title: page.title };
}

export default async function LandingSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // Tizim sahifalari bu yerga tushmaydi (Next statik route'larni birinchi hal
  // qiladi), lekin himoya uchun band slug'larni ham rad etamiz.
  if (isReservedSlug(slug)) notFound();

  const page = await prisma.landingPage.findUnique({ where: { slug } });
  if (!page || !page.isPublished) notFound();

  // Kirishlar hisoblagichini oshiramiz
  await prisma.landingPage
    .update({ where: { id: page.id }, data: { views: { increment: 1 } } })
    .catch(() => {});

  return <LandingRenderer slug={slug} blocks={parseBlocks(page.blocks)} />;
}
