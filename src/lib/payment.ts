import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const FOP_PAYMENT_METHODS = ["fop-prepayment", "fop-full"] as const;

const DEFAULT_FOP_PAYMENT_URL = "https://bank.gov.ua/qr/QkNECjAwMgoyClVDVAoK1M7PINXu9evu4iDQ7uSz7u0gxeTz4PDk7uLo9wpVQTg4MzA1Mjk5MDAwMDAyNjAwNjA0MTIxOTA1MQpVQUgKMzc4MjUwNjk1MgoKCgo=";

export function createPaymentToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashPaymentToken(token) };
}

export function hashPaymentToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isValidPaymentToken(token: string, expectedHash: string) {
  const actual = Buffer.from(hashPaymentToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function isFopPaymentMethod(method: string) {
  return FOP_PAYMENT_METHODS.includes(method as typeof FOP_PAYMENT_METHODS[number]);
}

export function getFopPaymentUrl() {
  return process.env.FOP_PAYMENT_URL?.trim() || DEFAULT_FOP_PAYMENT_URL;
}

export function buildPaymentPath(orderReference: string, token: string) {
  return `/payment/${encodeURIComponent(orderReference)}?token=${encodeURIComponent(token)}`;
}
