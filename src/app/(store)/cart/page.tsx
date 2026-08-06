"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useCart } from "@/context/CartContext";
import { useProducts } from "@/context/ProductsContext";
import { formatPrice } from "@/lib/products";

export default function CartPage() {
  const { items, removeItem, syncItems, updateItem } = useCart();
  const { products, loading } = useProducts();
  const productsById = useMemo(() => (
    new Map(products.map(product => [String(product.id), product]))
  ), [products]);
  const bagItems = useMemo(() => items.map((item, index) => ({
    item,
    index,
    product: productsById.get(String(item.productId))
  })).filter(entry => entry.product), [items, productsById]);

  useEffect(() => {
    if (loading || products.length === 0) return;
    const validItems = items.filter(item => productsById.has(String(item.productId)));
    if (validItems.length !== items.length) syncItems(validItems);
  }, [items, loading, products, productsById, syncItems]);

  const total = bagItems.reduce((sum, entry) => (
    entry.product ? sum + (entry.product.salePrice || entry.product.price) : sum
  ), 0);

  return (
    <section className="bag">
      <h1 className="bag__title">Кошик</h1>

      {loading && <div className="bag__empty">Завантажуємо кошик...</div>}

      {!loading && bagItems.length === 0 && (
        <div className="bag__empty">
          <p>Ваш кошик порожній</p>
          <p><Link href="/catalog">Продовжити покупки</Link></p>
        </div>
      )}

      {bagItems.map(({ item, index, product }) => product && (
        <div className="bag-item" key={`${item.productId}-${item.addedAt}-${index}`}>
          <Link href={`/product/${product.id}`} className="bag-item__image">
            <Image src={product.image} alt={`${product.brand} ${product.name}`} width={100} height={133} />
          </Link>
          <div className="bag-item__details">
            <div className="bag-item__brand">{product.brand}</div>
            <div className="bag-item__name">{product.name}</div>
            <div className="bag-item__size">Розмір: {item.size || "Не вибрано"}</div>
            <label className="bag-item__insole">
              <span>Устілка, см</span>
              <input
                inputMode="decimal"
                placeholder="Напр. 24.5"
                value={item.insoleCm || ""}
                onChange={event => updateItem(index, { insoleCm: event.target.value })}
              />
            </label>
          </div>
          <div className="bag-item__actions">
            <div className="bag-item__price">{formatPrice(product.salePrice || product.price)}</div>
            <button className="bag-item__remove" type="button" onClick={() => removeItem(index)}>Видалити</button>
          </div>
        </div>
      ))}

      {bagItems.length > 0 && (
        <div className="bag__footer">
          <div className="bag__summary">
            <span className="bag__total-label">Разом</span>
            <span className="bag__total-price">{formatPrice(total)}</span>
          </div>
          <Link className="bag__checkout" href="/checkout">Перейти до оформлення</Link>
          <Link href="/catalog" className="bag__continue">Продовжити покупки</Link>
        </div>
      )}
    </section>
  );
}
