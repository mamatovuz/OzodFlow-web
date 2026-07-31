import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OzodFlow — Elektron menyu",
    short_name: "OzodFlow",
    description: "Restoranlar uchun QR elektron menyu va buyurtma tizimi",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    orientation: "portrait",
    icons: [
      { src: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { src: "/favicon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/favicon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
