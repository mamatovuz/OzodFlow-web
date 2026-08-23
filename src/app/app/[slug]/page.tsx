import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { AppInstall } from "@/components/public/app-install";
import { Check, Wifi, RefreshCw, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getData(slug: string) {
  const restaurant = await prisma.restaurant
    .findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        logo: true,
        primaryColor: true,
        isBlocked: true,
        mobileApp: true,
      },
    })
    .catch(() => null);
  return restaurant;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const r = await getData(slug);
  if (!r) return { title: "Ilova topilmadi" };
  const name = r.mobileApp?.appName || r.name;
  return {
    title: `${name} — mobil ilova`,
    description: `${name} ilovasini telefoningizga yuklab oling. Menyu, buyurtma — hammasi bir joyda.`,
  };
}

export default async function AppLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const r = await getData(slug);
  if (!r || r.isBlocked) notFound();

  const appName = r.mobileApp?.appName || r.name;
  const color = r.mobileApp?.themeColor || r.primaryColor || "#2563EB";
  const iconSrc = r.logo || `/m/${r.slug}/app-icon?s=512`;
  const apkUrl = r.mobileApp?.apkUrl || null;
  const apkSize = r.mobileApp?.apkSize || null;
  const splash = r.mobileApp?.splashText || r.description || `${appName} — elektron menyu`;

  const base = process.env.NEXT_PUBLIC_APP_URL || "";
  const menuUrl = `${base}/m/${r.slug}`;

  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{
        background: `linear-gradient(160deg, ${color} 0%, ${color}cc 45%, #0b0f19 120%)`,
      }}
    >
      {/* Dekorativ nurlar */}
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16 text-center">
        {/* Ikonka */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={iconSrc}
          alt={appName}
          className="h-28 w-28 rounded-[1.6rem] bg-white object-contain p-2 shadow-2xl"
        />

        <h1 className="mt-6 text-3xl font-bold text-white drop-shadow-sm">{appName}</h1>
        <p className="mt-2 max-w-xs text-sm text-white/85">{splash}</p>

        {/* O'rnatish */}
        <div className="mt-9">
          <AppInstall
            slug={r.slug}
            menuUrl={menuUrl}
            apkUrl={apkUrl}
            apkSize={apkSize}
            themeColor={color}
          />
        </div>

        {/* Afzalliklar */}
        <div className="mt-12 grid w-full grid-cols-1 gap-2.5 text-left">
          <Feature icon={<Check className="h-4 w-4" />}>Menyu ilova ichida ochiladi — browsersiz</Feature>
          <Feature icon={<RefreshCw className="h-4 w-4" />}>Narx va taomlar doim yangi</Feature>
          <Feature icon={<Wifi className="h-4 w-4" />}>Tez ishlaydi, kam joy egallaydi</Feature>
          <Feature icon={<ShieldCheck className="h-4 w-4" />}>Xavfsiz — ro'yxatdan o'tish shart emas</Feature>
        </div>

        <p className="mt-12 text-xs text-white/60">
          OzodFlow bilan yaratilgan · ozodflow.uz
        </p>
      </div>
    </main>
  );
}

function Feature({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 text-sm text-white backdrop-blur-sm">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20">
        {icon}
      </span>
      {children}
    </div>
  );
}
