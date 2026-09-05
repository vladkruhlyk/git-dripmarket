import { NextRequest, NextResponse } from "next/server";
import { createCryptoPayment, getPublicCryptoPayment } from "@/lib/crypto-payments";
import type { TelegramOrder } from "@/lib/telegram";

type CreatePaymentRequest = {
  order: TelegramOrder;
  amountUah: number;
};

export async function POST(request: NextRequest) {
  let body: Partial<CreatePaymentRequest>;
  try {
    body = await request.json() as Partial<CreatePaymentRequest>;
  } catch {
    return NextResponse.json({ error: "Invalid payment request" }, { status: 400 });
  }

  if (!body.order?.orderReference || !Number.isFinite(body.amountUah) || Number(body.amountUah) <= 0) {
    return NextResponse.json({ error: "Missing order or amount" }, { status: 400 });
  }

  try {
    const payment = await createCryptoPayment({
      order: body.order,
      amountUah: Number(body.amountUah)
    });

    return NextResponse.json({
      payment: getPublicCryptoPayment(payment),
      paymentUrl: `/crypto-payment/${payment.id}`
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Crypto payment is temporarily unavailable" }, { status: 503 });
  }
}
