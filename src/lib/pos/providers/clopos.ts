/**
 * Clopos POS provayderi — Clopos Open API **v2** ga mos.
 * Hujjat: https://developer.clopos.com  (base: integrations.clopos.com/open-api/v2)
 *
 * Auth: POST /v2/auth {client_id, client_secret, brand, integrator_id} → JWT.
 * Keyingi so'rovlar: `x-token: <JWT>` header (+ ixtiyoriy `x-venue`).
 * Javob konverti: { success, data, total, time }. MUHIM — HTTP 200 bo'lsa ham
 * `success:false` bo'lishi mumkin (test/prod nomuvofiqligi), shuning uchun
 * doim `success` ni tekshiramiz.
 *
 * Barcha Clopos mapping shu bitta faylda — API o'zgarsa faqat shu yer tahrirlanadi.
 */
import { BasePosProvider, type PosProviderContext } from "../provider";
import { PosError } from "../errors";
import type {
  PosProviderId,
  PosMenu,
  PosConnectionResult,
  NormalizedCategory,
  NormalizedProduct,
  PosOrderInput,
  PosOrderResult,
  StockStatus,
} from "../types";

const BASE_URL = "https://integrations.clopos.com/open-api/v2";
const PAGE_LIMIT = 200;

// ─── Clopos v2 javob shakllari ───
interface CloposEnvelope<T> {
  success: boolean;
  data?: T;
  total?: number;
  error?: string;
  message?: string;
}

interface CloposMedia {
  urls?: {
    original?: string;
    original_large?: string;
    extra_large?: string;
    thumb?: string;
  };
}

interface CloposCategoryRaw {
  id: number | string;
  name: string;
  parent_id?: number | string | null;
  sort?: number;
  status?: number;
  media?: CloposMedia[];
}

interface CloposProductRaw {
  id: number | string;
  name: string;
  description?: string | null;
  price?: string | number;
  old_price?: string | number | null;
  status?: number; // 1 = sotuvda
  category_id?: number | string | null;
  weight?: string | number | null;
  calories?: number | null;
  sort?: number;
  media?: CloposMedia[];
}

function mediaUrl(media?: CloposMedia[]): string | null {
  const u = media?.[0]?.urls;
  return u?.original || u?.original_large || u?.extra_large || u?.thumb || null;
}

function toNumber(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : 0;
  return Number.isFinite(n) ? n : 0;
}

export class CloposProvider extends BasePosProvider {
  readonly id: PosProviderId = "CLOPOS";
  private token: string | null = null;
  private tokenExp = 0; // Unix (soniya)

  constructor(ctx: PosProviderContext) {
    super(ctx);
  }

