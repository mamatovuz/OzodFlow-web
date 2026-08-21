"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Phone,
  MapPin,
  Clock,
  Instagram,
  Send,
  Flame,
  Leaf,
  X,
  UtensilsCrossed,
  Star,
  Plus,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { formatPrice, parseJson } from "@/lib/utils";
import type { MenuTheme } from "@/lib/themes";
import { categoryStyleFor, headerStyleFor, menuStyleFor } from "@/lib/themes";
import { resolveDesign, backgroundCss, shadowCss, youtubeEmbed, heroMediaType } from "@/lib/design";
import { loc, LANGS, UI, type Lang } from "@/lib/i18n";
import {
  CheckoutModal,
  QtyControl,
  type CartLine,
} from "@/components/public/order-cart";
import { OrderTracker } from "@/components/public/service-bar";

type PublicProduct = {
  id: string;
  categoryId: string;
  name: string;
  nameRu: string | null;
  nameEn: string | null;
  description: string | null;
  descriptionRu: string | null;
  descriptionEn: string | null;
  images: string | null;
  price: number;
  oldPrice: number | null;
  weight: string | null;
  calories: number | null;
  ingredients: string | null;
  spicyLevel: number;
  isVegetarian: boolean;
  isHalal: boolean;
  isNew: boolean;
  isBestseller: boolean;
  isRecommended: boolean;
  isAvailable: boolean;
};

type PublicCategory = { id: string; name: string; nameRu: string | null; nameEn: string | null; image: string | null };
type PublicBanner = {
  id: string;
  image: string | null;
  title: string | null;
  subtitle: string | null;
  linkUrl: string | null;
};
type PublicGallery = { id: string; image: string; caption: string | null; category: string };
type PublicCombo = {
  id: string;
  name: string;
  price: number;
  oldPrice: number | null;
  image: string | null;
  description: string | null;
  items: string;
};

type PublicRestaurant = {
  slug: string;
  name: string;
  description: string | null;
  descriptionRu: string | null;
  descriptionEn: string | null;
  logo: string | null;
  cover: string | null;
  phone: string | null;
  telegram: string | null;
  instagram: string | null;
  mapUrl: string | null;
  address: string | null;
  workHours: string | null;
  currency: string;
  primaryColor: string;
  hasDelivery: boolean;
  designConfig?: string | null;
  waiterCodeEnabled?: boolean;
};

const filters = [
  { key: "all", label: "Barchasi" },
  { key: "bestseller", label: "🔥 Xit" },
  { key: "new", label: "🆕 Yangi" },
  { key: "vegetarian", label: "🥬 Vegetarian" },
];

