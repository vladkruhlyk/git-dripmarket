import { NextRequest, NextResponse } from "next/server";
import { calculatePromoDiscount, isPromoExpired, normalizePromoCode, type PromoCode } from "@/lib/promo-codes";
import { sanityClient } from "@/sanity/client";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { code?: string; total?: number } | null;
  const code = normalizePromoCode(body?.code || "");
  const total = Number(body?.total) || 0;

  if (!code) {
    return NextResponse.json({ error: "Enter promo code" }, { status: 400 });
  }

  const promoCodes = await sanityClient.fetch<Array<PromoCode & { active?: boolean }>>(
    `*[_type == "promoCode" && active == true]{
      code,
      active,
      discountType,
      amount,
      minOrderTotal,
      expiresAt
    }`,
    {},
    { next: { revalidate: 30, tags: ["promo-codes"] } }
  );
  const promoCode = promoCodes.find(item => normalizePromoCode(item.code) === code);

  if (!promoCode || !promoCode.active || isPromoExpired(promoCode.expiresAt)) {
    return NextResponse.json({ error: "Promo code is not active" }, { status: 404 });
  }

  const discount = calculatePromoDiscount(promoCode, total);
  if (discount <= 0) {
    return NextResponse.json({ error: "Promo code cannot be applied to this order" }, { status: 400 });
  }

  return NextResponse.json({
    promoCode: {
      code: promoCode.code,
      discountType: promoCode.discountType,
      amount: promoCode.amount,
      minOrderTotal: promoCode.minOrderTotal || 0,
      expiresAt: promoCode.expiresAt || null,
      discount
    }
  });
}
