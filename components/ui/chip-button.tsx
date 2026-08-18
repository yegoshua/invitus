"use client";

import { cn } from "@/lib/utils";

interface ChipButtonProps {
  children: React.ReactNode;
  isActive?: boolean;
  disabled?: boolean;
  title?: string;
  onClick?: () => void;
  className?: string;
}

export function ChipButton({
  children,
  isActive = false,
  disabled = false,
  title,
  onClick,
  className,
}: ChipButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "px-6 py-4 rounded-[20px] cursor-pointer font-heading text-base leading-6 font-bold tracking-[0.1em] text-center transition-colors whitespace-nowrap",
        isActive
          ? "bg-white text-black"
          : "bg-[#0000007A] text-white",
        // Struck through as well as dimmed: opacity alone reads as a styling
        // accident on a dark card, and the line says "gone" without a label
        // that would not fit inside a chip.
        disabled &&
          "cursor-not-allowed opacity-40 line-through bg-[#0000007A] text-white",
        className
      )}
    >
      {children}
    </button>
  );
}
