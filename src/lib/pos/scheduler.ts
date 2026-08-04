/**
 * POS avtomatik sinxron rejalashtiruvchisi.
 * Muddati kelgan (autoSync yoqilgan va oxirgi sync `syncIntervalMin` dan oshgan)
 * integratsiyalarni topib menyuni sinxronlaydi.
 *
 * Ikki joyda ishlatiladi:
 *  - `instrumentation.ts` — server ichida har ~5 daqiqada (Railway'da avtomatik)
 *  - `/api/pos/cron` — tashqi cron chaqirsa ham ishlaydi
 */
import { prisma } from "@/lib/prisma";
import { syncMenu } from "./sync";

export interface DueSyncResult {
  checked: number;
  synced: number;
  results: { id: string; ok: boolean }[];
}

export async function runDuePosSyncs(): Promise<DueSyncResult> {
  const now = Date.now();
  const integrations = await prisma.posIntegration.findMany({
    where: { isActive: true, autoSync: true },
    select: { id: true, syncIntervalMin: true, lastSyncAt: true },
  });

  const due = integrations.filter((i) => {
    if (!i.lastSyncAt) return true;
    return now - new Date(i.lastSyncAt).getTime() >= i.syncIntervalMin * 60_000;
  });

  const results: { id: string; ok: boolean }[] = [];
  for (const i of due) {
    try {
      const r = await syncMenu(i.id);
      results.push({ id: i.id, ok: r.ok });
    } catch {
      results.push({ id: i.id, ok: false });
    }
  }

  return { checked: integrations.length, synced: results.length, results };
}
