/**
 * iiko POS provayderi — iikoCloud (iikoTransport) API ga mos.
 * Hujjat: https://api-ru.iiko.services/  (Swagger: /docs)
 *
 * Auth: POST /api/1/access_token { apiLogin } → { token } (1 soatlik).
 * Keyingi so'rovlar: `Authorization: Bearer <token>`.
 * Menyu: POST /api/1/nomenclature { organizationId } → { groups, products }.
 * organizationId bo'sh bo'lsa — /api/1/organizations dan birinchisi olinadi.
 *
 * Narx: product.sizePrices[0].price.currentPrice (so'mda).
 * Barcha iiko mapping shu bitta faylda.
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

const BASE_URL = "https://api-ru.iiko.services";

interface IikoGroupRaw {
  id: string;
  name: string;
  parentGroup?: string | null;
  order?: number;
  isDeleted?: boolean;
  isGroupModifier?: boolean;
}

interface IikoSizePrice {
  price?: { currentPrice?: number; isIncludedInMenu?: boolean };
}

interface IikoProductRaw {
  id: string;
  name: string;
  description?: string | null;
  groupId?: string | null;
  parentGroup?: string | null;
  productCategoryId?: string | null;
  sizePrices?: IikoSizePrice[];
  imageLinks?: string[];
  weight?: number | null;
  energyAmount?: number | null;
  isDeleted?: boolean;
  orderItemType?: string; // "Product" | "Compound" | ...
}

interface IikoNomenclature {
  groups?: IikoGroupRaw[];
  products?: IikoProductRaw[];
}

export class IikoProvider extends BasePosProvider {
  readonly id: PosProviderId = "IIKO";
  private token: string | null = null;
  private tokenAt = 0; // olingan vaqt (ms)

  constructor(ctx: PosProviderContext) {
    super(ctx);
  }

  // ─── Token olish (~1 soat amal qiladi; 50 daqiqadan so'ng yangilaymiz) ───
  private async getToken(): Promise<string> {
    if (this.token && Date.now() - this.tokenAt < 50 * 60_000) return this.token;
    const body = await this.post<{ token?: string }>("/api/1/access_token", {
      apiLogin: this.cred("api_login"),
    });
    if (!body.token) throw new PosError("AUTH", "iiko token olinmadi");
    this.token = body.token;
    this.tokenAt = Date.now();
    return this.token;
  }

  // Avtorizatsiyasiz POST (token olish uchun)
  private async post<T>(path: string, payload: unknown): Promise<T> {
    return this.send<T>(path, payload, false);
  }

  // Avtorizatsiyali POST (Bearer token bilan)
  private async authPost<T>(path: string, payload: unknown): Promise<T> {
    return this.send<T>(path, payload, true);
  }

  private async send<T>(path: string, payload: unknown, auth: boolean): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (auth) headers.Authorization = `Bearer ${await this.getToken()}`;

    let res: Response;
    try {
      res = await fetch(`${BASE_URL}${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload ?? {}),
      });
    } catch (err) {
      throw new PosError("NETWORK", "iiko'ga ulanib bo'lmadi", { cause: err });
    }
    if (res.status === 401 || res.status === 403) {
      this.token = null; // token yaroqsiz — keyingi safar qayta olamiz
      throw new PosError("AUTH", "iiko avtorizatsiyasi rad etildi", { status: res.status });
    }
    if (res.status === 429) {
      throw new PosError("RATE_LIMIT", "So'rovlar limitidan oshdi", { status: 429 });
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new PosError("PROVIDER", `iiko xatosi (${res.status})${text ? ": " + text.slice(0, 200) : ""}`, {
        status: res.status,
      });
    }
    return (await res.json().catch(() => {
      throw new PosError("PROVIDER", "iiko javobi JSON emas");
    })) as T;
  }

  // organizationId ni oladi (kiritilmagan bo'lsa birinchi tashkilotni)
  private async resolveOrgId(): Promise<string> {
    const given = this.credentials["organization_id"];
    if (given?.trim()) return given.trim();
    const body = await this.authPost<{ organizations?: { id: string }[] }>(
      "/api/1/organizations",
      { returnAdditionalInfo: false, includeDisabled: false }
    );
    const first = body.organizations?.[0]?.id;
    if (!first) throw new PosError("NOT_FOUND", "iiko tashkiloti topilmadi");
    return first;
  }

  async testConnection(): Promise<PosConnectionResult> {
    try {
      await this.getToken();
      const org = await this.resolveOrgId();
      return { ok: true, message: "iiko bilan ulanish muvaffaqiyatli", meta: { organizationId: org } };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "Ulanib bo'lmadi" };
    }
  }

  async fetchMenu(): Promise<PosMenu> {
    const organizationId = await this.resolveOrgId();
    const nom = await this.authPost<IikoNomenclature>("/api/1/nomenclature", {
      organizationId,
      startRevision: 0,
    });

    const categories: NormalizedCategory[] = (nom.groups || [])
      .filter((g) => !g.isGroupModifier) // modifikator guruhlari kategoriya emas
      .map((g) => ({
        externalId: g.id,
        name: g.name,
        sortOrder: g.order ?? 0,
        parentExternalId: g.parentGroup ?? null,
        isVisible: !g.isDeleted,
      }));

    const products: NormalizedProduct[] = (nom.products || [])
      .filter((p) => p.orderItemType == null || p.orderItemType === "Product" || p.orderItemType === "Compound")
      .map((p) => {
        const price = p.sizePrices?.[0]?.price?.currentPrice ?? 0;
        const available = !p.isDeleted;
        const stockStatus: StockStatus | undefined = available ? "IN_STOCK" : "OUT_OF_STOCK";
        return {
          externalId: p.id,
          categoryExternalId: p.parentGroup || p.groupId || null,
          name: p.name,
          description: p.description ?? null,
          price: typeof price === "number" ? price : 0,
          oldPrice: null,
          imageUrl: p.imageLinks?.[0] || null,
          weight: p.weight != null ? String(p.weight) : null,
          calories: p.energyAmount != null ? Math.round(p.energyAmount) : null,
          isAvailable: available,
          stockStatus,
          sortOrder: 0,
        };
      });

    return { categories, products };
  }
}
