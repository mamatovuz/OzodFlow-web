import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "OzodFlow — Elektron menyu",
    short_name: "OzodFlow",
    description: "Restoranlar uchun QR elektron menyu va buyurtma tizimi",
    lang: "uz",
    dir: "ltr",
    categories: ["food", "business", "productivity"],
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    orientation: "portrait",
    icons: [
      { src: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { src: "/web-app-manifest-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/favicon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/web-app-manifest-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/favicon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcuts: [
      {
        name: "Boshqaruv paneli",
        short_name: "Panel",
        description: "Restoran boshqaruv paneli",
        url: "/dashboard?source=pwa",
      },
      {
        name: "Buyurtmalar",
        short_name: "Buyurtmalar",
        description: "Yangi buyurtmalarni ko'rish",
        url: "/dashboard/orders?source=pwa",
      },
      {
        name: "Kirish",
        short_name: "Kirish",
        description: "Hisobga kirish",
        url: "/login?source=pwa",
      },
    ],
  };
}
