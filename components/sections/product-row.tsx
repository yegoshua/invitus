"use client";

import { CTALink } from "@/components/ui/cta-link";
import { ProductScrollGrid } from "@/components/ui/product-scroll-grid";
import { FadeUp } from "@/components/ui/fade-up";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

interface ProductRowProps {
  products?: Product[];
  title?: string;
  ctaHref: string;
  ctaLabel: string;
  className?: string;
  titleClassName?: string;
  gridWrapperClassName?: string;
  ctaClassName?: string;
  rounded?: boolean;
}

export function ProductRow({
  products = [],
  title,
  ctaHref,
  ctaLabel,
  className,
  titleClassName,
  gridWrapperClassName,
  ctaClassName,
  rounded = false,
}: ProductRowProps) {
  if (products.length === 0) return null;

  const content = (
    <>
      {title && (
        <FadeUp className={cn("container-main", titleClassName)}>
          <h2 className="font-heading text-h2 font-bold text-white">{title}</h2>
        </FadeUp>
      )}

      <div className={gridWrapperClassName}>
        <ProductScrollGrid products={products} />
      </div>

      <FadeUp delay={0.4} className="container-main text-center">
        <CTALink
          href={ctaHref}
          variant="outline"
          size="large"
          color="coral"
          className={ctaClassName}
        >
          {ctaLabel}
        </CTALink>
      </FadeUp>
    </>
  );

  if (rounded) {
    return (
      <div className="bg-black p-2 sm:p-3 lg:p-4">
        <section className={cn("relative overflow-hidden rounded-section", className)}>
          <div className="relative z-10">{content}</div>
        </section>
      </div>
    );
  }

  return <section className={cn("bg-black", className)}>{content}</section>;
}
