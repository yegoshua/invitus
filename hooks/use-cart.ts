"use client";

// Public hooks for cart consumption.
//
// Components should import from this module — never reach into `@/stores/cart`.
// The Zustand store is the implementation; these hooks are the interface.

import { useCallback } from "react";
import { useCartStore } from "@/stores/cart";
import { cartValue, gaItem, gaItems, trackEvent } from "@/lib/gtag";
import type { Product } from "@/types";

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

export const useCloseCart = () => useCartStore((s) => s.closeCart);
export const useUpdateCartQuantity = () =>
  useCartStore((s) => s.updateQuantity);
export const useClearCart = () => useCartStore((s) => s.clearCart);

// The three actions below are wrapped so GA4 e-commerce events fire from a
// single place, regardless of which component triggered them.

export const useOpenCart = () => {
  const openCart = useCartStore((s) => s.openCart);
  return useCallback(() => {
    openCart();
    const items = useCartStore.getState().items;
    if (items.length) {
      trackEvent("view_cart", {
        value: cartValue(items),
        items: gaItems(items),
      });
    }
  }, [openCart]);
};

export const useAddToCart = () => {
  const addItem = useCartStore((s) => s.addItem);
  return useCallback(
    (product: Product, size?: string) => {
      addItem(product, size);
      trackEvent("add_to_cart", {
        value: product.price,
        items: [gaItem(product, { size })],
      });
    },
    [addItem]
  );
};

export const useRemoveFromCart = () => {
  const removeItem = useCartStore((s) => s.removeItem);
  return useCallback(
    (productId: string, size?: string) => {
      // Report the removed line (product + quantity) before it's gone.
      const item = useCartStore
        .getState()
        .items.find((i) => i.product.id === productId && i.size === size);
      if (item) {
        trackEvent("remove_from_cart", {
          value: item.product.price * item.quantity,
          items: [
            gaItem(item.product, { size: item.size, quantity: item.quantity }),
          ],
        });
      }
      removeItem(productId, size);
    },
    [removeItem]
  );
};
