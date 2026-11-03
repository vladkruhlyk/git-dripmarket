"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/context/CartContext";
import { useProducts } from "@/context/ProductsContext";

export function Header({ onSearch }: { onSearch: () => void }) {
  const pathname = usePathname();
  const { count } = useCart();
  const { products } = useProducts();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileCatalogOpen, setMobileCatalogOpen] = useState(false);
  const [mobileBrandsOpen, setMobileBrandsOpen] = useState(false);
  const mobileCategories = useMemo(() => (
    [...new Set(products.map(product => product.category).filter(Boolean))].sort()
  ), [products]);
  // Desktop menu lists categories biggest-first, like the catalog's own weight.
  const navCategories = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach(product => {
      if (product.category) counts.set(product.category, (counts.get(product.category) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([category]) => category);
  }, [products]);
  const mobileBrands = useMemo(() => (
    [...new Set(products.map(product => product.brand).filter(Boolean))].sort()
  ), [products]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileCatalogOpen(false);
    setMobileBrandsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  function openSearch() {
    setMobileMenuOpen(false);
    setMobileCatalogOpen(false);
    setMobileBrandsOpen(false);
    onSearch();
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
    setMobileCatalogOpen(false);
    setMobileBrandsOpen(false);
  }

  function toggleMobileMenu() {
    if (mobileMenuOpen) {
      setMobileCatalogOpen(false);
      setMobileBrandsOpen(false);
    }
    setMobileMenuOpen(open => !open);
  }

  return (
    <>
      <div className="announce-bar">
        <div className="announce-bar__inner">
          <span>100% authentic designer pieces</span>
          <div className="announce-bar__links">
            <Link href="/shipping">Shipping</Link>
            <Link href="/returns">Returns</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </div>
      </div>
      <header className={`header ${mobileMenuOpen ? "header--menu-open" : ""}`}>
        <div className="header__inner">
          <button
            className="header__burger"
            type="button"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            onClick={toggleMobileMenu}
          >
            {mobileMenuOpen ? "Close" : "Menu"}
          </button>


          <Link href="/" className="header__logo" aria-label="DRIP. home">
            <Image src="/logo.webp" alt="DRIP." width={152} height={48} priority />
          </Link>

          <nav className="header__nav" aria-label="Main navigation">
            <Link href="/catalog?sale=1" className="header__nav-link header__nav-link--sale">Sale</Link>
            <Link href="/catalog" className="header__nav-link">New In</Link>
            {navCategories.map(category => (
              <Link href={`/catalog?category=${encodeURIComponent(category)}`} className="header__nav-link" key={category}>
                {category}
              </Link>
            ))}
            <div className="header__dropdown">
              <Link href="/catalog" className="header__nav-link" aria-haspopup="true">Brands</Link>
              <div className="header__dropdown-panel header__dropdown-panel--brands">
                {mobileBrands.map(brand => (
                  <Link href={`/catalog?brand=${encodeURIComponent(brand)}`} key={brand}>{brand}</Link>
                ))}
              </div>
            </div>
            <Link href="/catalog?stock=1" className="header__nav-link">In Stock</Link>
            <div className="header__dropdown">
              <button className="header__nav-link" type="button" aria-haspopup="true">Info</button>
              <div className="header__dropdown-panel">
                <Link href="/about">About Us</Link>
                <Link href="/contact">Contact Us</Link>
                <Link href="/shipping">Shipping & Delivery</Link>
                <Link href="/returns">Returns & Exchanges</Link>
                <Link href="/faq">FAQ</Link>
              </div>
            </div>
          </nav>

          <div className="header__right">
            <button className="header__icon" type="button" aria-label="Search" onClick={openSearch}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></svg>
            </button>
            <Link href="/cart" className="header__icon" aria-label={`Bag, ${count} items`}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 13H6L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>
              {count > 0 && <span className="header__badge">{count}</span>}
            </Link>
          </div>
        </div>

        <button
          className={`header__mobile-backdrop ${mobileMenuOpen ? "open" : ""}`}
          type="button"
          aria-label="Close menu"
          onClick={closeMobileMenu}
        />

        <nav
          id="mobile-menu"
          className={`header__mobile-menu ${mobileMenuOpen ? "open" : ""}`}
          aria-label="Mobile navigation"
          aria-hidden={!mobileMenuOpen}
        >
          <div className="header__mobile-primary">
            <button
              className={`header__mobile-accordion ${mobileCatalogOpen ? "open" : ""}`}
              type="button"
              aria-expanded={mobileCatalogOpen}
              onClick={() => setMobileCatalogOpen(open => !open)}
            >
              <span>Catalog</span>
              <span className="header__mobile-chevron" aria-hidden="true" />
            </button>
            <div className={`header__mobile-submenu ${mobileCatalogOpen ? "open" : ""}`}>
              <Link href="/catalog" onClick={closeMobileMenu}>All Products</Link>
              {mobileCategories.map(category => (
                <Link
                  href={`/catalog?category=${encodeURIComponent(category)}`}
                  key={category}
                  onClick={closeMobileMenu}
                >
                  {category}
                </Link>
              ))}
            </div>
            <button
              className={`header__mobile-accordion ${mobileBrandsOpen ? "open" : ""}`}
              type="button"
              aria-expanded={mobileBrandsOpen}
              onClick={() => setMobileBrandsOpen(open => !open)}
            >
              <span>Brands</span>
              <span className="header__mobile-chevron" aria-hidden="true" />
            </button>
            <div className={`header__mobile-submenu header__mobile-submenu--brands ${mobileBrandsOpen ? "open" : ""}`}>
              {mobileBrands.map(brand => (
                <Link
                  href={`/catalog?brand=${encodeURIComponent(brand)}`}
                  key={brand}
                  onClick={closeMobileMenu}
                >
                  {brand}
                </Link>
              ))}
            </div>
            <Link href="/catalog?sale=1" onClick={closeMobileMenu}>Sale</Link>
            <Link href="/catalog?stock=1" onClick={closeMobileMenu}>In Stock</Link>
          </div>
          <div className="header__mobile-secondary">
            <span>Client Services</span>
            <Link href="/about" onClick={closeMobileMenu}>About Us</Link>
            <Link href="/contact" onClick={closeMobileMenu}>Contact Us</Link>
            <Link href="/shipping" onClick={closeMobileMenu}>Shipping & Delivery</Link>
            <Link href="/returns" onClick={closeMobileMenu}>Returns & Exchanges</Link>
            <Link href="/faq" onClick={closeMobileMenu}>FAQ</Link>
          </div>
        </nav>
      </header>
    </>
  );
}