export function PublicMenu({
  restaurant,
  categories: rawCategories,
  products: rawProducts,
  theme,
  table,
  banners,
  gallery = [],
  combos = [],
}: {
  restaurant: PublicRestaurant;
  categories: PublicCategory[];
  products: PublicProduct[];
  theme: MenuTheme;
  table: { code: string; name: string } | null;
  banners: PublicBanner[];
  gallery?: PublicGallery[];
  combos?: PublicCombo[];
}) {
  const [lang, setLang] = useState<Lang>("uz");
  // Ochilgan (ichiga kirilgan) kategoriya. null bo'lsa — barcha kategoriyalar
  // grid ko'rinishida ko'rinadi.
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  // Split (chap-o'ng) layout uchun tanlangan kategoriya
  const [splitCat, setSplitCat] = useState<string | null>(null);
  // Tabs (tepa tab) layout uchun tanlangan kategoriya
  const [tabsCat, setTabsCat] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [detail, setDetail] = useState<PublicProduct | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [trackedOrder, setTrackedOrder] = useState<string | null>(null);
  const menuTopRef = useRef<HTMLDivElement | null>(null);

  const t = UI[lang];

  useEffect(() => {
    const saved = localStorage.getItem("ozf_lang") as Lang | null;
    if (saved && ["uz", "ru", "en"].includes(saved)) setLang(saved);
  }, []);
  function changeLang(l: Lang) {
    setLang(l);
    localStorage.setItem("ozf_lang", l);
  }

  // Tilga moslash
  const categories = useMemo(
    () => rawCategories.map((c) => ({ ...c, name: loc(c.name, c.nameRu, c.nameEn, lang) })),
    [rawCategories, lang]
  );
  const products = useMemo(
    () =>
      rawProducts.map((p) => ({
        ...p,
        name: loc(p.name, p.nameRu, p.nameEn, lang),
        description: loc(p.description, p.descriptionRu, p.descriptionEn, lang),
      })),
    [rawProducts, lang]
  );
  const restaurantDesc = loc(
    restaurant.description,
    restaurant.descriptionRu,
    restaurant.descriptionEn,
    lang
  );

  // ─── Restoran moslagan dizayn (ranglar, fon, hero, radius) ───
  const design = useMemo(
    () => resolveDesign(theme, restaurant.designConfig),
    [theme, restaurant.designConfig]
  );
  const dc = design.colors;

  const accent = dc.accent || restaurant.primaryColor || "#2563EB";
  const accentText = dc.accentText || "#ffffff";
  const R = design.radius;
  const catStyle = categoryStyleFor(theme.key);
  const headerStyle = headerStyleFor(theme.key);
  const menuStyle = menuStyleFor(theme.key);
  const isSplit = menuStyle === "split";
  const isTabs = menuStyle === "tabs";
  const cardShadow = shadowCss(design.card.shadow, theme.isDark);

  // Menyu foni (standart / rang / rasm / gradient + overlay)
  const pageBg = backgroundCss(design.background, dc.background);
  const bgOverlay =
    (design.background.type === "image" || design.background.type === "gradient") &&
    design.background.overlay > 0
      ? design.background.overlay / 100
      : 0;

  // Bosh sahifa (intro) — FAQAT Klassik (split) dizaynда, yoqilgan va media bo'lsa
  const heroMedia = design.hero.media;
  const canReturnHome = isSplit && design.hero.enabled && heroMedia.length > 0;
  const [showIntro, setShowIntro] = useState(canReturnHome);

  // Bosh sahifa (intro) ochiq bo'lsa — orqadagi sahifa skroll bo'lmasin
  useEffect(() => {
    if (!showIntro) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showIntro]);

  const themeStyle: React.CSSProperties = {
    ["--accent" as string]: accent,
    ["--background" as string]: dc.background,
    ["--surface" as string]: dc.surface,
    ["--surface-2" as string]: dc.surface2,
    ["--card" as string]: dc.card,
    ["--foreground" as string]: dc.foreground,
    ["--muted" as string]: dc.muted,
    ["--border" as string]: dc.border,
    ["--accent-soft" as string]: theme.isDark ? "#ffffff14" : "#0000000d",
    ["--card-shadow" as string]: cardShadow,
  };

  function addToCart(id: string, qty = 1) {
    setCart((c) => ({ ...c, [id]: (c[id] || 0) + qty }));
  }
  function addCombo(combo: PublicCombo) {
    const items = parseJson<{ productId: string; qty: number }[]>(combo.items, []);
    setCart((c) => {
      const n = { ...c };
      for (const it of items) n[it.productId] = (n[it.productId] || 0) + (it.qty || 1);
      return n;
    });
  }
  function setQty(id: string, qty: number) {
    setCart((c) => {
      const n = { ...c };
      if (qty <= 0) delete n[id];
      else n[id] = qty;
      return n;
    });
  }
  const cartLines: CartLine[] = products
    .filter((p) => cart[p.id])
    .map((p) => ({
      productId: p.id,
      name: p.name,
      price: p.price,
      qty: cart[p.id],
      image: parseJson<string[]>(p.images, [])[0],
    }));
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = cartLines.reduce((s, l) => s + l.price * l.qty, 0);

  useEffect(() => {
    let vid = localStorage.getItem("ozf_vid");
    if (!vid) {
      vid = crypto.randomUUID();
      localStorage.setItem("ozf_vid", vid);
    }
    const params = new URLSearchParams(window.location.search);
    fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: restaurant.slug,
        visitorId: vid,
        tableCode: params.get("t") || undefined,
      }),
    }).catch(() => {});

    // Kuzatilayotgan buyurtma (localStorage)
    const savedOrder = localStorage.getItem(`ozf_order_${restaurant.slug}`);
    if (savedOrder) setTrackedOrder(savedOrder);

    // Live counter uchun heartbeat
    const beat = () =>
      fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: restaurant.slug, visitorId: vid }),
      }).catch(() => {});
    beat();
    const iv = setInterval(beat, 20000);
    return () => clearInterval(iv);
  }, [restaurant.slug]);

  function onOrdered(id: string) {
    setTrackedOrder(id);
    localStorage.setItem(`ozf_order_${restaurant.slug}`, id);
  }
  function clearTracked() {
    setTrackedOrder(null);
    localStorage.removeItem(`ozf_order_${restaurant.slug}`);
  }

  function openDetail(p: PublicProduct) {
    setDetail(p);
    fetch(`/api/products/${p.id}/view`, { method: "POST" }).catch(() => {});
  }

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (search) return p.name.toLowerCase().includes(search.toLowerCase());
      if (filter === "bestseller" && !p.isBestseller) return false;
      if (filter === "new" && !p.isNew) return false;
      if (filter === "vegetarian" && !p.isVegetarian) return false;
      return true;
    });
  }, [products, search, filter]);

  const grouped = useMemo(() => {
    return categories
      .map((c) => ({ category: c, items: filtered.filter((p) => p.categoryId === c.id) }))
      .filter((g) => g.items.length > 0);
  }, [categories, filtered]);

  const recommended = useMemo(
    () => products.filter((p) => p.isRecommended && p.isAvailable).slice(0, 10),
    [products]
  );

  // Kategoriyaga kirish / orqaga qaytish.
  function enterCat(id: string) {
    setSelectedCat(id);
    window.setTimeout(() => {
      menuTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 30);
  }
  function exitCat() {
    setSelectedCat(null);
    window.setTimeout(() => {
      menuTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 30);
  }

  // Mahsulotlarni tema layoutiga qarab chizadi.
  // gridClass — ixtiyoriy ustun sinfi (split layout o'ng tomonini responsive qiladi).
  function renderItems(list: PublicProduct[], gridClass = "grid-cols-2") {
    return theme.layout === "grid" ? (
      <div className={`grid ${gridClass} gap-3`}>
        {list.map((p) => (
          <GridCard
            key={p.id}
            product={p}
            {...cardProps}
            qty={cart[p.id] || 0}
            onOpen={() => openDetail(p)}
            onAdd={() => addToCart(p.id)}
            onSetQty={(q) => setQty(p.id, q)}
          />
        ))}
      </div>
    ) : (
      <div className="space-y-3">
        {list.map((p) => (
          <ListCard
            key={p.id}
            product={p}
            {...cardProps}
            qty={cart[p.id] || 0}
            onOpen={() => openDetail(p)}
            onAdd={() => addToCart(p.id)}
            onSetQty={(q) => setQty(p.id, q)}
          />
        ))}
      </div>
    );
  }

  const searching = !!search || filter !== "all";
  const currentGroup = grouped.find((g) => g.category.id === selectedCat) ?? null;
  const showBrowse = !searching && !selectedCat;

  const cardProps = { currency: restaurant.currency, accent, accentText, radius: R };

  return (
    <div
      className="relative min-h-screen bg-background pb-28"
      style={{
        ...themeStyle,
        backgroundColor: pageBg.backgroundColor,
        backgroundImage: pageBg.backgroundImage,
        backgroundSize: pageBg.backgroundImage ? "cover" : undefined,
        backgroundPosition: "center",
        backgroundAttachment: pageBg.backgroundImage ? "fixed" : undefined,
      }}
    >
      {/* Fon rasmi/gradient ustidagi qoraytirish (overlay) */}
      {bgOverlay > 0 && (
        <div
          className="pointer-events-none fixed inset-0 z-0"
          style={{ background: `rgba(0,0,0,${bgOverlay})` }}
        />
      )}

      {/* ─── Bosh sahifa (intro) — QR ochilganda birinchi ekran ─── */}
      {showIntro && (
        <HeroIntro
          media={heroMedia}
          autoplay={design.hero.autoplay}
          ctaText={design.hero.ctaText}
          restaurant={restaurant}
          desc={restaurantDesc}
          accent={accent}
          accentText={accentText}
          background={dc.background}
          foreground={dc.foreground}
          muted={dc.muted}
          card={dc.card}
          radius={R}
          onEnter={() => setShowIntro(false)}
        />
      )}

      {/* menyu tarkibi overlay ustida bo'lishi uchun */}
      <div className="relative z-[1]">
      {/* ─── SPLIT (Klassik) uchun ixcham tepa bar: orqaga + til + savat ─── */}
      {isSplit && (
        <div
          className="sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-border px-3 py-2.5 backdrop-blur"
          style={{ background: `color-mix(in srgb, ${dc.background} 92%, transparent)` }}
        >
          <div className="flex items-center gap-2">
            {canReturnHome && (
              <button
                onClick={() => setShowIntro(true)}
                aria-label={t.back}
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ background: accent, color: accentText }}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {restaurant.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={restaurant.logo} alt="" className="h-8 w-8 rounded-lg object-cover" />
            ) : null}
            <span className="max-w-[38vw] truncate text-sm font-semibold text-foreground">
              {restaurant.name}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex gap-0.5 rounded-full border border-border p-0.5">
              {LANGS.map((l) => (
                <button
                  key={l.key}
                  onClick={() => changeLang(l.key)}
                  className="rounded-full px-2 py-0.5 text-xs font-medium transition-colors"
                  style={lang === l.key ? { background: accent, color: accentText } : { color: dc.muted }}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCartOpen(true)}
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground"
            >
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span
                  className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold"
                  style={{ background: accent, color: accentText }}
                >
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ─── Cover banner (split'da ko'rsatilmaydi) ─── */}
      {!isSplit && (
      <div className="relative h-48 w-full overflow-hidden sm:h-64">
        {restaurant.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={restaurant.cover} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: `linear-gradient(135deg, ${accent}, ${theme.colors.foreground})` }}
          />
        )}
        {/* Pastga qarab qorayadigan gradient — karta bilan yumshoq ajralish uchun */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-background/95" />
        {/* Til almashtirish */}
        <div className="absolute left-4 top-4 flex gap-1 rounded-full bg-black/40 p-1 backdrop-blur">
          {LANGS.map((l) => (
            <button
              key={l.key}
              onClick={() => changeLang(l.key)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                lang === l.key ? "bg-white text-black" : "text-white/80"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        {/* Cart icon */}
        <button
          onClick={() => setCartOpen(true)}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white shadow-md backdrop-blur transition-colors hover:bg-black/55"
        >
          <ShoppingBag className="h-5 w-5" />
          {cartCount > 0 && (
            <span
              className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold"
              style={{ background: accent, color: accentText }}
            >
              {cartCount}
            </span>
          )}
        </button>
      </div>
      )}

      <div className={isSplit ? "mx-auto max-w-6xl pl-2 pr-3 sm:pl-3 sm:pr-5" : "mx-auto max-w-2xl px-4"}>
        {/* ─── Restoran profili (split'da ko'rsatilmaydi) ─── */}
        {!isSplit && (
          <ProfileHeader
            restaurant={restaurant}
            desc={restaurantDesc}
            productCount={products.length}
            accent={accent}
            accentText={accentText}
            radius={R}
            variant={headerStyle}
          />
        )}

        {/* ─── Stol bar ─── */}
        {table && (
          <div
            className="mt-3 flex items-center gap-2 px-4 py-2.5 text-sm font-semibold"
            style={{ background: accent, color: accentText, borderRadius: R }}
          >
            <UtensilsCrossed className="h-4 w-4" />
            {t.you}: {table.name}
          </div>
        )}

        {/* ─── Banner slider (split'da ko'rsatilmaydi) ─── */}
        {!isSplit && banners.length > 0 && (
          <div className="mt-5">
            <BannerSlider banners={banners} accent={accent} accentText={accentText} radius={R} />
          </div>
        )}

        {/* ─── Search + kategoriya chips (sticky) — split'da yashirin ─── */}
        {!isSplit && (
        <div className="sticky top-0 z-30 -mx-4 mt-4 bg-background/95 px-4 py-3 backdrop-blur">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.search}
              className="h-12 w-full border border-border bg-card pl-10 pr-4 text-sm text-foreground outline-none transition-colors focus:border-accent"
              style={{ borderRadius: R }}
            />
          </div>

          {!search && !selectedCat && !isTabs && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className="shrink-0 border px-3.5 py-1.5 text-xs font-medium transition-colors"
                  style={
                    filter === f.key
                      ? { background: accent, color: accentText, borderColor: accent, borderRadius: 999 }
                      : { borderRadius: 999 }
                  }
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
        )}

        {/* ─── Combo takliflar ─── */}
        {showBrowse && !isSplit && combos.length > 0 && (
          <div className="mt-4">
            <h2 className="mb-3 text-lg font-bold text-foreground">Combo takliflar</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {combos.map((c) => {
                const items = parseJson<{ name: string; qty: number }[]>(c.items, []);
                return (
                  <div
                    key={c.id}
                    className="flex flex-col overflow-hidden border border-border bg-card shadow-soft"
                    style={{ borderRadius: R }}
                  >
                    <div className="relative aspect-video w-full overflow-hidden bg-surface-2">
                      {c.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.image} alt={c.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted/40">
                          <UtensilsCrossed className="h-8 w-8" />
                        </div>
                      )}
                      <span
                        className="absolute left-2 top-2 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                        style={{ background: accent, color: accentText }}
                      >
                        COMBO
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-3">
                      <h3 className="font-semibold text-foreground">{c.name}</h3>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                        {items.map((it) => `${it.qty}× ${it.name}`).join(", ")}
                      </p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="font-bold text-foreground">{formatPrice(c.price, restaurant.currency)}</span>
                        {c.oldPrice && (
                          <span className="text-xs text-muted line-through">
                            {formatPrice(c.oldPrice, restaurant.currency)}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => addCombo(c)}
                        className="mt-2.5 flex items-center justify-center gap-1 rounded-lg py-2 text-sm font-medium"
                        style={{ background: accent, color: accentText, borderRadius: R - 6 }}
                      >
                        <Plus className="h-4 w-4" /> Savatga
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Tavsiya etamiz ─── */}
        {showBrowse && !isSplit && recommended.length > 0 && (
          <div className="mt-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">{t.recommended}</h2>
            </div>
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
              {recommended.map((p) => (
                <RecommendCard
                  key={p.id}
                  product={p}
                  {...cardProps}
                  qty={cart[p.id] || 0}
                  onOpen={() => openDetail(p)}
                  onAdd={() => addToCart(p.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ─── Menyu: qidiruv / kategoriya grid / kategoriya ichi ─── */}
        <div ref={menuTopRef} className="mt-6 scroll-mt-4">
          {grouped.length === 0 && (
            <div className="flex flex-col items-center py-16 text-center">
              <UtensilsCrossed className="h-10 w-10 text-muted/40" />
              <p className="mt-3 text-sm text-muted">{t.empty}</p>
            </div>
          )}

          {/* Qidiruv yoki filtr — barcha mos mahsulotlar bo'limlar bo'yicha */}
          {searching &&
            grouped.map((g) => (
              <div key={g.category.id} className="mb-8">
                <h2 className="mb-3 text-lg font-bold text-foreground">{g.category.name}</h2>
                {renderItems(g.items)}
              </div>
            ))}

          {/* ─── SPLIT layout: chapda kategoriyalar, o'ngda mahsulotlar ─── */}
          {!searching && isSplit && grouped.length > 0 && (
            <SplitMenu
              groups={grouped}
              activeId={splitCat ?? grouped[0].category.id}
              onSelect={setSplitCat}
              renderItems={renderItems}
              accent={accent}
              accentText={accentText}
              radius={R}
            />
          )}

          {/* ─── TABS layout: tepada kategoriya tablari, bitta kategoriya mahsulotlari ─── */}
          {!searching && isTabs && grouped.length > 0 && (
            <TabsMenu
              groups={grouped}
              activeId={tabsCat ?? grouped[0].category.id}
              onSelect={setTabsCat}
              renderItems={renderItems}
              accent={accent}
              accentText={accentText}
              radius={R}
            />
          )}

          {/* Kategoriya ichi: orqaga tugma + shu kategoriya mahsulotlari */}
          {!searching && !isSplit && !isTabs && currentGroup && (
            <div className="animate-fade-up">
              <button
                onClick={exitCat}
                className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-foreground"
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ background: "var(--surface-2)" }}
                >
                  <ChevronLeft className="h-5 w-5" />
                </span>
                {t.back}
              </button>
              <CategoryHero
                name={currentGroup.category.name}
                image={currentGroup.category.image}
                count={currentGroup.items.length}
                accent={accent}
                radius={R}
                label={t.items}
              />
              <div className="mt-4">{renderItems(currentGroup.items)}</div>
            </div>
          )}

          {/* Barcha kategoriyalar — shablonga qarab (banner / grid / list) */}
          {showBrowse && !isSplit && !isTabs && (
            <div className={catStyle === "grid" ? "grid grid-cols-2 gap-3" : "space-y-3"}>
              {grouped.map((g) => (
                <CategoryCard
                  key={g.category.id}
                  variant={catStyle}
                  name={g.category.name}
                  image={g.category.image}
                  count={g.items.length}
                  onClick={() => enterCat(g.category.id)}
                  accent={accent}
                  accentText={accentText}
                  radius={R}
                  label={t.items}
                />
              ))}
            </div>
          )}
        </div>

        {/* Galereya */}
        {gallery.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-3 text-lg font-bold text-foreground">{t.gallery}</h2>
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
              {gallery.map((g) => (
                <div
                  key={g.id}
                  className="relative h-40 w-56 shrink-0 overflow-hidden"
                  style={{ borderRadius: R }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.image} alt={g.caption || ""} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  {g.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <p className="text-xs font-medium text-white">{g.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 flex justify-center gap-3">
          {restaurant.telegram && (
            <SocialBtn href={`https://t.me/${restaurant.telegram.replace("@", "")}`} icon={Send} radius={R} />
          )}
          {restaurant.instagram && (
            <SocialBtn href={`https://instagram.com/${restaurant.instagram.replace("@", "")}`} icon={Instagram} radius={R} />
          )}
          {restaurant.phone && <SocialBtn href={`tel:${restaurant.phone}`} icon={Phone} radius={R} />}
        </div>
        <a
          href="https://ozodflow.uz"
          target="_blank"
          rel="noreferrer"
          className="mt-6 block text-center text-xs text-muted transition-colors hover:text-accent"
        >
          OzodFlow bilan yaratilgan
        </a>
      </div>
      </div>
      {/* /menyu tarkibi (z-[1]) */}

      {/* ─── Pastki savat bar ─── */}
      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4">
          <button
            onClick={() => setCartOpen(true)}
            className="mx-auto flex w-full max-w-2xl items-center justify-between px-5 py-3.5 shadow-card transition-transform active:scale-[0.99]"
            style={{ background: accent, color: accentText, borderRadius: R }}
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              <span className="text-sm font-medium">
                {cartCount} · {formatPrice(cartTotal, restaurant.currency)}
              </span>
            </span>
            <span className="flex items-center gap-1 text-sm font-semibold">
              {t.checkout} <ArrowRight className="h-4 w-4" />
            </span>
          </button>
        </div>
      )}

      {detail && (
        <ProductDetail
          product={detail}
          currency={restaurant.currency}
          accent={accent}
          accentText={accentText}
          radius={R}
          onAdd={(q) => {
            addToCart(detail.id, q);
            setDetail(null);
          }}
          onClose={() => setDetail(null)}
        />
      )}

      <CheckoutModal
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cartLines}
        currency={restaurant.currency}
        accent={accent}
        accentText={accentText}
        slug={restaurant.slug}
        tableCode={table?.code ?? null}
        tableName={table?.name ?? null}
        hasDelivery={restaurant.hasDelivery}
        waiterCodeEnabled={restaurant.waiterCodeEnabled}
        lang={lang}
        onSetQty={setQty}
        onClear={() => setCart({})}
        onOrdered={onOrdered}
      />

      {/* Buyurtma kuzatuvi */}
      {trackedOrder && (
        <OrderTracker
          orderId={trackedOrder}
          currency={restaurant.currency}
          accent={accent}
          onClose={clearTracked}
        />
      )}
    </div>
  );
}

// ─────────── TABS menyu: tepada kategoriya tablari, bitta kategoriya mahsulotlari ───────────
function TabsMenu({
  groups,
  activeId,
  onSelect,
  renderItems,
  accent,
  accentText,
  radius,
}: {
  groups: { category: { id: string; name: string; image: string | null }; items: PublicProduct[] }[];
  activeId: string;
  onSelect: (id: string) => void;
  renderItems: (list: PublicProduct[], gridClass?: string) => React.ReactNode;
  accent: string;
  accentText: string;
  radius: number;
}) {
  const active = groups.find((g) => g.category.id === activeId) ?? groups[0];
  const rowRef = useRef<HTMLDivElement | null>(null);

  return (
    <div>
      {/* Yopishqoq tab qatori */}
      <div
        ref={rowRef}
        className="sticky top-[68px] z-20 -mx-4 flex gap-2 overflow-x-auto bg-background/95 px-4 py-3 backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {groups.map((g) => {
          const on = g.category.id === active.category.id;
          return (
            <button
              key={g.category.id}
              data-cat={g.category.id}
              onClick={(e) => {
                onSelect(g.category.id);
                e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
              }}
              className="shrink-0 whitespace-nowrap px-4 py-2 text-sm font-semibold transition-colors"
              style={
                on
                  ? { background: accent, color: accentText, borderRadius: 999 }
                  : { borderRadius: 999, background: "var(--surface-2)", color: "var(--foreground)" }
              }
            >
              {g.category.name}
            </button>
          );
        })}
      </div>

      {/* Tanlangan kategoriya mahsulotlari */}
      <div className="mt-4">
        <h2 className="mb-3 text-xl font-bold text-foreground">{active.category.name}</h2>
        {renderItems(active.items, "grid-cols-2 lg:grid-cols-3")}
      </div>
    </div>
  );
}

// ─────────── Bosh sahifa (intro) — QR ochilganda birinchi to'liq ekran ───────────
// Tuzilishi: TEPADA rasm/video (yarimdan kamroq), PASTIDA logo + ma'lumot + CTA.
function HeroIntro({
  media,
  autoplay,
  ctaText,
  restaurant,
  desc,
  accent,
  accentText,
  background,
  foreground,
  muted,
  card,
  radius,
  onEnter,
}: {
  media: { id: string; kind: "image" | "video"; url: string }[];
  autoplay: boolean;
  ctaText: string;
  restaurant: PublicRestaurant;
  desc: string;
  accent: string;
  accentText: string;
  background: string;
  foreground: string;
  muted: string;
  card: string;
  radius: number;
  onEnter: () => void;
}) {
  const [i, setI] = useState(0);
  const images = media; // rasm + video aralash
  const hasVideo = images[i]?.kind === "video";

  // Faqat rasmlar bo'lganda avtomatik almashadi (video o'zi tugaydi/loop)
  useEffect(() => {
    if (!autoplay || images.length < 2 || hasVideo) return;
    const tmr = setInterval(() => setI((v) => (v + 1) % images.length), 4500);
    return () => clearInterval(tmr);
  }, [autoplay, images.length, hasVideo, i]);

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col overflow-y-auto overscroll-contain"
      style={{ background }}
    >
      {/* ─── TEPA: media (ekranning ~45% i — yarimdan kamroq) ─── */}
      <div className="relative h-[45vh] min-h-[260px] w-full shrink-0 overflow-hidden bg-black">
        {images.map((m, idx) => {
          const mt = heroMediaType(m);
          return (
          <div
            key={m.id}
            className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: idx === i ? 1 : 0 }}
          >
            {mt === "youtube" ? (
              <iframe
                src={youtubeEmbed(m.url) || ""}
                title="video"
                className="pointer-events-none h-full w-full scale-150 object-cover"
                allow="autoplay; encrypted-media"
                frameBorder={0}
              />
            ) : mt === "video" ? (
              <video
                src={m.url}
                className="h-full w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                onEnded={() =>
                  images.length > 1 && setI((v) => (v + 1) % images.length)
                }
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.url} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          );
        })}
        {/* pastga yumshoq o'tish */}
        <div
          className="absolute inset-x-0 bottom-0 h-24"
          style={{ background: `linear-gradient(to top, ${background}, transparent)` }}
        />
        {/* Slayd nuqtalari */}
        {images.length > 1 && (
          <div className="absolute left-1/2 bottom-4 z-10 flex -translate-x-1/2 gap-1.5">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setI(idx)}
                aria-label={`${idx + 1}-slayd`}
                className={`h-1.5 rounded-full transition-all ${
                  idx === i ? "w-6 bg-white" : "w-1.5 bg-white/60"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── PAST: logo + ma'lumot + CTA ─── */}
      <div className="relative z-10 flex flex-1 flex-col items-center px-6 pb-8 pt-2 text-center">
        {restaurant.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={restaurant.logo}
            alt={restaurant.name}
            className="-mt-12 h-24 w-24 rounded-2xl border-4 object-cover shadow-xl"
            style={{ borderColor: background }}
          />
        ) : (
          <div
            className="-mt-12 flex h-24 w-24 items-center justify-center rounded-2xl border-4 text-3xl font-bold shadow-xl"
            style={{ borderColor: background, background: accent, color: accentText }}
          >
            {restaurant.name.slice(0, 1)}
          </div>
        )}
        <h1 className="mt-4 text-2xl font-bold" style={{ color: foreground }}>
          {restaurant.name}
        </h1>
        {desc && (
          <p className="mt-2 max-w-xs text-sm leading-relaxed" style={{ color: muted }}>
            {desc}
          </p>
        )}

        {/* restoran aloqa (ixtiyoriy, ortiqcha to'ldirmaydi) */}
        {(restaurant.phone || restaurant.address) && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs" style={{ color: muted }}>
            {restaurant.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> {restaurant.phone}
              </span>
            )}
            {restaurant.address && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {restaurant.address}
              </span>
            )}
          </div>
        )}

        <button
          onClick={onEnter}
          className="mt-auto flex w-full max-w-xs items-center justify-center gap-2 py-4 text-base font-semibold shadow-lg transition-transform active:scale-[0.98]"
          style={{ background: accent, color: accentText, borderRadius: radius }}
        >
          {ctaText || "Menyuni ko'rish"} <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

// ─────────── SPLIT menyu: chapda kategoriyalar, o'ngda mahsulotlar ───────────
function SplitMenu({
  groups,
  activeId,
  onSelect,
  renderItems,
  accent,
  accentText,
  radius,
}: {
  groups: { category: { id: string; name: string; image: string | null }; items: PublicProduct[] }[];
  activeId: string;
  onSelect: (id: string) => void;
  renderItems: (list: PublicProduct[], gridClass?: string) => React.ReactNode;
  accent: string;
  accentText: string;
  radius: number;
}) {
  const active = groups.find((g) => g.category.id === activeId) ?? groups[0];
  const rad = Math.min(radius, 18);
  return (
    <div className="grid grid-cols-[64px_1fr] gap-2.5 sm:grid-cols-[104px_1fr] sm:gap-5">
      {/* CHAP: kategoriyalar roili (ixcham, yopishqoq — faqat rasm/nom) */}
      <div className="sticky top-[56px] self-start max-h-[calc(100vh-64px)] space-y-1 overflow-y-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {groups.map((g) => {
          const on = g.category.id === active.category.id;
          return (
            <button
              key={g.category.id}
              onClick={() => onSelect(g.category.id)}
              title={g.category.name}
              className="flex w-full flex-col items-center gap-1 px-0.5 py-2 text-center transition-colors sm:px-1.5"
              style={
                on
                  ? { background: accent, color: accentText, borderRadius: rad }
                  : { borderRadius: rad, color: "var(--foreground)" }
              }
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden sm:h-12 sm:w-12"
                style={{
                  borderRadius: rad * 0.7,
                  background: on ? "rgba(255,255,255,0.22)" : "var(--surface-2)",
                }}
              >
                {g.category.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={g.category.image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UtensilsCrossed
                    className="h-5 w-5"
                    style={{ color: on ? accentText : "var(--muted)" }}
                  />
                )}
              </span>
              <span className="line-clamp-2 text-[10px] font-medium leading-tight sm:text-[11px]">
                {g.category.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* O'NG: tanlangan kategoriya mahsulotlari */}
      <div className="min-w-0">
        <h2 className="mb-3 text-lg font-bold text-foreground sm:text-xl">{active.category.name}</h2>
        {renderItems(active.items, "grid-cols-2 lg:grid-cols-3")}
      </div>
    </div>
  );
}

// ─────────── Restoran profili (shablonga qarab: overlap / center / minimal) ───────────
function ProfileHeader({
  restaurant,
  desc,
  productCount,
  accent,
  accentText,
  radius,
  variant,
}: {
  restaurant: PublicRestaurant;
  desc: string;
  productCount: number;
  accent: string;
  accentText: string;
  radius: number;
  variant: "overlap" | "center" | "minimal";
}) {
  const R = radius;
  const logo = restaurant.logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={restaurant.logo} alt={restaurant.name} className="h-full w-full object-cover" />
  ) : (
    <div
      className="flex h-full w-full items-center justify-center text-3xl font-bold"
      style={{ background: accent, color: accentText }}
    >
      {restaurant.name[0]}
    </div>
  );

  const socials = (
    <div className="flex items-center gap-2">
      {restaurant.telegram && (
        <a
          href={`https://t.me/${restaurant.telegram.replace("@", "")}`}
          target="_blank"
          rel="noreferrer"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-foreground transition-colors hover:bg-accent-soft"
        >
          <Send className="h-4 w-4" />
        </a>
      )}
      {restaurant.instagram && (
        <a
          href={`https://instagram.com/${restaurant.instagram.replace("@", "")}`}
          target="_blank"
          rel="noreferrer"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-foreground transition-colors hover:bg-accent-soft"
        >
          <Instagram className="h-4 w-4" />
        </a>
      )}
    </div>
  );

  const infoChips = (restaurant.workHours || restaurant.address || restaurant.phone) && (
    <div className={`mt-4 flex flex-wrap gap-2 ${variant === "center" ? "justify-center" : ""}`}>
      {restaurant.address && (
        <InfoChip icon={MapPin} text={restaurant.address} href={restaurant.mapUrl || undefined} />
      )}
      {restaurant.phone && (
        <InfoChip icon={Phone} text={restaurant.phone} href={`tel:${restaurant.phone}`} />
      )}
      {restaurant.workHours && <InfoChip icon={Clock} text={restaurant.workHours} />}
    </div>
  );

  // ── CENTER: logo markazda, nom + ijtimoiy tugmalar markazda (rasimdagidek) ──
  if (variant === "center") {
    return (
      <div
        className="relative -mt-14 border border-border bg-card px-5 pb-5 pt-0 text-center shadow-card"
        style={{ borderRadius: R + 6 }}
      >
        <div
          className="mx-auto -mt-12 h-24 w-24 overflow-hidden rounded-full border-4 border-card bg-surface-2 shadow-card"
        >
          {logo}
        </div>
        <div className="mt-3 flex flex-col items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold leading-tight text-foreground">{restaurant.name}</h1>
            {socials}
          </div>
          {desc && <p className="mt-1 text-sm text-muted">{desc}</p>}
          <div className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
            <Star className="h-4 w-4 fill-current text-warning" />
            <span className="font-semibold text-foreground">4.8</span>
            <span>· {productCount} taom</span>
            {restaurant.hasDelivery && (
              <>
                <span className="text-muted/50">·</span>
                <span>Yetkazib berish</span>
              </>
            )}
          </div>
        </div>
        {infoChips}
      </div>
    );
  }

  // ── MINIMAL: kichik logo chapda, ixcham (kartasiz) ──
  if (variant === "minimal") {
    return (
      <div className="-mt-8 flex items-center gap-3 px-1">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-card bg-surface-2 shadow-card">
          {logo}
        </div>
        <div className="min-w-0 flex-1 pt-6">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-xl font-bold text-foreground">{restaurant.name}</h1>
            {socials}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
            <Star className="h-3.5 w-3.5 fill-current text-warning" />
            <span className="font-semibold text-foreground">4.8</span>
            <span>· {productCount} taom</span>
            {restaurant.hasDelivery && <span>· Yetkazib berish</span>}
          </div>
          {(restaurant.address || restaurant.phone) && (
            <p className="mt-1 truncate text-xs text-muted">
              {restaurant.address}
              {restaurant.address && restaurant.phone ? " · " : ""}
              {restaurant.phone}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── OVERLAP (standart): logo chap tepada ──
  return (
    <div
      className="relative -mt-10 border border-border bg-card px-5 pb-5 shadow-card"
      style={{ borderRadius: R + 6 }}
    >
      <div className="flex items-start justify-between">
        <div
          className="-mt-12 h-24 w-24 overflow-hidden border-4 border-card bg-surface-2 shadow-card"
          style={{ borderRadius: R + 2 }}
        >
          {logo}
        </div>
        <div className="pt-3">{socials}</div>
      </div>
      <div className="mt-3">
        <h1 className="text-2xl font-bold leading-tight text-foreground">{restaurant.name}</h1>
        <div className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
          <Star className="h-4 w-4 fill-current text-warning" />
          <span className="font-semibold text-foreground">4.8</span>
          <span>· {productCount} taom</span>
          {restaurant.hasDelivery && (
            <>
              <span className="text-muted/50">·</span>
              <span>Yetkazib berish bor</span>
            </>
          )}
        </div>
      </div>
      {desc && <p className="mt-3.5 text-sm leading-relaxed text-muted">{desc}</p>}
      {infoChips}
    </div>
  );
}

// ─────────── Kategoriya karta (shablonga qarab: banner / grid / list) ───────────
function CategoryCard({
  variant,
  name,
  image,
  count,
  onClick,
  accent,
  accentText,
  radius,
  label,
}: {
  variant: "banner" | "grid" | "list";
  name: string;
  image: string | null;
  count: number;
  onClick: () => void;
  accent: string;
  accentText: string;
  radius: number;
  label: string;
}) {
  const bg = `linear-gradient(135deg, ${accent}, ${accent}22, #0b0b0b)`;

  // ── LIST: chapda kichik rasm + nom + o'q ──
  if (variant === "list") {
    return (
      <button
        onClick={onClick}
        className="group flex w-full items-center gap-3 border border-border bg-card p-2.5 text-left shadow-soft transition-transform active:scale-[0.99]"
        style={{ borderRadius: radius }}
      >
        <div
          className="h-16 w-16 shrink-0 overflow-hidden bg-surface-2"
          style={{ borderRadius: radius - 4 }}
        >
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" style={{ background: bg }} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold text-foreground">{name}</h3>
          <p className="text-xs text-muted">
            {count} {label}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
      </button>
    );
  }

  // ── BANNER (to'liq enlik) yoki GRID (2 ustun) ──
  const isBanner = variant === "banner";
  return (
    <button
      onClick={onClick}
      className={`group relative block w-full overflow-hidden text-left shadow-card ring-1 ring-black/5 transition-transform active:scale-[0.98] ${
        isBanner ? "h-40 sm:h-52" : "aspect-[4/3]"
      }`}
      style={{ borderRadius: radius + 4 }}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
      ) : (
        <div
          className="h-full w-full transition-transform duration-500 ease-out group-hover:scale-105"
          style={{ background: bg }}
        />
      )}
      {isBanner ? (
        <>
          {/* Markazda nom (rasimdagidek) */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/25 to-black/10" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-5 text-center">
            <h3 className="text-2xl font-extrabold uppercase tracking-[0.1em] text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.5)] sm:text-4xl">
              {name}
            </h3>
            <span className="rounded-full bg-white/20 px-3 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
              {count} {label}
            </span>
          </div>
        </>
      ) : (
        <>
          {/* Nom pastki chapda */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold uppercase tracking-wide text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.5)] sm:text-lg">
                {name}
              </h3>
              <p className="text-[11px] font-medium text-white/80">
                {count} {label}
              </p>
            </div>
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-md transition-transform group-hover:translate-x-0.5"
              style={{ background: accent, color: accentText }}
            >
              <ChevronRight className="h-5 w-5" />
            </span>
          </div>
        </>
      )}
    </button>
  );
}

// ─────────── Kategoriya ichidagi hero (kirilgach tepada) ───────────
function CategoryHero({
  name,
  image,
  count,
  accent,
  radius,
  label,
}: {
  name: string;
  image: string | null;
  count: number;
  accent: string;
  radius: number;
  label: string;
}) {
  return (
    <div
      className="relative h-28 w-full overflow-hidden shadow-card ring-1 ring-black/5 sm:h-36"
      style={{ borderRadius: radius + 4 }}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={name} className="h-full w-full object-cover" />
      ) : (
        <div
          className="h-full w-full"
          style={{ background: `linear-gradient(135deg, ${accent}, ${accent}22, #0b0b0b)` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4">
        <h2 className="text-2xl font-extrabold uppercase tracking-[0.06em] text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.45)] sm:text-3xl">
          {name}
        </h2>
        <p className="mt-0.5 text-xs font-medium text-white/85">
          {count} {label}
        </p>
      </div>
    </div>
  );
}

// ─────────── Banner slider ───────────
function BannerSlider({
  banners,
  accent,
  accentText,
  radius,
}: {
  banners: PublicBanner[];
  accent: string;
  accentText: string;
  radius: number;
}) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(() => setI((v) => (v + 1) % banners.length), 4500);
    return () => clearInterval(t);
  }, [banners.length]);

  const multi = banners.length > 1;
  return (
    <div
      className="group relative overflow-hidden shadow-card ring-1 ring-black/5"
      style={{ borderRadius: radius + 4 }}
    >
      {/* Slaydlar (silliq o'tish) */}
      <div className="relative h-40 w-full sm:h-48">
        {banners.map((bn, idx) => (
          <a
            key={bn.id}
            href={bn.linkUrl || undefined}
            target={bn.linkUrl ? "_blank" : undefined}
            rel="noreferrer"
            className={`absolute inset-0 block transition-opacity duration-700 ease-out ${
              idx === i ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            aria-hidden={idx !== i}
          >
            {bn.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={bn.image}
                alt={bn.title || ""}
                className="h-full w-full object-cover transition-transform duration-[5000ms] ease-out group-hover:scale-105"
              />
            ) : (
              <div
                className="h-full w-full"
                style={{ background: `linear-gradient(135deg, ${accent}, #000)` }}
              />
            )}
            {/* Matn o'qilishi uchun ikki qatlamli gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/45 to-transparent" />

            {(bn.title || bn.subtitle || bn.linkUrl) && (
              <div
                className={`absolute inset-x-0 bottom-0 flex flex-col items-start gap-2 p-5 text-white ${
                  multi ? "pb-8" : ""
                }`}
              >
                {bn.title && (
                  <p className="text-xl font-bold leading-snug drop-shadow-sm sm:text-2xl">
                    {bn.title}
                  </p>
                )}
                {bn.subtitle && (
                  <p className="max-w-[85%] text-sm leading-snug text-white/85 drop-shadow-sm">
                    {bn.subtitle}
                  </p>
                )}
                {bn.linkUrl && (
                  <span
                    className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold shadow-md transition-transform group-active:scale-95"
                    style={{ background: accent, color: accentText, borderRadius: 999 }}
                  >
                    Batafsil <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
            )}
          </a>
        ))}
      </div>

      {multi && (
        <>
          <button
            aria-label="Oldingi"
            onClick={() => setI((v) => (v - 1 + banners.length) % banners.length)}
            className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white opacity-0 backdrop-blur-md transition-opacity hover:bg-black/55 group-hover:opacity-100 max-sm:opacity-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            aria-label="Keyingi"
            onClick={() => setI((v) => (v + 1) % banners.length)}
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white opacity-0 backdrop-blur-md transition-opacity hover:bg-black/55 group-hover:opacity-100 max-sm:opacity-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-3.5 left-1/2 flex -translate-x-1/2 gap-1.5">
            {banners.map((_, idx) => (
              <button
                key={idx}
                aria-label={`${idx + 1}-banner`}
                onClick={() => setI(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === i ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────── Badges ───────────
function ProductBadges({ p }: { p: PublicProduct }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {p.isBestseller && (
        <span className="flex items-center gap-0.5 rounded-md bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-warning">
          🔥 Xit
        </span>
      )}
      {p.isNew && (
        <span className="rounded-md bg-success/15 px-1.5 py-0.5 text-[10px] font-medium text-success">
          Yangi
        </span>
      )}
      {p.oldPrice && (
        <span className="rounded-md bg-error/15 px-1.5 py-0.5 text-[10px] font-medium text-error">
          🏷 Chegirma
        </span>
      )}
      {p.isVegetarian && <Leaf className="h-3 w-3 text-success" />}
      {p.spicyLevel > 0 && (
        <span className="flex text-error">
          {Array.from({ length: p.spicyLevel }).map((_, i) => (
            <Flame key={i} className="h-3 w-3" />
          ))}
        </span>
      )}
    </div>
  );
}

// ─────────── List card (rasm chapda) ───────────
function ListCard({
  product: p,
  currency,
  accent,
  accentText,
  radius,
  qty,
  onOpen,
  onAdd,
  onSetQty,
}: {
  product: PublicProduct;
  currency: string;
  accent: string;
  accentText: string;
  radius: number;
  qty: number;
  onOpen: () => void;
  onAdd: () => void;
  onSetQty: (q: number) => void;
}) {
  const imgs = parseJson<string[]>(p.images, []);
  return (
    <div
      onClick={onOpen}
      className={`flex cursor-pointer gap-3 border border-border bg-card p-3 transition-all active:scale-[0.99] ${
        !p.isAvailable ? "opacity-60" : ""
      }`}
      style={{ borderRadius: radius, boxShadow: "var(--card-shadow)" }}
    >
      <div className="h-24 w-24 shrink-0 overflow-hidden bg-surface-2" style={{ borderRadius: radius - 4 }}>
        {imgs[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgs[0]} alt={p.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted/40">
            <UtensilsCrossed className="h-7 w-7" />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="font-semibold text-foreground">{p.name}</h3>
        {p.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{p.description}</p>}
        <div className="mt-1">
          <ProductBadges p={p} />
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div>
            <span className="font-bold text-foreground">{formatPrice(p.price, currency)}</span>
            {p.oldPrice && (
              <span className="ml-1.5 text-xs text-muted line-through">
                {formatPrice(p.oldPrice, currency)}
              </span>
            )}
          </div>
          {p.isAvailable ? (
            <div onClick={(e) => e.stopPropagation()}>
              {qty > 0 ? (
                <QtyControl qty={qty} accent={accent} accentText={accentText} onChange={onSetQty} size="sm" />
              ) : (
                <button
                  onClick={onAdd}
                  className="flex h-9 items-center gap-1 px-3 text-sm font-medium"
                  style={{ background: accent, color: accentText, borderRadius: radius - 4 }}
                >
                  <Plus className="h-4 w-4" /> Qo'shish
                </button>
              )}
            </div>
          ) : (
            <span className="text-xs font-medium text-error">Mavjud emas</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────── Grid card (rasm tepada) ───────────
function GridCard({
  product: p,
  currency,
  accent,
  accentText,
  radius,
  qty,
  onOpen,
  onAdd,
  onSetQty,
}: {
  product: PublicProduct;
  currency: string;
  accent: string;
  accentText: string;
  radius: number;
  qty: number;
  onOpen: () => void;
  onAdd: () => void;
  onSetQty: (q: number) => void;
}) {
  const imgs = parseJson<string[]>(p.images, []);
  return (
    <div
      onClick={onOpen}
      className={`flex cursor-pointer flex-col overflow-hidden border border-border bg-card transition-all active:scale-[0.99] ${
        !p.isAvailable ? "opacity-60" : ""
      }`}
      style={{ borderRadius: radius, boxShadow: "var(--card-shadow)" }}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-surface-2">
        {imgs[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgs[0]} alt={p.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted/40">
            <UtensilsCrossed className="h-9 w-9" />
          </div>
        )}
        <div className="absolute left-2 top-2">
          <ProductBadges p={p} />
        </div>
        {p.isAvailable && (
          <div className="absolute bottom-2 right-2" onClick={(e) => e.stopPropagation()}>
            {qty > 0 ? (
              <div className="bg-card/95 p-1 backdrop-blur" style={{ borderRadius: radius - 4 }}>
                <QtyControl qty={qty} accent={accent} accentText={accentText} onChange={onSetQty} size="sm" />
              </div>
            ) : (
              <button
                onClick={onAdd}
                className="flex h-9 w-9 items-center justify-center shadow-card"
                style={{ background: accent, color: accentText, borderRadius: 999 }}
              >
                <Plus className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-1 font-semibold text-foreground">{p.name}</h3>
        {p.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{p.description}</p>}
        <div className="mt-2">
          <span className="font-bold text-foreground">{formatPrice(p.price, currency)}</span>
          {p.oldPrice && (
            <span className="ml-1.5 text-xs text-muted line-through">
              {formatPrice(p.oldPrice, currency)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────── Recommend card (horizontal) ───────────
function RecommendCard({
  product: p,
  currency,
  accent,
  accentText,
  radius,
  qty,
  onOpen,
  onAdd,
}: {
  product: PublicProduct;
  currency: string;
  accent: string;
  accentText: string;
  radius: number;
  qty: number;
  onOpen: () => void;
  onAdd: () => void;
}) {
  const imgs = parseJson<string[]>(p.images, []);
  return (
    <div
      onClick={onOpen}
      className="flex w-40 shrink-0 cursor-pointer flex-col overflow-hidden border border-border bg-card shadow-soft"
      style={{ borderRadius: radius }}
    >
      <div className="relative h-28 w-full overflow-hidden bg-surface-2">
        {imgs[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgs[0]} alt={p.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted/40">
            <UtensilsCrossed className="h-7 w-7" />
          </div>
        )}
        {p.isNew && (
          <span className="absolute left-2 top-2 rounded-md bg-success px-1.5 py-0.5 text-[10px] font-medium text-white">
            Yangi
          </span>
        )}
        <div className="absolute bottom-2 right-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onAdd}
            className="flex h-8 w-8 items-center justify-center shadow-card"
            style={{ background: accent, color: accentText, borderRadius: 999 }}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="p-2.5">
        <h3 className="line-clamp-1 text-sm font-semibold text-foreground">{p.name}</h3>
        <div className="mt-1 flex items-center gap-1">
          <span className="text-sm font-bold text-foreground">{formatPrice(p.price, currency)}</span>
          {qty > 0 && <span className="text-xs text-muted">×{qty}</span>}
        </div>
      </div>
    </div>
  );
}

function InfoChip({
  icon: Icon,
  text,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  href?: string;
}) {
  const inner = (
    <span className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-xs text-foreground">
      <Icon className="h-3.5 w-3.5 text-muted" />
      <span className="max-w-[180px] truncate">{text}</span>
    </span>
  );
  return href ? (
    <a href={href} target="_blank" rel="noreferrer">
      {inner}
    </a>
  ) : (
    inner
  );
}

function SocialBtn({
  href,
  icon: Icon,
  radius,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  radius: number;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex h-11 w-11 items-center justify-center border border-border bg-card text-foreground transition-colors hover:bg-surface-2"
      style={{ borderRadius: radius }}
    >
      <Icon className="h-5 w-5" />
    </a>
  );
}

// ─────────── Product detail ───────────
function ProductDetail({
  product: p,
  currency,
  accent,
  accentText,
  radius,
  onAdd,
  onClose,
}: {
  product: PublicProduct;
  currency: string;
  accent: string;
  accentText: string;
  radius: number;
  onAdd: (qty: number) => void;
  onClose: () => void;
}) {
  const imgs = parseJson<string[]>(p.images, []);
  const [qty, setQtyLocal] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-card animate-fade-up sm:rounded-3xl">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="relative h-60 w-full shrink-0 overflow-hidden bg-surface-2">
          {imgs[activeImg] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imgs[activeImg]} alt={p.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted/40">
              <UtensilsCrossed className="h-14 w-14" />
            </div>
          )}
          {imgs.length > 1 && (
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {imgs.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`h-1.5 rounded-full ${i === activeImg ? "w-4 bg-white" : "w-1.5 bg-white/50"}`}
                />
              ))}
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-bold text-foreground">{p.name}</h2>
            <div className="text-right">
              <div className="text-xl font-bold text-foreground">{formatPrice(p.price, currency)}</div>
              {p.oldPrice && (
                <div className="text-sm text-muted line-through">{formatPrice(p.oldPrice, currency)}</div>
              )}
            </div>
          </div>
          <div className="mt-2">
            <ProductBadges p={p} />
          </div>
          {p.description && <p className="mt-3 text-sm leading-relaxed text-muted">{p.description}</p>}
          {p.ingredients && (
            <div className="mt-4">
              <p className="text-xs font-medium text-muted">Tarkibi</p>
              <p className="mt-0.5 text-sm text-foreground">{p.ingredients}</p>
            </div>
          )}
          <div className="mt-4 flex gap-4 border-t border-border pt-4">
            {p.weight && <Meta label="Og'irligi" value={p.weight} />}
            {p.calories ? <Meta label="Kaloriya" value={`${p.calories} kkal`} /> : null}
            {p.isHalal && <Meta label="Belgi" value="Halol 🥩" />}
          </div>
        </div>
        {p.isAvailable && (
          <div className="flex items-center gap-3 border-t border-border bg-card p-4">
            <QtyControl qty={qty} accent={accent} accentText={accentText} onChange={(q) => setQtyLocal(Math.max(1, q))} />
            <button
              onClick={() => onAdd(qty)}
              className="flex flex-1 items-center justify-center gap-2 py-3 font-medium"
              style={{ background: accent, color: accentText, borderRadius: radius }}
            >
              Savatga qo'shish · {formatPrice(p.price * qty, currency)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
