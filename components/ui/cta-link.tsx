"use client";

import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import ArrowOutForwardIcon from "@/public/assets/icons/arrow-outforward-icon.svg";

const ctaLinkVariants = cva(
  "group inline-flex w-full lg:w-auto items-center justify-center gap-[10px] lg:gap-4 text-btn font-heading font-bold tracking-[0.05em] uppercase rounded-[24px] transition-all duration-300",
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
        default: "px-4 h-16 lg:px-12 lg:h-auto lg:py-5",
        large: "px-4 h-16 lg:pl-12 lg:pr-10 lg:h-auto lg:py-8",
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
      <ArrowOutForwardIcon className="w-5 h-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
    </Link>
  );
}
