"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { useProducts } from "@/context/ProductsContext";

export default function HomePage() {
  const { products, loading } = useProducts();
  const brands = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach(product => counts.set(product.brand, (counts.get(product.brand) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([brand]) => brand);
  }, [products]);
  const [activeBrand, setActiveBrand] = useState("");
  const selectedBrand = activeBrand || brands[0];
  const featured = products.filter(product => product.brand === selectedBrand);
  const brandIndex = useMemo(() => {
    return [...new Set(products.map(product => product.brand).filter(Boolean))].sort();
  }, [products]);
  const categoryIndex = useMemo(() => (
    [...new Set(products.map(product => product.category).filter(Boolean))]
      .sort()
      .slice(0, 5)
  ), [products]);

  return (
    <>
      <section className="hp-hero">
        <div className="hp-hero__media">
          <Image src="/hero.png" alt="DRIP. SS26 Campaign" fill priority sizes="100vw" />
        </div>
        <div className="hp-hero__overlay" />
        <div className="hp-hero__content">
          <p className="hp-hero__tag">Discover SS26 Essence</p>
          <h1 className="hp-hero__title">
            <span>Find elegance in</span>
            <span>stylish luxury wear</span>
          </h1>
          <div className="hp-hero__buttons">
            <Link href="/catalog" className="hp-hero__btn hp-hero__btn--primary">Discover Now</Link>
            <Link href="/catalog" className="hp-hero__btn hp-hero__btn--outline">Explore</Link>
          </div>
        </div>
      </section>

      <section className="hp-rail">
        <div className="hp-rail__statement">
          <span>THE DRIP EDIT</span>
          <p>Designer footwear, bags and accessories selected with a quiet point of view.</p>
          <Link href="/catalog" className="hp-rail__cta">Catalog</Link>
        </div>
        <div className="hp-rail__group">
          <span>Categories</span>
          <div>
            {categoryIndex.map(category => (
              <Link href={`/catalog?category=${encodeURIComponent(category)}`} key={category}>{category}</Link>
            ))}
          </div>
        </div>
        <div className="hp-rail__group">
          <span>Designers</span>
          <div>
            {brandIndex.map(brand => (
              <Link href={`/catalog?brand=${encodeURIComponent(brand)}`} key={brand}>{brand}</Link>
            ))}
          </div>
        </div>
      </section>

      <section className="hp-whatsnew">
        <p className="hp-whatsnew__label">WHAT'S NEW</p>
        <div className="hp-whatsnew__tabs">
          {brands.map(brand => (
            <button
              className={`hp-whatsnew__tab ${brand === selectedBrand ? "active" : ""}`}
              key={brand}
              onClick={() => setActiveBrand(brand)}
            >
              {brand}
            </button>
          ))}
        </div>
        <div className="hp-whatsnew__grid" aria-label={`${selectedBrand} products`}>
          {loading && <div className="loading-line">Loading products...</div>}
          {featured.map(product => <ProductCard product={product} key={product.id} compact />)}
        </div>
        <div className="hp-whatsnew__footer">
          <Link href={`/catalog?brand=${encodeURIComponent(selectedBrand)}`} className="hp-whatsnew__viewall">
            VIEW ALL {selectedBrand}
          </Link>
        </div>
      </section>

      <footer className="hp-footer">
        <div className="hp-footer__top">
          <div className="hp-footer__col">
            <h4>CLIENT SERVICES</h4>
            <a href="#">Contact Us</a>
            <a href="#">Shipping & Delivery</a>
            <a href="#">Returns & Exchanges</a>
            <a href="#">FAQ</a>
          </div>
          <div className="hp-footer__col">
            <h4>ABOUT DRIPMARKET</h4>
            <a href="#">Our Story</a>
            <a href="#">Stores</a>
            <a href="#">Careers</a>
          </div>
          <div className="hp-footer__col">
            <h4>FOLLOW US</h4>
            <a href="#">Instagram</a>
            <a href="#">Telegram</a>
            <a href="#">TikTok</a>
          </div>
          <div className="hp-footer__col">
            <h4>NEWSLETTER</h4>
            <p>Be first to know about new arrivals, sales & promos.</p>
            <form className="hp-footer__form">
              <input type="email" placeholder="Your email" />
              <button type="button">SUBSCRIBE</button>
            </form>
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
