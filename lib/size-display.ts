// Whether a size is worth showing the customer at all.
//
// A size is information only when it was a choice. Straps and wraps come in one
// size, and printing that size — "Універсальний", or whatever KeyCRM happens to
// call it — tells the customer nothing they did not already know, while adding a
// chip that is permanently selected and a cart line that answers a question
// nobody asked. Belts are the opposite: which of five widths is in the cart is
// the single most important thing on the line.
//
// So the rule is "more than one size", not "the size is named X". Renaming the
// KeyCRM offer would only move the problem to the next product, and matching on
// the word would break the first time somebody types "універсальний" in lower
// case. The size itself still travels to the order regardless — this decides
// nothing but what is drawn.
//
// It lives here so the product page, the cart drawer and the checkout summary
// cannot disagree: a size hidden on one screen and shown on the next reads as a
// bug, and the checkout is the worst place to first mention a size the customer
// never picked.

import type { CartItem, ProductSize } from "@/types";

/**
 * True when the product is made in more than one size, i.e. picking one is real.
 *
 * Typed as a predicate so a caller that guards on it can go on to map the list
 * without a second undefined check.
 */
export function sizeIsAChoice(sizes?: ProductSize[]): sizes is ProductSize[] {
  return (sizes?.length ?? 0) > 1;
}

/**
 * What to print for a cart line's size, or null when the size is not a choice
 * and should be left off the screen entirely.
 */
export function cartSizeLabel(item: CartItem): string | null {
  if (!sizeIsAChoice(item.product.sizes)) return null;
  return item.sizeLabel ?? item.size ?? null;
}
