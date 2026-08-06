import { notFound } from "next/navigation";
import { PaymentClient } from "@/app/(store)/payment/[orderReference]/PaymentClient";
import { getFopPaymentUrl, readPaymentToken } from "@/lib/payment";

type PaymentPageProps = {
  params: Promise<{ orderReference: string }>;
  searchParams: Promise<{ token?: string | string[] }>;
};

export default async function PaymentPage({ params, searchParams }: PaymentPageProps) {
  const [{ orderReference }, query] = await Promise.all([params, searchParams]);
  const token = typeof query.token === "string" ? query.token : "";

  if (!token) notFound();

  const order = readPaymentToken(token);
  if (!order || order.orderReference !== orderReference) {
    notFound();
  }

  return (
    <PaymentClient
      bankUrl={getFopPaymentUrl()}
      dueNow={Number(order.dueNow) || 0}
      orderReference={order.orderReference}
      paymentLabel={order.paymentLabel || "Оплата на ФОП"}
      receiptUploaded={false}
      token={token}
    />
  );
}
