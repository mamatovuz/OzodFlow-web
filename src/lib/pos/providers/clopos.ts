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
  position?: number | null;
  status?: number;
  hidden?: boolean;
  emenu_hidden?: boolean;
  media?: CloposMedia[];
  // Clopos /categories daraxt (nested) qaytaradi — subkategoriyalar shu yerda
  children?: CloposCategoryRaw[];
}

interface CloposProductRaw {
  id: number | string;
  name: string;
  description?: string | null;
  price?: string | number;
  old_price?: string | number | null;
  status?: number; // 1 = faol
  hidden?: number | boolean;
  emenu_hidden?: boolean;
  type?: string; // "DISH" | "INGREDIENT" | "MODIFICATION" | "TIMER" ...
  category_id?: number | string | null;
  weight?: string | number | null;
  calories?: number | null;
  sort?: number;
  position?: number | null;
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

    // Clopos /categories NESTED daraxt qaytaradi (children ichida) — tekislaymiz,
    // aks holda faqat yuqori darajali kategoriyalar olinib, subkategoriyalar yo'qoladi.
    const flatCats: CloposCategoryRaw[] = [];
    const walk = (list: CloposCategoryRaw[]) => {
      for (const c of list) {
        flatCats.push(c);
        if (Array.isArray(c.children) && c.children.length) walk(c.children);
      }
    };
    walk(rawCats);

    const categories: NormalizedCategory[] = flatCats.map((c) => ({
      externalId: String(c.id),
      name: c.name,
      sortOrder: c.position ?? c.sort ?? 0,
      parentExternalId: c.parent_id != null ? String(c.parent_id) : null,
      isVisible: c.status !== 0 && c.hidden !== true && c.emenu_hidden !== true,
    }));

    const products: NormalizedProduct[] = rawProds
      // Faqat sotiladigan taomlar — ingredient/modifikatsiya/timer menyuga tushmasin
      .filter((p) => (p.type ? p.type === "DISH" : true))
      .map((p) => {
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
          sortOrder: p.position ?? p.sort ?? 0,
        };
      });

    return { categories, products };
  }

  // Buyurtmani Clopos'ga yuborish — Open API v2 "Create Order" sxemasi.
  // MUHIM: bu endpoint Clopos'da "call_center" moduli yoqilgan brendlar uchun
  // ishlaydi. Modul yoqilmagan bo'lsa API 403 "does not have access to module
  // call_center" qaytaradi — buni AUTH/CONFIG xatosi sifatida aniq ko'rsatamiz.
  async pushOrder(input: PosOrderInput): Promise<PosOrderResult> {
    const token = await this.getToken();
    // venue_id majburiy (number). Kredensialdagi venue_id yoki token ichidagi 1.
    const venueId = Number(this.credentials["venue_id"] || 1);
    const saleTypeId = input.saleTypeId ?? Number(this.credentials["sale_type_id"] || 2);

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
          venue_id: venueId,
          sale_type_id: saleTypeId,
          order_number: input.tableExternalId ?? undefined,
          comment: input.comment ?? undefined,
          customer: {
            id: 0, // 0 = yangi/mehmon mijoz
            name: input.customerName || "OzodFlow mijoz",
            phone: input.phone || "",
            address: input.customerAddress || "",
            customer_discount_type: 0,
          },
          products: input.items.map((it, i) => ({
            product_id: Number(it.externalProductId),
            count: it.qty,
            status: "new",
            product_hash: `ozf-${it.externalProductId}-${i}`,
            note: it.note ?? undefined,
            modifiers: it.modifierOptionIds?.map((id) => ({ modifier_id: Number(id) })),
          })),
          auto_order_accept: true,
        }),
      });
    } catch (err) {
      throw new PosError("NETWORK", "Buyurtma yuborilmadi", { cause: err });
    }
    const body = (await res.json().catch(() => null)) as CloposEnvelope<{ id: number | string; status?: string }> | null;
    if (!body || body.success === false || !body.data) {
      const msg = body?.message || body?.error || "Buyurtma qabul qilinmadi";
      // Brendda call_center moduli yo'q bo'lsa — sozlama muammosi, aniq belgilaymiz
      if (res.status === 403 || /module/i.test(String(msg))) {
        throw new PosError("CONFIG", `Clopos: ${msg}. Brendda "call_center" modulini yoqish uchun Clopos bilan bog'laning (dev@clopos.com).`, {
          status: res.status,
        });
      }
      throw new PosError("PROVIDER", msg, { status: res.status });
    }
    return { externalOrderId: String(body.data.id), status: body.data.status ?? "PENDING" };
  }
}
