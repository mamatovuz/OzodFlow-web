import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { isSiteAdmin } from "@/lib/site";

export const dynamic = "force-dynamic";

const schema = z.object({
  title: z.string().trim().min(1, "Nom kiriting").max(80),
  description: z.string().max(500).optional(),
  url: z.string().max(300).optional(),
  image: z.string().optional().nullable(),
  tags: z.array(z.string()).max(8).optional(),
});

// GET — ommaviy (portfolio sahifasi uchun)
export async function GET() {
  const projects = await prisma.siteProject.findMany({ orderBy: [{ sort: "asc" }, { createdAt: "desc" }] });
  return ok(projects);
}

export async function POST(req: NextRequest) {
  if (!(await isSiteAdmin())) return fail("Ruxsat yo'q", 401);
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Ma'lumot noto'g'ri", 422);
  const d = parsed.data;
  const count = await prisma.siteProject.count();
  const p = await prisma.siteProject.create({
    data: {
      title: d.title.trim(),
      description: d.description?.trim() || "",
      url: d.url?.trim() || "",
      image: d.image?.trim() || null,
      tags: JSON.stringify(d.tags || []),
      sort: count,
    },
  });
  return ok(p, 201);
}
