/**
 * Provayder reyestri va fabrikasi (Provider Factory).
 *
 * Yangi POS qo'shish uchun 3 qadam:
 *   1) `providers/<nom>.ts` da `BasePosProvider` ni amalga oshiring
 *   2) shu yerga `FACTORIES` va `PROVIDER_META` ga bitta yozuv qo'shing
 *   3) tamom — UI, sync va order flow avtomatik qo'llab-quvvatlaydi
 */
import type { PosProvider, PosProviderContext } from "./provider";
import type { PosProviderId, PosProviderMeta } from "./types";
import { PosError } from "./errors";
import { CloposProvider } from "./providers/clopos";
import { PosterProvider } from "./providers/poster";
import { IikoProvider } from "./providers/iiko";

type ProviderFactory = (ctx: PosProviderContext) => PosProvider;

const FACTORIES: Partial<Record<PosProviderId, ProviderFactory>> = {
  CLOPOS: (ctx) => new CloposProvider(ctx),
  POSTER: (ctx) => new PosterProvider(ctx),
  IIKO: (ctx) => new IikoProvider(ctx),
  // Kelajakda:
  // JOWI:   (ctx) => new JowiProvider(ctx),
  // RKEEPER:(ctx) => new RKeeperProvider(ctx),
};

/** Provayder yaratadi (fabrika). Noma'lum provayderда PosError. */
export function createPosProvider(id: PosProviderId, ctx: PosProviderContext): PosProvider {
  const factory = FACTORIES[id];
  if (!factory) {
    throw new PosError("UNSUPPORTED", `"${id}" provayderi hali qo'llab-quvvatlanmaydi`);
  }
  return factory(ctx);
}

/** UI uchun barcha provayderlar ro'yxati va kredensial maydonlari */
export const PROVIDER_META: PosProviderMeta[] = [
  {
    id: "CLOPOS",
    label: "Clopos",
    available: true,
    docsUrl: "https://developer.clopos.com",
    credentialFields: [
      {
        key: "client_id",
        label: "Client ID",
        type: "text",
        required: true,
        help: "Clopos'dan olingan (dev@clopos.com so'rov formasi orqali)",
      },
      { key: "client_secret", label: "Client Secret", type: "password", required: true },
      { key: "brand", label: "Brand", placeholder: "masalan: openapitest", type: "text", required: true },
      { key: "integrator_id", label: "Integrator ID", type: "text", required: true },
      {
        key: "venue_id",
        label: "Venue ID (ixtiyoriy)",
        placeholder: "masalan: 1",
        type: "text",
        required: false,
        help: "Bo'sh qoldirilsa, token ichidagi asosiy filial ishlatiladi",
      },
    ],
  },
  {
    id: "POSTER",
    label: "Poster",
    available: true,
    docsUrl: "https://dev.joinposter.com",
    credentialFields: [
      {
        key: "token",
        label: "Access Token",
        type: "password",
        required: true,
        help: "Poster → Sozlamalar → API kirish nuqtalari (Access token)",
      },
    ],
  },
  {
    id: "IIKO",
    label: "iiko",
    available: true,
    docsUrl: "https://api-ru.iiko.services",
    credentialFields: [
      {
        key: "api_login",
        label: "API Login",
        type: "password",
        required: true,
        help: "iikoWeb → Integratsiyalar → iikoTransport (apiLogin)",
      },
      {
        key: "organization_id",
        label: "Organization ID (ixtiyoriy)",
        type: "text",
        required: false,
        help: "Bo'sh qoldirilsa — birinchi tashkilot avtomatik olinadi",
      },
    ],
  },
  { id: "JOWI", label: "JOWI", available: false, credentialFields: [] },
  { id: "RKEEPER", label: "R-Keeper", available: false, credentialFields: [] },
];

export function getProviderMeta(id: PosProviderId): PosProviderMeta | undefined {
  return PROVIDER_META.find((p) => p.id === id);
}

export function isSupportedProvider(id: string): id is PosProviderId {
  return PROVIDER_META.some((p) => p.id === id && p.available);
}
