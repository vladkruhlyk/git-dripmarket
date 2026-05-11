import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { calculatePrepaymentAmount } from "@/lib/products";

type CheckoutItem = {
  productId: string;
  name: string;
  brand: string;
  size: string;
  price: number;
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
  total: number;
};

const WAYFORPAY_URL = "https://secure.wayforpay.com/pay";
const TEST_MERCHANT_ACCOUNT = process.env.WAYFORPAY_MERCHANT_ACCOUNT || "test_merchant";
const TEST_MERCHANT_SECRET = process.env.WAYFORPAY_MERCHANT_SECRET || "dhkq3vUi94{Z!5frxs(02ML";
const CURRENCY = "UAH";

function money(value: number): string {
  return value.toFixed(2);
}

function sign(values: string[]) {
  return crypto
    .createHmac("md5", TEST_MERCHANT_SECRET)
    .update(values.join(";"), "utf8")
    .digest("hex");
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as CheckoutRequest;
  const items = body.items.filter(item => item.name && item.price > 0);

  if (!items.length || body.total <= 0) {
    return NextResponse.json({ error: "Order is empty" }, { status: 400 });
  }

  const host = request.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const merchantDomainName = process.env.WAYFORPAY_DOMAIN || host;
  const orderDate = Math.floor(Date.now() / 1000);
  const orderReference = `DRIP-${orderDate}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const productName = ["DRIP. order prepayment"];
  const productCount = ["1"];
  const amountDue = calculatePrepaymentAmount(body.total);
  const productPrice = [money(amountDue)];
  const amount = money(amountDue);
  const signature = sign([
    TEST_MERCHANT_ACCOUNT,
    merchantDomainName,
    orderReference,
    String(orderDate),
    amount,
    CURRENCY,
    ...productName,
    ...productCount,
    ...productPrice
  ]);

  return NextResponse.json({
    action: WAYFORPAY_URL,
    fields: {
      merchantAccount: TEST_MERCHANT_ACCOUNT,
      merchantAuthType: "SimpleSignature",
      merchantDomainName,
      merchantTransactionType: "AUTO",
      merchantTransactionSecureType: "AUTO",
      merchantSignature: signature,
      apiVersion: "2",
      language: "UA",
      returnUrl: `${protocol}://${host}/cart`,
      orderReference,
      orderDate: String(orderDate),
      amount,
      currency: CURRENCY,
      orderTimeout: "49000",
      productName,
      productPrice,
      productCount,
      clientFirstName: body.customer.firstName,
      clientLastName: body.customer.lastName,
      clientAddress: body.customer.deliveryMethod === "courier" ? body.customer.address : body.customer.warehouse,
      clientCity: body.customer.city,
      clientEmail: body.customer.email,
      clientPhone: body.customer.phone,
      defaultPaymentSystem: "card"
    }
  });
}
