"use client";

// Public hooks for the promo code. Components import from here, never from
// `@/stores/promo` — the store is the implementation, these are the interface.
//
// Every discount shown on the checkout has been agreed by the server for *this*
// cart, moments ago. That is what the re-check below is for: a percent code is
// worth a different sum after a size is added, and a code can expire or be
// switched off while the tab sits open. The order endpoint checks the same code
// again through the same function, so the worst this can do is show a stale
// figure for a second — never charge one.

import { useCallback, useEffect, useRef } from "react";
import { useCartItems } from "@/hooks/use-cart";
import { normalizePromoCode, PROMO_MESSAGES } from "@/lib/promo";
import { usePromoStore } from "@/stores/promo";
import type { CartItem } from "@/types";

export const usePromoStatus = () => usePromoStore((s) => s.status);
export const usePromoError = () => usePromoStore((s) => s.error);
export const useClearPromo = () => usePromoStore((s) => s.clear);
export const useRejectPromo = () => usePromoStore((s) => s.rejected);

/**
 * The code and discount that are actually in force — everything the summary and
 * the submit need, and nothing they should decide for themselves.
 *
 * A code mid-re-check reports as nothing applied. That single rule is why this
 * is one hook rather than three call sites each remembering to check `status`:
 * whatever it returns is a discount the server has confirmed for this cart, so
 * a caller cannot render or submit a figure the invoice will disagree with.
 */
export function useAppliedPromo(): { code: string | null; discount: number } {
  const code = usePromoStore((s) => s.code);
  const discount = usePromoStore((s) => s.discount);
  const status = usePromoStore((s) => s.status);

  return status === "applied" && code ? { code, discount } : { code: null, discount: 0 };
}

/** What the server needs to price the cart: never an amount. */
function orderedItems(items: readonly CartItem[]) {
  return items.map((item) => ({
    productId: Number(item.product.id),
    size: item.size ?? null,
    quantity: item.quantity,
  }));
}

/** Changes whenever the cart would price differently. */
function cartSignature(items: readonly CartItem[]): string {
  return items
    .map((i) => `${i.product.id}:${i.size ?? ""}:${i.quantity}`)
    .join("|");
}

interface PromoCheckResponse {
  ok?: boolean;
  code?: string;
  discount?: number;
  message?: string;
  error?: string;
}

/**
 * Apply, remove, and keep a code honest.
 *
 * The effect re-checks on mount and on any change to the cart. It cannot loop:
 * a refusal clears the code, and an acceptance changes only the discount, which
 * the effect does not watch.
 */
export function usePromo() {
  const items = useCartItems();
  const code = usePromoStore((s) => s.code);
  const checking = usePromoStore((s) => s.checking);
  const applied = usePromoStore((s) => s.applied);
  const rejected = usePromoStore((s) => s.rejected);
  const clear = usePromoStore((s) => s.clear);

  const signature = cartSignature(items);

  // Only the newest check may write to the store — a slow answer about an older
  // cart must not overwrite a newer one with a discount for the wrong basket.
  const requestId = useRef(0);
  // What the last check was about, so the re-check effect can tell "the cart
  // moved" from "the store wrote the same code back in its canonical case".
  const lastChecked = useRef<string | null>(null);

  const check = useCallback(
    async (raw: string) => {
      // Normalised on the way out as well as on the server, so what comes back
      // is the string we already hold and the effect below sees nothing new.
      const trimmed = normalizePromoCode(raw);
      if (!trimmed) {
        clear();
        return;
      }

      const id = ++requestId.current;
      lastChecked.current = `${trimmed}|${signature}`;
      checking();

      try {
        const res = await fetch("/api/promo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: trimmed,
            items: orderedItems(items),
          }),
        });
        const payload = (await res
          .json()
          .catch(() => ({}))) as PromoCheckResponse;

        if (id !== requestId.current) return;

        if (!res.ok) {
          rejected(payload.error || PROMO_MESSAGES.unavailable);
          return;
        }

        if (payload.ok && payload.code) {
          applied(payload.code, payload.discount ?? 0);
        } else {
          rejected(payload.message || "Промокод не діє");
        }
      } catch {
        if (id !== requestId.current) return;
        rejected(PROMO_MESSAGES.unavailable);
      }
    },
    // `items` is read inside, but the cart signature is what decides whether a
    // re-check is warranted — depending on the array identity would refire on
    // every unrelated store write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signature, checking, applied, rejected, clear]
  );

  useEffect(() => {
    if (!code || !items.length) return;
    if (lastChecked.current === `${code}|${signature}`) return;
    void check(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, code]);

  const remove = useCallback(() => {
    requestId.current += 1;
    lastChecked.current = null;
    clear();
  }, [clear]);

  return { apply: check, remove };
}
