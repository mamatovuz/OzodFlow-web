import type { MetadataRoute } from "next";

import { SITE } from "@/lib/site";

/**
 * robots.txt
 *
 * Yopiladigan bo'limlar:
 *   • /admin, /dashboard, /wallet va h.k. — shaxsiy kabinet
 *   • /api — API endpointlar
 *   • /login, /register — auth sahifalari qidiruvda kerak emas
 *
 * DIQQAT: robots.txt kirishni TAQIQLAMAYDI, u faqat qidiruv botlariga
 * ko'rsatma. Haqiqiy himoya middleware va `requireUser` da.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/dashboard",
          "/wallet",
          "/my-projects",
          "/proposals",
          "/projects/new",
          "/settings",
          "/api/",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/403",
        ],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
