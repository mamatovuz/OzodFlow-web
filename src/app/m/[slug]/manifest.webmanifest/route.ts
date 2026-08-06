import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Har bir restoran uchun alohida PWA manifest.
// Mijoz /m/<slug> menyusini "Bosh ekranga qo'shish" qilganda,
// telefonda aynan shu restoran nomi va logosi bilan ilova o'rnatiladi.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const restaurant = await prisma.restaurant
    .findUnique({
      where: { slug },
      select: { name: true, description: true, primaryColor: true, menuTheme: true },
    })
    .catch(() => null);

  if (!restaurant) {
    return new Response("Not found", { status: 404 });
  }

  const base = `/m/${slug}`;
  const theme = restaurant.primaryColor || "#2563EB";
  const bg = restaurant.menuTheme === "dark" ? "#0b0f19" : "#ffffff";

  const manifest = {
    id: base,
    name: restaurant.name,
    short_name:
      restaurant.name.length > 12
        ? restaurant.name.slice(0, 12)
        : restaurant.name,
    description:
      restaurant.description || `${restaurant.name} — elektron menyu`,
    lang: "uz",
    dir: "ltr",
    categories: ["food", "business"],
    start_url: `${base}?source=pwa`,
    scope: base,
    display: "standalone",
    orientation: "portrait",
    background_color: bg,
    theme_color: theme,
    icons: [
      {
        src: `${base}/app-icon?s=192`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${base}/app-icon?s=512`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${base}/app-icon?s=512`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };

  return new Response(JSON.stringify(manifest), {
    status: 200,
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
