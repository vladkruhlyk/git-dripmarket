"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/products";

type ProductsContextValue = {
  products: Product[];
  loading: boolean;
  getProduct: (id: string) => Product | undefined;
};

const ProductsContext = createContext<ProductsContextValue | null>(null);
let productCache: Product[] | null = null;

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>(productCache || []);
  const [loading, setLoading] = useState(!productCache);

  useEffect(() => {
    if (productCache) return;

    let alive = true;
    fetch("/api/products", { cache: "no-store" })
      .then(response => response.json())
      .then((data: Product[]) => {
        productCache = data;
        if (alive) setProducts(data);
      })
      .catch(error => {
        console.error("Failed to load products:", error);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo<ProductsContextValue>(() => ({
    products,
    loading,
    getProduct: id => products.find(product => String(product.id) === String(id))
  }), [products, loading]);

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts() {
  const value = useContext(ProductsContext);
  if (!value) throw new Error("useProducts must be used inside ProductsProvider");
  return value;
}
