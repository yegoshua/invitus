"use client";

import { ChipButton } from "@/components/ui/chip-button";
import type { ProductSize } from "@/types";

interface SizeSelectorProps {
  sizes?: ProductSize[];
  /** KeyCRM value of the selected size, not its label. */
  selectedSize: string | null;
  onSelect: (size: ProductSize) => void;
}

export function SizeSelector({
  sizes,
  selectedSize,
  onSelect,
}: SizeSelectorProps) {
  if (!sizes || sizes.length === 0) return null;

  return (
    <div className="flex gap-3 overflow-x-auto mt-6 lg:mt-10 pb-1 scrollbar-hide px-5 lg:px-0 lg:flex-wrap lg:gap-4">
      {sizes.map((size) => (
        <ChipButton
          key={size.value}
          onClick={() => onSelect(size)}
          isActive={selectedSize === size.value}
        >
          {size.label}
        </ChipButton>
      ))}
    </div>
  );
}
