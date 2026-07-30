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
import {
  CheckoutModal,
  QtyControl,
  type CartLine,
} from "@/components/public/order-cart";

type PublicProduct = {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
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

type PublicCategory = { id: string; name: string };
type PublicBanner = {
  id: string;
  image: string | null;
  title: string | null;
  subtitle: string | null;
  linkUrl: string | null;
};

type PublicRestaurant = {
  slug: string;
  name: string;
  description: string | null;
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
};

const filters = [
  { key: "all", label: "Barchasi" },
  { key: "bestseller", label: "🔥 Xit" },
  { key: "new", label: "🆕 Yangi" },
  { key: "vegetarian", label: "🥬 Vegetarian" },
];

export function PublicMenu({
  restaurant,
  categories,
  products,
  theme,
  table,
  banners,
}: {
  restaurant: PublicRestaurant;
  categories: PublicCategory[];
  products: PublicProduct[];
  theme: MenuTheme;
  table: { code: string; name: string } | null;
  banners: PublicBanner[];
}) {
  const [activeCat, setActiveCat] = useState<string>(categories[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [detail, setDetail] = useState<PublicProduct | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const catRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const accent = theme.accent || restaurant.primaryColor || "#2563EB";
  const accentText = theme.accentText || "#ffffff";
  const R = theme.radius;

  const themeStyle: React.CSSProperties = {
    ["--accent" as string]: accent,
    ["--background" as string]: theme.colors.background,
    ["--surface" as string]: theme.colors.surface,
    ["--surface-2" as string]: theme.colors.surface2,
    ["--card" as string]: theme.colors.card,
    ["--foreground" as string]: theme.colors.foreground,
    ["--muted" as string]: theme.colors.muted,
    ["--border" as string]: theme.colors.border,
    ["--accent-soft" as string]: theme.isDark ? "#ffffff14" : "#0000000d",
  };

  function addToCart(id: string, qty = 1) {
    setCart((c) => ({ ...c, [id]: (c[id] || 0) + qty }));
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
  }, [restaurant.slug]);

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

  function scrollToCat(id: string) {
    setActiveCat(id);
    catRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const cardProps = { currency: restaurant.currency, accent, accentText, radius: R };

  return (
    <div className="min-h-screen bg-background pb-28" style={themeStyle}>
      {/* ─── Cover banner ─── */}
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

      <div className="mx-auto max-w-2xl px-4">
        {/* ─── Restoran info card ─── */}
        <div
          className="relative -mt-10 border border-border bg-card px-5 pb-5 shadow-card"
          style={{ borderRadius: R + 6 }}
        >
          {/* Logo cover chetida "suzib" turadi, nom/tavsif esa tagida ajralib */}
          <div
            className="-mt-12 h-24 w-24 overflow-hidden border-4 border-card bg-surface-2 shadow-card"
            style={{ borderRadius: R + 2 }}
          >
            {restaurant.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={restaurant.logo} alt={restaurant.name} className="h-full w-full object-cover" />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-3xl font-bold"
                style={{ background: accent, color: accentText }}
              >
                {restaurant.name[0]}
              </div>
            )}
          </div>

          <div className="mt-3">
            <h1 className="text-2xl font-bold leading-tight text-foreground">
              {restaurant.name}
            </h1>
            <div className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
              <Star className="h-4 w-4 fill-current text-warning" />
              <span className="font-semibold text-foreground">4.8</span>
              <span>· {products.length} taom</span>
              {restaurant.hasDelivery && (
                <>
                  <span className="text-muted/50">·</span>
                  <span>Yetkazib berish bor</span>
                </>
              )}
            </div>
          </div>

          {restaurant.description && (
            <p className="mt-3.5 text-sm leading-relaxed text-muted">
              {restaurant.description}
            </p>
          )}

          {/* Info chips */}
          {(restaurant.workHours || restaurant.address || restaurant.phone) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {restaurant.workHours && <InfoChip icon={Clock} text={restaurant.workHours} />}
              {restaurant.address && (
                <InfoChip icon={MapPin} text={restaurant.address} href={restaurant.mapUrl || undefined} />
              )}
              {restaurant.phone && (
                <InfoChip icon={Phone} text={restaurant.phone} href={`tel:${restaurant.phone}`} />
              )}
            </div>
          )}
        </div>

        {/* ─── Stol bar ─── */}
        {table && (
          <div
            className="mt-3 flex items-center gap-2 px-4 py-2.5 text-sm font-semibold"
            style={{ background: accent, color: accentText, borderRadius: R }}
          >
            <UtensilsCrossed className="h-4 w-4" />
            Siz: {table.name}
          </div>
        )}

        {/* ─── Banner slider ─── */}
        {banners.length > 0 && (
          <div className="mt-5">
            <BannerSlider banners={banners} accent={accent} accentText={accentText} radius={R} />
          </div>
        )}

        {/* ─── Search + kategoriya chips (sticky) ─── */}
        <div className="sticky top-0 z-30 -mx-4 mt-4 bg-background/95 px-4 py-3 backdrop-blur">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Taom qidirish..."
              className="h-12 w-full border border-border bg-card pl-10 pr-4 text-sm text-foreground outline-none transition-colors focus:border-accent"
              style={{ borderRadius: R }}
            />
          </div>

          {!search && (
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

          {!search && filter === "all" && categories.length > 1 && (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => scrollToCat(c.id)}
                  className={`shrink-0 px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeCat === c.id ? "bg-surface-2 text-foreground" : "text-muted"
                  }`}
                  style={{ borderRadius: 999 }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ─── Tavsiya etamiz ─── */}
        {!search && filter === "all" && recommended.length > 0 && (
          <div className="mt-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Tavsiya etamiz</h2>
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

        {/* ─── Kategoriyalar ─── */}
        <div className="mt-6 space-y-8">
          {grouped.length === 0 && (
            <div className="flex flex-col items-center py-16 text-center">
              <UtensilsCrossed className="h-10 w-10 text-muted/40" />
              <p className="mt-3 text-sm text-muted">Hech narsa topilmadi</p>
            </div>
          )}
          {grouped.map((g) => (
            <div
              key={g.category.id}
              ref={(el) => {
                catRefs.current[g.category.id] = el;
              }}
              className="scroll-mt-44"
            >
              <h2 className="mb-3 text-lg font-bold text-foreground">{g.category.name}</h2>
              {theme.layout === "grid" ? (
                <div className="grid grid-cols-2 gap-3">
                  {g.items.map((p) => (
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
                  {g.items.map((p) => (
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
              )}
            </div>
          ))}
        </div>

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
        <p className="mt-6 text-center text-xs text-muted">OzodFlow bilan yaratilgan</p>
      </div>

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
                {cartCount} ta taom · {formatPrice(cartTotal, restaurant.currency)}
              </span>
            </span>
            <span className="flex items-center gap-1 text-sm font-semibold">
              Rasmiylashtirish <ArrowRight className="h-4 w-4" />
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
        onSetQty={setQty}
        onClear={() => setCart({})}
      />
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
      className={`flex cursor-pointer gap-3 border border-border bg-card p-3 shadow-soft transition-all active:scale-[0.99] ${
        !p.isAvailable ? "opacity-60" : ""
      }`}
      style={{ borderRadius: radius }}
    >
      <div className="h-24 w-24 shrink-0 overflow-hidden bg-surface-2" style={{ borderRadius: radius - 4 }}>
        {imgs[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgs[0]} alt={p.name} className="h-full w-full object-cover" />
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
      className={`flex cursor-pointer flex-col overflow-hidden border border-border bg-card shadow-soft transition-all active:scale-[0.99] ${
        !p.isAvailable ? "opacity-60" : ""
      }`}
      style={{ borderRadius: radius }}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-surface-2">
        {imgs[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgs[0]} alt={p.name} className="h-full w-full object-cover" />
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
          <img src={imgs[0]} alt={p.name} className="h-full w-full object-cover" />
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
