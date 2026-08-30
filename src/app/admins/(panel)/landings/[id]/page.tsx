import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { hasPerm } from "@/lib/admin-perms";
import { prisma } from "@/lib/prisma";
import { LandingBuilder } from "@/components/admin/landing-builder";

export const dynamic = "force-dynamic";

export default async function AdminLandingEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") redirect("/admins/login");
  if (!hasPerm(user, "landings")) redirect("/admins");

  const { id } = await params;
  const page = await prisma.landingPage.findUnique({ where: { id } });
  if (!page) notFound();

  return (
    <LandingBuilder
      page={{
        id: page.id,
        slug: page.slug,
        title: page.title,
        blocks: page.blocks,
        isPublished: page.isPublished,
        views: page.views,
      }}
    />
  );
}
