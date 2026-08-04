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

type ProviderFactory = (ctx: PosProviderContext) => PosProvider;

const FACTORIES: Partial<Record<PosProviderId, ProviderFactory>> = {
  CLOPOS: (ctx) => new CloposProvider(ctx),
  // Kelajakda:
  // IIKO:   (ctx) => new IikoProvider(ctx),
  // POSTER: (ctx) => new PosterProvider(ctx),
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
    docsUrl: "https://clopos.com",
    credentialFields: [
      {
        key: "baseUrl",
        label: "Akkaunt manzili",
        placeholder: "https://sizning-akkaunt.clopos.com",
        type: "text",
        required: true,
        help: "Clopos kabinetingiz manzili",
      },
      { key: "token", label: "API token", type: "password", required: true },
      { key: "venueId", label: "Filial (Venue) ID", type: "text", required: true },
    ],
  },
  { id: "IIKO", label: "iiko", available: false, credentialFields: [] },
  { id: "POSTER", label: "Poster", available: false, credentialFields: [] },
  { id: "JOWI", label: "JOWI", available: false, credentialFields: [] },
  { id: "RKEEPER", label: "R-Keeper", available: false, credentialFields: [] },
];

export function getProviderMeta(id: PosProviderId): PosProviderMeta | undefined {
  return PROVIDER_META.find((p) => p.id === id);
}

export function isSupportedProvider(id: string): id is PosProviderId {
  return PROVIDER_META.some((p) => p.id === id && p.available);
}
