import { GalleryManager } from "@/components/dashboard/gallery-manager";

export const dynamic = "force-dynamic";

export default function GalleryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Galereya</h1>
        <p className="mt-1 text-sm text-muted">
          Restoran rasmlari — menyuda mijozlarga ko'rsatiladi
        </p>
      </div>
      <GalleryManager />
    </div>
  );
}
