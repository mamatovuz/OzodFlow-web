import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { PwaRegister } from "@/components/pwa-register";
import { InstallButton } from "@/components/install-button";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://ozodflow.uz"
  ),
  title: {
    default: "OzodFlow — Restoranlar uchun elektron menyu platformasi",
    template: "%s · OzodFlow",
  },
  description:
    "OzodFlow — restoran, kafe va fast food uchun professional elektron menyu. QR kod orqali menyu, statistika va barcha filiallarni bitta paneldan boshqaring.",
  keywords: [
    "elektron menyu",
    "QR menyu",
    "restoran",
    "kafe",
    "OzodFlow",
    "Uzbekistan",
  ],
  openGraph: {
    title: "OzodFlow — Restoranlar uchun elektron menyu",
    description: "QR kod orqali zamonaviy elektron menyu platformasi",
    type: "website",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f19" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz" suppressHydrationWarning className={inter.variable}>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <PwaRegister />
        <InstallButton />
      </body>
    </html>
  );
}
