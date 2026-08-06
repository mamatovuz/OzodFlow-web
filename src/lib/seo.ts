// SEO yordamchilari: sayt manzili, absolyut URL va restoran uchun JSON-LD
// (Google boy natijalari — Restaurant + Menu strukturasi).

export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://ozodflow.uz"
).replace(/\/+$/, "");

// Nisbiy manzilni (/media/..) absolyutga aylantiradi
export function absUrl(
  src: string | null | undefined,
  base: string = SITE_URL
): string | undefined {
  if (!src) return undefined;
  if (/^https?:\/\//.test(src)) return src;
  return base + (src.startsWith("/") ? src : "/" + src);
}

// Product.images — JSON massiv string; birinchi rasmni oladi
function firstImage(images: string | null | undefined): string | undefined {
  if (!images) return undefined;
  try {
    const arr = JSON.parse(images);
    if (Array.isArray(arr) && arr.length) return String(arr[0]);
  } catch {
    /* noto'g'ri JSON — e'tiborsiz */
  }
  return undefined;
}

type Restaurant = {
  name: string;
  slug: string;
  description?: string | null;
  logo?: string | null;
  cover?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  instagram?: string | null;
  telegram?: string | null;
  currency?: string | null;
  primaryColor?: string | null;
};
type Category = { id: string; name: string };
type Product = {
  categoryId: string;
  name: string;
  description?: string | null;
  images?: string | null;
  price: number;
};

// Restoran + menyu uchun schema.org JSON-LD obyekti
export function restaurantJsonLd(
  r: Restaurant,
  categories: Category[],
  products: Product[]
): Record<string, unknown> {
  const url = `${SITE_URL}/m/${r.slug}`;
  const currency = r.currency || "UZS";

  const images = [absUrl(r.cover), absUrl(r.logo)].filter(Boolean);

  const sameAs = [
    r.website,
    r.instagram &&
      (r.instagram.startsWith("http")
        ? r.instagram
        : `https://instagram.com/${r.instagram.replace(/^@/, "")}`),
    r.telegram &&
      (r.telegram.startsWith("http")
        ? r.telegram
        : `https://t.me/${r.telegram.replace(/^@/, "")}`),
  ].filter(Boolean) as string[];

  const prices = products.map((p) => p.price).filter((n) => n > 0);
  const priceRange = prices.length
    ? `${Math.min(...prices)}–${Math.max(...prices)} ${currency}`
    : undefined;

  const hasMenuSection = categories
    .map((c) => {
      const items = products
        .filter((p) => p.categoryId === c.id)
        .map((p) => ({
          "@type": "MenuItem",
          name: p.name,
          ...(p.description ? { description: p.description } : {}),
          ...(firstImage(p.images)
            ? { image: absUrl(firstImage(p.images)) }
            : {}),
          offers: {
            "@type": "Offer",
            price: p.price,
            priceCurrency: currency,
          },
        }));
      return items.length
        ? { "@type": "MenuSection", name: c.name, hasMenuItem: items }
        : null;
    })
    .filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": url,
    name: r.name,
    url,
    ...(r.description ? { description: r.description } : {}),
    ...(images.length ? { image: images } : {}),
    ...(r.phone ? { telephone: r.phone } : {}),
    ...(r.address
      ? {
          address: {
            "@type": "PostalAddress",
            addressLocality: r.address,
            addressCountry: "UZ",
          },
        }
      : {}),
    ...(sameAs.length ? { sameAs } : {}),
    ...(priceRange ? { priceRange } : {}),
    acceptsReservations: false,
    servesCuisine: "Restaurant",
    hasMenu: {
      "@type": "Menu",
      name: `${r.name} menyusi`,
      inLanguage: "uz",
      ...(hasMenuSection.length ? { hasMenuSection } : {}),
    },
  };
}
