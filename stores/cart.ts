import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product, CartState } from "@/types";

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      // `size` alone identifies the line — it is KeyCRM's value, and two
      // labels can never disagree about the same value.
      addItem: (product: Product, size?: string, sizeLabel?: string) => {
        const items = get().items;
        const existing = items.find(
          (item) => item.product.id === product.id && item.size === size
        );

        if (existing) {
          set({
            items: items.map((item) =>
              item.product.id === product.id && item.size === size
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ),
          });
        } else {
          set({ items: [...items, { product, quantity: 1, size, sizeLabel }] });
        }
      },

      removeItem: (productId: string, size?: string) => {
        set({
          items: get().items.filter(
            (item) => !(item.product.id === productId && item.size === size)
          ),
        });
      },

      updateQuantity: (productId: string, quantity: number, size?: string) => {
        if (quantity <= 0) {
          get().removeItem(productId, size);
          return;
        }

        set({
          items: get().items.map((item) =>
            item.product.id === productId && item.size === size
              ? { ...item, quantity }
              : item
          ),
        });
      },

      clearCart: () => set({ items: [] }),

      getTotal: () =>
        get().items.reduce(
          (total, item) => total + item.product.price * item.quantity,
          0
        ),

      getItemCount: () =>
        get().items.reduce((count, item) => count + item.quantity, 0),
    }),
    {
      name: "invitus-cart",
      // CartItem changed from `Product & { quantity, size }` to
      // `{ product, quantity, size }`. Bump version so previously persisted
      // carts get cleared instead of crashing on shape mismatch.
      version: 2,
      migrate: () => ({ items: [], isOpen: false } as Partial<CartState>),
    }
  )
);
