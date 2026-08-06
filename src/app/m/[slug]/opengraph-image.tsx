import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { UPLOAD_DIR } from "@/lib/uploads";

// Har bir restoran uchun ijtimoiy tarmoq (Telegram, WhatsApp, Facebook...)
// ulashuvida ko'rinadigan tavsif rasmi — banner + logo + nom.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const alt = "Restoran menyusi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Rasmni (logo/cover) satori uchun PNG data-URI'ga o'giramiz.
// WebP/GIF fayllarni ham sharp orqali PNG'ga aylantiramiz, aks holda
// OG generator ularni o'qiy olmaydi.
async function loadImage(src: string | null): Promise<string | null> {
  if (!src) return null;
  try {
    let input: Buffer;
    if (src.startsWith("/media/")) {
      input = await readFile(path.join(UPLOAD_DIR, path.basename(src)));
    } else if (/^https?:\/\//.test(src)) {
      const r = await fetch(src);
      if (!r.ok) return null;
      input = Buffer.from(await r.arrayBuffer());
    } else {
      return null;
    }
    const png = await sharp(input).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: {
      name: true,
      description: true,
      logo: true,
      cover: true,
      primaryColor: true,
    },
  });

  const name = restaurant?.name || "OzodFlow";
  const description = restaurant?.description || "Elektron menyu";
  const color = restaurant?.primaryColor || "#2563EB";

  const [cover, logo] = await Promise.all([
    loadImage(restaurant?.cover ?? null),
    loadImage(restaurant?.logo ?? null),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: `linear-gradient(135deg, ${color} 0%, #0b0f19 100%)`,
          fontFamily: "sans-serif",
        }}
      >
        {/* Banner — to'liq fon */}
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            width={1200}
            height={630}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : null}

        {/* Qoraytiruvchi qatlam — matn o'qilishi uchun */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.85) 100%)",
          }}
        />

        {/* Kontent */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            width: "100%",
            height: "100%",
            padding: 64,
            color: "#ffffff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                alt=""
                width={160}
                height={160}
                style={{
                  width: 160,
                  height: 160,
                  borderRadius: 32,
                  objectFit: "cover",
                  border: "4px solid rgba(255,255,255,0.9)",
                  boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
                }}
              />
            ) : null}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize: 68,
                  fontWeight: 800,
                  lineHeight: 1.05,
                  textShadow: "0 2px 20px rgba(0,0,0,0.6)",
                }}
              >
                {name}
              </div>
              {description ? (
                <div
                  style={{
                    fontSize: 32,
                    marginTop: 12,
                    opacity: 0.92,
                    maxWidth: 900,
                    overflow: "hidden",
                    textShadow: "0 2px 12px rgba(0,0,0,0.6)",
                  }}
                >
                  {description.length > 90
                    ? description.slice(0, 90) + "…"
                    : description}
                </div>
              ) : null}
            </div>
          </div>

          {/* Brend badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: 40,
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 22px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.14)",
                border: "1px solid rgba(255,255,255,0.25)",
                fontSize: 26,
                fontWeight: 600,
              }}
            >
              📱 QR menyu · OzodFlow
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
