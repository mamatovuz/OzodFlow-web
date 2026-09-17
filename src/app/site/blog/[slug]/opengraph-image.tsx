import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { getSiteSetting } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Maqola";

// Har bir maqola uchun avtomatik ulashish rasmi (sarlavha + sayt nomi).
// Agar maqolada ogImage/coverImage bo'lsa — u generateMetadata orqali ustun bo'ladi.
export default async function PostOg({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post, s] = await Promise.all([
    prisma.sitePost.findUnique({ where: { slug } }).catch(() => null),
    getSiteSetting().catch(() => null),
  ]);
  const title = post?.title || "Maqola";
  const site = s?.siteName || "Ozodbek's Blog";
  const date = post?.publishDate
    ? new Date(post.publishDate).toLocaleDateString("uz", { day: "numeric", month: "long", year: "numeric" })
    : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 30, color: "#93c5fd", letterSpacing: 2, textTransform: "uppercase" }}>{site}</div>
        <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.12, maxWidth: 1040, display: "flex" }}>
          {title.length > 90 ? title.slice(0, 90) + "…" : title}
        </div>
        <div style={{ fontSize: 30, color: "#cbd5e1" }}>{date}</div>
      </div>
    ),
    { ...size }
  );
}
