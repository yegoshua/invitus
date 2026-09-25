/**
 * When the mobile product page's buttons leave the flow and pin to the bottom.
 *
 * They sit under the product card by default — pinned from the first paint, the
 * two of them took a third of a phone's screen off the product itself. Once the
 * reader has scrolled *past* them they pin, so buying never needs a scroll back
 * up. Only past: a block not reached yet (below the fold on a short screen) is
 * also off screen, and pinning it there would show the buttons twice the moment
 * the reader scrolled down to them.
 */
export function shouldPinCta(entry: {
  isIntersecting: boolean;
  /** `boundingClientRect.top` — negative once the block is above the viewport. */
  top: number;
}): boolean {
  return !entry.isIntersecting && entry.top < 0;
}
