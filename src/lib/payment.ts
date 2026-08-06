import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { deflateRawSync, inflateRawSync } from "node:zlib";
import type { TelegramOrder } from "@/lib/telegram";

export const FOP_PAYMENT_METHODS = ["fop-prepayment", "fop-full"] as const;

const DEFAULT_FOP_PAYMENT_URL = "https://bank.gov.ua/qr/QkNECjAwMgoyClVDVAoK1M7PINXu9evu4iDQ7uSz7u0gxeTz4PDk7uLo9wpVQTg4MzA1Mjk5MDAwMDAyNjAwNjA0MTIxOTA1MQpVQUgKMzc4MjUwNjk1MgoKCgo=";
const PAYMENT_SESSION_VERSION = "v1";
const PAYMENT_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PAYMENT_SESSION_SIZE = 128 * 1024;

export type PaymentSession = TelegramOrder & {
  paymentMethod: string;
  expiresAt: number;
};

function paymentSecret() {
  return process.env.PAYMENT_TOKEN_SECRET?.trim() || "";
}

function paymentKey() {
  return createHash("sha256").update(paymentSecret()).digest();
}

export function hasPaymentTokenSecret() {
  return paymentSecret().length >= 32;
}

export function createPaymentToken(order: TelegramOrder & { paymentMethod: string }) {
  if (!hasPaymentTokenSecret()) throw new Error("PAYMENT_TOKEN_SECRET is not configured");

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", paymentKey(), iv);
  const payload = deflateRawSync(Buffer.from(JSON.stringify({
    ...order,
    expiresAt: Date.now() + PAYMENT_SESSION_TTL_MS
  })));
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    PAYMENT_SESSION_VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url")
  ].join(".");
}

export function readPaymentToken(token: string): PaymentSession | null {
  if (!hasPaymentTokenSecret() || token.length > MAX_PAYMENT_SESSION_SIZE * 2) return null;

  try {
    const [version, encodedIv, encodedTag, encodedPayload, ...rest] = token.split(".");
    if (version !== PAYMENT_SESSION_VERSION || !encodedIv || !encodedTag || !encodedPayload || rest.length) {
      return null;
    }

    const decipher = createDecipheriv(
      "aes-256-gcm",
      paymentKey(),
      Buffer.from(encodedIv, "base64url")
    );
    decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encodedPayload, "base64url")),
      decipher.final()
    ]);
    const session = JSON.parse(inflateRawSync(decrypted, {
      maxOutputLength: MAX_PAYMENT_SESSION_SIZE
    }).toString("utf8")) as Partial<PaymentSession>;

    if (
      typeof session.orderReference !== "string" ||
      typeof session.paymentMethod !== "string" ||
      typeof session.expiresAt !== "number" ||
      session.expiresAt <= Date.now() ||
      !isFopPaymentMethod(session.paymentMethod)
    ) {
      return null;
    }

    return session as PaymentSession;
  } catch {
    return null;
  }
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
