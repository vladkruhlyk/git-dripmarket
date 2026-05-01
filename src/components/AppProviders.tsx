"use client";

import { CartProvider } from "@/context/CartContext";
import { ProductsProvider } from "@/context/ProductsContext";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ProductsProvider>
      <CartProvider>{children}</CartProvider>
    </ProductsProvider>
  );
}
