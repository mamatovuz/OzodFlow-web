import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const BASE = process.env.NEXT_PUBLIC_APP_URL || "https://ozodflow.uz";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/login`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/register`, changeFrequency: "monthly", priority: 0.3 },
  ];

  // Faol restoranlarning ommaviy menyulari
  let menus: MetadataRoute.Sitemap = [];
  try {
    const restaurants = await prisma.restaurant.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    });
    menus = restaurants.map((r) => ({
      url: `${BASE}/m/${r.slug}`,
      lastModified: r.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));
  } catch {
    // baza tayyor bo'lmasa bo'sh
  }

  return [...staticPages, ...menus];
}
