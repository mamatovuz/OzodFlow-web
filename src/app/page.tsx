import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { getMenuByDomain, getMenuBySlug, resolveTable } from "@/lib/menu";
import { slugFromHost } from "@/lib/urls";
import { PublicMenu } from "@/components/public/public-menu";
import { BlockedMenu } from "@/components/public/blocked-menu";
import { getPlanPrices, getLifetimePrices } from "@/lib/plan-prices";
import { PLANS, FEATURE_MATRIX, LIFETIME_MONTHS, computePrice } from "@/lib/plans";
import { formatPrice } from "@/lib/utils";
import {
  QrCode,
  LayoutDashboard,
  Smartphone,
  BarChart3,
  Palette,
  Layers,
  Store,
  ShieldCheck,
  Zap,
  ArrowRight,
  Check,
  X,
  Eye,
  Sparkles,
  Crown,
  RefreshCcw,
  Wallet,
  Clock,
  TrendingUp,
  ShoppingCart,
  ChefHat,
  Truck,
  Languages,
  Wand2,
  Table2,
  Printer,
  Newspaper,
} from "lucide-react";
import { PROVIDER_META } from "@/lib/pos";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/logo";
import { Button, Badge } from "@/components/ui";
import { SiteNav } from "@/components/landing/site-nav";
import { FAQ } from "@/components/landing/faq";
import { EnterpriseContact } from "@/components/landing/enterprise-contact";
import { PartnersMarquee } from "@/components/landing/partners-marquee";
import { Reveal } from "@/components/landing/reveal";

const features = [
  {
    icon: QrCode,
    title: "QR menyu",
    desc: "Har bir restoran va stol uchun avtomatik QR kod. PNG, SVG va PDF formatda yuklab oling.",
  },
  {
    icon: Layers,
    title: "Menyu boshqaruvi",
    desc: "Kategoriyalar, mahsulotlar, narxlar va rasmlarni istalgan vaqtda tahrirlang.",
  },
  {
    icon: BarChart3,
    title: "Statistika",
    desc: "QR skanerlar, mashhur mahsulotlar va tashrif buyuruvchilarni real vaqtda kuzating.",
  },
  {
    icon: Palette,
    title: "Premium dizayn",
    desc: "Restoraningizga mos rang, logo va uslub. Dark va Light rejim to'liq qo'llab-quvvatlanadi.",
  },
  {
    icon: Store,
    title: "Filiallar",
    desc: "Barcha filiallar, xodimlar va rollarni bitta paneldan boshqaring.",
  },
  {
    icon: ShieldCheck,
    title: "Xavfsizlik",
    desc: "JWT autentifikatsiya, shifrlash, SSL va muntazam backup bilan himoyalangan.",
  },
];

const PLAN_ORDER = [
  { key: "STARTER" as const, mk: "starter" as const, Icon: Sparkles, desc: "Kichik kafe, coffee shop, fast food", highlight: false, contact: false },
  { key: "BUSINESS" as const, mk: "business" as const, Icon: Crown, desc: "Restoran va tarmoqlar uchun", highlight: true, contact: false },
];

// Ishonch ko'rsatkichlari (admin SiteStat bo'sh bo'lsa — standart)
const defaultTrustStats = [
  { value: "500+", label: "Restoran va kafe" },
  { value: "50 000+", label: "Menyu mahsuloti" },
  { value: "1.2M+", label: "QR skaner" },
  { value: "99.9%", label: "Ishlash vaqti (uptime)" },
];

// Qog'oz menyu → OzodFlow taqqoslash
const compareRows = [
  { paper: "Narx o'zgarsa qayta chop etish", ozod: "1 marta o'zgartirasiz" },
  { paper: "Vaqt o'tib eskirib qoladi", ozod: "Doim yangi va aniq" },
  { paper: "Har safar qo'shimcha xarajat", ozod: "Raqamli — bepul yangilash" },
  { paper: "Statistikasi yo'q", ozod: "Skaner va sotuv statistikasi" },
  { paper: "Bitta umumiy menyu", ozod: "Har stolga alohida QR" },
  { paper: "Buyurtmani qo'lda olasiz", ozod: "Online buyurtma panelga keladi" },
];

// Restoran uchun nima beradi (feature emas — benefit)
const benefits = [
  { icon: Wallet, title: "Xarajatni kamaytiring", desc: "Menyu narxi yoki taomi o'zgarsa — qayta-qayta menyu chop etmaysiz." },
  { icon: Zap, title: "Bir zumda yangilang", desc: "Bitta mahsulotni o'zgartirsangiz, barcha mijozlar yangi ma'lumotni ko'radi." },
  { icon: BarChart3, title: "Mijozlaringizni tushuning", desc: "Qaysi taomlar ko'p ko'rilayotganini statistikadan bilib oling." },
  { icon: Smartphone, title: "Telefondan boshqaring", desc: "Kompyuter shart emas. Menyu, narx va mahsulotlarni telefondan boshqaring." },
  { icon: Store, title: "Filiallarni birlashtiring", desc: "Bir nechta restoran bo'lsa, hammasini yagona panelga ulang." },
  { icon: Clock, title: "24/7 ishlaydi", desc: "Menyu doim mavjud — kechayu kunduz, ta'tilsiz." },
];

