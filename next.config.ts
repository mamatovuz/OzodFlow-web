import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

/**
 * Headers applied to every response. The Content-Security-Policy is deliberately
 * absent here — it needs a per-request nonce, so it is set in `src/middleware.ts`.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  /**
   * `standalone` — Docker image uchun o'zi yetarli server bundle'i
   * (node_modules'ning faqat kerakli qismi bilan, image ancha kichik).
   *
   * Lekin u FAQAT Docker build'da yoqiladi. Sababi: `next start` buyrug'i
   * `output: "standalone"` bilan ishlamaydi — Next ogohlantirish beradi va
   * statik fayllar to'g'ri joyda bo'lmaydi. Railway va lokal `npm start`
   * aynan `next start` ni ishlatadi.
   *
   * Docker'da esa `node server.js` ishga tushadi (Dockerfile'ga qarang),
   * shu sababli o'sha yerda `DOCKER_BUILD=1` qo'yiladi.
   */
  output: process.env.DOCKER_BUILD === "1" ? "standalone" : undefined,
  poweredByHeader: false,
  reactStrictMode: true,

  // Prisma ships a native query engine that must not be bundled.
  serverExternalPackages: ["@prisma/client", ".prisma/client"],

  // Tip xatosi bo'lsa build to'xtaydi — bu ataylab. Xato bilan production'ga
  // chiqib ketishdan ko'ra build yiqilgani yaxshi.
  typescript: {
    ignoreBuildErrors: false,
  },

  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Avatars pulled from GitHub during developer verification.
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
