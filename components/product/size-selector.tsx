"use client";

import { cn } from "@/lib/utils";

interface SizeSelectorProps {
  sizes: string[];
  selectedSize: string | null;
  onSelect: (size: string) => void;
}

export function SizeSelector({
  sizes,
  selectedSize,
  onSelect,
}: SizeSelectorProps) {
  return (
    <div className="flex flex-wrap gap-4">
      {sizes.map((size) => (
        <button
          key={size}
          onClick={() => onSelect(size)}
          className={cn(
            "px-6 py-4 rounded-full cursor-pointer font-heading text-base leading-6 font-bold tracking-[0.1em] text-center transition-colors",
            selectedSize === size
              ? "bg-white text-black"
              : "bg-white/10 text-white hover:bg-white/20"
          )}
        >
          {size}
        </button>
      ))}
    </div>
  );
}