  // ─── JWT olish (keshlanadi; muddati tugashidan oldin qayta olamiz) ───
  private async getToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (this.token && now < this.tokenExp - 60) return this.token;

    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          client_id: this.cred("client_id"),
          client_secret: this.cred("client_secret"),
          brand: this.cred("brand"),
          integrator_id: this.cred("integrator_id"),
        }),
      });
    } catch (err) {
      throw new PosError("NETWORK", "Clopos'ga ulanib bo'lmadi", { cause: err });
    }

    const body = (await res.json().catch(() => null)) as
      | { success?: boolean; token?: string; expires_at?: number; expires_in?: number; error?: string; message?: string }
      | null;

    if (!body || body.success !== true || !body.token) {
      // Test/prod nomuvofiqligi 200 + success:false bilan keladi
      throw new PosError("AUTH", body?.error || body?.message || "Avtorizatsiya rad etildi", {
        status: res.status,
      });
    }

    this.token = body.token;
    this.tokenExp = body.expires_at || now + (body.expires_in || 3600);
    return this.token;
  }

  private venueHeader(): Record<string, string> {
    const v = this.credentials["venue_id"];
    return v ? { "x-venue": v } : {};
  }

  // ─── Avtorizatsiyalangan GET (success tekshiruvi bilan) ───
  private async apiGet<T>(path: string): Promise<CloposEnvelope<T>> {
    const token = await this.getToken();
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}${path}`, {
        headers: { "x-token": token, Accept: "application/json", ...this.venueHeader() },
      });
    } catch (err) {
      throw new PosError("NETWORK", "Clopos'ga ulanib bo'lmadi", { cause: err });
    }
    if (res.status === 429) {
      throw new PosError("RATE_LIMIT", "So'rovlar limitidan oshdi", { status: 429 });
    }
    const body = (await res.json().catch(() => null)) as CloposEnvelope<T> | null;
    if (!body || body.success === false) {
      if (res.status === 401) {
        this.token = null; // token yaroqsiz — keyingi safar qayta auth
        throw new PosError("AUTH", body?.error || "Token yaroqsiz", { status: 401 });
      }
      throw new PosError("PROVIDER", body?.error || body?.message || `Clopos xatosi (${res.status})`, {
        status: res.status,
      });
    }
    return body;
  }

  // ─── Barcha sahifalarni yig'ish (pagination) ───
  private async apiList<T>(path: string): Promise<T[]> {
    const all: T[] = [];
    for (let page = 1; page <= 100; page++) {
      const sep = path.includes("?") ? "&" : "?";
      const env = await this.apiGet<T[]>(`${path}${sep}page=${page}&limit=${PAGE_LIMIT}`);
      const batch = Array.isArray(env.data) ? env.data : [];
      all.push(...batch);
      const total = env.total ?? all.length;
      if (all.length >= total || batch.length < PAGE_LIMIT) break;
    }
    return all;
  }

  async testConnection(): Promise<PosConnectionResult> {
    try {
      await this.getToken();
      return { ok: true, message: "Clopos bilan ulanish muvaffaqiyatli" };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "Ulanib bo'lmadi" };
    }
  }

  async fetchMenu(): Promise<PosMenu> {
    await this.getToken(); // tokenni oldindan olamiz — parallel so'rovlar keshdan foydalanadi
    const [rawCats, rawProds] = await Promise.all([
      this.apiList<CloposCategoryRaw>("/categories"),
      this.apiList<CloposProductRaw>("/products"),
    ]);

    const categories: NormalizedCategory[] = rawCats.map((c) => ({
      externalId: String(c.id),
      name: c.name,
      sortOrder: c.sort ?? 0,
      parentExternalId: c.parent_id != null ? String(c.parent_id) : null,
      isVisible: c.status === undefined ? true : c.status !== 0,
    }));

    const products: NormalizedProduct[] = rawProds.map((p) => {
      const available = p.status === undefined ? true : p.status === 1;
      const stockStatus: StockStatus | undefined = available ? "IN_STOCK" : "OUT_OF_STOCK";
      return {
        externalId: String(p.id),
        categoryExternalId: p.category_id != null ? String(p.category_id) : null,
        name: p.name,
        description: p.description ?? null,
        price: toNumber(p.price),
        oldPrice: p.old_price != null ? toNumber(p.old_price) : null,
        imageUrl: mediaUrl(p.media),
        weight: p.weight != null ? String(p.weight) : null,
        calories: p.calories ?? null,
        isAvailable: available,
        stockStatus,
        sortOrder: p.sort ?? 0,
      };
    });

    return { categories, products };
  }

  // Buyurtmani Clopos'ga yuborish. Order body sxemasi Clopos "Create Order"
  // hujjatiga qarab yakuniy sozlanadi — hozircha eng ehtimoliy shakl.
  async pushOrder(input: PosOrderInput): Promise<PosOrderResult> {
    const token = await this.getToken();
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/orders`, {
        method: "POST",
        headers: {
          "x-token": token,
          "Content-Type": "application/json",
          Accept: "application/json",
          ...this.venueHeader(),
        },
        body: JSON.stringify({
          table_id: input.tableExternalId ?? undefined,
          comment: input.comment ?? undefined,
          phone: input.phone ?? undefined,
          products: input.items.map((it) => ({
            product_id: it.externalProductId,
            count: it.qty,
            comment: it.note ?? undefined,
            modifiers: it.modifierOptionIds,
          })),
        }),
      });
    } catch (err) {
      throw new PosError("NETWORK", "Buyurtma yuborilmadi", { cause: err });
    }
    const body = (await res.json().catch(() => null)) as CloposEnvelope<{ id: number | string; status?: string }> | null;
    if (!body || body.success === false || !body.data) {
      throw new PosError("PROVIDER", body?.error || body?.message || "Buyurtma qabul qilinmadi", {
        status: res.status,
      });
    }
    return { externalOrderId: String(body.data.id), status: body.data.status ?? "PENDING" };
  }
}
