import type { Metadata } from "next";
import Image from "next/image";
import { PromoLinks } from "@/components/PromoLinks";

export const metadata: Metadata = {
  title: "DRIP. Ukraine",
  description: "Каталог DRIP., Instagram та Telegram."
};

export default function PromoPage() {
  return (
    <main className="promo-page">
      <section className="promo-hero" aria-label="DRIP. links">
        <div className="promo-hero__media promo-hero__media--main">
          <Image src="/hero.webp" alt="" fill priority sizes="(max-width: 720px) 100vw, 520px" />
        </div>
        <div className="promo-hero__media promo-hero__media--accent">
          <Image src="/editorial-sneakers.webp" alt="" fill sizes="220px" />
        </div>

        <div className="promo-hero__topline">
          <Image src="/logo.webp" alt="DRIP." width={118} height={50} priority />
        </div>

        <div className="promo-hero__content">
          <div className="promo-hero__kicker">Private access to high fashion</div>
          <h1>DRIP<br />MARKET</h1>
          <p>Оригінальні позиції, актуальні дропи та швидкий контакт з менеджером.</p>
        </div>

        <PromoLinks />

        <div className="promo-hero__marquee" aria-hidden="true">
          <span>В наявності</span>
          <span>Під замовлення 12-16 днів</span>
        </div>
      </section>
    </main>
  );
}
