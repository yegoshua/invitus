"use client";

import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

interface ProductInfoAccordionProps {
  description?: string;
  howToMeasure?: string;
  careInstructions?: string;
  itemClassName?: string;
}

export function ProductInfoAccordion({
  description,
  howToMeasure,
  careInstructions,
  itemClassName,
}: ProductInfoAccordionProps) {
  const items = [
    { id: "description", title: "Опис товару", content: description },
    { id: "measure", title: "Як правильно виміряти?", content: howToMeasure },
    {
      id: "care",
      title: "Інструкція з догляду",
      content: careInstructions,
    },
  ].filter((item) => item.content);

  return (
    <Accordion type="single" collapsible className="flex flex-col gap-4">
      {items.map((item) => (
        <AccordionItem
          key={item.id}
          value={item.id}
          className={cn("bg-[#0000007A] backdrop-blur-sm rounded-3xl border-none px-5", itemClassName)}
        >
          <AccordionTrigger className="text-white font-heading text-base leading-6 font-bold tracking-[0.03em] py-6 cursor-pointer">
            {item.title}
          </AccordionTrigger>
          <AccordionContent className="text-sm leading-relaxed">
            {item.content}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
