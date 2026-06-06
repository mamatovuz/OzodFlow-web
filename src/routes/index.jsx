import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  BriefcaseBusiness,
  Check,
  Clock,
  Database,
  ExternalLink,
  Globe,
  LayoutGrid,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";

import {
  DEFAULT_SITE_DATA,
  TG_CHANNEL,
  TG_SUPPORT,
  fetchSiteData,
  getStoredSiteData,
  storeSiteData,
} from "@/lib/site-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OzodFlow - Landing, Telegram bot, CRM va saytlar" },
      {
        name: "description",
        content: "OzodFlow - Andijon. Sayt, Telegram bot va CRM tizimlar. Aloqa: +998 93 303 04 10.",
      },
      { property: "og:title", content: "OzodFlow - Raqamli mahsulotlar studiyasi" },
      { property: "og:description", content: "Landing page, Telegram bot, CRM va biznes saytlar." },
    ],
  }),
  component: Index,
});

const TG = TG_SUPPORT;
const LOGO_URL = "/favicon.svg";

const iconMap = {
  Globe,
  Bot,
  Database,
  LayoutGrid,
  Sparkles,
  BriefcaseBusiness,
};

const process = [
  { n: "01", t: "Tanishuv", d: "Telegram orqali loyiha haqida gaplashamiz, maqsadni aniqlaymiz. Bepul konsultatsiya." },
  { n: "02", t: "Taklif", d: "Texnik topshiriq, aniq narx va muddat yozma ko'rinishda taqdim etiladi." },
  { n: "03", t: "Dizayn & Kod", d: "Prototip, tasdiqdan keyin kod. Har bosqichda siz bilan kelishilib boriladi." },
  { n: "04", t: "Ishga tushirish", d: "Domen, hosting, sozlash va o'rgatish. 30 kun bepul texnik yordam." },
];

const faqs = [
  { q: "Loyiha qancha vaqtda tayyor bo'ladi?", a: "Landing - 5-10 kun. Telegram bot - 1-2 hafta. CRM - 3-6 hafta. Aniq muddat texnik topshiriqdan keyin." },
  { q: "Oldindan to'lov kerakmi?", a: "Ha, 50% oldindan, 50% topshirilganda. Yirik loyihalarda 3 bosqichli to'lov mumkin." },
  { q: "Domen va hostingni o'zim olamanmi?", a: "Yo'q, men yordam beraman yoki o'zim sozlab beraman. Birinchi yil mening hisobimdan." },
  { q: "Kafolat berasizmi?", a: "Ha. 30 kun davomida kodda bo'lgan har qanday xatoni bepul tuzataman." },
  { q: "Tayyor shablonlardan foydalanasizmi?", a: "Yo'q. Har bir loyiha noldan, sizning brendingiz va talablaringizga moslab yoziladi." },
];

const stats = [
  { n: "40+", l: "Tugallangan loyihalar" },
  { n: "3 yil", l: "Tajriba" },
  { n: "24 soat", l: "Javob vaqti" },
  { n: "30 kun", l: "Bepul kafolat" },
];

function useSiteData() {
  const [siteData, setSiteData] = useState(DEFAULT_SITE_DATA);

  useEffect(() => {
    const controller = new AbortController();
    setSiteData(getStoredSiteData());

    fetchSiteData({ signal: controller.signal })
      .then((data) => {
        storeSiteData(data);
        setSiteData(data);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setSiteData(getStoredSiteData());
        }
      });

    return () => controller.abort();
  }, []);

  return siteData;
}

function Index() {
  const { services, projects } = useSiteData();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        <Hero />
        <Trust />
        <Services services={services} />
        <Projects projects={projects} />
        <Process />
        <Why />
        <FAQ />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}

