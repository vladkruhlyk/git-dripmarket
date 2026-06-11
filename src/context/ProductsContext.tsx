"use client";

import { createContext, useContext, useMemo } from "react";
import type { Product } from "@/lib/products";

type ProductsContextValue = {
  products: Product[];
  loading: boolean;
  error: string;
  getProduct: (id: string) => Product | undefined;
};

const ProductsContext = createContext<ProductsContextValue | null>(null);
export function ProductsProvider({ children, products }: { children: React.ReactNode; products: Product[] }) {

  const productsById = useMemo(() => (
    new Map(products.map(product => [String(product.id), product]))
  ), [products]);

  const value = useMemo<ProductsContextValue>(() => ({
    products,
    loading: false,
    error: "",
    getProduct: id => productsById.get(String(id))
  }), [products, productsById]);

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts() {
  const value = useContext(ProductsContext);
  if (!value) throw new Error("useProducts must be used inside ProductsProvider");
  return value;
}
