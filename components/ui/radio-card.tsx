"use client";

import { forwardRef } from "react";
import RadioSelectedIcon from "@/public/assets/icons/checkout/radio-selected.svg";
import RadioUnselectedIcon from "@/public/assets/icons/checkout/radio-unselected.svg";
import { cn } from "@/lib/utils";

interface RadioCardProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  selected: boolean;
}

/**
 * Full-width radio styled per the checkout prototype:
 * - 1.5px transparent border → coral when selected
 * - Hover lifts background subtly
 * - Indicator uses checkout/radio-* SVG icons
 */
export const RadioCard = forwardRef<HTMLInputElement, RadioCardProps>(
  function RadioCard({ label, selected, className, ...inputProps }, ref) {
    return (
      <label
        className={cn(
          "group relative flex items-center gap-4 w-full h-[70px] px-5.5",
          "bg-[var(--color-checkout-field)]",
          "rounded-[var(--radius-checkout-field)]",
          "border-[1.5px] border-transparent",
          "text-white text-[17px] font-medium text-left cursor-pointer",
          "transition-[border-color,background] duration-150",
          "hover:bg-[#242424]",
          selected && "border-coral",
          className
        )}
      >
        <input
          ref={ref}
          type="radio"
          className="sr-only"
          {...inputProps}
        />
        <span
          aria-hidden
          className={cn(
            "shrink-0 inline-flex items-center justify-center w-[22px] h-[22px]",
            selected ? "text-coral" : "text-white/40"
          )}
        >
          {selected ? (
            <RadioSelectedIcon className="w-full h-full" />
          ) : (
            <RadioUnselectedIcon className="w-full h-full" />
          )}
        </span>
        <span>{label}</span>
      </label>
    );
  }
);
