import Link from "next/link";
import { headers } from "next/headers";
import { getMenuByDomain, resolveTable } from "@/lib/menu";
import { PublicMenu } from "@/components/public/public-menu";
import { getPlanPrices } from "@/lib/plan-prices";
import { PLANS, FEATURE_MATRIX } from "@/lib/plans";
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
} from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { Button, Badge } from "@/components/ui";
import { SiteNav } from "@/components/landing/site-nav";
import { FAQ } from "@/components/landing/faq";

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

const steps = [
  {
    n: "01",
    title: "Ro'yxatdan o'ting",
    desc: "Bir daqiqada hisob yarating va restoraningizni qo'shing.",
  },
  {
    n: "02",
    title: "Menyu yarating",
    desc: "Kategoriya va mahsulotlarni qo'shing, rasm va narxlarni kiriting.",
  },
  {
    n: "03",
    title: "QR kodni chop eting",
    desc: "Tayyor QR kodni yuklab olib stollarga joylashtiring.",
  },
  {
    n: "04",
    title: "Mijozlar ko'radi",
    desc: "Mijozlar QR kodni skanerlab zamonaviy menyuni ochadi.",
  },
];

const PLAN_ORDER = [
  { key: "FREE" as const, mk: "free" as const, desc: "Sinab ko'rish uchun", cta: "Bepul boshlash", highlight: false },
  { key: "PRO" as const, mk: "pro" as const, desc: "O'sib borayotgan biznes", cta: "Pro tanlash", highlight: false },
  { key: "PROMAX" as const, mk: "promax" as const, desc: "Barcha imkoniyatlar", cta: "Pro Max tanlash", highlight: true },
];

const testimonials = [
  {
    name: "Sardor Rahimov",
    role: "Osh Markazi, Toshkent",
    text: "Qog'oz menyudan voz kechdik. Endi narxlarni bir soniyada yangilaymiz, mijozlar ham menyuni yoqtirishmoqda.",
  },
  {
    name: "Dilnoza Karimova",
    role: "Coffee House, Samarqand",
    text: "Dizayni juda chiroyli va professional. QR statistikasi qaysi taomlar mashhurligini ko'rsatib beradi.",
  },
  {
    name: "Jasur Aliyev",
    role: "Fast Food tarmog'i",
    text: "3 ta filialni bitta paneldan boshqaramiz. OzodFlow biz uchun juda katta vaqt tejaydi.",
  },
];

export const dynamic = "force-dynamic";

// Platforma asosiy domenlari (bularda landing ko'rsatiladi)
const PLATFORM_HOSTS = (process.env.PLATFORM_HOSTS || "")
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

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

  if (!isPlatform) {
    const menu = await getMenuByDomain(host);
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
        />
      );
    }
  }

  const user = await getSessionUser();
  const prices = await getPlanPrices();

  return (
    <div className="min-h-screen bg-background">
      <SiteNav loggedIn={!!user} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-accent/5 blur-3xl" />
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="accent" className="mb-5">
              <Zap className="h-3 w-3" /> Restoranlar uchun #1 elektron menyu
            </Badge>
            <h1 className="text-balance text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-6xl">
              Restoraningizni{" "}
              <span className="text-accent">raqamlashtiring</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
              OzodFlow — QR kod orqali zamonaviy elektron menyu. Menyuni
              yarating, boshqaring va barcha filiallarni bitta professional
              paneldan nazorat qiling.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto">
                  Bepul boshlash <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="/m/test" target="_blank" rel="noreferrer">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  <Eye className="h-4 w-4" /> Demo menyuni ko'rish
                </Button>
              </a>
            </div>
            <p className="mt-4 text-sm text-muted">
              Karta talab qilinmaydi · 1 daqiqada tayyor
            </p>
          </div>

          {/* Preview */}
          <div className="mt-16 flex items-end justify-center gap-6">
            <DashboardPreview />
            <PhonePreview />
          </div>
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
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-border bg-card p-6 shadow-soft transition-all hover:shadow-card"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            tag="Qanday ishlaydi"
            title="4 qadamda ishga tushiring"
            subtitle="Texnik bilim shart emas. Hammasi oddiy va tez."
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div key={s.n} className="relative">
                <span className="text-4xl font-bold text-accent/20">{s.n}</span>
                <h3 className="mt-2 font-semibold text-foreground">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{s.desc}</p>
              </div>
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
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {PLAN_ORDER.map((p) => (
              <div
                key={p.key}
                className={`relative flex flex-col rounded-2xl border p-6 ${
                  p.highlight
                    ? "border-accent bg-card shadow-card"
                    : "border-border bg-card shadow-soft"
                }`}
              >
                {p.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-white">
                    Eng to'liq
                  </span>
                )}
                <h3 className="font-semibold text-foreground">{PLANS[p.key].name}</h3>
                <p className="mt-1 text-sm text-muted">{p.desc}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-foreground">
                    {prices[p.key] === 0 ? "0" : formatPrice(prices[p.key], "UZS")}
                  </span>
                  <span className="text-sm text-muted">
                    {p.key === "FREE" ? "so'm" : "/ oy"}
                  </span>
                </div>
                {p.key === "FREE" && (
                  <p className="mt-1 text-xs text-muted">7 kunlik sinov</p>
                )}
                <ul className="mt-6 flex-1 space-y-2.5">
                  {FEATURE_MATRIX.map((f) => {
                    const val = f[p.mk];
                    const has = val !== false;
                    return (
                      <li key={f.label} className="flex items-start gap-2 text-sm">
                        {has ? (
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        ) : (
                          <X className="mt-0.5 h-4 w-4 shrink-0 text-muted/40" />
                        )}
                        <span className={has ? "text-foreground" : "text-muted/50 line-through"}>
                          {f.label}
                          {typeof val === "string" && (
                            <span className="text-muted"> — {val}</span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <Link href="/register" className="mt-6 block">
                  <Button
                    variant={p.highlight ? "primary" : "outline"}
                    className="w-full"
                  >
                    {p.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            tag="Mijozlar fikri"
            title="Restoranlar bizni tanlaydi"
            subtitle="O'zbekiston bo'ylab yuzlab ovqatlanish maskanlari ishonadi."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="rounded-2xl border border-border bg-card p-6 shadow-soft"
              >
                <div className="mb-4 flex gap-0.5 text-warning">
                  {"★★★★★".split("").map((s, i) => (
                    <span key={i}>{s}</span>
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-foreground">
                  “{t.text}”
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {t.name}
                    </p>
                    <p className="text-xs text-muted">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

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
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-accent px-6 py-16 text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Bugun raqamlashtirishni boshlang
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/80">
              Restoraningiz uchun professional elektron menyuni bir daqiqada
              yarating. Bepul.
            </p>
            <Link href="/register" className="mt-8 inline-block">
              <Button
                size="lg"
                className="bg-white text-accent hover:bg-white/90"
              >
                Bepul boshlash <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
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
              <Link href="/login" className="hover:text-foreground">
                Kirish
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
    <div className="mx-auto max-w-2xl text-center">
      <Badge variant="accent" className="mb-3">
        {tag}
      </Badge>
      <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      <p className="mt-3 text-muted">{subtitle}</p>
    </div>
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
