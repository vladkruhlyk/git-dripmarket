import { notFound } from "next/navigation";
import { CryptoPaymentClient } from "@/app/crypto-payment/[id]/CryptoPaymentClient";
import { getCryptoPayment, getPublicCryptoPayment } from "@/lib/crypto-payments";

type CryptoPaymentPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CryptoPaymentPage({ params }: CryptoPaymentPageProps) {
  const { id } = await params;
  const payment = await getCryptoPayment(id);

  if (!payment) notFound();

  return <CryptoPaymentClient initialPayment={getPublicCryptoPayment(payment)} />;
}
