"use client";

import { cn } from "@/lib/utils";

interface ChipButtonProps {
  children: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

export function ChipButton({
  children,
  isActive = false,
  onClick,
  className,
}: ChipButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-6 py-4 rounded-[16px] cursor-pointer font-heading text-base leading-6 font-bold tracking-[0.1em] text-center transition-colors whitespace-nowrap",
        isActive
          ? "bg-white text-black"
          : "bg-white/10 text-white hover:bg-white/20",
        className
      )}
    >
      {children}
    </button>
  );
}
