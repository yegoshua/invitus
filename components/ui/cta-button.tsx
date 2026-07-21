"use client";

import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import ArrowOutForwardIcon from "@/public/assets/icons/arrow-outforward-icon.svg";

// THE canonical CTA — one shape everywhere, per the design spec:
//   mobile:  h-16 (64px), padding 22/28/22/32, gap 12px, radius 24px
//   desktop: h-[88px],    padding 32/40/32/48, gap 16px, radius 32px
// Text style is the text-btn token (14/20 → 16/24).
//
// Variants: solid (coral bg) | outline (dark bg, coral border) — nothing else.
// Renders as <Link> when `href` is given, otherwise as <button>.
const ctaButtonVariants = cva(
  [
    "group inline-flex items-center justify-center",
    // rounded-[24px] must be explicit: the project's rounded-3xl resolves to
    // calc(--radius + 12px) = 22px, not the spec'd 24px.
    "gap-3 h-16 rounded-[24px] py-[22px] pl-8 pr-7",
    "lg:gap-4 lg:h-[88px] lg:rounded-[32px] lg:py-8 lg:pl-12 lg:pr-10",
    // Explicit text-btn token values (14/20 → 16/24 at md): the text-btn
    // utility itself gets stripped by tailwind-merge, which misreads it as a
    // text-color class conflicting with the variant's text-black/text-coral.
    "text-sm leading-5 md:text-base md:leading-6",
    "font-heading font-bold tracking-[0.05em] uppercase",
    "transition-[filter,transform,background-color,color] duration-150 active:translate-y-px",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
    "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:brightness-100",
  ].join(" "),
  {
    variants: {
      variant: {
        solid: "bg-coral text-black hover:brightness-110",
        outline: "border-2 border-coral text-coral hover:bg-coral hover:text-black",
      },
      // fill — stretch to the container (forms, drawers, cards);
      // hug — content width on desktop, full width on mobile (page sections).
      width: {
        fill: "w-full",
        hug: "w-full lg:w-auto",
      },
    },
    defaultVariants: { variant: "solid", width: "hug" },
  }
);

interface CTAButtonBaseProps extends VariantProps<typeof ctaButtonVariants> {
  /** Trailing icon. Defaults to the brand ↗ arrow; pass `null` to omit. */
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

interface CTAButtonAsLink
  extends CTAButtonBaseProps,
    Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children"> {
  href: string;
}

interface CTAButtonAsButton
  extends CTAButtonBaseProps,
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> {
  href?: never;
}

type CTAButtonProps = CTAButtonAsLink | CTAButtonAsButton;

const defaultIcon = (
  <ArrowOutForwardIcon className="w-5 h-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
);

export function CTAButton({
  variant,
  width,
  icon = defaultIcon,
  className,
  children,
  ...props
}: CTAButtonProps) {
  const classes = cn(ctaButtonVariants({ variant, width }), className);

  if ("href" in props && props.href !== undefined) {
    const { href, ...rest } = props as CTAButtonAsLink;
    return (
      <Link href={href} className={classes} {...rest}>
        {children}
        {icon}
      </Link>
    );
  }

  return (
    <button className={classes} {...(props as CTAButtonAsButton)}>
      {children}
      {icon}
    </button>
  );
}
