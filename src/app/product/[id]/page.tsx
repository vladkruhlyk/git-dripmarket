"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { useCart } from "@/context/CartContext";
import { useProducts } from "@/context/ProductsContext";
import { formatPrice } from "@/lib/products";

export default function ProductPage() {
  const params = useParams<{ id: string }>();
  const { products, loading, getProduct } = useProducts();
  const { addItem } = useCart();
  const [selectedSize, setSelectedSize] = useState("");
  const [notice, setNotice] = useState("");
  const product = getProduct(params.id);

  const related = useMemo(() => {
    if (!product) return [];
    return products.filter(item => item.brand === product.brand && item.id !== product.id).slice(0, 4);
  }, [products, product]);

  if (loading) {
    return <div className="page-message">Loading product...</div>;
  }

  if (!product) {
    return <div className="page-message">Product not found</div>;
  }

  function addToBag() {
    if (!product || !selectedSize) {
      setNotice("Please select a size");
      return;
    }
    addItem(product.id, selectedSize);
    setNotice(`${product.name} added to bag`);
  }

  return (
    <>
      <div className="product-detail">
        <div className="product-detail__left">
          <Link href={`/catalog?brand=${encodeURIComponent(product.brand)}`} className="product-info__brand">
            {product.brand}
          </Link>
          <h1 className="product-info__name">{product.name}</h1>
          <div className="product-info__desc">{product.description}</div>
        </div>

        <div className="product-gallery">
          {product.images.map(image => (
            <div className="product-gallery__item" key={image}>
              <img src={image} alt={`${product.brand} ${product.name}`} />
            </div>
          ))}
        </div>

        <div className="product-detail__right">
          <div className="product-info__price">
            {product.salePrice && <span className="product-card__price--old">{formatPrice(product.price)}</span>}
            <span className={product.salePrice ? "product-card__price--sale" : ""}>
              {formatPrice(product.salePrice || product.price)}
            </span>
          </div>
          <div className="product-info__taxes">Taxes and duties included.</div>
          <div className="product-info__policy">Items ordered by request are final sale and cannot be returned.</div>
          <div className="product-info__size-container">
            <select className="product-info__size-select" value={selectedSize} onChange={event => setSelectedSize(event.target.value)}>
              <option value="" disabled>SELECT A SIZE</option>
              {product.sizes.map(size => <option value={size} key={size}>{size}</option>)}
            </select>
            <div className="product-info__size-guide">SIZE GUIDE</div>
          </div>
          <button className="product-info__add-btn" onClick={addToBag}>ADD TO BAG</button>
          {notice && <div className="product-notice">{notice}</div>}
        </div>
      </div>

      {related.length > 0 && (
        <section className="related">
          <div className="related__title">You May Also Like</div>
          <div className="related__grid">
            {related.map(item => <ProductCard product={item} key={item.id} compact />)}
          </div>
        </section>
      )}
    </>
  );
}
