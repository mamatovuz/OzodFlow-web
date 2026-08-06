import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { getPosOwner } from "@/lib/pos-access";
import {
  createPosProvider,
  encryptCredentials,
  isSupportedProvider,
  getProviderMeta,
} from "@/lib/pos";
import type { PosProviderId } from "@/lib/pos";
import { limitOrReject, WINDOW } from "@/lib/rate-limit";

const schema = z.object({
  provider: z.string(),
  credentials: z.record(z.string()),
  autoSync: z.boolean().optional(),
  syncIntervalMin: z.number().int().min(1).max(1440).optional(),
});

// ─── POS ni ulash (avval tekshiradi, keyin shifrlab saqlaydi) ───
export async function POST(req: NextRequest) {
  const limited = limitOrReject(req, "pos-connect", { limit: 10, windowMs: WINDOW.minute });
  if (limited) return limited;

  const acc = await getPosOwner();
  if (acc.error === "UNAUTHORIZED") return fail("Avtorizatsiya talab qilinadi", 401);
  if (acc.error === "FORBIDDEN") return fail("Ruxsat yo'q", 403);
  if (acc.error === "PLAN") return fail("POS integratsiyasi PRO tarifdan boshlab mavjud", 403);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Ma'lumotlar noto'g'ri", 422);

  const { provider, credentials, autoSync, syncIntervalMin } = parsed.data;
  if (!isSupportedProvider(provider)) return fail("Provayder qo'llab-quvvatlanmaydi", 400);

  const meta = getProviderMeta(provider as PosProviderId);
  for (const f of meta?.credentialFields ?? []) {
    if (f.required && !credentials[f.key]?.trim()) return fail(`${f.label} kiritilmagan`, 422);
  }

  // Saqlashdan oldin ulanishni tekshiramiz
  const client = createPosProvider(provider as PosProviderId, {
    credentials,
    restaurantId: acc.restaurant.id,
  });
  const test = await client.testConnection();
  if (!test.ok) return fail(`Ulanib bo'lmadi: ${test.message}`, 400);

  const enc = encryptCredentials(credentials);
  const integration = await prisma.posIntegration.upsert({
    where: {
      restaurantId_provider: { restaurantId: acc.restaurant.id, provider },
    },
    create: {
      restaurantId: acc.restaurant.id,
      provider,
      credentials: enc,
      status: "CONNECTED",
      autoSync: autoSync ?? true,
      syncIntervalMin: syncIntervalMin ?? 5,
    },
    update: {
      credentials: enc,
      status: "CONNECTED",
      lastError: null,
      isActive: true,
      ...(autoSync !== undefined ? { autoSync } : {}),
      ...(syncIntervalMin !== undefined ? { syncIntervalMin } : {}),
    },
  });

  return ok({ id: integration.id, status: "CONNECTED" });
}
