import type { Metadata } from "next";
import Link from "next/link";
import { Coffee, Heart, ArrowLeft } from "lucide-react";
import { getSiteSetting, siteBase } from "@/lib/site";
import { CoffeeCard } from "@/components/site/coffee-card";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Kofe sotib olish" };

export default async function CoffeePage() {
  const [s, base] = await Promise.all([getSiteSetting(), siteBase()]);

  return (
    <div className="mx-auto max-w-2xl px-5 py-16 sm:px-6 sm:py-20">
      <Link href={base || "/"} className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Bosh sahifa
      </Link>

      <div className="mt-10 flex flex-col items-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400 text-amber-900 shadow-lg">
          <Coffee className="h-8 w-8" />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">Meni bir piyola kofe bilan qo'llab-quvvatlang</h1>
        <p className="mt-3 max-w-md text-balance text-muted">
          Yozgan maqolalarim, darslarim va kontentlarim sizga foydali bo'layotgan bo'lsa — kichik qo'llab-quvvatlash
          menga yangi kontent yaratishда katta turtki bo'ladi. Rahmat! <Heart className="inline h-4 w-4 text-red-500" />
        </p>

        {s.coffeeUrl && (
          <a
            href={s.coffeeUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-amber-400 px-7 py-3 text-sm font-semibold text-amber-950 shadow-md transition-transform hover:-translate-y-0.5"
          >
            <Coffee className="h-5 w-5" /> Kofe sotib olish
          </a>
        )}
      </div>

      <div className="sr mt-16 border-t border-border pt-12">
        <CoffeeCard coffeeUrl={s.coffeeUrl} channel={s.channel} />
      </div>
    </div>
  );
}
