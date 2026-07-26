import type { MetadataRoute } from "next";

import { db } from "@/lib/db";
import { listPublicUsernames } from "@/lib/queries/developers";
import { SITE } from "@/lib/site";

/**
 * DINAMIK SITEMAP
 *
 * Statik `public/sitemap.xml` ISHLATILMAYDI: unda yangi developer
 * profillari va kategoriyalar bo'lmaydi, ya'ni Google ularni kech topadi
 * yoki umuman topmaydi.
 *
 * Bu yerda esa ro'yxat databasedan yig'iladi — yangi profil tasdiqlangan
 * zahoti sitemap'ga tushadi.
 *
 * Auth va kabinet sahifalari ATAYLAB yo'q: ular `robots: noindex` bilan
 * belgilangan va qidiruvda chiqmasligi kerak.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE.url, lastModified: now, changeFrequency: "daily", priority: 1 },
    {
      url: `${SITE.url}/services`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE.url}/developers`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE.url}/how-it-works`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE.url}/contact`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];

  try {
    const [categories, usernames] = await Promise.all([
      db.category.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
      }),
      listPublicUsernames(),
    ]);

    return [
      ...staticPages,

      ...categories.map((category) => ({
        url: `${SITE.url}/services/${category.slug}`,
        lastModified: category.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),

      ...usernames.map((username) => ({
        url: `${SITE.url}/dev/${username}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
    ];
  } catch (error) {
    // Database mavjud bo'lmasa (build vaqti) — hech bo'lmasa statik
    // sahifalar sitemap'ga tushsin.
    console.error("[sitemap] Dinamik qism yasalmadi:", error);
    return staticPages;
  }
}
