import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * The promo code the customer is carrying, and the server's latest word on it.
 *
 * The split down the middle is the whole point. The **code** is the customer's
 * — it survives a reload, the way the cart does, because retyping it after an
 * accidental refresh is a good reason to abandon a checkout. The **discount** is
 * the server's, and it is never persisted, for exactly the reason prices are
 * never persisted: a number restored from localStorage is a number nobody has
 * agreed to pay, and showing one that the invoice will not honour is worse than
 * showing none. On every load the code goes back to the server and the discount
 * is earned again.
 */
export type PromoStatus = "idle" | "checking" | "applied" | "rejected";

interface PromoState {
  /** Normalised, as accepted by the server. Persisted. */
  code: string | null;
  /** UAH off the goods, straight from the server. Never persisted. */
  discount: number;
  status: PromoStatus;
  /** Why the last code was refused, in the customer's language. */
  error: string | null;

  checking: () => void;
  applied: (code: string, discount: number) => void;
  /** Refused: the code comes off, and the reason takes its place. */
  rejected: (message: string) => void;
  clear: () => void;
}

export const usePromoStore = create<PromoState>()(
  persist(
    (set) => ({
      code: null,
      discount: 0,
      status: "idle",
      error: null,

      checking: () => set({ status: "checking", error: null }),

      applied: (code, discount) =>
        set({ code, discount, status: "applied", error: null }),

      // Dropping the code rather than keeping it greyed out is deliberate: a
      // code still sitting in the field after it stopped working reads as
      // "applied", and the next submit would silently be at full price.
      rejected: (message) =>
        set({ code: null, discount: 0, status: "rejected", error: message }),

      clear: () => set({ code: null, discount: 0, status: "idle", error: null }),
    }),
    {
      name: "invitus-promo",
      partialize: (state) => ({ code: state.code }),
    }
  )
);
