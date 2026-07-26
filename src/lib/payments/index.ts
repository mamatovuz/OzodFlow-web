/**
 * TO'LOVLAR — ommaviy interfeys
 *
 * Chaqiruvchi kod `@/lib/payments` dan import qiladi va ichki
 * tuzilishni bilishi shart emas. Shlyuz almashtirilsa (yoki ikkinchisi
 * qo'shilsa) faqat shu papka ichi o'zgaradi.
 *
 * Hozirgi shlyuz: **inPAY** (`inpay.ts`).
 *
 * ISM QOIDASI: bu qatlamdagi nomlar shlyuzga BOG'LIQ EMAS
 * (`startGatewayDeposit`, `settleGatewayPayment`, `GATEWAY_MIN_SUM`).
 * Shu sababli shlyuz almashganda chaqiruvchi kod tegilmaydi — bu
 * CHECKOUT.UZ'dan inPAY'ga o'tishda amalda tekshirildi.
 */

export {
  PaymentError,
  confirmDeposit,
  listAllPendingDeposits,
  listPendingDeposits,
  recheckPendingGatewayPayments,
  rejectDeposit,
  requestManualDeposit,
  settleGatewayPayment,
  startGatewayDeposit,
  type GatewayDeposit,
  type PendingDeposit,
  type SettleResult,
  type VerifyFn,
} from "@/lib/payments/deposits";

export {
  InpayError,
  getInpayMerchant,
  getInpayPaymentStatus,
  inpayErrorMessage,
  type InpayMethod,
  type InpayPaymentStatus,
} from "@/lib/payments/inpay";

// ─────────────────────────────────────────────────────────────────────────────
// Shlyuzdan mustaqil nomlar
// ─────────────────────────────────────────────────────────────────────────────
//
// UI va action'lar SHU nomlarni ishlatadi. Shunda shlyuz almashsa
// faqat pastdagi to'rt qator o'zgaradi.

export {
  INPAY_MAX_SUM as GATEWAY_MAX_SUM,
  INPAY_MIN_SUM as GATEWAY_MIN_SUM,
  inpayErrorMessage as gatewayErrorMessage,
  isInpayConfigured as isGatewayConfigured,
} from "@/lib/payments/inpay";
