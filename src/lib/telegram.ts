import "server-only";

const TELEGRAM_API_URL = "https://api.telegram.org";
const TELEGRAM_MESSAGE_LIMIT = 3900;
const TELEGRAM_TIMEOUT_MS = 10_000;

type TelegramCustomer = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  telegram?: string;
  instagram?: string;
};

type TelegramDelivery = {
  method?: string;
  city?: string;
  cityRef?: string;
  warehouse?: string;
  warehouseRef?: string;
  address?: string;
};

type TelegramOrderItem = {
  productId?: string;
  brand?: string;
  name?: string;
  size?: string;
  insoleCm?: string;
  price?: number;
};

export type TelegramOrder = {
  orderReference: string;
  paymentMethod?: string;
  paymentLabel?: string;
  customer?: TelegramCustomer;
  delivery?: TelegramDelivery;
  items?: TelegramOrderItem[];
  promoCode?: string;
  total?: number;
  discount?: number;
  discountedTotal?: number;
  dueNow?: number;
  comment?: string;
};

export type TelegramNotificationResult = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
};

type TelegramCryptoPayment = {
  id?: string;
  network?: string | null;
  amount_usdt?: string;
  receiving_address?: string | null;
  tx_hash?: string | null;
};

type TelegramConfig = {
  botToken: string;
  chatId: string;
  threadId?: string;
};

type TelegramInlineKeyboard = {
  inline_keyboard: Array<Array<{ text: string; url: string }>>;
};

function getTelegramConfig(): TelegramConfig | null {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  const threadId = process.env.TELEGRAM_MESSAGE_THREAD_ID?.trim();

  if (!botToken || !chatId) return null;
  return { botToken, chatId, ...(threadId ? { threadId } : {}) };
}

function clean(value: string | undefined) {
  return value?.trim() || "-";
}

