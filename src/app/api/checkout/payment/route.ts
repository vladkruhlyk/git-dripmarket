import { NextRequest, NextResponse } from "next/server";
import { readPaymentToken } from "@/lib/payment";
import { notifyPaymentSubmitted } from "@/lib/telegram";

const MAX_RECEIPT_SIZE = 4 * 1024 * 1024;
const ALLOWED_RECEIPT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf"
]);

function cleanFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._() -]/g, "_").slice(0, 120) || "receipt";
}

export async function POST(request: NextRequest) {
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

  const order = readPaymentToken(token);
  if (!order || order.orderReference !== orderReference) {
    return NextResponse.json({ error: "Посилання на оплату недійсне" }, { status: 404 });
  }

  const fileName = cleanFileName(receipt.name);

  const telegramResult = await notifyPaymentSubmitted(order, receipt, fileName);
  if (!telegramResult.ok) {
    console.error("Telegram payment notification failed");
    return NextResponse.json({
      error: "Не вдалося передати квитанцію менеджеру. Спробуйте ще раз"
    }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    message: "Квитанцію завантажено. Ми перевіримо оплату та зв’яжемося з вами."
  });
}
