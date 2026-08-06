"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const PROMO_CODE = "drip26";
const PROMO_DISMISSED_KEY = "drip_first_order_promo_dismissed";
const IDLE_DELAY_MS = 8000;

export function PromoPopup() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const pathname = usePathname();
  const suppressed = pathname === "/cart" || pathname === "/checkout";

  const close = useCallback(() => {
    setOpen(false);
    sessionStorage.setItem(PROMO_DISMISSED_KEY, "true");
  }, []);

  useEffect(() => {
    if (open || suppressed) return;
    if (sessionStorage.getItem(PROMO_DISMISSED_KEY)) return;

    let timer = 0;

    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (document.visibilityState !== "visible") {
          schedule();
          return;
        }
        setOpen(true);
      }, IDLE_DELAY_MS);
    };

    // Any interaction postpones the popup so it never opens mid-tap.
    window.addEventListener("pointerdown", schedule, true);
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("keydown", schedule, true);
    schedule();

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", schedule, true);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("keydown", schedule, true);
    };
  }, [open, suppressed]);

  useEffect(() => {
    if (open && suppressed) setOpen(false);
  }, [open, suppressed]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [close, open]);

  async function copyPromoCode() {
    try {
      await navigator.clipboard.writeText(PROMO_CODE);
    } catch {
      const input = document.createElement("textarea");
      input.value = PROMO_CODE;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 2400);
  }

  if (!open) return null;

  return (
    <div className="promo-popup" role="dialog" aria-modal="true" aria-label="First order discount">
      <button className="promo-popup__backdrop" type="button" aria-label="Close promotion" onClick={close} />
      <section className="promo-popup__card">
        <button className="promo-popup__close" type="button" aria-label="Close promotion" onClick={close}>
          <span />
          <span />
        </button>

        <div className="promo-popup__media">
          <Image
            src="/balenciaga-3xl-campaign.webp"
            alt="Balenciaga 3XL sneakers campaign"
            fill
            sizes="(max-width: 700px) 92vw, 440px"
            priority
          />
          <div className="promo-popup__media-label">Private access / DRIP.</div>
        </div>

        <div className="promo-popup__content">
          <div className="promo-popup__eyebrow">A private welcome</div>
          <h2>
            A welcome gift.
            <span>For your first order.</span>
          </h2>
          <p>Use your personal welcome code when placing your first order.</p>

          <div className="promo-popup__code">
            <span>{PROMO_CODE}</span>
            <button type="button" onClick={copyPromoCode} aria-live="polite">
              {copied ? "Copied" : "Copy code"}
            </button>
          </div>

          <Link className="promo-popup__cta" href="/catalog" onClick={close}>
            Discover collection
          </Link>
          <button className="promo-popup__later" type="button" onClick={close}>Maybe later</button>
        </div>
      </section>
    </div>
  );
}
