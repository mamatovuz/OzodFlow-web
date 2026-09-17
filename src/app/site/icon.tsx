import { ImageResponse } from "next/og";
import { getSiteSetting } from "@/lib/site";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// Shaxsiy sayt uchun standart favicon — sayt nomining birinchi harfi (monogram).
// Admin paneldan favicon yuklansa, u ustun bo'ladi (layout metadata orqali).
export default async function Icon() {
  const s = await getSiteSetting().catch(() => null);
  const letter = (s?.siteName || "O").trim().charAt(0).toUpperCase() || "O";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#111827",
          color: "#fff",
          fontSize: 40,
          fontWeight: 700,
          borderRadius: 14,
        }}
      >
        {letter}
      </div>
    ),
    { ...size }
  );
}
