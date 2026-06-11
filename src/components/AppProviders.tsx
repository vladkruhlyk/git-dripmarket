"use client";

import { CartProvider } from "@/context/CartContext";
import { ProductsProvider } from "@/context/ProductsContext";
import type { Product } from "@/lib/products";

export function AppProviders({ children, products }: { children: React.ReactNode; products: Product[] }) {
  return (
    <ProductsProvider products={products}>
      <CartProvider>{children}</CartProvider>
    </ProductsProvider>
  );
}
