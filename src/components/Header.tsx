"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/context/CartContext";
import { useProducts } from "@/context/ProductsContext";

export function Header({ onSearch }: { onSearch: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { count } = useCart();
  const { products } = useProducts();
  const [scrolled, setScrolled] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"Men" | "Women" | "Sale" | "">("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileCatalogOpen, setMobileCatalogOpen] = useState(false);
  const isHome = pathname === "/";
  const mobileCategories = useMemo(() => (
    [...new Set(products.map(product => product.category).filter(Boolean))].sort()
  ), [products]);

  useEffect(() => {
    if (!isHome) return;
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  useEffect(() => {
    const updateActiveFilter = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("sale")) {
        setActiveFilter("Sale");
      } else if (params.get("gender") === "Men") {
        setActiveFilter("Men");
      } else if (params.get("gender") === "Women") {
        setActiveFilter("Women");
      } else {
        setActiveFilter("");
      }
    };

    updateActiveFilter();
  }, [pathname]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileCatalogOpen(false);
  }, [pathname]);

  function pushCatalog(filter: "Men" | "Women" | "Sale") {
    const params = new URLSearchParams(window.location.search);
    setActiveFilter(filter);
    if (filter === "Sale") {
      params.set("sale", "1");
      params.delete("gender");
    } else {
      params.set("gender", filter);
      params.delete("sale");
    }
    router.push(`/catalog?${params.toString()}`);
    setMobileMenuOpen(false);
    setMobileCatalogOpen(false);
  }

  function openSearch() {
    setMobileMenuOpen(false);
    setMobileCatalogOpen(false);
    onSearch();
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
    setMobileCatalogOpen(false);
  }

  function toggleMobileMenu() {
    if (mobileMenuOpen) setMobileCatalogOpen(false);
    setMobileMenuOpen(open => !open);
  }

  return (
    <header className={`header ${isHome ? "header--hero" : ""} ${scrolled ? "scrolled" : ""} ${mobileMenuOpen ? "header--menu-open" : ""}`}>
      <button
        className="header__burger"
        type="button"
        aria-expanded={mobileMenuOpen}
        aria-controls="mobile-menu"
        onClick={toggleMobileMenu}
      >
        {mobileMenuOpen ? "Close" : "Menu"}
      </button>

      <nav className="header__left" aria-label="Main navigation">
        {isHome ? (
          <>
            <Link href="/catalog" className="header__nav-link">Catalog</Link>
            <Link href="/about" className="header__nav-link">About Us</Link>
          </>
        ) : (
          <>
            <button className={`header__nav-link ${activeFilter === "Men" ? "active" : ""}`} onClick={() => pushCatalog("Men")}>Menswear</button>
            <button className={`header__nav-link ${activeFilter === "Women" ? "active" : ""}`} onClick={() => pushCatalog("Women")}>Womenswear</button>
            <button className={`header__nav-link ${activeFilter === "Sale" ? "active" : ""}`} onClick={() => pushCatalog("Sale")}>Sale</button>
            <button className="header__nav-link" onClick={openSearch}>Search</button>
          </>
        )}
      </nav>

      <div className="header__center">
        <Link href="/" className="header__logo" aria-label="DRIP. home">
          <Image src="/logo.png" alt="DRIP." width={152} height={48} priority />
        </Link>
      </div>

      <div className="header__right">
        {isHome && <button className="header__action" onClick={openSearch}>Search</button>}
        {!isHome && <button className="header__action header__mobile-search" onClick={openSearch}>Search</button>}
        <Link href="/cart" className="header__action">Bag ({count})</Link>
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
          <button type="button" onClick={() => pushCatalog("Men")}>Menswear</button>
          <button type="button" onClick={() => pushCatalog("Women")}>Womenswear</button>
          <button type="button" onClick={() => pushCatalog("Sale")}>Sale</button>
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
  );
}
