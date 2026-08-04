/**
 * Clopos POS provayderi.
 *
 * ⚠️ MUHIM: quyidagi endpoint yo'llari va JSON maydon nomlari Clopos'ning
 * rasmiy API hujjatlariga qarab yakuniy tasdiqlanishi kerak. Butun mapping
 * mana shu bitta faylda jamlangan — Clopos API o'zgarsa faqat shu yer
 * tahrirlanadi, qolgan tizim (sync, UI, order flow) tegilmaydi.
 *
 * Kredensiallar (UI shu asosda forma chizadi — `registry.ts` metama'lumoti):
 *   - baseUrl   : masalan https://<akkaunt>.clopos.com
 *   - token     : API kalit (Bearer)
 *   - venueId   : filial / venue ID
 */
import { BasePosProvider, type PosProviderContext } from "../provider";
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

// ─── Clopos xom javob shakllari (soddalashtirilgan; hujjatga qarab kengaytiriladi) ───
interface CloposCategoryRaw {
  id: number | string;
  name: string;
  parent_id?: number | string | null;
  sort?: number;
  hidden?: boolean;
}

interface CloposProductRaw {
  id: number | string;
  category_id?: number | string | null;
  name: string;
  description?: string | null;
  price?: number;
  old_price?: number | null;
  image?: string | null;
  photo?: string | null;
  weight?: string | number | null;
  calories?: number | null;
  status?: number | boolean; // sotuvda/ yo'q
  in_stock?: boolean;
  sort?: number;
}

interface CloposListResponse<T> {
  data?: T[];
}

export class CloposProvider extends BasePosProvider {
  readonly id: PosProviderId = "CLOPOS";

  constructor(ctx: PosProviderContext) {
    super(ctx);
  }

  private get base(): string {
    return this.cred("baseUrl").replace(/\/+$/, "");
  }

  private headers(): HeadersInit {
    return {
      Authorization: `Bearer ${this.cred("token")}`,
      "Content-Type": "application/json",
    };
  }

  private venue(): string {
    return this.cred("venueId");
  }

  async testConnection(): Promise<PosConnectionResult> {
    try {
      // Yengil endpoint — venue/profil ma'lumotini so'raymiz
      await this.request(`${this.base}/api/venue/${this.venue()}`, {
        headers: this.headers(),
      });
      return { ok: true, message: "Clopos bilan ulanish muvaffaqiyatli" };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : "Ulanib bo'lmadi",
      };
    }
  }

  async fetchMenu(): Promise<PosMenu> {
    const [catsRes, prodsRes] = await Promise.all([
      this.request<CloposListResponse<CloposCategoryRaw>>(
        `${this.base}/api/venue/${this.venue()}/categories`,
        { headers: this.headers() }
      ),
      this.request<CloposListResponse<CloposProductRaw>>(
        `${this.base}/api/venue/${this.venue()}/products`,
        { headers: this.headers() }
      ),
    ]);

    const categories: NormalizedCategory[] = (catsRes.data ?? []).map((c) => ({
      externalId: String(c.id),
      name: c.name,
      sortOrder: c.sort ?? 0,
      parentExternalId: c.parent_id != null ? String(c.parent_id) : null,
      isVisible: !c.hidden,
    }));

    const products: NormalizedProduct[] = (prodsRes.data ?? []).map((p) => {
      const available = typeof p.status === "boolean" ? p.status : p.status !== 0;
      const stockStatus: StockStatus | undefined =
        p.in_stock === undefined ? undefined : p.in_stock ? "IN_STOCK" : "OUT_OF_STOCK";
      return {
        externalId: String(p.id),
        categoryExternalId: p.category_id != null ? String(p.category_id) : null,
        name: p.name,
        description: p.description ?? null,
        price: Number(p.price ?? 0),
        oldPrice: p.old_price != null ? Number(p.old_price) : null,
        imageUrl: p.image ?? p.photo ?? null,
        weight: p.weight != null ? String(p.weight) : null,
        calories: p.calories ?? null,
        isAvailable: available,
        stockStatus,
        sortOrder: p.sort ?? 0,
      };
    });

    return { categories, products };
  }

  async pushOrder(input: PosOrderInput): Promise<PosOrderResult> {
    const body = {
      venue_id: this.venue(),
      table_id: input.tableExternalId ?? null,
      comment: input.comment ?? undefined,
      phone: input.phone ?? undefined,
      products: input.items.map((it) => ({
        product_id: it.externalProductId,
        count: it.qty,
        comment: it.note ?? undefined,
        modifiers: it.modifierOptionIds,
      })),
    };
    const res = await this.request<{ data?: { id: number | string; status?: string } }>(
      `${this.base}/api/venue/${this.venue()}/orders`,
      { method: "POST", headers: this.headers(), body: JSON.stringify(body) }
    );
    return {
      externalOrderId: String(res.data?.id ?? ""),
      status: res.data?.status ?? "PENDING",
    };
  }
}
