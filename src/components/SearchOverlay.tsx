"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatPrice } from "@/lib/products";
import { useProducts } from "@/context/ProductsContext";

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);
  const [query, setQuery] = useState("");
  const { products } = useProducts();
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setQuery("");
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), 280);
    return () => window.clearTimeout(timer);
  }, [open]);

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

  if (!mounted) return null;

  return (
    <div
      className={`search-overlay${visible ? " open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Search products"
    >
      <button className="search-overlay__backdrop" aria-label="Close search" onClick={close} />
      <div className="search-overlay__inner">
        <div className="search-overlay__header">
          <span className="search-overlay__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <circle cx="11" cy="11" r="7" />
              <path d="m16.2 16.2 4.3 4.3" />
            </svg>
          </span>
          <input
            className="search-overlay__input"
            placeholder="Find products, brands, categories..."
            aria-label="Search products"
            value={query}
            onChange={event => setQuery(event.target.value)}
            ref={inputRef}
          />
          <button className="search-overlay__close" aria-label="Close search" onClick={close}>ESC</button>
        </div>

        {!query && (
          <div className="search-suggestions">
            {suggestedCategories.length > 0 && (
              <section className="search-suggestions__section">
                <div className="search-suggestions__title">Categories</div>
                <div className="search-suggestions__chips">
                  {suggestedCategories.map(category => (
                    <Link key={category} href={`/catalog?category=${encodeURIComponent(category)}`} onClick={close}>
                      <span>{category}</span>
                      <span aria-hidden="true">↗</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {suggestedBrands.length > 0 && (
              <section className="search-suggestions__section">
                <div className="search-suggestions__title">Popular Designers</div>
                <div className="search-suggestions__chips search-suggestions__chips--brands">
                  {suggestedBrands.map(brand => (
                    <Link key={brand} href={`/catalog?brand=${encodeURIComponent(brand)}`} onClick={close}>
                      <span>{brand}</span>
                      <span aria-hidden="true">↗</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <p className="search-overlay__hint">
              Start typing a model, designer or category. For example: Golden Goose, 3XL, bags.
            </p>
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

        <div className="search-overlay__footer" aria-hidden="true">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigation</span>
          <span><kbd>↵</kbd> choose</span>
          <strong>DRIP SEARCH</strong>
        </div>
      </div>
    </div>
  );
}
