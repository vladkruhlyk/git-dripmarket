import { NextRequest, NextResponse } from "next/server";
import { createClient } from "next-sanity";
import { isFopPaymentMethod, isValidPaymentToken } from "@/lib/payment";
import { apiVersion, dataset, projectId } from "@/sanity/env";

const MAX_RECEIPT_SIZE = 4 * 1024 * 1024;
const ALLOWED_RECEIPT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf"
]);

const sanityWriteClient = createClient({
  apiVersion,
  dataset,
  projectId: projectId || "missing-project-id",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false
});

type PaymentOrder = {
  _id: string;
  paymentMethod?: string;
  paymentStatus?: string;
  paymentTokenHash?: string;
};

function cleanFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._() -]/g, "_").slice(0, 120) || "receipt";
}

export async function POST(request: NextRequest) {
  if (!process.env.SANITY_API_TOKEN) {
    return NextResponse.json({ error: "Завантаження квитанцій не налаштовано" }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Не вдалося прочитати файл" }, { status: 400 });
  }

  const orderReference = String(formData.get("orderReference") || "").trim();
  const token = String(formData.get("token") || "").trim();
  const receipt = formData.get("receipt");

  if (!orderReference || !token || !(receipt instanceof File) || receipt.size === 0) {
    return NextResponse.json({ error: "Додайте квитанцію або скриншот оплати" }, { status: 400 });
  }

  if (receipt.size > MAX_RECEIPT_SIZE) {
    return NextResponse.json({ error: "Файл завеликий. Максимальний розмір — 4 МБ" }, { status: 413 });
  }

  if (!ALLOWED_RECEIPT_TYPES.has(receipt.type)) {
    return NextResponse.json({ error: "Підтримуються JPG, PNG, WebP, HEIC та PDF" }, { status: 415 });
  }

  const order = await sanityWriteClient.fetch<PaymentOrder | null>(
    `*[_type == "order" && orderReference == $orderReference][0]{
      _id,
      paymentMethod,
      paymentStatus,
      paymentTokenHash
    }`,
    { orderReference }
  );

  if (
    !order ||
    !order.paymentTokenHash ||
    !isFopPaymentMethod(order.paymentMethod || "") ||
    !isValidPaymentToken(token, order.paymentTokenHash)
  ) {
    return NextResponse.json({ error: "Посилання на оплату недійсне" }, { status: 404 });
  }

  if (order.paymentStatus === "confirmed") {
    return NextResponse.json({ error: "Оплату цього замовлення вже підтверджено" }, { status: 409 });
  }

  const fileName = cleanFileName(receipt.name);

  try {
    const asset = await sanityWriteClient.assets.upload("file", receipt, {
      contentType: receipt.type,
      filename: fileName
    });

    await sanityWriteClient.patch(order._id).set({
      status: "payment-review",
      paymentStatus: "receipt-uploaded",
      paymentReceipt: {
        _type: "file",
        asset: { _type: "reference", _ref: asset._id }
      },
      paymentReceiptName: fileName,
      paymentReceiptType: receipt.type,
      paymentSubmittedAt: new Date().toISOString()
    }).commit();
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Не вдалося зберегти квитанцію. Спробуйте ще раз" }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    message: "Квитанцію завантажено. Ми перевіримо оплату та зв’яжемося з вами."
  });
}
