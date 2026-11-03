"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { HeroBanner } from "@/components/HeroBanner";
import { NewsletterForm } from "@/components/NewsletterForm";
import { ProductCard } from "@/components/ProductCard";
import { ScrollRail } from "@/components/ScrollRail";
import { useProducts } from "@/context/ProductsContext";
import type { Product } from "@/lib/products";
import { siteConfig, socialLinks } from "@/lib/site-config";

const FEATURED_BRANDS = ["Golden Goose", "Off-White", "Dior", "Hermes", "Balenciaga", "Saint Laurent"];
const RAIL_SIZE = 15;
const GRID_SIZE = 12;
const BRAND_CARD_COUNT = 10;
// Wordmarks from Wikimedia Commons (Off-White from brandlogos.net); the Designers wall only shows brands listed here.
const BRAND_LOGOS: Record<string, string> = {
  "Golden Goose": "/brands/golden-goose.svg",
  "Off-White": "/brands/off-white.svg",
  Dior: "/brands/dior.svg",
  Hermes: "/brands/hermes.svg",
  Balenciaga: "/brands/balenciaga.svg",
  "Saint Laurent": "/brands/saint-laurent.svg",
  "Louis Vuitton": "/brands/louis-vuitton.svg",
  Goyard: "/brands/goyard.svg",
  "Dolce & Gabbana": "/brands/dolce-gabbana.svg",
  "Miu Miu": "/brands/miu-miu.svg"
};
const SECONDARY_CATEGORY_RAILS = 2;
const MIN_CATEGORY_RAIL_SIZE = 4;

const SERVICES = [
  {
    title: "Shipping & Delivery",
    text: "In-stock pieces are prepared within 1–2 business days after payment and shipped with tracking.",
    href: "/shipping"
  },
  {
    title: "Returns & Exchanges",
    text: "Unworn items with original packaging and tags. We help with a size exchange when another size is available.",
    href: "/returns"
  },
  {
    title: "Private Sourcing",
    text: "Pre-order pieces are bought out directly from European boutiques and closed drops. Delivery in 12–16 days.",
    href: "/about"
  }
];

const SOCIAL_TILES = ["/hero.webp", "/balenciaga-3xl-campaign.webp", "/editorial-sneakers.webp"];

function groupBy(products: Product[], key: (product: Product) => string) {
  const groups = new Map<string, Product[]>();
  products.forEach(product => {
    const value = key(product);
    if (!value) return;
    const group = groups.get(value) || [];
    group.push(product);
    groups.set(value, group);
  });
  return groups;
}

// Round-robins products across brands so one large brand doesn't fill a whole rail.
function interleaveByBrand(pool: Product[]): Product[] {
  const queues = [...groupBy(pool, product => product.brand).values()];
  const depth = Math.max(0, ...queues.map(queue => queue.length));
  const result: Product[] = [];
  for (let index = 0; index < depth; index += 1) {
    queues.forEach(queue => {
      if (queue[index]) result.push(queue[index]);
    });
  }
  return result;
}

function buildHomeSections(products: Product[]) {
  const seen = new Set<string>();
  // Prefers products an earlier section hasn't shown, so rails don't repeat each other.
  const take = (pool: Product[], limit: number) => {
    const ordered = interleaveByBrand(pool);
    const picked = [
      ...ordered.filter(product => !seen.has(product.id)),
      ...ordered.filter(product => seen.has(product.id))
    ].slice(0, limit);
    picked.forEach(product => seen.add(product.id));
    return picked;
  };

  const byBrand = groupBy(products, product => product.brand);
  const byCategory = groupBy(products, product => product.category);
  const categories = [...byCategory.entries()].sort((a, b) => b[1].length - a[1].length);
  const [mainCategory, ...otherCategories] = categories;

  const brandNames = [
    ...FEATURED_BRANDS.filter(brand => byBrand.has(brand) && BRAND_LOGOS[brand]),
    ...[...byBrand.entries()]
      .filter(([brand]) => !FEATURED_BRANDS.includes(brand) && BRAND_LOGOS[brand])
      .sort((a, b) => b[1].length - a[1].length)
      .map(([brand]) => brand)
  ].slice(0, BRAND_CARD_COUNT);
  const brandCards = brandNames.map(brand => {
    const items = byBrand.get(brand) || [];
    return { brand, count: items.length };
  });

  return {
    newIn: take(products.filter(product => product.isNew), RAIL_SIZE),
    inStock: take(products.filter(product => product.inStock), GRID_SIZE),
    mainCategory: mainCategory ? { name: mainCategory[0], items: take(mainCategory[1], RAIL_SIZE) } : null,
    brandCards,
    sale: take(products.filter(product => product.salePrice), RAIL_SIZE),
    categoryRails: otherCategories
      .filter(([, items]) => items.length >= MIN_CATEGORY_RAIL_SIZE)
      .slice(0, SECONDARY_CATEGORY_RAILS)
      .map(([name, items]) => ({ name, items: take(items, RAIL_SIZE) }))
  };
}

function ProductRail({ title, href, items }: { title: string; href: string; items: Product[] }) {
  if (items.length === 0) return null;

  return (
    <ScrollRail title={title} href={href} variant="products">
      {items.map(product => <ProductCard product={product} key={product.id} compact />)}
    </ScrollRail>
  );
}

