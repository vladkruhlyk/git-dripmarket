"use client";

import { useCart } from "@/context/CartContext";

export function Toast() {
  const { toast } = useCart();

  return <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>;
}
