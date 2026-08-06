import { notFound } from "next/navigation";
import { PaymentClient } from "@/app/(store)/payment/[orderReference]/PaymentClient";
import { getFopPaymentUrl, isFopPaymentMethod, isValidPaymentToken } from "@/lib/payment";
import { sanityClient } from "@/sanity/client";

type PaymentPageProps = {
  params: Promise<{ orderReference: string }>;
  searchParams: Promise<{ token?: string | string[] }>;
};

type PaymentOrder = {
  orderReference: string;
  paymentMethod?: string;
  paymentLabel?: string;
  paymentStatus?: string;
  paymentTokenHash?: string;
  dueNow?: number;
};

export default async function PaymentPage({ params, searchParams }: PaymentPageProps) {
  const [{ orderReference }, query] = await Promise.all([params, searchParams]);
  const token = typeof query.token === "string" ? query.token : "";

  if (!token) notFound();

  const order = await sanityClient.fetch<PaymentOrder | null>(
    `*[_type == "order" && orderReference == $orderReference][0]{
      orderReference,
      paymentMethod,
      paymentLabel,
      paymentStatus,
      paymentTokenHash,
      dueNow
    }`,
    { orderReference },
    { cache: "no-store" }
  );

  if (
    !order ||
    !order.paymentTokenHash ||
    !isFopPaymentMethod(order.paymentMethod || "") ||
    !isValidPaymentToken(token, order.paymentTokenHash)
  ) {
    notFound();
  }

  return (
    <PaymentClient
      bankUrl={getFopPaymentUrl()}
      dueNow={Number(order.dueNow) || 0}
      orderReference={order.orderReference}
      paymentLabel={order.paymentLabel || "Оплата на ФОП"}
      receiptUploaded={order.paymentStatus === "receipt-uploaded" || order.paymentStatus === "confirmed"}
      token={token}
    />
  );
}
