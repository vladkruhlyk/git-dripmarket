import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { calculatePrepaymentAmount } from "@/lib/products";
import { getCachedWooProducts } from "@/lib/woo-products";

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
  deliveryMethod: "nova-poshta" | "courier";
  warehouse: string;
  address: string;
  comment: string;
};

type CheckoutRequest = {
  customer: CheckoutCustomer;
  items: CheckoutItem[];
};

const WAYFORPAY_URL = "https://secure.wayforpay.com/pay";
const CURRENCY = "UAH";

function money(value: number): string {
  return value.toFixed(2);
}

function sign(values: string[], merchantSecret: string) {
  return crypto
    .createHmac("md5", merchantSecret)
    .update(values.join(";"), "utf8")
    .digest("hex");
}

function isFilledString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
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
    hasDeliveryAddress
  );
}

export async function POST(request: NextRequest) {
  const merchantAccount = process.env.WAYFORPAY_MERCHANT_ACCOUNT;
  const merchantSecret = process.env.WAYFORPAY_MERCHANT_SECRET;

  if (!merchantAccount || !merchantSecret) {
    return NextResponse.json({ error: "Payment provider is not configured" }, { status: 503 });
  }

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

  const customer = checkout.customer;
  let products;
  try {
    products = await getCachedWooProducts();
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

  const host = request.headers.get("host") || "localhost:3000";
  const merchantDomainName = process.env.WAYFORPAY_DOMAIN || host;
  const orderDate = Math.floor(Date.now() / 1000);
  const orderReference = `DRIP-${orderDate}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const productName = ["DRIP. order prepayment"];
  const productCount = ["1"];
  const total = items.reduce((sum, item) => sum + item.price, 0);
  const amountDue = calculatePrepaymentAmount(total);
  const productPrice = [money(amountDue)];
  const amount = money(amountDue);
  const signature = sign([
    merchantAccount,
    merchantDomainName,
    orderReference,
    String(orderDate),
    amount,
    CURRENCY,
    ...productName,
    ...productCount,
    ...productPrice
  ], merchantSecret);

  return NextResponse.json({
    action: WAYFORPAY_URL,
    fields: {
      merchantAccount,
      merchantAuthType: "SimpleSignature",
      merchantDomainName,
      merchantTransactionType: "AUTO",
      merchantTransactionSecureType: "AUTO",
      merchantSignature: signature,
      apiVersion: "2",
      language: "UA",
      returnUrl: `${request.nextUrl.origin}/cart`,
      orderReference,
      orderDate: String(orderDate),
      amount,
      currency: CURRENCY,
      orderTimeout: "49000",
      productName,
      productPrice,
      productCount,
      clientFirstName: customer.firstName,
      clientLastName: customer.lastName,
      clientAddress: customer.deliveryMethod === "courier" ? customer.address : customer.warehouse,
      clientCity: customer.city,
      clientEmail: customer.email,
      clientPhone: customer.phone,
      defaultPaymentSystem: "card"
    }
  });
}
