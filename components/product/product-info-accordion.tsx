"use client";

import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import type { ProductInfoItem } from "./product-info-items";

interface ProductInfoAccordionProps {
  items: ProductInfoItem[];
  /**
   * `compact` is the hero card's translucent panel (and the mobile stack);
   * `wide` is the full-width row under the photos on desktop, sized like the
   * FAQ section so the two read as one system.
   */
  variant?: "compact" | "wide";
  itemClassName?: string;
  className?: string;
}

export function ProductInfoAccordion({
  items,
  variant = "compact",
  itemClassName,
  className,
}: ProductInfoAccordionProps) {
  if (items.length === 0) return null;

  const wide = variant === "wide";

  return (
    <Accordion
      type="single"
      collapsible
      className={cn("flex flex-col gap-4", className)}
    >
      {items.map((item) => (
        <AccordionItem
          key={item.id}
          value={item.id}
          className={cn(
            "rounded-3xl border-none",
            wide
              ? "bg-surface px-6 lg:px-12"
              : "bg-[#0000007A] backdrop-blur-sm px-6",
            itemClassName
          )}
        >
          <AccordionTrigger
            className={cn(
              "text-white font-heading font-bold cursor-pointer hover:no-underline",
              wide
                ? "text-base leading-6 tracking-[0.03em] py-5 lg:text-2xl lg:leading-8 lg:tracking-[0.02em] lg:py-10 data-[state=open]:lg:pb-4"
                : "text-base leading-6 tracking-[0.02em] lg:tracking-[0.03em] py-5 lg:py-6"
            )}
          >
            {item.title}
          </AccordionTrigger>
          <AccordionContent
            className={cn(
              // Strapi long-text keeps its paragraph breaks as blank lines.
              "text-white text-base lg:text-lg whitespace-pre-line",
              wide ? "pb-5 lg:pb-12" : "pb-5 lg:pb-6"
            )}
          >
            {item.content}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
