import { NextRequest, NextResponse } from "next/server";
import { calculatePrepaymentAmount } from "@/lib/products";
import { calculatePromoDiscount, isPromoExpired, normalizePromoCode, type PromoCode } from "@/lib/promo-codes";
import { getProducts } from "@/sanity/queries";
import { sanityClient } from "@/sanity/client";
import { buildPaymentPath, createPaymentToken, hasPaymentTokenSecret, isFopPaymentMethod } from "@/lib/payment";
import { notifyOrderAwaitingPayment } from "@/lib/telegram";

type PaymentMethod = "fop-prepayment" | "fop-full" | "crypto-trc20" | "contact-after-order";

type CheckoutItem = {
  productId: string;
  size: string;
  insoleCm?: string;
};

type CheckoutCustomer = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  telegram?: string;
  instagram?: string;
  city: string;
  cityRef?: string;
  deliveryMethod: "nova-poshta" | "courier";
  warehouse: string;
  warehouseRef?: string;
  address: string;
  paymentMethod: PaymentMethod;
  comment: string;
};

type CheckoutRequest = {
  customer: CheckoutCustomer;
  items: CheckoutItem[];
  promoCode?: string;
};

function isFilledString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPaymentMethod(value: unknown): value is PaymentMethod {
  return value === "fop-prepayment" || value === "fop-full" || value === "crypto-trc20" || value === "contact-after-order";
}

function isValidCustomer(value: unknown): value is CheckoutCustomer {
  if (!value || typeof value !== "object") return false;
  const customer = value as Partial<CheckoutCustomer>;
  const hasDeliveryAddress = customer.deliveryMethod === "courier"
    ? isFilledString(customer.address)
    : customer.deliveryMethod === "nova-poshta" && isFilledString(customer.warehouse);

  return (
    isFilledString(customer.firstName) &&
    isFilledString(customer.lastName) &&
    isFilledString(customer.phone) &&
    isFilledString(customer.email) &&
    customer.email.includes("@") &&
    isFilledString(customer.city) &&
    isPaymentMethod(customer.paymentMethod) &&
    hasDeliveryAddress
  );
}

async function getPromoCode(code: string) {
  const normalizedCode = normalizePromoCode(code);
  if (!normalizedCode) return null;

  const promoCodes = await sanityClient.fetch<Array<PromoCode & { active?: boolean }>>(
    `*[_type == "promoCode" && active == true]{
      code,
      active,
      discountType,
      amount,
      minOrderTotal,
      expiresAt
    }`,
    {},
    { next: { revalidate: 30, tags: ["promo-codes"] } }
  );
  const promoCode = promoCodes.find(item => normalizePromoCode(item.code) === normalizedCode);

  if (!promoCode || !promoCode.active || isPromoExpired(promoCode.expiresAt)) return null;
  return promoCode;
}

function paymentLabel(method: PaymentMethod) {
  if (method === "fop-prepayment") return "Передоплата на ФОП";
  if (method === "fop-full") return "Повна оплата на ФОП (100%)";
  if (method === "contact-after-order") return "Менеджер зв’яжеться після замовлення";
  return "CRYPTO (TRC20)";
}