export default function HomePage() {
  const { products } = useProducts();
  const home = useMemo(() => buildHomeSections(products), [products]);
  const instagramUrl = siteConfig.socials.instagram;
  const instagramHandle = instagramUrl ? `@${instagramUrl.replace(/\/+$/, "").split("/").pop()}` : "";

  return (
    <>
      <HeroBanner />

      <ProductRail title="New In" href="/catalog" items={home.newIn} />

      {home.inStock.length > 0 && (
        <section className="hp-section hp-section--grid">
          <div className="hp-section__head">
            <h2 className="hp-section__title">In Stock</h2>
            <div className="hp-section__actions">
              <Link href="/catalog?stock=1" className="hp-section__link">View all</Link>
            </div>
          </div>
          <div className="hp-grid">
            {home.inStock.map(product => <ProductCard product={product} key={product.id} compact />)}
          </div>
        </section>
      )}

      {home.mainCategory && (
        <ProductRail
          title={home.mainCategory.name}
          href={`/catalog?category=${encodeURIComponent(home.mainCategory.name)}`}
          items={home.mainCategory.items}
        />
      )}

      <section className="hp-statement">
        <span className="hp-statement__label">The DRIP Edit</span>
        <p>Designer footwear, bags and accessories selected with a quiet point of view.</p>
        <Link href="/about" className="hp-section__link">About DRIPMARKET</Link>
      </section>

      {home.brandCards.length > 0 && (
        <section className="hp-section hp-section--designers">
          <div className="hp-section__head">
            <h2 className="hp-section__title">Designers</h2>
            <div className="hp-section__actions">
              <Link href="/catalog" className="hp-section__link">All designers</Link>
            </div>
          </div>
          <div className="hp-designers">
            {home.brandCards.map(card => (
              <Link href={`/catalog?brand=${encodeURIComponent(card.brand)}`} className="hp-designer" key={card.brand}>
                <span className="hp-designer__logo">
                  <Image src={BRAND_LOGOS[card.brand]} alt={card.brand} fill unoptimized />
                </span>
                <span className="hp-designer__count">{card.count} {card.count === 1 ? "piece" : "pieces"}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <ProductRail title="Sale" href="/catalog?sale=1" items={home.sale} />

      {home.categoryRails.map(rail => (
        <ProductRail
          key={rail.name}
          title={rail.name}
          href={`/catalog?category=${encodeURIComponent(rail.name)}`}
          items={rail.items}
        />
      ))}

      <section className="hp-section hp-section--services">
        <div className="hp-section__head">
          <h2 className="hp-section__title">Client Services</h2>
          <div className="hp-section__actions">
            <Link href="/faq" className="hp-section__link">FAQ</Link>
          </div>
        </div>
        <div className="hp-services">
          {SERVICES.map((service, index) => (
            <Link href={service.href} className="hp-service" key={service.title}>
              <span className="hp-service__index">{String(index + 1).padStart(2, "0")}</span>
              <span className="hp-service__title">{service.title}</span>
              <span className="hp-service__text">{service.text}</span>
            </Link>
          ))}
        </div>
      </section>

      {instagramUrl && (
        <section className="hp-section hp-section--social">
          <div className="hp-section__head">
            <h2 className="hp-section__title">{instagramHandle} on Instagram</h2>
            <div className="hp-section__actions">
              <a href={instagramUrl} className="hp-section__link" target="_blank" rel="noopener noreferrer">Follow</a>
            </div>
          </div>
          <div className="hp-social">
            {SOCIAL_TILES.map(src => (
              <a href={instagramUrl} className="hp-social__tile" target="_blank" rel="noopener noreferrer" key={src} aria-label={`${instagramHandle} on Instagram`}>
                <Image src={src} alt="" fill sizes="(max-width: 768px) 50vw, 33vw" />
              </a>
            ))}
          </div>
        </section>
      )}

      <footer className="hp-footer">
        <div className="hp-footer__top">
          <div className="hp-footer__col">
            <h4>CLIENT SERVICES</h4>
            <Link href="/contact">Contact Us</Link>
            <Link href="/shipping">Shipping & Delivery</Link>
            <Link href="/returns">Returns & Exchanges</Link>
            <Link href="/faq">FAQ</Link>
          </div>
          <div className="hp-footer__col">
            <h4>ABOUT DRIPMARKET</h4>
            <Link href="/about">About Us</Link>
            <p>A private access point to original high-fashion pieces from European boutiques, closed drops and carefully selected supply channels.</p>
          </div>
          <div className="hp-footer__col">
            <h4>FOLLOW US</h4>
            {socialLinks.length > 0 ? (
              socialLinks.map(social => (
                <a key={social.label} href={social.href} target="_blank" rel="noopener noreferrer">
                  {social.label}
                </a>
              ))
            ) : (
              <p>Social links coming soon.</p>
            )}
          </div>
          <div className="hp-footer__col">
            <h4>NEWSLETTER</h4>
            <p>Be first to know about new arrivals, sales & promos.</p>
            <NewsletterForm />
          </div>
        </div>
        <div className="hp-footer__bottom">
          <span>© 2026 DRIPMARKET. All rights reserved.</span>
          <span>100% Authentic Products</span>
        </div>
      </footer>
    </>
  );
}
