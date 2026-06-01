"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/products";

type ProductsContextValue = {
  products: Product[];
  loading: boolean;
  error: string;
  getProduct: (id: string) => Product | undefined;
};

const ProductsContext = createContext<ProductsContextValue | null>(null);
let productCache: Product[] | null = null;

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>(productCache || []);
  const [loading, setLoading] = useState(!productCache);
  const [error, setError] = useState("");

  useEffect(() => {
    if (productCache) return;

    let alive = true;
    fetch("/api/products")
      .then(response => {
        if (!response.ok) throw new Error("Product catalog is temporarily unavailable");
        return response.json();
      })
      .then((data: Product[]) => {
        if (!Array.isArray(data)) throw new Error("Product catalog returned an invalid response");
        productCache = data;
        if (alive) setProducts(data);
      })
      .catch(error => {
        console.error("Failed to load products:", error);
        if (alive) setError("Catalog is temporarily unavailable. Please try again shortly.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const productsById = useMemo(() => (
    new Map(products.map(product => [String(product.id), product]))
  ), [products]);

  const value = useMemo<ProductsContextValue>(() => ({
    products,
    loading,
    error,
    getProduct: id => productsById.get(String(id))
  }), [error, loading, products, productsById]);

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts() {
  const value = useContext(ProductsContext);
  if (!value) throw new Error("useProducts must be used inside ProductsProvider");
  return value;
}
