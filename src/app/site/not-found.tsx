import Link from "next/link";
import { Home, Search } from "lucide-react";
import { siteBase } from "@/lib/site";

export default async function SiteNotFound() {
  const base = await siteBase();
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-5 py-28 text-center">
      <p className="text-7xl font-bold tracking-tight text-muted/30">404</p>
      <h1 className="mt-4 text-2xl font-bold">Sahifa topilmadi</h1>
      <p className="mt-2 text-muted">Bu havola mavjud emas yoki o'chirilgan bo'lishi mumkin.</p>
      <div className="mt-6 flex gap-2">
        <Link
          href={base || "/"}
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          <Home className="h-4 w-4" /> Bosh sahifa
        </Link>
        <Link
          href={`${base}/blog`}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:border-foreground"
        >
          <Search className="h-4 w-4" /> Blog
        </Link>
      </div>
    </div>
  );
}