function Logo() {
  return (
    <a href="/" className="flex items-center gap-2.5 group">
      <img src={LOGO_URL} alt="OzodFlow" className="h-9 w-9 rounded-lg shadow-card" />
      <span className="font-display font-bold text-xl tracking-tight">OzodFlow</span>
    </a>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          <a href="#xizmatlar" className="hover:text-foreground transition">Xizmatlar</a>
          <a href="#loyihalar" className="hover:text-foreground transition">Loyihalarim</a>
          <a href="#jarayon" className="hover:text-foreground transition">Jarayon</a>
          <a href="#savollar" className="hover:text-foreground transition">Savollar</a>
          <a href="#aloqa" className="hover:text-foreground transition">Aloqa</a>
        </nav>
        <a
          href={TG}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-card transition hover:bg-accent"
        >
          Aloqa <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-hero">
      <div className="absolute inset-0 grid-bg opacity-60" />
      <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-20 md:px-6 md:pb-32 md:pt-28">
        <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-card">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          Yangi loyihalarga ochiq - 2026
        </div>

        <h1 className="mt-8 max-w-4xl text-balance font-display text-5xl font-extrabold leading-[1.05] tracking-tight md:text-7xl">
          Biznesingiz uchun <span className="text-accent">raqamli yechim</span> - sayt, bot va CRM.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
          Men <span className="font-semibold text-foreground">Ozodbek</span> - mustaqil dasturchiman.
          Andijonda va butun O'zbekiston bo'ylab biznes uchun zamonaviy, ishonchli va sotuvchi
          raqamli mahsulotlar yarataman.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <a
            href="#xizmatlar"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-elevated transition hover:bg-accent"
          >
            Xizmat va narxlar <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href={TG}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border bg-card px-6 py-3.5 text-sm font-semibold transition hover:border-accent hover:text-accent"
          >
            <MessageCircle className="h-4 w-4" /> Telegram'da yozish
          </a>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.l} className="rounded-xl border bg-card p-5 shadow-card">
              <div className="font-display text-3xl font-bold text-foreground">{s.n}</div>
              <div className="mt-1 text-xs text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Trust() {
  const points = [
    { icon: Shield, t: "Shartnoma asosida", d: "Har bir loyiha rasmiy shartnoma bilan" },
    { icon: Clock, t: "Aniq muddat", d: "Kelishilgan vaqtda topshirish kafolati" },
    { icon: Zap, t: "Tez javob", d: "24 soat ichida har bir savolga javob" },
  ];

  return (
    <section className="border-y bg-surface/50">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 md:grid-cols-3 md:px-6">
        {points.map((p) => (
          <div key={p.t} className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <p.icon className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-foreground">{p.t}</div>
              <div className="text-sm text-muted-foreground">{p.d}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Services({ services }) {
  return (
    <section id="xizmatlar" className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
            <Sparkles className="h-3.5 w-3.5" /> Xizmatlar
          </div>
          <h2 className="mt-4 text-balance font-display text-4xl font-bold tracking-tight md:text-5xl">
            Xizmatlar. Aniq narx. Yashirin to'lovsiz.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Loyihangiz hajmiga qarab paket tanlang yoki Telegram orqali individual taklif so'rang.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {services.map((s) => {
            const Icon = iconMap[s.icon] || Sparkles;

            return (
              <article
                key={s.id}
                className={`group relative rounded-2xl border bg-card p-7 shadow-card transition hover:shadow-elevated ${
                  s.featured ? "border-accent/40 ring-1 ring-accent/20" : ""
                }`}
              >
                {s.featured && (
                  <div className="absolute -top-3 left-7 inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground shadow-card">
                    Mashhur
                  </div>
                )}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/5 text-primary transition group-hover:bg-accent/10 group-hover:text-accent">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-xs font-mono text-muted-foreground">{s.deadline}</div>
                </div>

                <h3 className="mt-5 font-display text-2xl font-bold">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{s.desc}</p>

                <ul className="mt-5 space-y-2">
                  {s.items.map((it) => (
                    <li key={it} className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 flex items-end justify-between gap-4 border-t pt-6">
                  <div>
                    <div className="text-xs text-muted-foreground">Boshlang'ich narx</div>
                    <div className="font-display text-2xl font-bold text-foreground">
                      {s.price} <span className="font-sans text-sm font-normal text-muted-foreground">so'm</span>
                    </div>
                  </div>
                  <a
                    href={TG}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold transition hover:bg-primary hover:text-primary-foreground"
                  >
                    Buyurtma <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
              </article>
            );
          })}
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          * Narxlar minimal funksionallik uchun. Aniq narx loyiha hajmi va talablariga qarab belgilanadi.
        </p>
      </div>
    </section>
  );
}

function Projects({ projects }) {
  const [showAll, setShowAll] = useState(false);
  const visibleProjects = useMemo(() => (showAll ? projects : projects.slice(0, 5)), [projects, showAll]);
  const hasMore = projects.length > 5;

  return (
    <section id="loyihalar" className="border-y bg-surface/60 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
              <BriefcaseBusiness className="h-3.5 w-3.5" /> Loyihalarim
            </div>
            <h2 className="mt-4 text-balance font-display text-4xl font-bold tracking-tight md:text-5xl">
              Men qilgan ishlar va real yechimlar.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Bu bo'lim admin panel orqali yangilanadi. 5 tadan ko'p loyiha bo'lsa, qolganlari tugma bilan ochiladi.
            </p>
          </div>
          <a
            href={TG_CHANNEL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-2 rounded-xl border bg-card px-5 py-3 text-sm font-semibold transition hover:border-accent hover:text-accent"
          >
            Kanalga o'tish <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {visibleProjects.map((project) => (
            <article key={project.id} className="rounded-2xl border bg-card p-6 shadow-card transition hover:shadow-elevated">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-accent">{project.category}</div>
                  <h3 className="mt-2 font-display text-2xl font-bold">{project.title}</h3>
                </div>
                <a
                  href={project.url || TG_CHANNEL}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground transition hover:bg-accent hover:text-accent-foreground"
                  aria-label={`${project.title} havolasini ochish`}
                >
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{project.desc}</p>
              <div className="mt-5 rounded-xl bg-surface px-4 py-3 text-sm font-semibold text-foreground">
                {project.result}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {project.stack.map((item) => (
                  <span key={item} className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                    {item}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>

        {hasMore && (
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={() => setShowAll((value) => !value)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-card transition hover:bg-accent"
            >
              {showAll ? "Qisman ko'rish" : "Hammasini ko'rish"}
              <ArrowRight className={`h-4 w-4 transition ${showAll ? "-rotate-90" : ""}`} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function Process() {
  return (
    <section id="jarayon" className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
            Jarayon
          </div>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight md:text-5xl">
            G'oyadan ishga tushirishgacha - 4 qadam.
          </h2>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-4">
          {process.map((p, i) => (
            <div key={p.n} className="relative rounded-2xl border bg-card p-6 shadow-card">
              <div className="font-mono text-xs font-semibold text-accent">{p.n}</div>
              <h3 className="mt-3 font-display text-xl font-bold">{p.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.d}</p>
              {i < process.length - 1 && (
                <ArrowRight className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 bg-background text-border md:block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Why() {
  const items = [
    { t: "Mustaqil ishlash", d: "Agentliklar emas - to'g'ridan-to'g'ri men bilan ishlaysiz. Komissiya yo'q." },
    { t: "Zamonaviy texnologiyalar", d: "React, Node.js, PostgreSQL va biznesga mos arxitektura." },
    { t: "O'zbek tilida", d: "Loyiha hujjatlari va texnik yordam to'liq o'zbek tilida." },
    { t: "Uzoq muddatli hamkorlik", d: "Loyiha topshirilgandan keyin ham qo'llab-quvvatlash va yangilanishlar." },
  ];

  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 md:grid-cols-12 md:px-6">
        <div className="md:col-span-5">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
            Nega men
          </div>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight md:text-5xl">
            To'g'ridan-to'g'ri dasturchi bilan.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Sizning loyihangiz - mening shaxsiy mas'uliyatim. Hech qanday vositachi, menejer yoki komissiya yo'q.
          </p>
          <a
            href={TG}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex items-center gap-2 font-semibold text-accent underline-offset-4 hover:underline"
          >
            Suhbatlashamizmi? <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:col-span-7">
          {items.map((it) => (
            <div key={it.t} className="rounded-xl border bg-card p-6 shadow-card">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Check className="h-4 w-4" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{it.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{it.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  return (
    <section id="savollar" className="border-y bg-surface/60 py-24 md:py-32">
      <div className="mx-auto max-w-4xl px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
            Savol-javob
          </div>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight md:text-5xl">
            Tez-tez beriladigan savollar
          </h2>
        </div>

        <div className="mt-14 space-y-3">
          {faqs.map((f) => (
            <details key={f.q} className="group rounded-xl border bg-card px-6 py-5 shadow-card transition open:shadow-elevated">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6">
                <span className="font-display text-lg font-semibold">{f.q}</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-lg leading-none text-foreground transition group-open:rotate-45 group-open:bg-accent group-open:text-accent-foreground">
                  +
                </span>
              </summary>
              <p className="mt-4 leading-relaxed text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contact() {
  const channels = [
    { icon: MessageCircle, label: "Telegram (Support)", value: "@OzodFlow_uz", href: TG_SUPPORT },
    { icon: MessageCircle, label: "Telegram kanal", value: "@OzodFlow", href: TG_CHANNEL },
    { icon: Mail, label: "Email", value: "mamatovo354@gmail.com", href: "mailto:mamatovo354@gmail.com" },
    { icon: Phone, label: "Telefon", value: "+998 93 303 04 10", href: "tel:+998933030410" },
    { icon: MapPin, label: "Joylashuv", value: "Andijon, O'zbekiston", href: "#" },
  ];

  return (
    <section id="aloqa" className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="relative overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground shadow-elevated sm:p-8 md:rounded-3xl md:p-16">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/30 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-sky/20 blur-3xl" />

          <div className="relative grid min-w-0 items-start gap-8 md:grid-cols-2 md:gap-12">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
                Aloqa
              </div>
              <h2 className="mt-4 font-display text-4xl font-bold tracking-tight md:text-5xl">
                Loyihangizni boshlaymizmi?
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-primary-foreground/70 sm:text-lg">
                Bepul konsultatsiya uchun yozing. 24 soat ichida javob beraman va aniq taklifni taqdim etaman.
              </p>
              <a
                href={TG}
                target="_blank"
                rel="noreferrer"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-accent-foreground shadow-elevated transition hover:opacity-90"
              >
                <MessageCircle className="h-4 w-4" /> Telegram'da yozish
              </a>
            </div>

            <div className="min-w-0 space-y-3">
              {channels.map((c) => (
                <a
                  key={c.label}
                  href={c.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex min-w-0 items-center gap-3 rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-4 transition hover:bg-primary-foreground/10 sm:gap-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/20 text-accent">
                    <c.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-primary-foreground/60">{c.label}</div>
                    <div className="break-words text-base font-semibold leading-snug [overflow-wrap:anywhere]">
                      {c.value}
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-primary-foreground/40 transition group-hover:text-accent" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-10 text-sm text-muted-foreground md:flex-row md:items-baseline md:px-6">
        <Logo />
        <div className="text-xs">© {new Date().getFullYear()} OzodFlow. Barcha huquqlar himoyalangan.</div>
        <div className="flex gap-6 text-sm">
          <a href={TG_CHANNEL} target="_blank" rel="noreferrer" className="transition hover:text-accent">Telegram</a>
          <a href="mailto:mamatovo354@gmail.com" className="transition hover:text-accent">Email</a>
        </div>
      </div>
    </footer>
  );
}
