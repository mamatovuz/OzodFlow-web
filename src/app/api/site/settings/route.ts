import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { isSiteAdmin, getSiteSetting } from "@/lib/site";

export const dynamic = "force-dynamic";

const linkSchema = z.object({
  id: z.string(),
  icon: z.string(),
  url: z.string().min(1),
  label: z.string().optional(),
});

const navSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  url: z.string().min(1),
  external: z.boolean().optional(),
});

const schema = z.object({
  heroTitle: z.string().max(60).optional(),
  heroRole: z.string().max(80).optional(),
  heroTagline: z.string().max(200).optional(),
  heroImage: z.string().optional(),
  profileImage: z.string().optional(),
  aboutHtml: z.string().optional(),
  channel: z.string().optional(),
  links: z.array(linkSchema).max(20).optional(),
  navButtons: z.array(navSchema).max(10).optional(),
  metaTitle: z.string().max(120).optional(),
  metaDescription: z.string().max(300).optional(),
  ogImage: z.string().optional().nullable(),
  favicon: z.string().optional().nullable(),
  siteName: z.string().max(60).optional(),
  tgBotToken: z.string().max(120).optional().nullable(),
  tgChannel: z.string().max(120).optional().nullable(),
});

export async function GET() {
  if (!(await isSiteAdmin())) return fail("Ruxsat yo'q", 401);
  const s = await getSiteSetting();
  return ok(s);
}

export async function PUT(req: NextRequest) {
  if (!(await isSiteAdmin())) return fail("Ruxsat yo'q", 401);
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Ma'lumot noto'g'ri", 422);

  await getSiteSetting(); // qator borligiga ishonch
  const { links, navButtons, ogImage, favicon, tgBotToken, tgChannel, ...rest } = parsed.data;
  const s = await prisma.siteSetting.update({
    where: { id: "main" },
    data: {
      ...rest,
      ...(links !== undefined ? { links: JSON.stringify(links) } : {}),
      ...(navButtons !== undefined ? { navButtons: JSON.stringify(navButtons) } : {}),
      ...(ogImage !== undefined ? { ogImage: ogImage || null } : {}),
      ...(favicon !== undefined ? { favicon: favicon || null } : {}),
      ...(tgBotToken !== undefined ? { tgBotToken: tgBotToken || null } : {}),
      ...(tgChannel !== undefined ? { tgChannel: tgChannel || null } : {}),
    },
  });
  return ok(s);
}
