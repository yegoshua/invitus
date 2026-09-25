"use client";

import { cn } from "@/lib/utils";

interface ChipButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> {
  children: React.ReactNode;
  isActive?: boolean;
  className?: string;
}

/**
 * The chip's look, for the few places that need it on something other than a
 * button — a label wrapping a colour or range input, which a <button> may not
 * contain.
 */
export function chipClassName({
  isActive = false,
  disabled = false,
}: { isActive?: boolean; disabled?: boolean } = {}) {
  return cn(
    "px-6 py-4 rounded-[20px] cursor-pointer font-heading text-base leading-6 font-bold tracking-[0.1em] text-center transition-colors whitespace-nowrap",
    isActive
      ? "bg-white text-black"
      : "bg-[#0000007A] text-white",
    // Struck through as well as dimmed: opacity alone reads as a styling
    // accident on a dark card, and the line says "gone" without a label
    // that would not fit inside a chip.
    disabled &&
      "cursor-not-allowed opacity-40 line-through bg-[#0000007A] text-white",
  );
}

export function ChipButton({
  children,
  isActive = false,
  disabled = false,
  className,
  type = "button",
  ...rest
}: ChipButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled}
      className={cn(chipClassName({ isActive, disabled }), className)}
    >
      {children}
    </button>
  );
}
