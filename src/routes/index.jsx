import { createFileRoute } from "@tanstack/react-router";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Menu,
  Moon,
  Phone,
  Quote,
  Shield,
  Sparkles,
  Star,
  Sun,
  X,
  Zap,
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DEFAULT_SITE_DATA,
  TG_CHANNEL,
  TG_SUPPORT,
  fetchSiteData,
  getStoredSiteData,
  storeSiteData,
  submitLead,
} from "@/lib/site-data";
import { getInitialTheme, setStoredTheme } from "@/lib/theme";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OzodFlow - Landing, Telegram bot, CRM va saytlar" },
      {
        name: "description",
        content: "OzodFlow - Andijon. Sayt, Telegram bot va CRM tizimlar. Aloqa: +998 93 230 34 10.",
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

/* ---------------------------------- i18n ---------------------------------- */

const translations = {
  uz: {
    code: "uz",
    htmlLang: "uz",
    switchTo: "RU",
    nav: {
      services: "Xizmatlar",
      projects: "Loyihalarim",
      process: "Jarayon",
      testimonials: "Fikrlar",
      faq: "Savollar",
      contact: "Aloqa",
      cta: "Aloqa",
    },
    hero: {
      badge: "Yangi loyihalarga ochiq - 2026",
      titleStart: "Biznesingiz uchun ",
      titleAccent: "raqamli yechim",
      titleEnd: " - sayt, bot va CRM.",
      descBefore: "Men ",
      name: "Ozodbek",
      descAfter:
        " - mustaqil dasturchiman. Andijonda va butun O'zbekiston bo'ylab biznes uchun zamonaviy, ishonchli va sotuvchi raqamli mahsulotlar yarataman.",
      ctaServices: "Xizmat va narxlar",
      ctaTelegram: "Telegram'da yozish",
    },
    stats: [
      { n: "40+", l: "Tugallangan loyihalar" },
      { n: "3 yil", l: "Tajriba" },
      { n: "24 soat", l: "Javob vaqti" },
      { n: "30 kun", l: "Bepul kafolat" },
    ],
    trust: [
      { t: "Shartnoma asosida", d: "Har bir loyiha rasmiy shartnoma bilan" },
      { t: "Aniq muddat", d: "Kelishilgan vaqtda topshirish kafolati" },
      { t: "Tez javob", d: "24 soat ichida har bir savolga javob" },
    ],
    services: {
      label: "Xizmatlar",
      title: "Xizmatlar. Aniq narx. Yashirin to'lovsiz.",
      desc: "Loyihangiz hajmiga qarab paket tanlang yoki Telegram orqali individual taklif so'rang.",
      popular: "Mashhur",
      startPrice: "Boshlang'ich narx",
      currency: "so'm",
      order: "Buyurtma",
      note: "* Narxlar minimal funksionallik uchun. Aniq narx loyiha hajmi va talablariga qarab belgilanadi.",
    },
    projects: {
      label: "Loyihalarim",
      title: "Men qilgan ishlar va real yechimlar.",
      channel: "Kanalga o'tish",
      showAll: "Hammasini ko'rish",
      showLess: "Qisman ko'rish",
    },
    process: {
      label: "Jarayon",
      title: "G'oyadan ishga tushirishgacha - 4 qadam.",
      steps: [
        { n: "01", t: "Tanishuv", d: "Telegram orqali loyiha haqida gaplashamiz, maqsadni aniqlaymiz. Bepul konsultatsiya." },
        { n: "02", t: "Taklif", d: "Texnik topshiriq, aniq narx va muddat yozma ko'rinishda taqdim etiladi." },
        { n: "03", t: "Dizayn & Kod", d: "Prototip, tasdiqdan keyin kod. Har bosqichda siz bilan kelishilib boriladi." },
        { n: "04", t: "Ishga tushirish", d: "Domen, hosting, sozlash va o'rgatish. 30 kun bepul texnik yordam." },
      ],
    },
    why: {
      label: "Nega men",
      title: "To'g'ridan-to'g'ri dasturchi bilan.",
      desc: "Sizning loyihangiz - mening shaxsiy mas'uliyatim. Hech qanday vositachi, menejer yoki komissiya yo'q.",
      link: "Suhbatlashamizmi?",
      items: [
        { t: "Mustaqil ishlash", d: "Agentliklar emas - to'g'ridan-to'g'ri men bilan ishlaysiz. Komissiya yo'q." },
        { t: "Zamonaviy texnologiyalar", d: "React, Node.js, PostgreSQL va biznesga mos arxitektura." },
        { t: "O'zbek tilida", d: "Loyiha hujjatlari va texnik yordam to'liq o'zbek tilida." },
        { t: "Uzoq muddatli hamkorlik", d: "Loyiha topshirilgandan keyin ham qo'llab-quvvatlash va yangilanishlar." },
      ],
    },
    testimonials: {
      label: "Mijozlar fikri",
      title: "Mijozlar nima deyishadi.",
    },
    faq: {
      label: "Savol-javob",
      title: "Tez-tez beriladigan savollar",
      items: [
        { q: "Loyiha qancha vaqtda tayyor bo'ladi?", a: "Landing - 5-10 kun. Telegram bot - 1-2 hafta. CRM - 3-6 hafta. Aniq muddat texnik topshiriqdan keyin." },
        { q: "Oldindan to'lov kerakmi?", a: "Ha, 50% oldindan, 50% topshirilganda. Yirik loyihalarda 3 bosqichli to'lov mumkin." },
        { q: "Domen va hostingni o'zim olamanmi?", a: "Yo'q, men yordam beraman yoki o'zim sozlab beraman. Birinchi yil mening hisobimdan." },
        { q: "Kafolat berasizmi?", a: "Ha. 30 kun davomida kodda bo'lgan har qanday xatoni bepul tuzataman." },
        { q: "Tayyor shablonlardan foydalanasizmi?", a: "Yo'q. Har bir loyiha noldan, sizning brendingiz va talablaringizga moslab yoziladi." },
      ],
    },
    contact: {
      label: "Aloqa",
      title: "Loyihangizni boshlaymizmi?",
      desc: "Bepul konsultatsiya uchun yozing. 24 soat ichida javob beraman va aniq taklifni taqdim etaman.",
      ctaTelegram: "Telegram'da yozish",
      orForm: "yoki quyidagi formani to'ldiring",
      form: {
        title: "Ariza qoldiring",
        name: "Ismingiz",
        namePh: "Ism familiya",
        phone: "Telefon raqam",
        phonePh: "+998 __ ___ __ __",
        service: "Xizmat turi",
        servicePh: "Tanlang",
        other: "Boshqa",
        message: "Xabar (ixtiyoriy)",
        messagePh: "Loyihangiz haqida qisqacha...",
        submit: "Yuborish",
        sending: "Yuborilmoqda...",
        success: "Rahmat! Tez orada siz bilan bog'lanaman.",
        error: "Xatolik yuz berdi. Telegram orqali yozing yoki qayta urinib ko'ring.",
        required: "Ism va telefon raqamni kiriting.",
      },
    },
    footer: {
      rights: "Barcha huquqlar himoyalangan.",
    },
  },
  ru: {
    code: "ru",
    htmlLang: "ru",
    switchTo: "UZ",
    nav: {
      services: "Услуги",
      projects: "Проекты",
      process: "Процесс",
      testimonials: "Отзывы",
      faq: "Вопросы",
      contact: "Контакты",
      cta: "Связаться",
    },
    hero: {
      badge: "Открыт для новых проектов - 2026",
      titleStart: "Для вашего бизнеса — ",
      titleAccent: "цифровое решение",
      titleEnd: ": сайт, бот и CRM.",
      descBefore: "Я ",
      name: "Ozodbek",
      descAfter:
        " - независимый разработчик. Создаю современные, надёжные и продающие цифровые продукты для бизнеса в Андижане и по всему Узбекистану.",
      ctaServices: "Услуги и цены",
      ctaTelegram: "Написать в Telegram",
    },
    stats: [
      { n: "40+", l: "Завершённых проектов" },
      { n: "3 года", l: "Опыта" },
      { n: "24 часа", l: "Время ответа" },
      { n: "30 дней", l: "Бесплатная гарантия" },
    ],
    trust: [
      { t: "По договору", d: "Каждый проект с официальным договором" },
      { t: "Точные сроки", d: "Гарантия сдачи в оговорённый срок" },
      { t: "Быстрый ответ", d: "Ответ на любой вопрос в течение 24 часов" },
    ],
    services: {
      label: "Услуги",
      title: "Услуги. Чёткая цена. Без скрытых платежей.",
      desc: "Выберите пакет по масштабу проекта или запросите индивидуальное предложение в Telegram.",
      popular: "Популярный",
      startPrice: "Начальная цена",
      currency: "сум",
      order: "Заказать",
      note: "* Цены указаны за минимальный функционал. Точная цена зависит от объёма и требований проекта.",
    },
    projects: {
      label: "Проекты",
      title: "Мои работы и реальные решения.",
      channel: "Перейти в канал",
      showAll: "Показать все",
      showLess: "Свернуть",
    },
    process: {
      label: "Процесс",
      title: "От идеи до запуска - 4 шага.",
      steps: [
        { n: "01", t: "Знакомство", d: "Обсуждаем проект в Telegram, определяем цель. Бесплатная консультация." },
        { n: "02", t: "Предложение", d: "Техническое задание, точная цена и срок предоставляются письменно." },
        { n: "03", t: "Дизайн и код", d: "Прототип, после утверждения - код. Каждый этап согласуется с вами." },
        { n: "04", t: "Запуск", d: "Домен, хостинг, настройка и обучение. 30 дней бесплатной поддержки." },
      ],
    },
    why: {
      label: "Почему я",
      title: "Напрямую с разработчиком.",
      desc: "Ваш проект - моя личная ответственность. Никаких посредников, менеджеров и комиссий.",
      link: "Обсудим?",
      items: [
        { t: "Независимая работа", d: "Не агентства - вы работаете напрямую со мной. Без комиссий." },
        { t: "Современные технологии", d: "React, Node.js, PostgreSQL и подходящая бизнесу архитектура." },
        { t: "На вашем языке", d: "Документация и техподдержка на узбекском и русском." },
        { t: "Долгосрочное сотрудничество", d: "Поддержка и обновления даже после сдачи проекта." },
      ],
    },
    testimonials: {
      label: "Отзывы клиентов",
      title: "Что говорят клиенты.",
    },
    faq: {
      label: "Вопрос-ответ",
      title: "Часто задаваемые вопросы",
      items: [
        { q: "Сколько времени займёт проект?", a: "Лендинг - 5-10 дней. Telegram-бот - 1-2 недели. CRM - 3-6 недель. Точный срок - после техзадания." },
        { q: "Нужна ли предоплата?", a: "Да, 50% предоплата, 50% при сдаче. Для крупных проектов возможна оплата в 3 этапа." },
        { q: "Домен и хостинг покупать самому?", a: "Нет, я помогу или настрою сам. Первый год за мой счёт." },
        { q: "Даёте гарантию?", a: "Да. В течение 30 дней бесплатно исправляю любые ошибки в коде." },
        { q: "Используете готовые шаблоны?", a: "Нет. Каждый проект пишется с нуля под ваш бренд и требования." },
      ],
    },
    contact: {
      label: "Контакты",
      title: "Начнём ваш проект?",
      desc: "Напишите для бесплатной консультации. Отвечу в течение 24 часов и дам точное предложение.",
      ctaTelegram: "Написать в Telegram",
      orForm: "или заполните форму ниже",
      form: {
        title: "Оставьте заявку",
        name: "Ваше имя",
        namePh: "Имя Фамилия",
        phone: "Номер телефона",
        phonePh: "+998 __ ___ __ __",
        service: "Тип услуги",
        servicePh: "Выберите",
        other: "Другое",
        message: "Сообщение (необязательно)",
        messagePh: "Коротко о вашем проекте...",
        submit: "Отправить",
        sending: "Отправка...",
        success: "Спасибо! Свяжусь с вами в ближайшее время.",
        error: "Произошла ошибка. Напишите в Telegram или попробуйте снова.",
        required: "Укажите имя и номер телефона.",
      },
    },
    footer: {
      rights: "Все права защищены.",
    },
  },
};

const LANG_STORAGE_KEY = "ozodflow-lang";
const LangContext = createContext({ lang: "uz", t: translations.uz, setLang: () => {} });
const useLang = () => useContext(LangContext);

function LanguageProvider({ children }) {
  const [lang, setLang] = useState("uz");

  useEffect(() => {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (stored === "uz" || stored === "ru") setLang(stored);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
    document.documentElement.lang = translations[lang].htmlLang;
  }, [lang]);

  const value = useMemo(
    () => ({
      lang,
      t: translations[lang],
      setLang,
      toggle: () => setLang((current) => (current === "uz" ? "ru" : "uz")),
    }),
    [lang]
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

/* ------------------------------ scroll reveal ----------------------------- */

function Reveal({ children, className = "", delay = 0, as: Tag = "div" }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
      className={`transition-all duration-700 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      } ${className}`}
    >
      {children}
    </Tag>
  );
}

/* ------------------------------- data hook -------------------------------- */

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
  const { services, projects, testimonials } = useSiteData();

  return (
    <LanguageProvider>
      <div className="min-h-screen bg-background text-foreground">
        <Nav />
        <main>
          <Hero />
          <Trust />
          <Services services={services} />
          <Projects projects={projects} />
          <Process />
          <Why />
          <Testimonials testimonials={testimonials} />
          <FAQ />
          <Contact services={services} />
        </main>
        <Footer />
      </div>
    </LanguageProvider>
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

function LangToggle({ className = "" }) {
  const { t, toggle } = useLang();
  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:border-accent hover:text-accent ${className}`}
      aria-label="Til / Язык"
    >
      <Globe className="h-4 w-4" /> {t.switchTo}
    </button>
  );
}

function ThemeToggle({ className = "" }) {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    setTheme(getInitialTheme());
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setStoredTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border bg-card text-muted-foreground transition hover:border-accent hover:text-accent ${className}`}
      aria-label="Tungi rejim"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

function Nav() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "#xizmatlar", label: t.nav.services },
    { href: "#loyihalar", label: t.nav.projects },
    { href: "#jarayon", label: t.nav.process },
    { href: "#fikrlar", label: t.nav.testimonials },
    { href: "#savollar", label: t.nav.faq },
    { href: "#aloqa", label: t.nav.contact },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-foreground transition">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LangToggle />
          <a
            href={TG}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-card transition hover:bg-accent sm:inline-flex"
          >
            {t.nav.cta} <ArrowRight className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border bg-card text-foreground transition hover:border-accent md:hidden"
            aria-label="Menyu"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t bg-background md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col px-4 py-3">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
            <a
              href={TG}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-card transition hover:bg-accent"
            >
              {t.nav.cta} <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}

function Hero() {
  const { t } = useLang();

  return (
    <section className="relative overflow-hidden bg-hero">
      <div className="absolute inset-0 grid-bg opacity-60" />
      <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-20 md:px-6 md:pb-32 md:pt-28">
        <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-card">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          {t.hero.badge}
        </div>

        <h1 className="mt-8 max-w-4xl text-balance font-display text-5xl font-extrabold leading-[1.05] tracking-tight md:text-7xl">
          {t.hero.titleStart}
          <span className="text-accent">{t.hero.titleAccent}</span>
          {t.hero.titleEnd}
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
          {t.hero.descBefore}
          <span className="font-semibold text-foreground">{t.hero.name}</span>
          {t.hero.descAfter}
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <a
            href="#xizmatlar"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-elevated transition hover:bg-accent"
          >
            {t.hero.ctaServices} <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href={TG}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border bg-card px-6 py-3.5 text-sm font-semibold transition hover:border-accent hover:text-accent"
          >
            <MessageCircle className="h-4 w-4" /> {t.hero.ctaTelegram}
          </a>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-4">
          {t.stats.map((s, i) => (
            <Reveal
              key={s.l}
              delay={i * 80}
              className="rounded-xl border bg-card p-5 shadow-card"
            >
              <div className="font-display text-3xl font-bold text-foreground">{s.n}</div>
              <div className="mt-1 text-xs text-muted-foreground">{s.l}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Trust() {
  const { t } = useLang();
  const icons = [Shield, Clock, Zap];

  return (
    <section className="border-y bg-surface/50">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 md:grid-cols-3 md:px-6">
        {t.trust.map((p, i) => {
          const Icon = icons[i];
          return (
            <Reveal key={p.t} delay={i * 80} className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-foreground">{p.t}</div>
                <div className="text-sm text-muted-foreground">{p.d}</div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

function SectionHeading({ icon: Icon, label, title, desc, center = false }) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <div className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent ${center ? "justify-center" : ""}`}>
        {Icon && <Icon className="h-3.5 w-3.5" />} {label}
      </div>
      <h2 className="mt-4 text-balance font-display text-4xl font-bold tracking-tight md:text-5xl">
        {title}
      </h2>
      {desc && <p className="mt-4 text-lg text-muted-foreground">{desc}</p>}
    </div>
  );
}

function Services({ services }) {
  const { t } = useLang();

  return (
    <section id="xizmatlar" className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <SectionHeading icon={Sparkles} label={t.services.label} title={t.services.title} desc={t.services.desc} />

        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {services.map((s, i) => {
            const Icon = iconMap[s.icon] || Sparkles;

            return (
              <Reveal
                key={s.id}
                delay={(i % 2) * 90}
                as="article"
                className={`group relative rounded-2xl border bg-card p-7 shadow-card transition hover:shadow-elevated ${
                  s.featured ? "border-accent/40 ring-1 ring-accent/20" : ""
                }`}
              >
                {s.featured && (
                  <div className="absolute -top-3 left-7 inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground shadow-card">
                    {t.services.popular}
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
                    <div className="text-xs text-muted-foreground">{t.services.startPrice}</div>
                    <div className="font-display text-2xl font-bold text-foreground">
                      {s.price} <span className="font-sans text-sm font-normal text-muted-foreground">{t.services.currency}</span>
                    </div>
                  </div>
                  <a
                    href={TG}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold transition hover:bg-primary hover:text-primary-foreground"
                  >
                    {t.services.order} <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
              </Reveal>
            );
          })}
        </div>

        <p className="mt-8 text-sm text-muted-foreground">{t.services.note}</p>
      </div>
    </section>
  );
}

function Projects({ projects }) {
  const { t } = useLang();
  const [showAll, setShowAll] = useState(false);
  const visibleProjects = useMemo(() => (showAll ? projects : projects.slice(0, 6)), [projects, showAll]);
  const hasMore = projects.length > 6;

  return (
    <section id="loyihalar" className="border-y bg-surface/60 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <SectionHeading icon={BriefcaseBusiness} label={t.projects.label} title={t.projects.title} />
          <a
            href={TG_CHANNEL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-2 rounded-xl border bg-card px-5 py-3 text-sm font-semibold transition hover:border-accent hover:text-accent"
          >
            {t.projects.channel} <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {visibleProjects.map((project, i) => (
            <Reveal
              key={project.id}
              delay={(i % 3) * 90}
              as="article"
              className="flex flex-col overflow-hidden rounded-2xl border bg-card shadow-card transition hover:shadow-elevated"
            >
              <a
                href={project.url || TG_CHANNEL}
                target="_blank"
                rel="noreferrer"
                className="relative block aspect-video overflow-hidden bg-surface"
                aria-label={project.title}
              >
                {project.image ? (
                  <img
                    src={project.image}
                    alt={project.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/5 via-accent/5 to-sky/10">
                    <span className="font-display text-2xl font-bold text-muted-foreground/40">
                      {project.title}
                    </span>
                  </div>
                )}
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold text-accent shadow-card backdrop-blur">
                  {project.category}
                </span>
              </a>

              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-display text-2xl font-bold">{project.title}</h3>
                  <a
                    href={project.url || TG_CHANNEL}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground transition hover:bg-accent hover:text-accent-foreground"
                    aria-label={project.title}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{project.desc}</p>
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
              </div>
            </Reveal>
          ))}
        </div>

        {hasMore && (
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={() => setShowAll((value) => !value)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-card transition hover:bg-accent"
            >
              {showAll ? t.projects.showLess : t.projects.showAll}
              <ArrowRight className={`h-4 w-4 transition ${showAll ? "-rotate-90" : ""}`} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function Process() {
  const { t } = useLang();

  return (
    <section id="jarayon" className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <SectionHeading label={t.process.label} title={t.process.title} />

        <div className="mt-14 grid gap-5 md:grid-cols-4">
          {t.process.steps.map((p, i) => (
            <Reveal key={p.n} delay={i * 80} className="relative rounded-2xl border bg-card p-6 shadow-card">
              <div className="font-mono text-xs font-semibold text-accent">{p.n}</div>
              <h3 className="mt-3 font-display text-xl font-bold">{p.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.d}</p>
              {i < t.process.steps.length - 1 && (
                <ArrowRight className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 bg-background text-border md:block" />
              )}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Why() {
  const { t } = useLang();

  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 md:grid-cols-12 md:px-6">
        <div className="md:col-span-5">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
            {t.why.label}
          </div>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight md:text-5xl">
            {t.why.title}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            {t.why.desc}
          </p>
          <a
            href={TG}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex items-center gap-2 font-semibold text-accent underline-offset-4 hover:underline"
          >
            {t.why.link} <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:col-span-7">
          {t.why.items.map((it, i) => (
            <Reveal key={it.t} delay={(i % 2) * 90} className="rounded-xl border bg-card p-6 shadow-card">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Check className="h-4 w-4" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{it.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{it.d}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials({ testimonials }) {
  const { t } = useLang();

  if (!testimonials?.length) return null;

  return (
    <section id="fikrlar" className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <SectionHeading icon={Quote} label={t.testimonials.label} title={t.testimonials.title} center />

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {testimonials.map((item, i) => (
            <Reveal key={item.id} delay={(i % 3) * 90} className="flex flex-col rounded-2xl border bg-card p-7 shadow-card">
              <Quote className="h-7 w-7 text-accent/40" />
              <p className="mt-4 flex-1 leading-relaxed text-foreground">{item.text}</p>
              <div className="mt-5 flex gap-0.5">
                {Array.from({ length: Math.max(0, Math.min(5, item.rating || 5)) }).map((_, idx) => (
                  <Star key={idx} className="h-4 w-4 fill-accent text-accent" />
                ))}
              </div>
              <div className="mt-4 border-t pt-4">
                <div className="font-semibold text-foreground">{item.name}</div>
                <div className="text-sm text-muted-foreground">{item.role}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const { t } = useLang();

  return (
    <section id="savollar" className="border-y bg-surface/60 py-24 md:py-32">
      <div className="mx-auto max-w-4xl px-4 md:px-6">
        <SectionHeading label={t.faq.label} title={t.faq.title} center />

        <Accordion type="single" collapsible className="mt-14 space-y-3">
          {t.faq.items.map((f, i) => (
            <AccordionItem
              key={f.q}
              value={`faq-${i}`}
              className="rounded-xl border bg-card px-6 shadow-card transition data-[state=open]:shadow-elevated"
            >
              <AccordionTrigger className="font-display text-lg font-semibold no-underline hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="leading-relaxed text-muted-foreground">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function ContactForm({ services }) {
  const { t } = useLang();
  const f = t.contact.form;

  const [form, setForm] = useState({ name: "", phone: "", service: "", message: "", website: "" });
  const [state, setState] = useState("idle"); // idle | sending | success | error

  const serviceOptions = useMemo(
    () => [...services.map((s) => s.title), f.other],
    [services, f.other]
  );

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setState("required");
      return;
    }

    setState("sending");
    try {
      await submitLead(form);
      setState("success");
      setForm({ name: "", phone: "", service: "", message: "", website: "" });
    } catch {
      setState("error");
    }
  }

  const fieldClass =
    "w-full rounded-xl border border-primary-foreground/15 bg-primary-foreground/5 px-4 py-3 text-sm text-primary-foreground outline-none transition placeholder:text-primary-foreground/40 focus:border-accent focus:ring-2 focus:ring-accent/30";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Honeypot — bots fill this, humans never see it */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={form.website}
        onChange={(event) => update("website", event.target.value)}
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />
      <div className="text-sm font-semibold text-primary-foreground/80">{f.title}</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className={fieldClass}
          placeholder={f.namePh}
          value={form.name}
          onChange={(event) => update("name", event.target.value)}
          aria-label={f.name}
        />
        <input
          className={fieldClass}
          placeholder={f.phonePh}
          value={form.phone}
          inputMode="tel"
          onChange={(event) => update("phone", event.target.value)}
          aria-label={f.phone}
        />
      </div>
      <select
        className={`${fieldClass} ${form.service ? "" : "text-primary-foreground/40"}`}
        value={form.service}
        onChange={(event) => update("service", event.target.value)}
        aria-label={f.service}
      >
        <option value="" className="text-foreground">{f.servicePh}</option>
        {serviceOptions.map((option) => (
          <option key={option} value={option} className="text-foreground">
            {option}
          </option>
        ))}
      </select>
      <textarea
        className={`${fieldClass} min-h-24 resize-y`}
        placeholder={f.messagePh}
        value={form.message}
        onChange={(event) => update("message", event.target.value)}
        aria-label={f.message}
      />

      <button
        type="submit"
        disabled={state === "sending"}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-accent-foreground shadow-elevated transition hover:opacity-90 disabled:opacity-60"
      >
        {state === "sending" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> {f.sending}
          </>
        ) : (
          <>
            {f.submit} <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      {state === "success" && (
        <p className="rounded-lg bg-accent/20 px-4 py-2.5 text-sm font-medium text-primary-foreground">
          {f.success}
        </p>
      )}
      {state === "error" && (
        <p className="rounded-lg bg-destructive/20 px-4 py-2.5 text-sm font-medium text-primary-foreground">
          {f.error}
        </p>
      )}
      {state === "required" && (
        <p className="rounded-lg bg-destructive/20 px-4 py-2.5 text-sm font-medium text-primary-foreground">
          {f.required}
        </p>
      )}
    </form>
  );
}

function Contact({ services }) {
  const { t } = useLang();
  const channels = [
    { icon: MessageCircle, label: "Telegram (Support)", value: "@OzodFlow_uz", href: TG_SUPPORT },
    { icon: MessageCircle, label: "Telegram kanal", value: "@OzodFlow", href: TG_CHANNEL },
    { icon: Mail, label: "Email", value: "mamatovo354@gmail.com", href: "mailto:mamatovo354@gmail.com" },
    { icon: Phone, label: "Telefon", value: "+998 93 230 34 10", href: "tel:+998932303410" },
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
                {t.contact.label}
              </div>
              <h2 className="mt-4 font-display text-4xl font-bold tracking-tight md:text-5xl">
                {t.contact.title}
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-primary-foreground/70 sm:text-lg">
                {t.contact.desc}
              </p>
              <a
                href={TG}
                target="_blank"
                rel="noreferrer"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-accent-foreground shadow-elevated transition hover:opacity-90"
              >
                <MessageCircle className="h-4 w-4" /> {t.contact.ctaTelegram}
              </a>
              <p className="mt-3 text-sm text-primary-foreground/50">{t.contact.orForm}</p>

              <div className="mt-6">
                <ContactForm services={services} />
              </div>
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
  const { t } = useLang();
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-10 text-sm text-muted-foreground md:flex-row md:items-baseline md:px-6">
        <Logo />
        <div className="text-xs">© {new Date().getFullYear()} OzodFlow. {t.footer.rights}</div>
        <div className="flex gap-6 text-sm">
          <a href={TG_CHANNEL} target="_blank" rel="noreferrer" className="transition hover:text-accent">Telegram</a>
          <a href="mailto:mamatovo354@gmail.com" className="transition hover:text-accent">Email</a>
        </div>
      </div>
    </footer>
  );
}
