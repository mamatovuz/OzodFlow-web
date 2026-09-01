import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isReservedSlug } from "@/lib/reserved-slugs";
import { parseBlocks } from "@/lib/landing-blocks";
import { LandingRenderer } from "@/components/landing/landing-renderer";
import { TaplinkView } from "@/components/taplink/taplink-view";
import { menuUrl } from "@/lib/urls";

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
  if (page && page.isPublished) return { title: page.title };

  // Landing bo'lmasa — taplink bo'lishi mumkin
  const taplink = await prisma.taplink.findUnique({
    where: { handle: slug },
    select: { displayName: true, bio: true, logo: true, enabled: true },
  });
  if (taplink && taplink.enabled) {
    return {
      title: taplink.displayName,
      description: taplink.bio || undefined,
      openGraph: {
        title: taplink.displayName,
        description: taplink.bio || undefined,
        images: taplink.logo ? [taplink.logo] : undefined,
      },
    };
  }
  return { title: "Sahifa topilmadi" };
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
  if (page && page.isPublished) {
    // Kirishlar hisoblagichini oshiramiz
    await prisma.landingPage
      .update({ where: { id: page.id }, data: { views: { increment: 1 } } })
      .catch(() => {});
    return <LandingRenderer slug={slug} blocks={parseBlocks(page.blocks)} />;
  }

  // Landing yo'q — taplinkni tekshiramiz
  const taplink = await prisma.taplink.findUnique({
    where: { handle: slug },
    include: {
      restaurant: { select: { slug: true, customDomain: true } },
    },
  });
  if (!taplink || !taplink.enabled) notFound();

  await prisma.taplink
    .update({ where: { id: taplink.id }, data: { views: { increment: 1 } } })
    .catch(() => {});

  return (
    <TaplinkView
      data={{
        displayName: taplink.displayName,
        firstName: taplink.firstName,
        lastName: taplink.lastName,
        bio: taplink.bio,
        logo: taplink.logo,
        videoUrl: taplink.videoUrl,
        links: taplink.links,
        design: taplink.design,
        showMenuButton: taplink.showMenuButton,
      }}
      menuUrl={menuUrl(taplink.restaurant.slug, taplink.restaurant.customDomain)}
    />
  );
}
