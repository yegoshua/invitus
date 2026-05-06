"use client";

// Public hooks for cart consumption.
//
// Components should import from this module — never reach into `@/stores/cart`.
// The Zustand store is the implementation; these hooks are the interface.

import { useCartStore } from "@/stores/cart";

// ── Reads ─────────────────────────────────────────────────────────────────

export const useCartItems = () => useCartStore((s) => s.items);

export const useCartIsOpen = () => useCartStore((s) => s.isOpen);

export const useCartCount = () =>
  useCartStore((s) => s.items.reduce((count, item) => count + item.quantity, 0));

export const useCartTotal = () =>
  useCartStore((s) =>
    s.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  );

// ── Actions ───────────────────────────────────────────────────────────────
// Each returns a stable function reference from the store, so re-renders
// only happen when the selected value actually changes.

export const useOpenCart = () => useCartStore((s) => s.openCart);
export const useCloseCart = () => useCartStore((s) => s.closeCart);
export const useAddToCart = () => useCartStore((s) => s.addItem);
export const useRemoveFromCart = () => useCartStore((s) => s.removeItem);
export const useUpdateCartQuantity = () =>
  useCartStore((s) => s.updateQuantity);
export const useClearCart = () => useCartStore((s) => s.clearCart);
