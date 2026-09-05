"use client";

import { ChipButton } from "@/components/ui/chip-button";
import { sizeDisplayText, sizeIsAChoice } from "@/lib/size-display";
import type { ProductSize } from "@/types";

interface SizeSelectorProps {
  sizes?: ProductSize[];
  /** KeyCRM value of the selected size, not its label. */
  selectedSize: string | null;
  onSelect: (size: ProductSize) => void;
}

/**
 * The sizes a product is made in. A size KeyCRM has none of stays on screen —
 * struck through and unclickable — because a missing chip reads as "we do not
 * make that size" rather than "it is out this week".
 *
 * A single size is not a choice, so it is not drawn — see lib/size-display.ts,
 * which the cart and the checkout read too. The size itself is still picked and
 * still travels to the cart and the order — ProductPageContent pre-selects the
 * first size in stock — so hiding it here costs the KeyCRM offer match nothing.
 * And a lone size that is out of stock needs no chip either: the button already
 * says so.
 */
export function SizeSelector({
  sizes,
  selectedSize,
  onSelect,
}: SizeSelectorProps) {
  if (!sizeIsAChoice(sizes)) return null;

  return (
    <div className="flex gap-3 overflow-x-auto mt-6 lg:mt-10 pb-1 scrollbar-hide px-5 lg:px-0 lg:flex-wrap lg:gap-4">
      {sizes.map((size) => (
        <ChipButton
          key={size.value}
          onClick={() => onSelect(size)}
          isActive={selectedSize === size.value}
          disabled={!size.inStock}
          title={size.inStock ? undefined : "Немає в наявності"}
        >
          {sizeDisplayText(size.value, size.label)}
        </ChipButton>
      ))}
    </div>
  );
}
