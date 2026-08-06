import { prisma } from "@/lib/prisma";
import { fail, ok, route, readJson } from "@/lib/api";
import { getIgOwner } from "@/lib/instagram/access";
import { z } from "zod";

export const dynamic = "force-dynamic";

// ─── Media kutubxonasi (DM'da qayta ishlatish uchun) ───
export const GET = route(async () => {
  const acc = await getIgOwner();
  if (acc.error === "UNAUTHORIZED") return fail("Avtorizatsiya talab qilinadi", 401);
  if (acc.error === "FORBIDDEN") return fail("Ruxsat yo'q", 403);

  const items = await prisma.instagramMedia.findMany({
    where: { restaurantId: acc.restaurant.id },
    orderBy: { createdAt: "desc" },
  });
  return ok({ items });
});

const createSchema = z.object({
  kind: z.enum(["IMAGE", "VIDEO", "PDF"]).default("IMAGE"),
  url: z.string().url(),
  title: z.string().max(120).optional().nullable(),
});

export const POST = route(async (req) => {
  const acc = await getIgOwner();
  if (acc.error === "UNAUTHORIZED") return fail("Avtorizatsiya talab qilinadi", 401);
  if (acc.error === "FORBIDDEN") return fail("Ruxsat yo'q", 403);

  const input = await readJson(req, createSchema);
  const item = await prisma.instagramMedia.create({
    data: { restaurantId: acc.restaurant.id, kind: input.kind, url: input.url, title: input.title ?? null },
  });
  return ok({ item }, 201);
});

export const DELETE = route(async (req) => {
  const acc = await getIgOwner();
  if (acc.error === "UNAUTHORIZED") return fail("Avtorizatsiya talab qilinadi", 401);
  if (acc.error === "FORBIDDEN") return fail("Ruxsat yo'q", 403);

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return fail("id kerak", 400);
  await prisma.instagramMedia.deleteMany({ where: { id, restaurantId: acc.restaurant.id } });
  return ok({ removed: true });
});
