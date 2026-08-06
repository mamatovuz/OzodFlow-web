/**
 * Poster POS provayderi — Poster (joinposter.com) API ga mos.
 * Hujjat: https://dev.joinposter.com/docs/v3/api/menu
 *
 * Auth: barcha so'rovlar `?token=<access_token>` bilan (token akkauntni
 * ichiga oladi, alohida domen shart emas). Javob konverti:
 *   muvaffaqiyat → { response: [...] }
 *   xato         → { error: <kod>, message } (HTTP 200 bo'lsa ham!)
 * Shu sabab doim `error` maydonini tekshiramiz.
 *
 * Narxlar Poster'da tiyin (kopeyka) — ya'ni 10000 = 100.00; /100 qilamiz.
 * Barcha Poster mapping shu bitta faylda.
 */
import { BasePosProvider, type PosProviderContext } from "../provider";
import { PosError } from "../errors";
import type {
  PosProviderId,
  PosMenu,
  PosConnectionResult,
  NormalizedCategory,
  NormalizedProduct,
  StockStatus,
} from "../types";

const BASE_URL = "https://joinposter.com/api";
const IMG_HOST = "https://joinposter.com";

interface PosterEnvelope<T> {
  response?: T;
  // Poster xatoni ikki formatda qaytaradi: eski `error: 33` yoki
  // yangi `error: { code, message }`.
  error?: number | string | { code?: number | string; message?: string };
  message?: string;
}

interface PosterCategoryRaw {
  category_id: number | string;
  category_name: string;
  parent_category?: number | string | null;
  category_hidden?: number | string;
  sort_order?: number | string;
}

interface PosterProductRaw {
  product_id: number | string;
  product_name: string;
  menu_category_id?: number | string | null;
  // Poster narxi spot bo'yicha obyekt: { "1": "10000" } (tiyinda)
  price?: Record<string, string | number> | string | number;
  photo?: string | null;
  photo_origin?: string | null;
  hidden?: number | string;
  out?: number | string;
  weight?: string | number | null;
  cost?: string | number | null;
}

function toBool(v: unknown): boolean {
  return v === "1" || v === 1 || v === true;
}

function imgUrl(p?: string | null): string | null {
  if (!p) return null;
  if (/^https?:\/\//.test(p)) return p;
  return IMG_HOST + (p.startsWith("/") ? p : "/" + p);
}

// Poster narxi (tiyin) → so'm. Spot obyekti bo'lsa birinchi qiymatni oladi.
function posterPrice(price: PosterProductRaw["price"]): number {
  let raw: unknown = price;
  if (price && typeof price === "object") {
    const first = Object.values(price)[0];
    raw = first;
  }
  const n = typeof raw === "string" ? parseFloat(raw) : typeof raw === "number" ? raw : 0;
  return Number.isFinite(n) ? n / 100 : 0;
}

export class PosterProvider extends BasePosProvider {
  readonly id: PosProviderId = "POSTER";

  constructor(ctx: PosProviderContext) {
    super(ctx);
  }

  private url(method: string): string {
    const token = this.cred("token");
    return `${BASE_URL}/${method}?token=${encodeURIComponent(token)}&format=json`;
  }

  private async get<T>(method: string): Promise<T> {
    let res: Response;
    try {
      res = await fetch(this.url(method), { headers: { Accept: "application/json" } });
    } catch (err) {
      throw new PosError("NETWORK", "Poster'ga ulanib bo'lmadi", { cause: err });
    }
    if (res.status === 401 || res.status === 403) {
      throw new PosError("AUTH", "Token yaroqsiz", { status: res.status });
    }
    if (res.status === 429) {
      throw new PosError("RATE_LIMIT", "So'rovlar limitidan oshdi", { status: 429 });
    }
    const body = (await res.json().catch(() => null)) as PosterEnvelope<T> | null;
    if (!body || body.error !== undefined) {
      // Xato kodi va matnini ikkala formatdan ham ajratamiz
      const err = body?.error;
      const code = typeof err === "object" && err ? err.code : err;
      const emsg = (typeof err === "object" && err ? err.message : undefined) || body?.message;
      const isAuth = code === 33 || code === "33" || code === 401 || res.status === 401;
      throw new PosError(isAuth ? "AUTH" : "PROVIDER", emsg || `Poster xatosi (${code ?? res.status})`, {
        status: res.status,
      });
    }
    return (body.response ?? ([] as unknown)) as T;
  }

  async testConnection(): Promise<PosConnectionResult> {
    try {
      await this.get<PosterCategoryRaw[]>("menu.getCategories");
      return { ok: true, message: "Poster bilan ulanish muvaffaqiyatli" };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "Ulanib bo'lmadi" };
    }
  }

  async fetchMenu(): Promise<PosMenu> {
    const [rawCats, rawProds] = await Promise.all([
      this.get<PosterCategoryRaw[]>("menu.getCategories"),
      this.get<PosterProductRaw[]>("menu.getProducts"),
    ]);

    const categories: NormalizedCategory[] = (rawCats || []).map((c) => ({
      externalId: String(c.category_id),
      name: c.category_name,
      sortOrder: c.sort_order != null ? Number(c.sort_order) : 0,
      parentExternalId:
        c.parent_category != null && String(c.parent_category) !== "0"
          ? String(c.parent_category)
          : null,
      isVisible: !toBool(c.category_hidden),
    }));

    const products: NormalizedProduct[] = (rawProds || []).map((p) => {
      const available = !toBool(p.hidden);
      const stockStatus: StockStatus | undefined = available ? "IN_STOCK" : "OUT_OF_STOCK";
      return {
        externalId: String(p.product_id),
        categoryExternalId:
          p.menu_category_id != null ? String(p.menu_category_id) : null,
        name: p.product_name,
        description: null,
        price: posterPrice(p.price),
        oldPrice: null,
        imageUrl: imgUrl(p.photo_origin || p.photo),
        weight: p.weight != null ? String(p.weight) : null,
        calories: null,
        isAvailable: available,
        stockStatus,
        sortOrder: 0,
      };
    });

    return { categories, products };
  }
}
