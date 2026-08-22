"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useCart } from "@/context/CartContext";
import { trackMetaPixelEvent } from "@/lib/meta-pixel";
import { formatPrice, type Product } from "@/lib/products";

export function ProductCard({ product, delay = 0, compact = false }: { product: Product; delay?: number; compact?: boolean }) {
  const { addItem, showToast } = useCart();
  const [sizeOpen, setSizeOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState("");

  useEffect(() => {
    if (!sizeOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSizeOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [sizeOpen]);

  function quickAdd() {
    if (product.sizes.length === 1) {
      addItem(product.id, product.sizes[0]);
      trackMetaPixelEvent("AddToCart", {
        content_ids: [String(product.id)],
        content_type: "product",
        contents: [{ id: String(product.id), quantity: 1, item_price: product.salePrice || product.price }],
        currency: "UAH",
        value: product.salePrice || product.price
      });
      showToast(`${product.name} added to bag`);
      return;
    }
    setSelectedSize("");
    setSizeOpen(true);
  }

  function confirmAdd() {
    if (!selectedSize) return;
    addItem(product.id, selectedSize);
    trackMetaPixelEvent("AddToCart", {
      content_ids: [String(product.id)],
      content_type: "product",
      contents: [{ id: String(product.id), quantity: 1, item_price: product.salePrice || product.price }],
      currency: "UAH",
      value: product.salePrice || product.price
    });
    setSizeOpen(false);
    showToast(`${product.name} / Size ${selectedSize} added to bag`);
  }

  return (
    <article className={`product-card ${compact ? "product-card--compact" : ""}`} style={{ animationDelay: `${delay}s` }}>
      <Link href={`/product/${product.id}`} className="product-card__image">
        <Image
          src={product.image}
          alt={`${product.brand} ${product.name}`}
          fill
          sizes={compact ? "(max-width: 768px) 50vw, 25vw" : "(max-width: 768px) 50vw, 25vw"}
          priority={!compact && delay === 0}
        />
      </Link>
      {!compact && (
        <button className="product-card__add-btn" type="button" onClick={quickAdd}>Add to bag</button>
      )}
      <Link href={`/product/${product.id}`} className="product-card__info">
        <span className="product-card__brand">{product.brand}</span>
        <span className="product-card__name">{product.name}</span>
        {product.inStock && product.sizes.length > 0 && (
          <span className="product-card__stock-size">
            In stock: {product.sizes.join(", ")}
          </span>
        )}
        {!product.inStock && (
          <span className="product-card__preorder-delivery">Під замовлення: 12–16 днів</span>
        )}
        <span className="product-card__prices">
          {product.salePrice && <span className="product-card__price product-card__price--old">{formatPrice(product.price)}</span>}
          <span className={`product-card__price ${product.salePrice ? "product-card__price--sale" : ""}`}>
            {formatPrice(product.salePrice || product.price)}
          </span>
        </span>
      </Link>

      {sizeOpen && createPortal(
        <div className="size-modal open" role="dialog" aria-modal="true" aria-label={`Choose a size for ${product.name}`}>
          <button className="size-modal__overlay" type="button" onClick={() => setSizeOpen(false)} aria-label="Close size picker" />
          <div className="size-modal__content">
            <button className="size-modal__close" type="button" aria-label="Close size picker" onClick={() => setSizeOpen(false)}>x</button>
            <div className="size-modal__product">
              <Image
                className="size-modal__product-img"
                src={product.image}
                alt={`${product.brand} ${product.name}`}
                width={72}
                height={96}
              />
              <div className="size-modal__product-info">
                <div className="size-modal__product-brand">{product.brand}</div>
                <div className="size-modal__product-name">{product.name}</div>
                <div className="size-modal__product-price">{formatPrice(product.salePrice || product.price)}</div>
              </div>
            </div>
            <div className="size-modal__title">Select Size</div>
            <div className="size-modal__sizes">
              {product.sizes.map(size => (
                <button
                  className={`size-modal__size-btn ${selectedSize === size ? "selected" : ""}`}
                  key={size}
                  type="button"
                  onClick={() => setSelectedSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
            <button className="size-modal__add" type="button" disabled={!selectedSize} onClick={confirmAdd}>
              {selectedSize ? `Add to bag - Size ${selectedSize}` : "Select a size"}
            </button>
          </div>
        </div>,
        document.body
      )}
    </article>
  );
}
