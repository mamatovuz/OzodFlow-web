import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Manrope } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Toaster } from "sonner";

import { ThemeScript } from "@/components/theme/theme-script";
import { SITE } from "@/lib/site";

import "./globals.css";

/**
 * SHRIFTLAR
 *
 * `latin-ext` majburiy: o'zbek lotin alifbosida ʻ (U+02BB) va ʼ (U+02BC)
 * belgilari bor ("o'zbek", "ma'lumot"). Faqat `latin` bilan ular boshqa
 * shriftdan tushib, matn notekis ko'rinadi.
 *
 * Uchta shrift roli:
 *   Manrope       — sarlavhalar. Geometrik, o'ziga xos xarakteri bor.
 *   Inter         — interfeys matni. Kichik o'lchamda eng yaxshi o'qiladi.
 *   JetBrains Mono — pul summalari va kod. Raqamlar bir xil kenglikda.
 */

const manrope = Manrope({
  subsets: ["latin", "latin-ext"],
  variable: "--font-manrope",
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-jetbrains",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),

  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    // Ichki sahifalar faqat o'z nomini beradi, brend avtomatik qo'shiladi.
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  authors: [{ name: SITE.name, url: SITE.url }],
  creator: SITE.name,
  publisher: SITE.name,

  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    images: [
      {
        url: SITE.ogImage,
        width: 1200,
        height: 630,
        alt: SITE.name,
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    images: [SITE.ogImage],
  },

  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Brauzer manzil paneli rangi temaga moslashadi.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfdfe" },
    { media: "(prefers-color-scheme: dark)", color: "#101218" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const t = await getTranslations("common");

  return (
    <html
      lang={locale}
      // Tema sinfini `<html>` ga inline skript qo'yadi, ya'ni server bilan
      // klient farq qiladi. Bu ATAYLAB — ogohlantirishni shu sababdan
      // o'chiramiz, boshqa hech qanday farqni yashirmaydi.
      suppressHydrationWarning
      className={`${manrope.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <NextIntlClientProvider>
          {/* Klaviatura bilan yuradiganlar uchun: Tab bosilganda birinchi
              element — kontentga o'tish havolasi. */}
          <a
            href="#main"
            className="sr-only-focusable fixed left-4 top-4 z-100 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground shadow-lg"
          >
            {t("skipToContent")}
          </a>

          {children}

          <Toaster
            position="top-center"
            // Toast ranglarini dizayn tizimidan oladi — o'zining palitrasini
            // ishlatmaydi, shunda tema almashganda mos keladi.
            toastOptions={{
              classNames: {
                toast:
                  "!bg-popover !text-popover-foreground !border-border !shadow-lg !rounded-xl",
                description: "!text-muted-foreground",
                actionButton: "!bg-brand !text-brand-foreground",
                cancelButton: "!bg-muted !text-muted-foreground",
              },
            }}
          />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
