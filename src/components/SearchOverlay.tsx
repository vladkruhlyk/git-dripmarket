"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatPrice } from "@/lib/products";
import { useProducts } from "@/context/ProductsContext";

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const { products } = useProducts();
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setQuery("");
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      previousFocus.current?.focus();
    };
  }, [close, open]);

  const suggestedBrands = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach(product => counts.set(product.brand, (counts.get(product.brand) || 0) + 1));
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([brand]) => brand);
  }, [products]);

  const suggestedCategories = useMemo(() => (
    [...new Set(products.map(product => product.category).filter(Boolean))]
      .sort()
      .slice(0, 5)
  ), [products]);

  const matches = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    if (!normalized) return [];
    return products.filter(product =>
      product.name.toLowerCase().includes(normalized) ||
      product.brand.toLowerCase().includes(normalized) ||
      product.category.toLowerCase().includes(normalized)
    ).slice(0, 16);
  }, [products, query]);

  if (!open) return null;

  return (
    <div
      className="search-overlay open"
      role="dialog"
      aria-modal="true"
      aria-label="Search products"
    >
      <div className="search-overlay__inner">
        <div className="search-overlay__header">
          <input
            className="search-overlay__input"
            placeholder="SEARCH"
            aria-label="Search products"
            value={query}
            onChange={event => setQuery(event.target.value)}
            ref={inputRef}
          />
          <button className="search-overlay__close" aria-label="Close search" onClick={close}>x</button>
        </div>

        {!query && (
          <div className="search-suggestions">
            {suggestedBrands.length > 0 && (
              <section className="search-suggestions__section">
                <div className="search-suggestions__title">Popular Designers</div>
                <div className="search-suggestions__chips">
                  {suggestedBrands.map(brand => (
                    <Link key={brand} href={`/catalog?brand=${encodeURIComponent(brand)}`} onClick={close}>
                      {brand}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {suggestedCategories.length > 0 && (
              <section className="search-suggestions__section">
                <div className="search-suggestions__title">Categories</div>
                <div className="search-suggestions__chips">
                  {suggestedCategories.map(category => (
                    <Link key={category} href={`/catalog?category=${encodeURIComponent(category)}`} onClick={close}>
                      {category}
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        <div className="search-overlay__results">
          {query && matches.length === 0 && (
            <div className="search-overlay__empty">NO MATCHES FOUND</div>
          )}
          {matches.map(product => (
            <Link href={`/product/${product.id}`} className="search-result-item" key={product.id} onClick={close}>
              <Image src={product.image} alt={`${product.brand} ${product.name}`} width={60} height={80} />
              <div className="search-result-item__info">
                <div className="search-result-item__brand">{product.brand}</div>
                <div className="search-result-item__name">{product.name}</div>
                <div className="search-result-item__price">
                  {product.salePrice ? formatPrice(product.salePrice) : formatPrice(product.price)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