// Nega OzodFlow (ishonch)
const whyReasons = [
  { icon: Zap, title: "1 daqiqada ishga tushadi", desc: "Texnik bilim kerak emas." },
  { icon: Smartphone, title: "Telefondan boshqariladi", desc: "Istalgan joydan menyuni yangilang." },
  { icon: Languages, title: "O'zbekistonga mos", desc: "So'm, o'zbekcha, ruscha va inglizcha." },
  { icon: Palette, title: "Professional dizayn", desc: "Restoraningiz brendiga mos menyu." },
  { icon: BarChart3, title: "Statistika", desc: "Mijozlar harakatini tushuning." },
  { icon: ShieldCheck, title: "24/7 ishlaydi", desc: "Menyu doim mavjud va xavfsiz." },
];

// QR sayohati (visual journey)
const journey = [
  { icon: Store, label: "Restoran yarating" },
  { icon: Layers, label: "Menyuni qo'shing" },
  { icon: QrCode, label: "QR kodni stolga qo'ying" },
  { icon: Smartphone, label: "Mijoz skanerlaydi" },
  { icon: Eye, label: "Menyu ochiladi" },
  { icon: ShoppingCart, label: "Buyurtma keladi" },
];

export const dynamic = "force-dynamic";

// Platforma asosiy domenlari (bularda landing ko'rsatiladi)
const PLATFORM_HOSTS = (process.env.PLATFORM_HOSTS || "")
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