function profileUsername(value: string | undefined, service: "telegram" | "instagram") {
  if (!value) return "";

  const normalized = value.trim().replace(/^@/, "");
  const hostPattern = service === "telegram"
    ? /^(?:https?:\/\/)?(?:www\.)?t\.me\/([^/?#]+)\/?$/i
    : /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^/?#]+)\/?$/i;
  const username = normalized.match(hostPattern)?.[1] || normalized;
  const validPattern = service === "telegram"
    ? /^[a-zA-Z0-9_]{5,32}$/
    : /^[a-zA-Z0-9._]{1,30}$/;

  return validPattern.test(username) ? username : "";
}

function contactKeyboard(order: TelegramOrder): TelegramInlineKeyboard | undefined {
  const telegram = profileUsername(order.customer?.telegram, "telegram");
  const instagram = profileUsername(order.customer?.instagram, "instagram");
  const buttons = [
    telegram ? { text: "💬 Написати в Telegram", url: `https://t.me/${telegram}` } : null,
    instagram ? { text: "📸 Написати в Instagram", url: `https://instagram.com/${instagram}` } : null
  ].filter((button): button is { text: string; url: string } => Boolean(button));

  return buttons.length ? { inline_keyboard: [buttons] } : undefined;
}

function money(value: number | undefined) {
  return `${new Intl.NumberFormat("uk-UA").format(Math.round(value || 0))} грн`;
}

function deliveryText(delivery: TelegramDelivery | undefined) {
  if (delivery?.method === "courier") {
    return `Кур'єр: ${clean(delivery.city)}, ${clean(delivery.address)}`;
  }

  return `Нова пошта: ${clean(delivery?.city)}, ${clean(delivery?.warehouse)}`;
}

function itemsText(items: TelegramOrderItem[] | undefined) {
  if (!items?.length) return "-";

  return items.map((item, index) => {
    const details = [
      item.size ? `розмір ${item.size}` : "",
      item.insoleCm ? `устілка ${item.insoleCm} см` : ""
    ].filter(Boolean).join(", ");

    return `${index + 1}. ${[item.brand, item.name].filter(Boolean).join(" ") || "Товар"}\n` +
      `   ${details || "розмір не вказано"} | ${money(item.price)}`;
  }).join("\n");
}

function orderMessage(order: TelegramOrder, heading: string, status: string) {
  const customerName = [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(" ");
  const contactLines = [
    `📞 Телефон: ${clean(order.customer?.phone)}`,
    `✉️ Email: ${clean(order.customer?.email)}`,
    order.customer?.telegram ? `💬 Telegram: ${order.customer.telegram}` : "",
    order.customer?.instagram ? `📸 Instagram: ${order.customer.instagram}` : ""
  ].filter(Boolean);
  const discountLines = order.discount
    ? [`🏷️ Промокод: ${clean(order.promoCode)}`, `🎁 Знижка: ${money(order.discount)}`]
    : [];

  return [
    heading,
    `⏳ Статус: ${status}`,
    `🧾 Замовлення: ${order.orderReference}`,
    "",
    `👤 Клієнт: ${customerName || "-"}`,
    ...contactLines,
    "",
    `🚚 Доставка: ${deliveryText(order.delivery)}`,
    `💳 Оплата: ${clean(order.paymentLabel)}`,
    `💰 До сплати зараз: ${money(order.dueNow)}`,
    "",
    "📦 Товари:",
    itemsText(order.items),
    "",
    `💵 Сума товарів: ${money(order.total)}`,
    ...discountLines,
    `✅ Разом: ${money(order.discountedTotal)}`,
    `📝 Коментар: ${clean(order.comment)}`
  ].join("\n");
}

function splitMessage(message: string) {
  const chunks: string[] = [];
  let current = "";

  for (const line of message.split("\n")) {
    const next = current ? `${current}\n${line}` : line;
    if (next.length <= TELEGRAM_MESSAGE_LIMIT) {
      current = next;
      continue;
    }

    if (current) chunks.push(current);
    current = line;

    while (current.length > TELEGRAM_MESSAGE_LIMIT) {
      chunks.push(current.slice(0, TELEGRAM_MESSAGE_LIMIT));
      current = current.slice(TELEGRAM_MESSAGE_LIMIT);
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

async function telegramRequest(config: TelegramConfig, method: string, init: RequestInit) {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/bot${config.botToken}/${method}`, {
      ...init,
      signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
      cache: "no-store"
    });

    if (response.ok) return { ok: true } satisfies TelegramNotificationResult;

    const payload = await response.json().catch(() => null) as { description?: string } | null;
    return {
      ok: false,
      error: (payload?.description || `Telegram HTTP ${response.status}`).slice(0, 300)
    } satisfies TelegramNotificationResult;
  } catch {
    return { ok: false, error: "Telegram request failed or timed out" } satisfies TelegramNotificationResult;
  }
}

async function sendText(config: TelegramConfig, message: string, keyboard?: TelegramInlineKeyboard) {
  const chunks = splitMessage(message);
  for (const [index, text] of chunks.entries()) {
    const result = await telegramRequest(config, "sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.chatId,
        text,
        disable_web_page_preview: true,
        ...(keyboard && index === chunks.length - 1 ? { reply_markup: keyboard } : {}),
        ...(config.threadId ? { message_thread_id: config.threadId } : {})
      })
    });

    if (!result.ok) return result;
  }

  return { ok: true } satisfies TelegramNotificationResult;
}

async function sendReceipt(config: TelegramConfig, receipt: File, fileName: string, orderReference: string) {
  const formData = new FormData();
  formData.set("chat_id", config.chatId);
  formData.set("caption", `📎 Квитанція до замовлення ${orderReference}`);
  formData.set("document", receipt, fileName);
  if (config.threadId) formData.set("message_thread_id", config.threadId);

  return telegramRequest(config, "sendDocument", {
    method: "POST",
    body: formData
  });
}

export async function notifyOrderAwaitingPayment(order: TelegramOrder) {
  const config = getTelegramConfig();
  if (!config) return { ok: false, skipped: true, error: "Telegram is not configured" };

  return sendText(config, orderMessage(
    order,
    "🛍️ НОВЕ ЗАМОВЛЕННЯ",
    "очікується оплата"
  ), contactKeyboard(order));
}

export async function notifyPaymentSubmitted(order: TelegramOrder, receipt: File, fileName: string) {
  const config = getTelegramConfig();
  if (!config) return { ok: false, skipped: true, error: "Telegram is not configured" };

  const messageResult = await sendText(config, orderMessage(
    order,
    "✅ КЛІЄНТ ПОВІДОМИВ ПРО ОПЛАТУ",
    "квитанцію завантажено, потрібна перевірка"
  ), contactKeyboard(order));
  if (!messageResult.ok) return messageResult;

  return sendReceipt(config, receipt, fileName, order.orderReference);
}

export async function notifyCryptoPaymentPaid(order: TelegramOrder, payment: TelegramCryptoPayment) {
  const config = getTelegramConfig();
  if (!config) return { ok: false, skipped: true, error: "Telegram is not configured" };

  const message = [
    "🟢 CRYPTO ОПЛАТА ПІДТВЕРДЖЕНА",
    `🧾 Замовлення: ${order.orderReference}`,
    `💵 Сума: ${payment.amount_usdt || "-"} USDT`,
    `🌐 Мережа: ${payment.network ? payment.network.toUpperCase() : "-"}`,
    `👛 Гаманець: ${payment.receiving_address || "-"}`,
    `🔗 TX: ${payment.tx_hash || "-"}`,
    "",
    orderMessage(order, "📦 ДАНІ ЗАМОВЛЕННЯ", "paid")
  ].join("\n");

  return sendText(config, message, contactKeyboard(order));
}
