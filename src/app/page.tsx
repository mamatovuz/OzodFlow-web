import Link from "next/link";
import { headers } from "next/headers";
import { getMenuByDomain, resolveTable } from "@/lib/menu";
import { PublicMenu } from "@/components/public/public-menu";
import { BlockedMenu } from "@/components/public/blocked-menu";
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
  Sparkles,
  Crown,
  Plug,
  RefreshCcw,
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
  { key: "STARTER" as const, mk: "starter" as const, Icon: Sparkles, desc: "Kichik kafe, coffee shop, fast food", highlight: false, contact: false },
  { key: "BUSINESS" as const, mk: "business" as const, Icon: Crown, desc: "Restoran va tarmoqlar uchun", highlight: true, contact: false },
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
              <Zap className="h-3 w-3" /> Restoranlar uchun #1 elektron menyu
            </Badge>
            <h1 className="text-balance text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-6xl">
              Restoraningizni{" "}
              <span className="bg-gradient-to-r from-accent to-accent-hover bg-clip-text text-transparent">
                raqamlashtiring
              </span>
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

            {/* Telefon ramkasida real menyu (iframe) */}
            <div className="flex justify-center">
              <div className="relative w-[300px] shrink-0">
                <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-accent/10 blur-2xl" />
                <div className="rounded-[2.5rem] border-[10px] border-foreground/80 bg-foreground/80 shadow-card">
                  <div className="relative h-[600px] overflow-hidden rounded-[1.7rem] bg-card">
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

      {/* How it works */}
      <section id="how" className="border-t border-border py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            tag="Qanday ishlaydi"
            title="4 qadamda ishga tushiring"
            subtitle="Texnik bilim shart emas. Hammasi oddiy va tez."
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 90} className="relative">
                <span className="text-4xl font-bold text-accent/20">{s.n}</span>
                <h3 className="mt-2 font-semibold text-foreground">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{s.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Integratsiyalar (POS / kassa) */}
      <section id="integrations" className="border-t border-border py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            tag="Integratsiyalar"
            title="Kassa tizimingizga ulanadi"
            subtitle="Mashhur POS tizimlari bilan integratsiya — mahsulot va narxlar avtomatik sinxronlanadi, ikki marta kiritmaysiz."
          />

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PROVIDER_META.map((p, i) => (
              <Reveal
                key={p.id}
                delay={(i % 3) * 80}
                className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-1 hover:shadow-card"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-lg font-bold text-accent">
                  {p.label.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-foreground">{p.label}</div>
                  {p.available ? (
                    <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-success">
                      <Check className="h-3.5 w-3.5" /> Ulanadi
                    </span>
                  ) : (
                    <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-muted">
                      Tez orada
                    </span>
                  )}
                </div>
                <Plug className={`h-5 w-5 shrink-0 ${p.available ? "text-accent" : "text-muted/40"}`} />
              </Reveal>
            ))}
          </div>

          <Reveal className="mx-auto mt-10 flex max-w-3xl flex-col gap-4 rounded-2xl border border-border bg-surface/50 p-6 sm:flex-row sm:items-center sm:justify-center sm:gap-8">
            <div className="flex items-center gap-3">
              <RefreshCcw className="h-5 w-5 shrink-0 text-accent" />
              <span className="text-sm text-foreground">Menyu har 5 daqiqada avtomatik yangilanadi</span>
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 shrink-0 text-accent" />
              <span className="text-sm text-foreground">Kalitlar shifrlangan holda saqlanadi</span>
            </div>
          </Reveal>
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

      {/* Testimonials */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            tag="Mijozlar fikri"
            title="Restoranlar bizni tanlaydi"
            subtitle="O'zbekiston bo'ylab yuzlab ovqatlanish maskanlari ishonadi."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <Reveal
                key={t.name}
                delay={i * 90}
                className="rounded-2xl border border-border bg-card p-6 shadow-soft transition-all hover:shadow-card"
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
              </Reveal>
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
