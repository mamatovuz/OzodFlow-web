import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { getSiteSetting, parseTags, readingTime } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Maqola";

// Har bir maqola uchun avtomatik, chiroyli ulashish rasmi (Telegram/X/Google).
// Agar maqolada ogImage/coverImage bo'lsa — u generateMetadata orqali ustun bo'ladi.
export default async function PostOg({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post, s] = await Promise.all([
    prisma.sitePost.findUnique({ where: { slug } }).catch(() => null),
    getSiteSetting().catch(() => null),
  ]);
  const title = post?.title || "Maqola";
  const site = s?.siteName || "Ozodbek's Blog";
  const tags = post ? parseTags(post.tags).slice(0, 3) : [];
  const mins = post ? readingTime(post.contentHtml) : 0;
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
          padding: "72px",
          background: "#0b1120",
          color: "#fff",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Dekorativ rangli halolar */}
        <div style={{ position: "absolute", top: -160, right: -120, width: 520, height: 520, borderRadius: 520, background: "radial-gradient(circle, rgba(99,102,241,0.55) 0%, rgba(99,102,241,0) 70%)", display: "flex" }} />
        <div style={{ position: "absolute", bottom: -200, left: -140, width: 540, height: 540, borderRadius: 540, background: "radial-gradient(circle, rgba(16,185,129,0.4) 0%, rgba(16,185,129,0) 70%)", display: "flex" }} />
        {/* Yuqori chiziq (aksent) */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 10, background: "linear-gradient(90deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)", display: "flex" }} />

        {/* Brend */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: "linear-gradient(135deg,#6366f1,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800 }}>
            {site.trim().charAt(0).toUpperCase() || "O"}
          </div>
          <div style={{ fontSize: 30, fontWeight: 600, color: "#e2e8f0" }}>{site}</div>
        </div>

        {/* Sarlavha */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {tags.length > 0 && (
            <div style={{ display: "flex", gap: 12 }}>
              {tags.map((t) => (
                <div key={t} style={{ display: "flex", fontSize: 24, color: "#c4b5fd", background: "rgba(139,92,246,0.16)", border: "1px solid rgba(139,92,246,0.4)", padding: "8px 20px", borderRadius: 999 }}>
                  {t}
                </div>
              ))}
            </div>
          )}
          <div style={{ fontSize: title.length > 60 ? 62 : 74, fontWeight: 800, lineHeight: 1.1, maxWidth: 1056, display: "flex", letterSpacing: -1 }}>
            {title.length > 100 ? title.slice(0, 100) + "…" : title}
          </div>
        </div>

        {/* Pastki qator */}
        <div style={{ display: "flex", alignItems: "center", gap: 24, fontSize: 28, color: "#94a3b8" }}>
          {date && <div style={{ display: "flex" }}>{date}</div>}
          {mins > 0 && <div style={{ display: "flex" }}>·</div>}
          {mins > 0 && <div style={{ display: "flex" }}>{mins} daqiqalik o&apos;qish</div>}
        </div>
      </div>
    ),
    { ...size }
  );
}
