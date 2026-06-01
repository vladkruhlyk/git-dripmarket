"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

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
  const [hydrated, setHydrated] = useState(false);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    try {
      const storedItems = JSON.parse(localStorage.getItem("drip_cart") || "[]");
      if (Array.isArray(storedItems)) setItems(storedItems);
    } catch {
      localStorage.removeItem("drip_cart");
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("drip_cart", JSON.stringify(items));
  }, [hydrated, items]);

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(""), 2400);
  }, []);

  const addItem = useCallback((productId: string, size: string) => {
    setItems(current => [...current, { productId, size, addedAt: Date.now() }]);
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems(current => current.filter((_, itemIndex) => itemIndex !== index));
  }, []);

  const syncItems = useCallback((nextItems: CartItem[]) => {
    setItems(nextItems);
  }, []);

  const value = useMemo<CartContextValue>(() => ({
    items,
    count: items.length,
    toast,
    addItem,
    removeItem,
    syncItems,
    showToast
  }), [addItem, items, removeItem, showToast, syncItems, toast]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
