/**
 * POS integratsiya — provayderga bog'liq bo'lmagan umumiy tiplar.
 *
 * G'oya: OzodFlow hech qachon bitta POS tizimiga (Clopos) bog'lanib qolmasin.
 * Har bir POS (Clopos, iiko, Poster, JOWI, R-Keeper) `PosProvider` interfeysini
 * amalga oshiradi va bu yerdagi NORMALLASHTIRILGAN DTO'larni qaytaradi.
 * Qolgan kod (sync, UI, order flow) faqat shu umumiy tiplar bilan ishlaydi.
 */

/** Qo'llab-quvvatlanadigan provayderlar */
export type PosProviderId = "CLOPOS" | "IIKO" | "POSTER" | "JOWI" | "RKEEPER";

/** Provayder hisob ma'lumotlari (har provayder o'ziga xos maydonlar to'plami) */
export type PosCredentials = Record<string, string>;

/** Ombor holati (provayderdan mustaqil) */
export type StockStatus = "IN_STOCK" | "OUT_OF_STOCK" | "LOW";

/** Normallashtirilgan kategoriya */
export interface NormalizedCategory {
  externalId: string;
  name: string;
  sortOrder?: number;
  parentExternalId?: string | null;
  isVisible?: boolean;
}

/** Modifikator/qo'shimcha (masalan: "O'lcham", "Qo'shimcha sous") */
export interface NormalizedModifierOption {
  externalId: string;
  name: string;
  price: number;
}

export interface NormalizedModifier {
  externalId: string;
  name: string;
  required?: boolean;
  minSelect?: number;
  maxSelect?: number;
  options: NormalizedModifierOption[];
}

/** Normallashtirilgan mahsulot */
export interface NormalizedProduct {
  externalId: string;
  categoryExternalId: string | null;
  name: string;
  description?: string | null;
  price: number;
  oldPrice?: number | null;
  imageUrl?: string | null;
  weight?: string | null;
  calories?: number | null;
  isAvailable: boolean;
  stockStatus?: StockStatus;
  sortOrder?: number;
  modifiers?: NormalizedModifier[];
}

/** Menyu snapshot — provayderdan bir marta olinadigan to'liq holat */
export interface PosMenu {
  categories: NormalizedCategory[];
  products: NormalizedProduct[];
}

/** OzodFlow → POS ga yuboriladigan buyurtma */
export interface PosOrderItemInput {
  externalProductId: string;
  qty: number;
  note?: string;
  modifierOptionIds?: string[];
}

export interface PosOrderInput {
  tableExternalId?: string | null;
  items: PosOrderItemInput[];
  comment?: string | null;
  phone?: string | null;
}

export interface PosOrderResult {
  externalOrderId: string;
  status: string;
}

/** Ulanishni tekshirish natijasi */
export interface PosConnectionResult {
  ok: boolean;
  message: string;
  meta?: Record<string, unknown>;
}

/**
 * Provayder metama'lumoti — UI ("POS ulash" oynasi) shu asosda
 * dinamik forma chizadi. Yangi provayder qo'shganda faqat shu yerga
 * bitta yozuv qo'shiladi, UI avtomatik yangilanadi.
 */
export interface PosCredentialField {
  key: string;
  label: string;
  placeholder?: string;
  type?: "text" | "password";
  required?: boolean;
  help?: string;
}

export interface PosProviderMeta {
  id: PosProviderId;
  label: string;
  /** Hali ishga tushmagan provayderlar UI'da "tez orada" bo'lib turadi */
  available: boolean;
  credentialFields: PosCredentialField[];
  docsUrl?: string;
}
