import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AiKeysManager } from "@/components/admin/ai-keys-manager";

export const dynamic = "force-dynamic";

export default async function AdminAiPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN" || !user.isSuperAdmin) redirect("/admins");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI kalitlari</h1>
        <p className="mt-1 text-sm text-muted">
          Menyuni AI orqali import qilish uchun kalitlar. Bir nechta kalit
          qo'shing — biri limitga yetsa, avtomatik keyingisiga o'tadi (cheksiz
          zaxira).
        </p>
      </div>
      <AiKeysManager />
    </div>
  );
}
