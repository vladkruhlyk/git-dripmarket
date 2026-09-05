import { NextRequest, NextResponse } from "next/server";
import { checkCryptoPayment, getCryptoPayment, getPublicCryptoPayment, type CryptoNetwork } from "@/lib/crypto-payments";

type PaymentRouteProps = {
  params: Promise<{ id: string }>;
};

function isCryptoNetwork(value: unknown): value is CryptoNetwork {
  return value === "trc20" || value === "bep20";
}

export async function GET(_request: NextRequest, { params }: PaymentRouteProps) {
  const { id } = await params;

  try {
    const payment = await getCryptoPayment(id);
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    return NextResponse.json({ payment: getPublicCryptoPayment(payment) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Payment is temporarily unavailable" }, { status: 503 });
  }
}

export async function POST(request: NextRequest, { params }: PaymentRouteProps) {
  const { id } = await params;
  const body = await request.json().catch(() => ({})) as { network?: unknown };
  const network = isCryptoNetwork(body.network) ? body.network : undefined;

  try {
    const payment = await checkCryptoPayment(id, network);
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    return NextResponse.json({ payment: getPublicCryptoPayment(payment) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to check blockchain right now" }, { status: 503 });
  }
}
