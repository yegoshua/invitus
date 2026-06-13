"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface IconInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: React.ReactNode;
  trailing?: React.ReactNode;
  invalid?: boolean;
  containerClassName?: string;
}

/**
 * Icon-prefixed input matching the checkout prototype:
 * - Dark field bg (--color-checkout-field)
 * - 1.5px transparent border → coral on focus → error on aria-invalid
 * - Icon color cascades to coral/error via group-style state
 */
export const IconInput = forwardRef<HTMLInputElement, IconInputProps>(
  function IconInput(
    { icon, trailing, invalid, containerClassName, className, ...inputProps },
    ref
  ) {
    const isInvalid = invalid || inputProps["aria-invalid"] === true;
    return (
      <div
        data-invalid={isInvalid || undefined}
        className={cn(
          "group flex items-center gap-3 h-16 px-5",
          "bg-[var(--color-checkout-field)]",
          "rounded-[var(--radius-checkout-field)]",
          "border-[1.5px] border-transparent",
          "transition-colors duration-150",
          "focus-within:border-coral",
          "data-[invalid]:border-[var(--color-error)]",
          containerClassName
        )}
      >
        <span
          className={cn(
            "flex items-center justify-center text-white/40 transition-colors duration-150",
            "group-focus-within:text-coral",
            "group-data-[invalid]:text-[var(--color-error)]",
            "[&>svg]:w-5 [&>svg]:h-5"
          )}
        >
          {icon}
        </span>
        <input
          ref={ref}
          aria-invalid={isInvalid || undefined}
          className={cn(
            "flex-1 min-w-0 bg-transparent border-none outline-none",
            "text-white text-[17px] font-medium",
            "placeholder:text-white/40",
            "group-data-[invalid]:text-[var(--color-error)]",
            "group-data-[invalid]:placeholder:text-[var(--color-error)]",
            "caret-coral",
            className
          )}
          {...inputProps}
        />
        {trailing && (
          <span
            className={cn(
              "flex items-center justify-center text-white/40 transition-[color,transform] duration-150",
              "group-focus-within:text-coral",
              "group-data-[invalid]:text-[var(--color-error)]",
              "[&>svg]:w-5 [&>svg]:h-5"
            )}
          >
            {trailing}
          </span>
        )}
      </div>
    );
  }
);
