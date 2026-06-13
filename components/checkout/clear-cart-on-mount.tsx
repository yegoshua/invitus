"use client";

import { useEffect } from "react";
import { useClearCart } from "@/hooks/use-cart";

/**
 * Tiny mount-effect component used by the payment-result success branch
 * (server component) to clear the persisted cart after a successful payment.
 */
export function ClearCartOnMount() {
  const clearCart = useClearCart();
  useEffect(() => {
    clearCart();
  }, [clearCart]);
  return null;
}
