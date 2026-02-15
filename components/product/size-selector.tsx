"use client";

import { ChipButton } from "@/components/ui/chip-button";

interface SizeSelectorProps {
  sizes?: string[];
  selectedSize: string | null;
  onSelect: (size: string) => void;
}

export function SizeSelector({
  sizes,
  selectedSize,
  onSelect,
}: SizeSelectorProps) {
  if (!sizes || sizes.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-4">
      {sizes.map((size) => (
        <ChipButton
          key={size}
          onClick={() => onSelect(size)}
          isActive={selectedSize === size}
        >
          {size}
        </ChipButton>
      ))}
    </div>
  );
}
