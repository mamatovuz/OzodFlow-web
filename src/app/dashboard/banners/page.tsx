import { BannersManager } from "@/components/dashboard/banners-manager";

export const dynamic = "force-dynamic";

export default function BannersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bannerlar</h1>
        <p className="mt-1 text-sm text-muted">
          Menyu tepasida slider ko'rinishida chiqadigan reklama bannerlari
        </p>
      </div>
      <BannersManager />
    </div>
  );
}