// Subdomen/maxsus domenda ochilganda — brauzer tabida restoran nomi va logosi
// ko'rinsin (platforma nomi emas). Menyu "o'z sayti" kabi ko'rinadi.
export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const host = (h.get("host") || "").split(":")[0].toLowerCase();
  const sub = slugFromHost(host);
  const menu = sub
    ? await getMenuBySlug(sub)
    : host && !host.endsWith("ozodflow.uz") && host !== "localhost"
    ? await getMenuByDomain(host)
    : null;
  if (!menu || "blocked" in menu) return {};
  const r = menu.restaurant;
  const title = `${r.name} — Menyu`;
  const description = r.description || `${r.name} elektron menyusi`;
  // Ijtimoiy tarmoq (Telegram/WhatsApp/Facebook) ulashuvida ko'rinadigan rasm.
  // Subdomen/custom domenda `/m/[slug]/opengraph-image` avtomatik ulanmaydi —
  // shuning uchun bu yerda qo'lda ko'rsatamiz (aynan shu host orqali).
  const ogImage = `https://${host}/m/${r.slug}/opengraph-image`;
  return {
    title,
    description,
    appleWebApp: { capable: true, title: r.name },
    manifest: `/m/${r.slug}/manifest.webmanifest`,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
    ...(r.logo
      ? {
          icons: {
            icon: [{ url: r.logo }],
            shortcut: [{ url: r.logo }],
            apple: [{ url: r.logo }],
          },
        }
      : {}),
  };
}

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  // Custom domain: agar host restoran domeniga to'g'ri kelsa — menyuni ko'rsatamiz
  const h = await headers();
  const host = (h.get("host") || "").split(":")[0].toLowerCase();
  const isPlatform =
    !host ||
    host === "localhost" ||
    host.endsWith(".railway.app") ||
    host.endsWith("ozodflow.uz") ||
    PLATFORM_HOSTS.includes(host);

  // ─── Subdomen menyu: test.ozodflow.uz → "test" restorani menyusi ───
  const subSlug = slugFromHost(host);
  if (subSlug) {
    const menu = await getMenuBySlug(subSlug);
    if (menu && "blocked" in menu) {
      return <BlockedMenu name={menu.restaurant.name} slug={menu.restaurant.slug} />;
    }
    if (menu) {
      const { t } = await searchParams;
      const table = await resolveTable(menu.restaurant.id, t);
      return (
        <PublicMenu
          restaurant={menu.restaurant}
          categories={menu.categories}
          products={menu.products}
          theme={menu.theme}
          table={table}
          banners={menu.banners}
          gallery={menu.gallery}
          combos={menu.combos}
        />
      );
    }
    // Subdomen bor, lekin bunday menyu topilmadi — landing ko'rsatamiz
  }

  if (!isPlatform) {
    const menu = await getMenuByDomain(host);
    if (menu && "blocked" in menu) {
      return <BlockedMenu name={menu.restaurant.name} slug={menu.restaurant.slug} />;
    }
    if (menu) {
      const { t } = await searchParams;
      const table = await resolveTable(menu.restaurant.id, t);
      return (
        <PublicMenu
          restaurant={menu.restaurant}
          categories={menu.categories}
          products={menu.products}
          theme={menu.theme}
          table={table}
          banners={menu.banners}
          gallery={menu.gallery}
          combos={menu.combos}
        />
      );
    }
  }

  const user = await getSessionUser();
  const prices = await getPlanPrices();
  const lifetimePrices = await getLifetimePrices();
  // Ishonch ko'rsatkichlari — admin belgilagan (SiteStat) yoki standart
  const partners = await prisma.partner.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, image: true, url: true },
  });
  const stats = await prisma.siteStat.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, value: true, label: true },
    take: 4,
  });
  // Ishonch bo'limi: admin 4+ ko'rsatkich qo'shsa — o'shani, aks holda standart
  const trustStats =
    stats.length >= 4
      ? stats.map((s) => ({ value: s.value, label: s.label }))
      : defaultTrustStats;
  // Bosh sahifada ko'rsatiladigan (yulduzchali) bloglar
  const featuredPosts = await prisma.blogPost.findMany({
    where: { isPublished: true, isFeatured: true },
    orderBy: [{ publishDate: "desc" }, { createdAt: "desc" }],
    take: 5,
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      coverImage: true,
      version: true,
      publishDate: true,
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteNav loggedIn={!!user} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-[-120px] h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute right-[-100px] top-40 h-[320px] w-[320px] rounded-full bg-accent/5 blur-3xl" />
          <div
            className="absolute inset-x-0 top-0 h-[600px] opacity-[0.4] dark:opacity-[0.25]"
            style={{
              backgroundImage:
                "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              maskImage:
                "radial-gradient(ellipse 70% 60% at 50% 0%, #000 40%, transparent 100%)",
              WebkitMaskImage:
                "radial-gradient(ellipse 70% 60% at 50% 0%, #000 40%, transparent 100%)",
            }}
          />
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="accent" className="mb-5">
              <QrCode className="h-3 w-3" /> Restoranlar uchun QR menyu
            </Badge>
            <h1 className="text-balance text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-6xl">
              Restoraningiz menyusini{" "}
              <span className="bg-gradient-to-r from-accent to-accent-hover bg-clip-text text-transparent">
                1 daqiqada
              </span>{" "}
              raqamlashtiring
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
              Qog'oz menyuni unuting. Menyuni istalgan vaqtda yangilang,
              buyurtmalarni qabul qiling va mijozlaringizni yaxshiroq tushuning —
              hammasi bitta paneldan.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto">
                  Bepul boshlash <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="/m/test" target="_blank" rel="noreferrer">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  <Eye className="h-4 w-4" /> Demo ko'rish
                </Button>
              </a>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted">
              {["Karta talab qilinmaydi", "1 daqiqada ishga tushadi", "Telefon orqali boshqariladi"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-success" /> {t}
                </span>
              ))}
            </div>

            {/* Ko'rsatkichlar — admin paneldan boshqariladi (bo'sh bo'lsa ko'rinmaydi) */}
            {stats.length > 0 && (
              <div className="mx-auto mt-12 grid max-w-xl gap-4 border-t border-border pt-8"
                style={{ gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, minmax(0, 1fr))` }}
              >
                {stats.map((s) => (
                  <div key={s.id}>
                    <p className="text-2xl font-bold text-foreground sm:text-3xl">
                      {s.value}
                    </p>
                    <p className="mt-1 text-xs text-muted sm:text-sm">{s.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="mt-16 flex items-end justify-center gap-6">
            <DashboardPreview />
            <PhonePreview />
          </div>
        </div>
      </section>

      {/* Hamkorlarimiz */}
      {partners.length > 0 && (
        <section className="border-t border-border bg-surface/50 py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-center text-sm font-medium uppercase tracking-wider text-muted">
              Bizga ishonadigan hamkorlar
            </p>
            <div className="mt-8">
              <PartnersMarquee partners={partners} />
            </div>
          </div>
        </section>
      )}

      {/* Muammo → Yechim: Qog'oz menyu vs OzodFlow */}
      <section className="border-t border-border py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <SectionHeading
            tag="Nega raqamli?"
            title="Qog'oz menyu vs OzodFlow"
            subtitle="Bitta o'zgarish restoraningizga qancha vaqt va pul tejashini ko'ring."
          />
          <Reveal className="mt-12 overflow-hidden rounded-2xl border border-border">
            <div className="grid grid-cols-2 bg-surface/50 text-sm font-semibold">
              <div className="flex items-center gap-2 px-4 py-3 text-muted sm:px-6">
                <Printer className="h-4 w-4" /> Oddiy qog'oz menyu
              </div>
              <div className="flex items-center gap-2 border-l border-border px-4 py-3 text-accent sm:px-6">
                <Sparkles className="h-4 w-4" /> OzodFlow
              </div>
            </div>
            {compareRows.map((r, i) => (
              <div
                key={r.paper}
                className={`grid grid-cols-2 text-sm ${i % 2 ? "bg-card" : "bg-surface/30"}`}
              >
                <div className="flex items-start gap-2 px-4 py-3.5 text-muted sm:px-6">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-error/70" />
                  <span>{r.paper}</span>
                </div>
                <div className="flex items-start gap-2 border-l border-border px-4 py-3.5 text-foreground sm:px-6">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>{r.ozod}</span>
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border bg-surface/50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            tag="Imkoniyatlar"
            title="Restoraningiz uchun hamma narsa"
            subtitle="Menyudan statistikagacha — bitta professional platformada."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <Reveal
                key={f.title}
                delay={(i % 3) * 80}
                className="rounded-2xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-card"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{f.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Jonli demo menyu */}
      <section id="demo" className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <Badge variant="accent" className="mb-3">
                Jonli demo
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Mijozlaringiz aynan shuni ko'radi
              </h2>
              <p className="mt-3 text-muted">
                Bu — haqiqiy ishlaydigan demo menyu. Kategoriyalarni bosing,
                mahsulotlarni ko'ring, savatga qo'shib ko'ring — hammasi real
                vaqtda ishlaydi.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Kategoriya va mahsulotlar bo'yicha tez navigatsiya",
                  "Savat, buyurtma va stolga bog'lash",
                  "3 tilda (uz / ru / en) va tunги rejim",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span className="text-foreground">{t}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href="/m/test" target="_blank" rel="noreferrer">
                  <Button size="lg" className="w-full sm:w-auto">
                    <Eye className="h-4 w-4" /> To'liq demo menyuni ochish
                  </Button>
                </a>
                <Link href="/register">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    O'zimniki yarataman <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Telefon ramkasida real menyu (iframe) — kattaroq, siqilmaydigan */}
            <div className="flex justify-center">
              <div className="relative w-[320px] shrink-0 sm:w-[420px]">
                <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-accent/10 blur-2xl" />
                <div className="rounded-[3rem] border-[12px] border-foreground/80 bg-foreground/80 shadow-card">
                  <div className="relative h-[640px] overflow-hidden rounded-[2.1rem] bg-card sm:h-[820px]">
                    <span className="absolute left-1/2 top-2 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-black/30" />
                    <iframe
                      src="/m/test"
                      title="OzodFlow jonli demo menyu"
                      loading="lazy"
                      className="h-full w-full border-0"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Restoran uchun nima beradi (benefit) */}
      <section className="border-t border-border py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            tag="Foyda"
            title="Restoraningizga nima beradi?"
            subtitle="OzodFlow — bu shunchaki menyu emas, vaqt va pul tejaydigan vosita."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b, i) => (
              <Reveal
                key={b.title}
                delay={(i % 3) * 80}
                className="rounded-2xl border border-border bg-card p-6 shadow-soft"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <b.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-semibold text-foreground">{b.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{b.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Dizayn editor ko'rgazmasi */}
      <section className="border-t border-border bg-surface/50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <Badge variant="accent" className="mb-3">
                <Wand2 className="h-3 w-3" /> Dizayn editori
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Menyuni restoraningiz uslubida yarating
              </h2>
              <p className="mt-3 text-muted">
                Tayyor dizaynlardan birini tanlab, uni brendingizga moslang —
                dasturlashni bilish shart emas. Har o'zgarish jonli ko'rinishda
                darhol namoyon bo'ladi.
              </p>
              <ul className="mt-6 grid grid-cols-2 gap-3">
                {[
                  "Tayyor dizayn shablonlari",
                  "Logo va rang tanlash",
                  "Bosh sahifa rasm/video",
                  "Fon va tugma sozlamalari",
                  "Tayyor rang paletralari",
                  "Chap-o'ng menyu tuzilishi",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span className="text-foreground">{t}</span>
                  </li>
                ))}
              </ul>
              <Link href="/register" className="mt-8 inline-block">
                <Button size="lg">
                  Dizaynni sinab ko'rish <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <Reveal className="flex justify-center">
              <EditorPreview />
            </Reveal>
          </div>
        </div>
      </section>

      {/* How it works — QR sayohati */}
      <section id="how" className="border-t border-border py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            tag="Qanday ishlaydi"
            title="Restorandan mijozgacha — bitta oqim"
            subtitle="Texnik bilim shart emas. Hammasi oddiy va tez."
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {journey.map((s, i) => (
              <Reveal key={s.label} delay={i * 70} className="relative">
                <div className="flex flex-col items-center rounded-2xl border border-border bg-card p-5 text-center shadow-soft">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <s.icon className="h-6 w-6" />
                  </div>
                  <span className="mt-3 text-xs font-bold text-accent/70">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="mt-1 text-sm font-medium text-foreground">{s.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Stol QR */}
      <section className="border-t border-border bg-surface/50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <Reveal className="order-2 flex justify-center lg:order-1">
              <TableQrPreview />
            </Reveal>
            <div className="order-1 lg:order-2">
              <Badge variant="accent" className="mb-3">
                <Table2 className="h-3 w-3" /> Stol QR
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Har bir stol — o'z QR kodiga ega
              </h2>
              <p className="mt-3 text-muted">
                Mijoz stoldagi QR kodni skanerlaydi — menyu ochiladi va buyurtma
                qaysi stoldan kelayotgani avtomatik aniqlanadi. Ofitsiant qidirib
                yurmaydi.
              </p>
              <ol className="mt-6 space-y-3">
                {[
                  "Mijoz stol QR kodini skanerlaydi",
                  "Menyu ochiladi",
                  "Stol raqami avtomatik aniqlanadi",
                  "Buyurtma to'g'ri stolga bog'lanib yuboriladi",
                ].map((t, i) => (
                  <li key={t} className="flex items-center gap-3 text-sm">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="text-foreground">{t}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Buyurtma oqimi */}
      <section className="border-t border-border py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            tag="Buyurtma"
            title="Buyurtma jarayonini avtomatlashtiring"
            subtitle="OzodFlow — oddiy QR menyu generatori emas, to'liq restoran boshqaruv platformasi."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <Reveal className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <div className="mb-4 flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-accent" />
                <h3 className="font-semibold text-foreground">Mijoz</h3>
              </div>
              <FlowSteps steps={["Menyuni ochadi", "Taom tanlaydi", "Savatga qo'shadi", "Buyurtma beradi"]} />
            </Reveal>
            <Reveal delay={90} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <div className="mb-4 flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-accent" />
                <h3 className="font-semibold text-foreground">Restoran</h3>
              </div>
              <FlowSteps steps={["Buyurtma panelga keladi", "Xodim qabul qiladi", "Tayyorlanadi", "Buyurtma yopiladi"]} />
            </Reveal>
          </div>
          <Reveal className="mx-auto mt-8 flex max-w-2xl items-center justify-center gap-3 rounded-2xl border border-border bg-surface/50 p-5 text-center">
            <Truck className="h-5 w-5 shrink-0 text-accent" />
            <span className="text-sm text-foreground">
              Yetkazib berish uchun mijoz xaritada joylashuvini belgilaydi — buyurtma manzil bilan keladi.
            </span>
          </Reveal>
        </div>
      </section>

      {/* Statistika */}
      <section className="border-t border-border bg-surface/50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <Badge variant="accent" className="mb-3">
                <TrendingUp className="h-3 w-3" /> Statistika
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                &ldquo;Men pul to'lasam nima olaman?&rdquo;
              </h2>
              <p className="mt-3 text-muted">
                Har bir skaner, mashhur taomlar, eng faol vaqt va eng ko'p buyurtma
                keladigan stollar — barchasi real vaqtda panelingizda. Qaror
                qabul qilish endi taxminga emas, raqamga asoslanadi.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Qaysi taomlar ko'p ko'rilayotganini biling",
                  "Eng faol soatlarni aniqlang",
                  "Menyuni ma'lumotga asoslanib yaxshilang",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span className="text-foreground">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Reveal className="flex justify-center">
              <StatsPreview />
            </Reveal>
          </div>
        </div>
      </section>

      {/* Integratsiyalar (POS / kassa) */}
      <section id="integrations" className="border-t border-border py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            tag="Integratsiyalar"
            title="Mavjud kassa tizimingiz bilan ishlaydi"
            subtitle="Mahsulotlar va narxlar POS tizimingizdan avtomatik sinxronlanadi — ikki marta kiritmaysiz."
          />

          <Reveal className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3">
              {PROVIDER_META.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 border-b border-border p-5 last:border-b-0 sm:[&:nth-last-child(-n+1)]:border-b-0 lg:[&:nth-last-child(-n+2)]:border-b-0"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-lg font-bold text-accent">
                    {p.label.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-foreground">{p.label}</div>
                    {p.available ? (
                      <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-success">
                        <Check className="h-3.5 w-3.5" /> Ulanadi
                      </span>
                    ) : (
                      <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-muted">
                        Tez orada
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          <div className="mx-auto mt-6 grid max-w-4xl gap-4 sm:grid-cols-3">
            {[
              { icon: RefreshCcw, t: "Avtomatik sinxron", d: "Menyu har 5 daqiqada yangilanadi" },
              { icon: ShieldCheck, t: "Xavfsiz", d: "Kalitlar shifrlangan holda saqlanadi" },
              { icon: Crown, t: "Business tarifda", d: "POS integratsiyasi Business rejasida" },
            ].map((x) => (
              <Reveal key={x.t} className="flex items-start gap-3 rounded-2xl border border-border bg-surface/50 p-4">
                <x.icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <div>
                  <p className="text-sm font-medium text-foreground">{x.t}</p>
                  <p className="text-xs text-muted">{x.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Nega OzodFlow? */}
      <section className="border-t border-border py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            tag="Nega OzodFlow?"
            title="Nega restoranlar OzodFlow'ni tanlaydi?"
            subtitle="Zamonaviy, ishonchli va O'zbekistonga moslangan."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {whyReasons.map((w, i) => (
              <Reveal
                key={w.title}
                delay={(i % 3) * 80}
                className="flex gap-4 rounded-2xl border border-border bg-card p-6 shadow-soft"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <w.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{w.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{w.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-border bg-surface/50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            tag="Tariflar"
            title="Sizga mos tarifni tanlang"
            subtitle="Bepul boshlang, biznesingiz o'sishi bilan kengaytiring."
          />
          <div className="mx-auto mt-12 grid max-w-3xl gap-5 sm:grid-cols-2">
            {PLAN_ORDER.map((p, i) => (
              <Reveal
                key={p.key}
                delay={i * 70}
                className={`relative flex flex-col rounded-2xl border p-5 ${
                  p.highlight
                    ? "border-accent bg-card shadow-card"
                    : "border-border bg-card shadow-soft"
                }`}
              >
                {p.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-white">
                    Eng ommabop
                  </span>
                )}
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                    p.highlight ? "bg-accent text-white" : "bg-accent-soft text-accent"
                  }`}
                >
                  <p.Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 font-semibold text-foreground">{PLANS[p.key].name}</h3>
                <p className="mt-1 text-xs text-muted">{p.desc}</p>
                <div className="mt-4">
                  {p.contact ? (
                    <span className="text-xl font-bold text-foreground">Kelishiladi</span>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-foreground">
                        {formatPrice(prices[p.key] ?? 0, "UZS")}
                      </span>
                      <span className="text-xs text-muted">/ oy</span>
                    </div>
                  )}
                </div>
                <ul className="mt-5 flex-1 space-y-2">
                  {FEATURE_MATRIX.filter((f) => f[p.mk] !== false).map((f) => {
                    const val = f[p.mk];
                    return (
                      <li key={f.label} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        <span className="text-foreground">
                          {f.label}
                          {typeof val === "string" && (
                            <span className="text-muted"> — {val}</span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                  {p.contact && (
                    <>
                      <FeatLi text="10+ filial" />
                      <FeatLi text="Maxsus integratsiyalar" />
                      <FeatLi text="Shaxsiy menejer" />
                      <FeatLi text="O'rnatish va sozlash xizmati" />
                    </>
                  )}
                </ul>
                {p.contact ? (
                  <EnterpriseContact />
                ) : (
                  <Link href="/register" className="mt-5 block">
                    <Button variant={p.highlight ? "primary" : "outline"} className="w-full">
                      Tanlash
                    </Button>
                  </Link>
                )}
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Boshqa to'lov usullari — 6 oy oldindan + umrbod */}
      <section className="border-t border-border py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <SectionHeading
            tag="Boshqa to'lov usullari"
            title="Oldindan to'lang va tejang"
            subtitle="Oylik to'lovlar bilan ovora bo'lmang — bir marta to'lab, xotirjam ishlang."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {/* 6 oy oldindan */}
            <Reveal className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Wallet className="h-5 w-5" />
                </span>
                <h3 className="text-lg font-bold text-foreground">6 oy oldindan</h3>
              </div>
              <div className="space-y-3">
                {(["STARTER", "BUSINESS"] as const).map((k) => {
                  const monthly = prices[k] ?? 0;
                  const full = monthly * 6;
                  const six = computePrice(monthly, 6);
                  const off = full > 0 ? Math.round((1 - six / full) * 100) : 0;
                  return (
                    <div key={k} className="flex items-center justify-between rounded-xl bg-surface p-4">
                      <span className="font-medium text-foreground">{PLANS[k].name}</span>
                      <span className="text-right">
                        {off > 0 && (
                          <span className="mr-2 text-xs text-muted line-through">
                            {formatPrice(full, "UZS")}
                          </span>
                        )}
                        <span className="text-lg font-bold text-foreground">
                          {formatPrice(six, "UZS")}
                        </span>
                        <span className="ml-1 text-xs font-normal text-muted">/ 6 oy</span>
                      </span>
                    </div>
                  );
                })}
              </div>
              <ul className="mt-4 space-y-2">
                {["Narx 6 oy davomida o'zgarmaydi", "Har oy to'lov qilish tashvishi yo'q", "Bepul onboarding va sozlash"].map((t) => (
                  <li key={t} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span className="text-foreground">{t}</span>
                  </li>
                ))}
              </ul>
            </Reveal>

            {/* Umrbod */}
            <Reveal delay={90} className="relative rounded-2xl border border-accent bg-card p-6 shadow-card">
              <span className="absolute -top-3 left-6 rounded-full bg-accent px-3 py-1 text-xs font-medium text-white">
                Eng tejamli
              </span>
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white">
                  <Crown className="h-5 w-5" />
                </span>
                <h3 className="text-lg font-bold text-foreground">Umrbod sotib olish</h3>
              </div>
              <div className="space-y-3">
                {(["STARTER", "BUSINESS"] as const).map((k) => {
                  const auto = (prices[k] ?? 0) * LIFETIME_MONTHS;
                  const life = lifetimePrices[k] ?? auto;
                  const off = auto > 0 ? Math.round((1 - life / auto) * 100) : 0;
                  return (
                    <div key={k} className="flex items-center justify-between rounded-xl bg-surface p-4">
                      <span className="font-medium text-foreground">{PLANS[k].name}</span>
                      <span className="text-right">
                        {off > 0 && (
                          <span className="mr-2 text-xs text-muted line-through">
                            {formatPrice(auto, "UZS")}
                          </span>
                        )}
                        <span className="text-lg font-bold text-foreground">
                          {formatPrice(life, "UZS")}
                        </span>
                        {off > 0 && (
                          <span className="ml-1 rounded bg-success/10 px-1.5 py-0.5 text-xs font-semibold text-success">
                            −{off}%
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-sm text-muted">
                Bir marta to'laysiz — va tarifdan umrbod foydalanasiz, oylik
                to'lovlarsiz. Bugungi narx keyingi oshirilishidan oldin sizga
                qotib qoladi.
              </p>
              <Link href="/register" className="mt-5 block">
                <Button className="w-full">
                  Bepul boshlash <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Ishonch — real ko'rsatkichlar (soxta izohlar o'rniga) */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            tag="Ishonch"
            title="Raqamlar bilan"
            subtitle="OzodFlow O'zbekiston bo'ylab restoran va kafelar tomonidan ishlatiladi."
          />
          <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {trustStats.map((s, i) => (
              <Reveal
                key={s.label}
                delay={i * 80}
                className="rounded-2xl border border-border bg-card p-6 text-center shadow-soft"
              >
                <p className="text-3xl font-bold text-accent sm:text-4xl">{s.value}</p>
                <p className="mt-2 text-sm text-muted">{s.label}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Blog — yulduzchali maqolalar */}
      {featuredPosts.length > 0 && (
        <section id="blog" className="border-t border-border py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <Badge variant="accent" className="mb-3">
                  Blog
                </Badge>
                <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  So'nggi yangiliklar
                </h2>
              </div>
              <Link
                href="/blog"
                className="hidden shrink-0 items-center gap-1 text-sm font-medium text-accent hover:underline sm:flex"
              >
                Barchasi <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredPosts.map((p, i) => (
                <Reveal key={p.id} delay={i * 60}>
                  <Link
                    href={`/blog/${p.slug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-card"
                  >
                    <div className="aspect-[16/10] w-full overflow-hidden bg-surface-2">
                      {p.coverImage ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={p.coverImage}
                          alt={p.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted/40">
                          <Newspaper className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <div className="mb-2 flex items-center gap-2 text-xs text-muted">
                        <span>
                          {new Date(p.publishDate).toLocaleDateString("uz", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                        {p.version && <Badge variant="accent">{p.version}</Badge>}
                      </div>
                      <h3 className="font-semibold text-foreground group-hover:text-accent">
                        {p.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-sm text-muted">{p.description}</p>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
            <div className="mt-8 text-center sm:hidden">
              <Link
                href="/blog"
                className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
              >
                Barcha maqolalar <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section id="faq" className="border-t border-border bg-surface/50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            tag="Savol-javob"
            title="Ko'p beriladigan savollar"
            subtitle="Javobini topa olmadingizmi? Biz bilan bog'laning."
          />
          <div className="mt-12">
            <FAQ />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <Reveal className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-accent px-6 py-16 text-center">
            {/* Bezak — yumshoq nur dog'lari */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -bottom-20 -right-10 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
            </div>
            <div className="relative">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Bugun raqamlashtirishni boshlang
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-white/80">
                Restoraningiz uchun professional elektron menyuni bir daqiqada
                yarating. Bepul.
              </p>
              <Link
                href="/register"
                className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-6 text-base font-semibold text-accent shadow-soft transition-all hover:bg-white/90 active:scale-[0.98]"
              >
                Bepul boshlash <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <Logo />
            <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted">
              <a href="#features" className="hover:text-foreground">
                Imkoniyatlar
              </a>
              <a href="#pricing" className="hover:text-foreground">
                Tariflar
              </a>
              <a href="#faq" className="hover:text-foreground">
                Savol-javob
              </a>
              <Link href="/blog" className="hover:text-foreground">
                Blog
              </Link>
              <Link href="/login" className="hover:text-foreground">
                Kirish
              </Link>
              <Link href="/privacy" className="hover:text-foreground">
                Maxfiylik
              </Link>
              <Link href="/terms" className="hover:text-foreground">
                Shartlar
              </Link>
            </nav>
          </div>
          <div className="mt-8 border-t border-border pt-6 text-center text-sm text-muted">
            © {new Date().getFullYear()} OzodFlow. Barcha huquqlar himoyalangan.
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatLi({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
      <span className="text-foreground">{text}</span>
    </li>
  );
}

function SectionHeading({
  tag,
  title,
  subtitle,
}: {
  tag: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <Badge variant="accent" className="mb-3">
        {tag}
      </Badge>
      <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      <p className="mt-3 text-muted">{subtitle}</p>
    </Reveal>
  );
}

function DashboardPreview() {
  return (
    <div className="hidden w-[420px] rounded-2xl border border-border bg-card p-4 shadow-card lg:block">
      <div className="mb-4 flex items-center gap-2">
        <LayoutDashboard className="h-4 w-4 text-accent" />
        <span className="text-sm font-medium text-foreground">Dashboard</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { l: "Bugungi skan", v: "1 284" },
          { l: "Mahsulotlar", v: "56" },
          { l: "Kategoriya", v: "8" },
        ].map((c) => (
          <div key={c.l} className="rounded-xl bg-surface p-3">
            <p className="text-[10px] text-muted">{c.l}</p>
            <p className="mt-1 text-lg font-bold text-foreground">{c.v}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl bg-surface p-3">
        <div className="mb-2 flex items-end justify-between gap-1 h-20">
          {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
            <div
              key={i}
              style={{ height: `${h}%` }}
              className="flex-1 rounded-t bg-accent/70"
            />
          ))}
        </div>
        <p className="text-[10px] text-muted">Haftalik skanerlar</p>
      </div>
    </div>
  );
}

function PhonePreview() {
  return (
    <div className="w-[220px] shrink-0">
      <div className="rounded-[2rem] border-[6px] border-foreground/10 bg-card p-3 shadow-card">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <div className="h-8 w-8 rounded-lg bg-accent-soft" />
          <div>
            <div className="h-2.5 w-20 rounded bg-foreground/20" />
            <div className="mt-1 h-2 w-14 rounded bg-foreground/10" />
          </div>
        </div>
        <div className="mt-3 flex gap-2 overflow-hidden">
          {["Osh", "Salat", "Ichimlik"].map((t, i) => (
            <span
              key={t}
              className={`rounded-full px-2 py-1 text-[9px] ${
                i === 0
                  ? "bg-accent text-white"
                  : "bg-surface-2 text-muted"
              }`}
            >
              {t}
            </span>
          ))}
        </div>
        <div className="mt-3 space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-2 rounded-xl bg-surface p-2">
              <div className="h-12 w-12 shrink-0 rounded-lg bg-accent/10" />
              <div className="flex-1">
                <div className="h-2.5 w-24 rounded bg-foreground/20" />
                <div className="mt-1.5 h-2 w-16 rounded bg-foreground/10" />
                <div className="mt-2 h-2.5 w-14 rounded bg-accent/40" />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-center gap-1 rounded-xl bg-accent-soft py-2 text-accent">
          <Smartphone className="h-3 w-3" />
          <span className="text-[9px] font-medium">QR menyu</span>
        </div>
      </div>
    </div>
  );
}

// Dizayn editor ko'rgazmasi (chapda sozlamalar, o'ngda telefon)
function EditorPreview() {
  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <Wand2 className="h-4 w-4 text-accent" />
        <span className="text-sm font-medium text-foreground">Dizaynni sozlash</span>
      </div>
      <div className="grid grid-cols-[1fr_120px] gap-3">
        {/* chap: sozlamalar */}
        <div className="space-y-2.5">
          <div className="text-[11px] font-semibold text-muted">Ranglar</div>
          <div className="flex gap-1.5">
            {["#8B5E3C", "#2E9E5B", "#2563EB", "#EA580C", "#0A0A0B"].map((c) => (
              <span
                key={c}
                className="h-6 w-6 rounded-full border-2 border-card shadow-soft"
                style={{ background: c }}
              />
            ))}
          </div>
          {[
            { l: "Asosiy rang", c: "#8B5E3C" },
            { l: "Fon", c: "#F8F5F0" },
            { l: "Tugma", c: "#8B5E3C" },
          ].map((row) => (
            <div
              key={row.l}
              className="flex items-center justify-between rounded-lg border border-border px-2.5 py-1.5"
            >
              <span className="text-[11px] text-foreground">{row.l}</span>
              <span className="h-4 w-4 rounded" style={{ background: row.c }} />
            </div>
          ))}
          <div className="rounded-lg border border-border px-2.5 py-2">
            <div className="mb-1 text-[10px] text-muted">Burchak radiusi</div>
            <div className="h-1.5 w-full rounded-full bg-surface-2">
              <div className="h-1.5 w-2/3 rounded-full bg-accent" />
            </div>
          </div>
        </div>
        {/* o'ng: telefon preview */}
        <div className="rounded-2xl border-4 border-foreground/80 bg-foreground/80 p-1">
          <div className="overflow-hidden rounded-xl bg-card">
            <div className="h-16 bg-gradient-to-br from-accent/80 to-accent" />
            <div className="p-2">
              <div className="-mt-6 mb-1.5 h-7 w-7 rounded-lg border-2 border-card bg-accent" />
              <div className="h-2 w-3/4 rounded bg-foreground/20" />
              <div className="mt-1 h-1.5 w-1/2 rounded bg-foreground/10" />
              <div className="mt-2 h-5 w-full rounded-md bg-accent" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stol QR ko'rgazmasi
function TableQrPreview() {
  return (
    <div className="relative w-[260px]">
      <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-card">
        <p className="text-sm font-semibold text-foreground">Stol №12</p>
        <div className="mx-auto mt-4 h-40 w-40">
          <div className="grid h-full w-full grid-cols-7 grid-rows-7 gap-0.5 rounded-xl border border-border bg-white p-2">
            {Array.from({ length: 49 }).map((_, i) => {
              // Barqaror soxta QR naqsh (deterministik)
              const on = (i * 7 + (i % 5) * 3 + ((i >> 1) & 1)) % 3 !== 0;
              const corner =
                (i < 3 || (i >= 7 && i < 10) || (i >= 14 && i < 17)) &&
                (i % 7 < 3);
              return (
                <span
                  key={i}
                  className="rounded-[1px]"
                  style={{ background: on || corner ? "#111827" : "transparent" }}
                />
              );
            })}
          </div>
        </div>
        <p className="mt-4 text-xs text-muted">Skanerlang — menyu ochiladi</p>
      </div>
      <div className="absolute -bottom-3 -right-3 flex h-11 w-11 items-center justify-center rounded-full bg-accent text-white shadow-card">
        <QrCode className="h-5 w-5" />
      </div>
    </div>
  );
}

// Buyurtma oqimi qadamlari
function FlowSteps({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-2.5">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
            {i + 1}
          </span>
          <span className="text-sm text-foreground">{s}</span>
        </li>
      ))}
    </ol>
  );
}

// Statistika ko'rgazmasi
function StatsPreview() {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Restoran statistikasi</span>
        <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
          +18.4%
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-surface p-3">
          <p className="text-[11px] text-muted">Bugungi skaner</p>
          <p className="mt-1 text-2xl font-bold text-foreground">1 284</p>
        </div>
        <div className="rounded-xl bg-surface p-3">
          <p className="text-[11px] text-muted">Buyurtmalar</p>
          <p className="mt-1 text-2xl font-bold text-foreground">86</p>
        </div>
      </div>
      <div className="mt-4">
        <p className="mb-2 text-[11px] font-semibold text-muted">Eng ko'p ko'rilgan</p>
        <div className="space-y-2">
          {[
            { n: "🥇 Osh", v: 84 },
            { n: "🥈 Lavash", v: 72 },
            { n: "🥉 Choy", v: 61 },
          ].map((r) => (
            <div key={r.n} className="flex items-center gap-2">
              <span className="w-20 text-xs text-foreground">{r.n}</span>
              <div className="h-2 flex-1 rounded-full bg-surface-2">
                <div className="h-2 rounded-full bg-accent" style={{ width: `${r.v}%` }} />
              </div>
              <span className="w-8 text-right text-[11px] text-muted">{r.v}%</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between rounded-xl bg-surface p-3 text-xs">
        <span className="text-muted">Eng faol vaqt</span>
        <span className="font-semibold text-foreground">19:00 — 21:00</span>
      </div>
    </div>
  );
}
