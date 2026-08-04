/** POS integratsiyasidagi tipli xatolar */

export type PosErrorCode =
  | "AUTH" // hisob ma'lumotlari noto'g'ri
  | "NETWORK" // provayderga ulanib bo'lmadi
  | "RATE_LIMIT" // provayder limitga urildi
  | "NOT_FOUND" // resurs topilmadi
  | "PROVIDER" // provayder tomonidagi umumiy xato
  | "UNSUPPORTED" // amal bu provayderda mavjud emas
  | "CONFIG"; // sozlama/hisob ma'lumoti yetishmayapti

export class PosError extends Error {
  code: PosErrorCode;
  status?: number;
  cause?: unknown;

  constructor(code: PosErrorCode, message: string, opts?: { status?: number; cause?: unknown }) {
    super(message);
    this.name = "PosError";
    this.code = code;
    this.status = opts?.status;
    this.cause = opts?.cause;
  }
}

/** Foydalanuvchiga ko'rsatish uchun xavfsiz (o'zbekcha) xabar */
export function posErrorMessage(err: unknown): string {
  if (err instanceof PosError) {
    switch (err.code) {
      case "AUTH":
        return "Hisob ma'lumotlari noto'g'ri. API kalit va ID larni tekshiring.";
      case "NETWORK":
        return "POS tizimiga ulanib bo'lmadi. Internet yoki provayder holatini tekshiring.";
      case "RATE_LIMIT":
        return "So'rovlar juda ko'p. Biroz kutib qayta urinib ko'ring.";
      case "NOT_FOUND":
        return "So'ralgan ma'lumot topilmadi.";
      case "CONFIG":
        return "Integratsiya sozlamalari to'liq emas.";
      case "UNSUPPORTED":
        return "Bu amal ushbu POS tizimida qo'llab-quvvatlanmaydi.";
      default:
        return err.message || "POS tizimida xatolik yuz berdi.";
    }
  }
  return "POS tizimida noma'lum xatolik yuz berdi.";
}
