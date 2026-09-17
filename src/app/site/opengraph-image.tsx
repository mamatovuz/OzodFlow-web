import { ImageResponse } from "next/og";
import { getSiteSetting } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Ozodbek's Blog";

// Bosh sahifa ulashish rasmi (Telegram/Google). Admin ogImage yuklasa,
// u layout metadata orqali ustun bo'ladi.
export default async function OgImage() {
  const s = await getSiteSetting().catch(() => null);
  const title = s?.metaTitle || "Ozodbek's Blog";
  const desc = s?.metaDescription || "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 30, color: "#93c5fd", letterSpacing: 2, textTransform: "uppercase" }}>
          {s?.siteName || "Ozodbek's Blog"}
        </div>
        <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.1, marginTop: 24, maxWidth: 950 }}>
          {title}
        </div>
        {desc ? (
          <div style={{ fontSize: 34, color: "#cbd5e1", marginTop: 28, maxWidth: 900 }}>
            {desc.length > 120 ? desc.slice(0, 120) + "…" : desc}
          </div>
        ) : null}
      </div>
    ),
    { ...size }
  );
}
