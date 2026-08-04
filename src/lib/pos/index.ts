/**
 * POS integratsiya moduli — yagona kirish nuqtasi (barrel).
 * Tashqi kod faqat shu yerdan import qiladi:
 *   import { syncMenu, createPosProvider, PROVIDER_META } from "@/lib/pos";
 */
export * from "./types";
export * from "./errors";
export * from "./provider";
export * from "./registry";
export { encryptCredentials, decryptCredentials, maskSecret } from "./crypto";
export { syncMenu, type SyncResult } from "./sync";
