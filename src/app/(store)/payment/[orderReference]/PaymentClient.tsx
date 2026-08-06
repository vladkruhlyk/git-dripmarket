"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/products";

type PaymentClientProps = {
  orderReference: string;
  token: string;
  paymentLabel: string;
  dueNow: number;
  bankUrl: string;
  receiptUploaded: boolean;
};

const MAX_RECEIPT_SIZE = 4 * 1024 * 1024;

export function PaymentClient({
  orderReference,
  token,
  paymentLabel,
  dueNow,
  bankUrl,
  receiptUploaded
}: PaymentClientProps) {
  const [receipt, setReceipt] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(receiptUploaded);
  const [status, setStatus] = useState(receiptUploaded
    ? "Квитанцію вже завантажено. Оплата очікує перевірки."
    : "");

  async function submitReceipt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!receipt) {
      setStatus("Додайте квитанцію або скриншот оплати.");
      return;
    }

    if (receipt.size > MAX_RECEIPT_SIZE) {
      setStatus("Файл завеликий. Максимальний розмір — 4 МБ.");
      return;
    }

    const formData = new FormData();
    formData.set("orderReference", orderReference);
    formData.set("token", token);
    formData.set("receipt", receipt);

    setSubmitting(true);
    setStatus("Завантажуємо квитанцію...");

    try {
      const response = await fetch("/api/checkout/payment", {
        method: "POST",
        body: formData
      });
      const data = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "Не вдалося завантажити квитанцію");
      setSubmitted(true);
      setStatus(data.message || "Квитанцію завантажено.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Не вдалося завантажити квитанцію");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="payment-page">
      <div className="payment-page__eyebrow">Замовлення {orderReference}</div>
      <h1>{paymentLabel}</h1>
      <p className="payment-page__intro">
        Переведіть точно зазначену суму на рахунок ФОП. У призначенні платежу вкажіть номер замовлення.
      </p>

      <div className="payment-page__amount">
        <span>Сума до оплати</span>
        <strong>{formatPrice(dueNow)}</strong>
      </div>

      <a className="payment-page__pay" href={bankUrl} target="_blank" rel="noreferrer">
        Оплатити {formatPrice(dueNow)}
      </a>
      <p className="payment-page__hint">
        Посилання відкриється в новій вкладці або банківському застосунку. Після переказу поверніться сюди.
      </p>

      <form className="payment-receipt" onSubmit={submitReceipt}>
        <h2>Підтвердження оплати</h2>
        <p>Завантажте квитанцію або скриншот переказу, а потім натисніть «Оплачено».</p>
        {!submitted && (
          <label className="payment-receipt__file">
            <span>{receipt ? receipt.name : "Вибрати квитанцію"}</span>
            <input
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
              type="file"
              onChange={event => {
                setReceipt(event.target.files?.[0] || null);
                setStatus("");
              }}
            />
          </label>
        )}
        <button type="submit" disabled={submitted || submitting || !receipt}>
          {submitted ? "Оплату відправлено на перевірку" : submitting ? "Завантажуємо..." : "Оплачено"}
        </button>
        {status && <div className={`payment-receipt__status ${submitted ? "success" : ""}`}>{status}</div>}
      </form>

      <Link className="payment-page__catalog" href="/catalog">Повернутися до каталогу</Link>
    </section>
  );
}
