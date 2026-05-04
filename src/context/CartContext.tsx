"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  productId: string;
  size: string;
  addedAt: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  toast: string;
  addItem: (productId: string, size: string) => void;
  removeItem: (index: number) => void;
  syncItems: (items: CartItem[]) => void;
  showToast: (message: string) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [toast, setToast] = useState("");

  useEffect(() => {
    setItems(JSON.parse(localStorage.getItem("drip_cart") || "[]"));
  }, []);

  useEffect(() => {
    localStorage.setItem("drip_cart", JSON.stringify(items));
  }, [items]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  }

  const value = useMemo<CartContextValue>(() => ({
    items,
    count: items.length,
    toast,
    addItem: (productId, size) => {
      setItems(current => [...current, { productId, size, addedAt: Date.now() }]);
    },
    removeItem: index => {
      setItems(current => current.filter((_, itemIndex) => itemIndex !== index));
    },
    syncItems: nextItems => {
      setItems(nextItems);
    },
    showToast
  }), [items, toast]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
