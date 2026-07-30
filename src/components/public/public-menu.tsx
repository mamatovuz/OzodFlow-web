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
} from "lucide-react";
import { formatPrice, parseJson } from "@/lib/utils";
import type { MenuTheme } from "@/lib/themes";
import {
  FloatingCart,
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
  { key: "bestseller", label: "Xit" },
  { key: "new", label: "Yangi" },
  { key: "vegetarian", label: "Vegetarian" },
];

export function PublicMenu({
  restaurant,
  categories,
  products,
  theme,
  table,
}: {
  restaurant: PublicRestaurant;
  categories: PublicCategory[];
  products: PublicProduct[];
  theme: MenuTheme;
  table: { code: string; name: string } | null;
}) {
  const [activeCat, setActiveCat] = useState<string>(categories[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [detail, setDetail] = useState<PublicProduct | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const catRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

  const accent = theme.accent || restaurant.primaryColor || "#2563EB";

  // Tema ranglarini CSS o'zgaruvchilar orqali qo'llaymiz
  const themeStyle: React.CSSProperties = {
    ["--accent" as string]: accent,
    ["--background" as string]: theme.colors.background,
    ["--surface" as string]: theme.colors.surface,
    ["--surface-2" as string]: theme.colors.surface2,
    ["--card" as string]: theme.colors.card,
    ["--foreground" as string]: theme.colors.foreground,
    ["--muted" as string]: theme.colors.muted,
    ["--border" as string]: theme.colors.border,
    ["--accent-soft" as string]: theme.isDark ? "#ffffff18" : "#00000010",
  };

  // Skanni qayd qilish
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
      if (search) {
        return p.name.toLowerCase().includes(search.toLowerCase());
      }
      if (filter === "bestseller" && !p.isBestseller) return false;
      if (filter === "new" && !p.isNew) return false;
      if (filter === "vegetarian" && !p.isVegetarian) return false;
      return true;
    });
  }, [products, search, filter]);

  // Qidiruv/filtr bo'lmaganda kategoriyalarga bo'lib ko'rsatamiz
  const grouped = useMemo(() => {
    return categories
      .map((c) => ({
        category: c,
        items: filtered.filter((p) => p.categoryId === c.id),
      }))
      .filter((g) => g.items.length > 0);
  }, [categories, filtered]);

  function scrollToCat(id: string) {
    setActiveCat(id);
    catRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="min-h-screen bg-background pb-24" style={themeStyle}>
      {/* Cover / Header */}
      <div className="relative">
        <div className="h-40 w-full overflow-hidden bg-surface-2 sm:h-52">
          {restaurant.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={restaurant.cover}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="h-full w-full"
              style={{
                background: `linear-gradient(135deg, ${accent}, ${accent}99)`,
              }}
            />
          )}
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4">
        {/* Restoran info */}
        <div className="-mt-10 flex items-end gap-4">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-4 border-background bg-card shadow-card">
            {restaurant.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={restaurant.logo}
                alt={restaurant.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-2xl font-bold text-white"
                style={{ background: accent }}
              >
                {restaurant.name[0]}
              </div>
            )}
          </div>
          <div className="pb-1">
            <h1 className="text-xl font-bold text-foreground">
              {restaurant.name}
            </h1>
            {restaurant.description && (
              <p className="text-sm text-muted">{restaurant.description}</p>
            )}
          </div>
        </div>

        {/* Stol banneri */}
        {table && (
          <div
            className="mt-4 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white"
            style={{ background: accent }}
          >
            <UtensilsCrossed className="h-4 w-4" />
            Siz: <b>{table.name}</b>
          </div>
        )}

        {/* Aloqa chiplar */}
        <div className="mt-4 flex flex-wrap gap-2">
          {restaurant.workHours && (
            <InfoChip icon={Clock} text={restaurant.workHours} />
          )}
          {restaurant.address && (
            <InfoChip
              icon={MapPin}
              text={restaurant.address}
              href={restaurant.mapUrl || undefined}
            />
          )}
          {restaurant.phone && (
            <InfoChip
              icon={Phone}
              text={restaurant.phone}
              href={`tel:${restaurant.phone}`}
            />
          )}
          {restaurant.hasDelivery && (
            <span
              className="rounded-full px-3 py-1.5 text-xs font-medium text-white"
              style={{ background: accent }}
            >
              Yetkazib berish bor
            </span>
          )}
        </div>

        {/* Qidiruv */}
        <div className="sticky top-0 z-30 -mx-4 mt-5 bg-background/90 px-4 py-3 backdrop-blur">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Taom qidirish..."
              className="h-11 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm text-foreground outline-none focus:border-accent"
            />
          </div>

          {/* Filtrlar */}
          {!search && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                  style={
                    filter === f.key
                      ? { background: accent, color: "#fff", borderColor: accent }
                      : {}
                  }
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {/* Kategoriya tablar */}
          {!search && filter === "all" && categories.length > 1 && (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => scrollToCat(c.id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeCat === c.id
                      ? "bg-surface-2 text-foreground"
                      : "text-muted"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mahsulotlar */}
        <div className="mt-4 space-y-8">
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
              className="scroll-mt-40"
            >
              <h2 className="mb-3 text-lg font-bold text-foreground">
                {g.category.name}
              </h2>
              <div className="space-y-3">
                {g.items.map((p) => (
                  <ProductRow
                    key={p.id}
                    product={p}
                    currency={restaurant.currency}
                    accent={accent}
                    qty={cart[p.id] || 0}
                    onOpen={() => openDetail(p)}
                    onAdd={() => addToCart(p.id)}
                    onSetQty={(q) => setQty(p.id, q)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer aloqa */}
        <div className="mt-10 flex justify-center gap-3">
          {restaurant.telegram && (
            <SocialBtn
              href={`https://t.me/${restaurant.telegram.replace("@", "")}`}
              icon={Send}
            />
          )}
          {restaurant.instagram && (
            <SocialBtn
              href={`https://instagram.com/${restaurant.instagram.replace("@", "")}`}
              icon={Instagram}
            />
          )}
          {restaurant.phone && (
            <SocialBtn href={`tel:${restaurant.phone}`} icon={Phone} />
          )}
        </div>
        <p className="mt-8 text-center text-xs text-muted">
          OzodFlow bilan yaratilgan
        </p>
      </div>

      {/* Mahsulot detali */}
      {detail && (
        <ProductDetail
          product={detail}
          currency={restaurant.currency}
          accent={accent}
          onAdd={(q) => {
            addToCart(detail.id, q);
            setDetail(null);
          }}
          onClose={() => setDetail(null)}
        />
      )}

      {/* Doimiy savat */}
      <FloatingCart
        count={cartCount}
        total={cartTotal}
        currency={restaurant.currency}
        accent={accent}
        onOpen={() => setCartOpen(true)}
      />

      {/* Savat / buyurtma */}
      <CheckoutModal
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cartLines}
        currency={restaurant.currency}
        accent={accent}
        slug={restaurant.slug}
        tableCode={table?.code ?? null}
        tableName={table?.name ?? null}
        onSetQty={setQty}
        onClear={() => setCart({})}
      />
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
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-surface-2"
    >
      <Icon className="h-5 w-5" />
    </a>
  );
}

function ProductRow({
  product: p,
  currency,
  accent,
  qty,
  onOpen,
  onAdd,
  onSetQty,
}: {
  product: PublicProduct;
  currency: string;
  accent: string;
  qty: number;
  onOpen: () => void;
  onAdd: () => void;
  onSetQty: (q: number) => void;
}) {
  const imgs = parseJson<string[]>(p.images, []);
  return (
    <div
      onClick={onOpen}
      className={`flex w-full cursor-pointer gap-3 rounded-2xl border border-border bg-card p-3 text-left shadow-soft transition-all active:scale-[0.99] ${
        !p.isAvailable ? "opacity-60" : ""
      }`}
    >
      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-surface-2">
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
        <div className="flex items-start gap-1.5">
          <h3 className="font-medium text-foreground">{p.name}</h3>
        </div>
        {p.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted">
            {p.description}
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {p.isBestseller && (
            <span className="flex items-center gap-0.5 rounded-md bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">
              <Star className="h-2.5 w-2.5" /> Xit
            </span>
          )}
          {p.isNew && (
            <span className="rounded-md bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
              Yangi
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
        <div className="mt-auto flex items-center gap-2 pt-1">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="font-bold" style={{ color: accent }}>
              {formatPrice(p.price, currency)}
            </span>
            {p.oldPrice && (
              <span className="text-xs text-muted line-through">
                {formatPrice(p.oldPrice, currency)}
              </span>
            )}
          </div>
          {/* Savatga qo'shish */}
          {p.isAvailable ? (
            <div onClick={(e) => e.stopPropagation()}>
              {qty > 0 ? (
                <QtyControl qty={qty} accent={accent} onChange={onSetQty} size="sm" />
              ) : (
                <button
                  onClick={onAdd}
                  className="flex h-9 items-center gap-1 rounded-lg px-3 text-sm font-medium text-white"
                  style={{ background: accent }}
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

function ProductDetail({
  product: p,
  currency,
  accent,
  onAdd,
  onClose,
}: {
  product: PublicProduct;
  currency: string;
  accent: string;
  onAdd: (qty: number) => void;
  onClose: () => void;
}) {
  const imgs = parseJson<string[]>(p.images, []);
  const [qty, setQtyLocal] = useState(1);
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-card animate-fade-up sm:rounded-3xl">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="h-56 w-full overflow-hidden bg-surface-2">
          {imgs[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imgs[0]} alt={p.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted/40">
              <UtensilsCrossed className="h-14 w-14" />
            </div>
          )}
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-bold text-foreground">{p.name}</h2>
            <div className="text-right">
              <div className="text-xl font-bold" style={{ color: accent }}>
                {formatPrice(p.price, currency)}
              </div>
              {p.oldPrice && (
                <div className="text-sm text-muted line-through">
                  {formatPrice(p.oldPrice, currency)}
                </div>
              )}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {p.isBestseller && (
              <span className="rounded-md bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                Bestseller
              </span>
            )}
            {p.isNew && (
              <span className="rounded-md bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                Yangi
              </span>
            )}
            {p.isVegetarian && (
              <span className="rounded-md bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                Vegetarian
              </span>
            )}
            {p.isHalal && (
              <span className="rounded-md bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                Halol
              </span>
            )}
          </div>

          {p.description && (
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {p.description}
            </p>
          )}

          {p.ingredients && (
            <div className="mt-4">
              <p className="text-xs font-medium text-muted">Tarkibi</p>
              <p className="mt-0.5 text-sm text-foreground">{p.ingredients}</p>
            </div>
          )}

          <div className="mt-4 flex gap-4 border-t border-border pt-4">
            {p.weight && (
              <div>
                <p className="text-xs text-muted">Og'irligi</p>
                <p className="text-sm font-medium text-foreground">{p.weight}</p>
              </div>
            )}
            {p.calories && (
              <div>
                <p className="text-xs text-muted">Kaloriya</p>
                <p className="text-sm font-medium text-foreground">
                  {p.calories} kkal
                </p>
              </div>
            )}
            {p.spicyLevel > 0 && (
              <div>
                <p className="text-xs text-muted">Achchiqlik</p>
                <p className="flex text-error">
                  {Array.from({ length: p.spicyLevel }).map((_, i) => (
                    <Flame key={i} className="h-4 w-4" />
                  ))}
                </p>
              </div>
            )}
          </div>

          {!p.isAvailable && (
            <div className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-center text-sm font-medium text-error">
              Hozircha mavjud emas
            </div>
          )}
        </div>

        {/* Savatga qo'shish */}
        {p.isAvailable && (
          <div className="sticky bottom-0 flex items-center gap-3 border-t border-border bg-card p-4">
            <QtyControl qty={qty} accent={accent} onChange={(q) => setQtyLocal(Math.max(1, q))} />
            <button
              onClick={() => onAdd(qty)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-medium text-white"
              style={{ background: accent }}
            >
              Savatga qo'shish · {formatPrice(p.price * qty, currency)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