function clean(value: string | undefined) {
  return value?.trim() || "";
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некоректний запит оформлення" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Некоректний запит оформлення" }, { status: 400 });
  }

  const checkout = body as Partial<CheckoutRequest>;
  if (!isValidCustomer(checkout.customer) || !Array.isArray(checkout.items) || checkout.items.length === 0) {
    return NextResponse.json({ error: "Замовлення порожнє" }, { status: 400 });
  }

  let products;
  try {
    products = await getProducts();
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Каталог тимчасово недоступний" }, { status: 503 });
  }

  const productsById = new Map(products.map(product => [String(product.id), product]));
  const items = checkout.items.flatMap(item => {
    if (!item || typeof item !== "object") return [];
    const product = productsById.get(String(item.productId));
    const price = product ? product.salePrice || product.price : 0;
    if (!product || price <= 0 || !product.sizes.includes(String(item.size))) return [];

    return [{
      productId: product.id,
      name: product.name,
      brand: product.brand,
      size: String(item.size),
      insoleCm: typeof item.insoleCm === "string" ? item.insoleCm.trim() : "",
      price,
      inStock: product.inStock
    }];
  });

  if (items.length !== checkout.items.length) {
    return NextResponse.json({ error: "Деякі товари вже недоступні" }, { status: 400 });
  }

  const hasInStockItems = items.some(item => item.inStock);
  if (hasInStockItems && checkout.customer.paymentMethod !== "contact-after-order") {
    return NextResponse.json({
      error: "Для товарів у наявності оплату узгоджує менеджер після оформлення"
    }, { status: 400 });
  }
  if (!hasInStockItems && checkout.customer.paymentMethod === "contact-after-order") {
    return NextResponse.json({
      error: "Оберіть спосіб оплати"
    }, { status: 400 });
  }

  const total = items.reduce((sum, item) => sum + item.price, 0);
  const requestedPromoCode = normalizePromoCode(checkout.promoCode || "");
  const promoCode = requestedPromoCode ? await getPromoCode(requestedPromoCode) : null;
  if (requestedPromoCode && !promoCode) {
    return NextResponse.json({ error: "Промокод більше неактивний. Перевірте його ще раз" }, { status: 400 });
  }
  const discount = promoCode ? calculatePromoDiscount(promoCode, total) : 0;
  const discountedTotal = Math.max(0, total - discount);
  const dueNow = hasInStockItems
    ? 0
    : checkout.customer.paymentMethod === "fop-prepayment"
    ? calculatePrepaymentAmount(discountedTotal)
    : discountedTotal;
  const orderReference = `DRIP-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const label = paymentLabel(checkout.customer.paymentMethod);
  const order = {
    orderReference,
    paymentMethod: checkout.customer.paymentMethod,
    paymentLabel: label,
    customer: {
      firstName: clean(checkout.customer.firstName),
      lastName: clean(checkout.customer.lastName),
      phone: clean(checkout.customer.phone),
      email: clean(checkout.customer.email),
      telegram: clean(checkout.customer.telegram),
      instagram: clean(checkout.customer.instagram)
    },
    delivery: {
      method: checkout.customer.deliveryMethod,
      city: clean(checkout.customer.city),
      cityRef: clean(checkout.customer.cityRef),
      warehouse: clean(checkout.customer.warehouse),
      warehouseRef: clean(checkout.customer.warehouseRef),
      address: clean(checkout.customer.address)
    },
    items: items.map(item => ({
      brand: item.brand,
      name: item.name,
      size: item.size,
      insoleCm: item.insoleCm,
      price: item.price
    })),
    promoCode: promoCode ? promoCode.code : "",
    total,
    discount,
    discountedTotal,
    dueNow,
    comment: clean(checkout.customer.comment)
  };

  let paymentToken: string | null = null;
  if (isFopPaymentMethod(checkout.customer.paymentMethod)) {
    if (!hasPaymentTokenSecret()) {
      return NextResponse.json({ error: "Сторінка оплати тимчасово недоступна" }, { status: 503 });
    }
    paymentToken = createPaymentToken(order);
  }

  const telegramResult = await notifyOrderAwaitingPayment(order);
  if (!telegramResult.ok) {
    console.error("Telegram order notification failed");
    return NextResponse.json({
      error: "Не вдалося передати замовлення менеджеру. Спробуйте ще раз"
    }, { status: 503 });
  }

  return NextResponse.json({
    orderReference,
    total,
    discount,
    discountedTotal,
    dueNow,
    paymentMethod: checkout.customer.paymentMethod,
    paymentLabel: label,
    paymentUrl: paymentToken ? buildPaymentPath(orderReference, paymentToken) : null,
    promoCode: promoCode ? promoCode.code : null
  });
}
