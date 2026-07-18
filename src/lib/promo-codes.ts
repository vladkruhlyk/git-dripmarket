export type PromoCode = {
  code: string;
  discountType: "percentage" | "fixed";
  amount: number;
  minOrderTotal?: number | null;
  expiresAt?: string | null;
};

export type AppliedPromoCode = PromoCode & {
  discount: number;
};

export function normalizePromoCode(code: string) {
  return code.trim().toUpperCase();
}

export function calculatePromoDiscount(promoCode: PromoCode, total: number) {
  const amount = Number(promoCode.amount) || 0;
  const minOrderTotal = Number(promoCode.minOrderTotal) || 0;

  if (total <= 0 || amount <= 0 || total < minOrderTotal) return 0;

  const discount = promoCode.discountType === "percentage"
    ? total * Math.min(amount, 100) / 100
    : amount;

  return Math.min(total, Math.max(0, Math.round(discount)));
}

export function isPromoExpired(expiresAt?: string | null) {
  return Boolean(expiresAt && new Date(expiresAt).getTime() < Date.now());
}
