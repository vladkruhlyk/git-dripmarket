"use client";

type MetaPixelEvent =
  | "AddToCart"
  | "InitiateCheckout"
  | "Purchase"
  | "ViewContent";

type MetaPixelParams = {
  content_ids?: string[];
  content_type?: "product" | "product_group";
  contents?: Array<{ id: string; quantity: number; item_price?: number }>;
  currency?: string;
  num_items?: number;
  value?: number;
} & Record<string, string | number | boolean | null | undefined | Array<unknown> | Record<string, unknown>>;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function trackMetaPixelEvent(event: MetaPixelEvent, params?: MetaPixelParams) {
  if (typeof window === "undefined") return;

  if (typeof window.fbq === "function") {
    window.fbq("track", event, params);
    return;
  }

  window.setTimeout(() => {
    window.fbq?.("track", event, params);
  }, 350);
}

export function trackMetaPixelCustomEvent(event: string, params?: MetaPixelParams) {
  if (typeof window === "undefined") return;

  if (typeof window.fbq === "function") {
    window.fbq("trackCustom", event, params);
    return;
  }

  window.setTimeout(() => {
    window.fbq?.("trackCustom", event, params);
  }, 350);
}
