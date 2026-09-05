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
 * The text a size is drawn as: "S · 65-80 см".
 *
 * A belt is stocked by letter but fits by waist, and the customer needs both —
 * the range to pick by, the letter to recognise the belt they already own or
 * to say to a manager. When Strapi has no wording for a size the label is the
 * value itself, and printing "S · S" would look like a bug, so it collapses to
 * the one string.
 */
export function sizeDisplayText(value: string, label: string): string {
  return label === value ? value : `${value} · ${label}`;
}

/**
 * What to print for a cart line's size, or null when the size is not a choice
 * and should be left off the screen entirely. Same text as the product page
 * chip, so the cart names the size the customer just clicked.
 */
export function cartSizeLabel(item: CartItem): string | null {
  if (!sizeIsAChoice(item.product.sizes)) return null;
  if (!item.size) return null;
  return sizeDisplayText(item.size, item.sizeLabel ?? item.size);
}
