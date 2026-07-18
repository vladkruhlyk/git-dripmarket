import { NextRequest, NextResponse } from "next/server";
import { calculatePrepaymentAmount } from "@/lib/products";
import { calculatePromoDiscount, isPromoExpired, normalizePromoCode, type PromoCode } from "@/lib/promo-codes";
import { getProducts } from "@/sanity/queries";
import { sanityClient } from "@/sanity/client";
import { apiVersion, dataset, projectId } from "@/sanity/env";
import { createClient } from "next-sanity";

type PaymentMethod = "fop-prepayment" | "fop-full" | "crypto-trc20";

type CheckoutItem = {
  productId: string;
  size: string;
};

type CheckoutCustomer = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
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

const sanityWriteClient = createClient({
  apiVersion,
  dataset,
  projectId: projectId || "missing-project-id",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false
});

function isFilledString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPaymentMethod(value: unknown): value is PaymentMethod {
  return value === "fop-prepayment" || value === "fop-full" || value === "crypto-trc20";
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
  if (method === "fop-prepayment") return "Предоплата на ФОП";
  if (method === "fop-full") return "Полная оплата на ФОП (100%)";
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
    return NextResponse.json({ error: "Invalid checkout request" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid checkout request" }, { status: 400 });
  }

  const checkout = body as Partial<CheckoutRequest>;
  if (!isValidCustomer(checkout.customer) || !Array.isArray(checkout.items) || checkout.items.length === 0) {
    return NextResponse.json({ error: "Order is empty" }, { status: 400 });
  }

  let products;
  try {
    products = await getProducts();
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Product catalog is temporarily unavailable" }, { status: 503 });
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
      price
    }];
  });

  if (items.length !== checkout.items.length) {
    return NextResponse.json({ error: "Some order items are no longer available" }, { status: 400 });
  }

  const total = items.reduce((sum, item) => sum + item.price, 0);
  const promoCode = checkout.promoCode ? await getPromoCode(checkout.promoCode) : null;
  const discount = promoCode ? calculatePromoDiscount(promoCode, total) : 0;
  const discountedTotal = Math.max(0, total - discount);
  const dueNow = checkout.customer.paymentMethod === "fop-prepayment"
    ? calculatePrepaymentAmount(discountedTotal)
    : discountedTotal;
  const orderReference = `DRIP-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const label = paymentLabel(checkout.customer.paymentMethod);

  if (!process.env.SANITY_API_TOKEN) {
    return NextResponse.json({ error: "Order storage is not configured" }, { status: 503 });
  }

  try {
    await sanityWriteClient.create({
      _type: "order",
      orderReference,
      status: "new",
      paymentMethod: checkout.customer.paymentMethod,
      paymentLabel: label,
      customer: {
        firstName: clean(checkout.customer.firstName),
        lastName: clean(checkout.customer.lastName),
        phone: clean(checkout.customer.phone),
        email: clean(checkout.customer.email)
      },
      delivery: {
        method: checkout.customer.deliveryMethod,
        city: clean(checkout.customer.city),
        cityRef: clean(checkout.customer.cityRef),
        warehouse: clean(checkout.customer.warehouse),
        warehouseRef: clean(checkout.customer.warehouseRef),
        address: clean(checkout.customer.address)
      },
      items: items.map((item, index) => ({
        _key: `${item.productId}-${item.size}-${index}`.replace(/[^a-zA-Z0-9_-]/g, "-"),
        productId: String(item.productId),
        brand: item.brand,
        name: item.name,
        size: item.size,
        price: item.price
      })),
      promoCode: promoCode ? promoCode.code : "",
      total,
      discount,
      discountedTotal,
      dueNow,
      comment: clean(checkout.customer.comment)
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Order could not be saved" }, { status: 503 });
  }

  return NextResponse.json({
    orderReference,
    total,
    discount,
    discountedTotal,
    dueNow,
    paymentMethod: checkout.customer.paymentMethod,
    paymentLabel: label,
    promoCode: promoCode ? promoCode.code : null
  });
}
