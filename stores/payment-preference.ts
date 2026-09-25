import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_PARTS, isPartsCount, type PartsCount } from "@/lib/installments";

export type PaymentMethod = "online" | "parts" | "cod";

/**
 * How the customer intends to pay, remembered between the product page, the
 * cart drawer and the checkout.
 *
 * The «Від 513 ₴ / міс» button on a product is a statement of intent, not a
 * different add-to-cart: it sets this to instalments, and from then on the
 * cart drawer shows «до оплати зараз» instead of the total and the checkout
 * opens with «Оплата частинами monobank» selected. Changing the radio on the
 * checkout writes back here, so the cart and the checkout never disagree.
 *
 * Nothing about money is stored — only the choice. Whether the choice is
 * *available* (the total is over the floor) is re-derived wherever it is
 * shown, from the cart as it is then.
 */
interface PaymentPreferenceState {
  method: PaymentMethod;
  parts: PartsCount;
  setMethod: (method: PaymentMethod) => void;
  setParts: (parts: PartsCount) => void;
}

export const usePaymentPreferenceStore = create<PaymentPreferenceState>()(
  persist(
    (set) => ({
      method: "online",
      parts: DEFAULT_PARTS,
      setMethod: (method) => set({ method }),
      // Guarded: the value comes back from localStorage, where an older build
      // may have written a count the list no longer offers.
      setParts: (parts) => set({ parts: isPartsCount(parts) ? parts : DEFAULT_PARTS }),
    }),
    {
      name: "invitus-payment",
      partialize: (state) => ({ method: state.method, parts: state.parts }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<PaymentPreferenceState>;
        return {
          ...current,
          method:
            saved.method === "parts" || saved.method === "cod" || saved.method === "online"
              ? saved.method
              : current.method,
          parts: isPartsCount(saved.parts) ? saved.parts : current.parts,
        };
      },
    }
  )
);
