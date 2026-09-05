"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { trackMetaPixelEvent } from "@/lib/meta-pixel";

type CryptoNetwork = "trc20" | "bep20";
type CryptoPaymentStatus = "pending" | "detected" | "paid" | "expired" | "underpaid" | "manual_review";

type PublicCryptoPayment = {
  id: string;
  orderReference: string;
  status: CryptoPaymentStatus;
  currency: "USDT";
  network: CryptoNetwork | null;
  receivingAddress: string | null;
  amountUsdt: string;
  amountUah: number;
  txHash: string | null;
  expiresAt: string;
  createdAt: string;
  wallets: Record<CryptoNetwork, string>;
  contracts: Record<CryptoNetwork, string>;
};

type CryptoPaymentClientProps = {
  initialPayment: PublicCryptoPayment;
};

const networkLabels: Record<CryptoNetwork, string> = {
  trc20: "TRON (TRC20)",
  bep20: "BNB Smart Chain (BEP20)"
};

const statusLabels: Record<CryptoPaymentStatus, string> = {
  pending: "Waiting for payment",
  detected: "Transaction detected, waiting for confirmations",
  paid: "Payment Successful",
  expired: "Invoice expired",
  underpaid: "Underpaid, manual check required",
  manual_review: "Manual review required"
};

function formatTime(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function qrUrl(value: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&data=${encodeURIComponent(value)}`;
}

export function CryptoPaymentClient({ initialPayment }: CryptoPaymentClientProps) {
  const [payment, setPayment] = useState(initialPayment);
  const [network, setNetwork] = useState<CryptoNetwork>(initialPayment.network || "trc20");
  const [statusText, setStatusText] = useState("");
  const [checking, setChecking] = useState(false);
  const [remaining, setRemaining] = useState(() => new Date(initialPayment.expiresAt).getTime() - Date.now());
  const address = payment.receivingAddress || payment.wallets[network];
  const isFinal = ["paid", "expired", "underpaid", "manual_review"].includes(payment.status);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemaining(new Date(payment.expiresAt).getTime() - Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [payment.expiresAt]);

  const refreshPayment = useCallback(async (selectedNetwork = network) => {
    setChecking(true);
    setStatusText("Checking blockchain...");
    try {
      const response = await fetch(`/api/payments/${payment.id}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ network: selectedNetwork })
      });
      const data = await response.json() as { payment?: PublicCryptoPayment; error?: string };
      if (!response.ok || !data.payment) throw new Error(data.error || "Payment check failed");
      setPayment(data.payment);
      if (data.payment.network) setNetwork(data.payment.network);
      setStatusText(statusLabels[data.payment.status]);

      if (data.payment.status === "paid") {
        trackMetaPixelEvent("Purchase", {
          content_ids: [data.payment.orderReference],
          content_type: "product_group",
          currency: "USD",
          value: Number(data.payment.amountUsdt)
        });
      }
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Unable to check payment right now");
    } finally {
      setChecking(false);
    }
  }, [network, payment.id]);

  useEffect(() => {
    if (isFinal) return;
    const timer = window.setInterval(() => {
      void refreshPayment(network);
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [isFinal, network, refreshPayment]);

  async function copy(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    setStatusText(`${label} copied`);
  }

  return (
    <main className="crypto-page">
      <section className="crypto-card">
        <div className="crypto-card__top">
          <span>DRIP. Crypto Checkout</span>
          <b>{formatTime(remaining)}</b>
        </div>

        <div className="crypto-card__heading">
          <p>Order {payment.orderReference}</p>
          <h1>{payment.status === "paid" ? "Payment Successful" : "Pay with Crypto"}</h1>
          <span className={`crypto-status crypto-status--${payment.status}`}>{statusLabels[payment.status]}</span>
        </div>

        <div className="crypto-networks">
          {(Object.keys(networkLabels) as CryptoNetwork[]).map(option => (
            <button
              className={network === option ? "active" : ""}
              disabled={payment.status !== "pending" || checking}
              key={option}
              type="button"
              onClick={() => {
                setNetwork(option);
                void refreshPayment(option);
              }}
            >
              {networkLabels[option]}
            </button>
          ))}
        </div>

        <div className="crypto-qr">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl(address)} alt={`${networkLabels[network]} payment QR`} />
        </div>

        <div className="crypto-details">
          <div>
            <span>Network</span>
            <strong>{networkLabels[payment.network || network]}</strong>
          </div>
          <div>
            <span>Exact amount</span>
            <strong>{payment.amountUsdt} USDT</strong>
          </div>
          <div>
            <span>Wallet address</span>
            <strong>{address}</strong>
          </div>
          <div>
            <span>USDT contract</span>
            <strong>{payment.contracts[payment.network || network]}</strong>
          </div>
          {payment.txHash && (
            <div>
              <span>Transaction</span>
              <strong>{payment.txHash}</strong>
            </div>
          )}
        </div>

        <div className="crypto-actions">
          <button type="button" onClick={() => copy(address, "Address")}>Copy Address</button>
          <button type="button" onClick={() => copy(payment.amountUsdt, "Amount")}>Copy Amount</button>
        </div>

        <button className="crypto-check" type="button" disabled={checking || isFinal} onClick={() => refreshPayment(network)}>
          {checking ? "Checking..." : "I have paid"}
        </button>

        {statusText && <div className="crypto-message">{statusText}</div>}
        <p className="crypto-note">
          Send only USDT via the selected network. Wrong network, wrong token or different amount can require manual review.
        </p>
        <Link className="crypto-back" href="/catalog">Back to catalog</Link>
      </section>
    </main>
  );
}
