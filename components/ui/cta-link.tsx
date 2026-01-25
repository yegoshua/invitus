"use client";

import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

function ArrowRightUpIcon({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M6.65078 18.825L4.42578 16.6L13.4508 7.57499H5.67578V4.42499H18.8258V17.575H15.6758V9.79999L6.65078 18.825Z"
        fill="currentColor"
      />
    </svg>
  );
}

const ctaLinkVariants = cva(
  "group inline-flex items-center justify-center gap-4 font-druk font-bold text-base leading-6 tracking-[0.05em] uppercase rounded-full transition-all duration-300",
  {
    variants: {
      variant: {
        solid: "bg-coral text-black hover:brightness-110",
        outline: "border-2",
      },
      color: {
        coral: "",
        black: "",
      },
      size: {
        default: "px-8 lg:px-12 py-5",
        large: "px-8 lg:pl-12 lg:pr-10 py-8",
      },
    },
    compoundVariants: [
      {
        variant: "outline",
        color: "coral",
        className: "border-coral text-coral hover:bg-coral hover:text-black",
      },
      {
        variant: "outline",
        color: "black",
        className: "border-black text-black hover:bg-black hover:text-coral",
      },
    ],
    defaultVariants: {
      variant: "solid",
      color: "coral",
      size: "default",
    },
  }
);

interface CTALinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "color">,
    VariantProps<typeof ctaLinkVariants> {
  href: string;
  children: React.ReactNode;
}

export function CTALink({
  href,
  children,
  variant,
  color,
  size,
  className,
  ...props
}: CTALinkProps) {
  return (
    <Link
      href={href}
      className={cn(ctaLinkVariants({ variant, color, size }), className)}
      {...props}
    >
      {children}
      <ArrowRightUpIcon className="w-5 h-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
    </Link>
  );
}
