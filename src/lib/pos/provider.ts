/**
 * `PosProvider` — barcha POS integratsiyalari amalga oshiradigan interfeys.
 * Bu qatlam tashqi dunyo (Clopos API va h.k.) bilan OzodFlow o'rtasidagi
 * yagona shartnoma. Kod boshqa joyda faqat shu interfeysga tayanadi.
 */
import type {
  PosProviderId,
  PosCredentials,
  PosMenu,
  PosConnectionResult,
  PosOrderInput,
  PosOrderResult,
} from "./types";
import { PosError } from "./errors";

export interface PosProviderContext {
  credentials: PosCredentials;
  /** Log/telemetriya uchun restoran ID (ixtiyoriy) */
  restaurantId?: string;
}

export interface PosProvider {
  readonly id: PosProviderId;

  /** Hisob ma'lumotlari to'g'ri ekanini tekshiradi (Settings → Test Connection) */
  testConnection(): Promise<PosConnectionResult>;

  /** To'liq menyuni (kategoriya + mahsulot) provayderdan oladi */
  fetchMenu(): Promise<PosMenu>;

  /** Buyurtmani POS ga yuboradi (ixtiyoriy — hamma provayder qo'llamaydi) */
  pushOrder?(input: PosOrderInput): Promise<PosOrderResult>;

  /** Buyurtma holatini POS dan oladi (ixtiyoriy) */
  fetchOrderStatus?(externalOrderId: string): Promise<string>;
}

/**
 * Barcha provayderlar uchun umumiy asos: HTTP so'rov, xatolarni
 * `PosError` ga normallashtirish, kredensial o'qish yordamchilari.
 */
export abstract class BasePosProvider implements PosProvider {
  abstract readonly id: PosProviderId;
  protected readonly credentials: PosCredentials;
  protected readonly restaurantId?: string;

  constructor(ctx: PosProviderContext) {
    this.credentials = ctx.credentials;
    this.restaurantId = ctx.restaurantId;
  }

  abstract testConnection(): Promise<PosConnectionResult>;
  abstract fetchMenu(): Promise<PosMenu>;

  /** Talab qilinadigan kredensialni oladi, bo'lmasa CONFIG xatosi */
  protected cred(key: string): string {
    const v = this.credentials[key];
    if (!v) throw new PosError("CONFIG", `"${key}" kiritilmagan`);
    return v;
  }

  /** JSON HTTP so'rovi — xatolarni PosError ga aylantiradi */
  protected async request<T>(
    url: string,
    init: RequestInit & { timeoutMs?: number } = {}
  ): Promise<T> {
    const { timeoutMs = 15000, ...rest } = init;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(url, {
        ...rest,
        signal: controller.signal,
        headers: { Accept: "application/json", ...(rest.headers || {}) },
      });
    } catch (err) {
      throw new PosError("NETWORK", "POS tizimiga ulanib bo'lmadi", { cause: err });
    } finally {
      clearTimeout(timer);
    }

    if (res.status === 401 || res.status === 403) {
      throw new PosError("AUTH", "Avtorizatsiya rad etildi", { status: res.status });
    }
    if (res.status === 429) {
      throw new PosError("RATE_LIMIT", "So'rovlar limitidan oshdi", { status: res.status });
    }
    if (res.status === 404) {
      throw new PosError("NOT_FOUND", "Resurs topilmadi", { status: res.status });
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new PosError("PROVIDER", `POS xatosi (${res.status})${text ? ": " + text.slice(0, 200) : ""}`, {
        status: res.status,
      });
    }

    return (await res.json().catch(() => {
      throw new PosError("PROVIDER", "POS javobi JSON emas");
    })) as T;
  }
}
