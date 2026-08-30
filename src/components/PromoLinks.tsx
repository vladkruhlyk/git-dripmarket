"use client";

import Link from "next/link";
import { trackMetaPixelCustomEvent } from "@/lib/meta-pixel";

const catalogUrl = "/catalog?utm_source=promo&utm_medium=taplink&utm_campaign=drip_promo&utm_content=catalog";
const instagramUrl = "https://www.instagram.com/dripmarketua";
const telegramUrl = "https://t.me/dripmarketukraine";

function CatalogIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 5h16v4H4V5Zm0 6h16v8H4v-8Zm2 2v4h12v-4H6Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm0 2A3.8 3.8 0 0 0 4 7.8v8.4A3.8 3.8 0 0 0 7.8 20h8.4a3.8 3.8 0 0 0 3.8-3.8V7.8A3.8 3.8 0 0 0 16.2 4H7.8Zm4.2 3.3A4.7 4.7 0 1 1 7.3 12 4.7 4.7 0 0 1 12 7.3Zm0 2A2.7 2.7 0 1 0 14.7 12 2.7 2.7 0 0 0 12 9.3Zm5-2.4a1.1 1.1 0 1 1-1.1 1.1A1.1 1.1 0 0 1 17 6.9Z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M21.6 3.3a1.3 1.3 0 0 0-1.4-.2L3.1 9.7a1.2 1.2 0 0 0 .1 2.3l4.4 1.4 1.7 5.3a1.2 1.2 0 0 0 2 .5l2.5-2.4 4.5 3.3a1.3 1.3 0 0 0 2-.8l2-14.8a1.3 1.3 0 0 0-.7-1.2ZM18.4 17l-3.9-2.9a1.2 1.2 0 0 0-1.5.1l-1.5 1.5-.6-2 5.8-5.5a.8.8 0 0 0-.9-1.3l-7.6 4.7-2.5-.8 14.4-5.5-1.7 11.7Z" />
    </svg>
  );
}

const links = [
  {
    title: "Каталог",
    description: "Кросівки, сумки, аксесуари",
    href: catalogUrl,
    eventName: "PromoCatalogClick",
    channel: "catalog",
    icon: <CatalogIcon />
  },
  {
    title: "Instagram",
    description: "@dripmarketua",
    href: instagramUrl,
    eventName: "PromoInstagramClick",
    channel: "instagram",
    icon: <InstagramIcon />
  },
  {
    title: "Telegram",
    description: "@dripmarketukraine",
    href: telegramUrl,
    eventName: "PromoTelegramClick",
    channel: "telegram",
    icon: <TelegramIcon />
  }
];

function trackPromoClick(link: (typeof links)[number]) {
  trackMetaPixelCustomEvent(link.eventName, {
    channel: link.channel,
    destination: link.href,
    source: "promo_taplink"
  });
}

export function PromoLinks() {
  return (
    <div className="promo-hero__links">
      {links.map(link => {
        const isExternal = link.href.startsWith("http");

        if (isExternal) {
          return (
            <a
              className="promo-link"
              href={link.href}
              key={link.title}
              onClick={() => trackPromoClick(link)}
              rel="noreferrer"
              target="_blank"
            >
              <span className="promo-link__icon">{link.icon}</span>
              <span>
                <strong>{link.title}</strong>
                <small>{link.description}</small>
              </span>
              <b>↗</b>
            </a>
          );
        }

        return (
          <Link className="promo-link" href={link.href} key={link.title} onClick={() => trackPromoClick(link)}>
            <span className="promo-link__icon">{link.icon}</span>
            <span>
              <strong>{link.title}</strong>
              <small>{link.description}</small>
            </span>
            <b>→</b>
          </Link>
        );
      })}
    </div>
  );
}
