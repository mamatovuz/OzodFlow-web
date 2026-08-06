/**
 * Instagram token'larini shifrlash. POS bilan bir xil AES-256-GCM
 * mexanizmi ishlatiladi (kod takrorlanmasligi uchun qayta eksport).
 * Token'lar DB'da HECH QACHON ochiq saqlanmaydi.
 */
import { encryptCredentials, decryptCredentials } from "@/lib/pos/crypto";

export type IgTokens = {
  token: string; // long-lived access token
  refresh?: string; // (Instagram Login'da refresh alohida yo'q — token yangilanadi)
};

export function encryptTokens(tokens: IgTokens): string {
  return encryptCredentials(tokens as Record<string, string>);
}

export function decryptTokens(payload: string): IgTokens {
  const data = decryptCredentials(payload);
  return { token: data.token, refresh: data.refresh };
}
