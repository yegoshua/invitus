"use client";

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

interface ProductInfoAccordionProps {
  description: string;
  howToMeasure: string;
  careInstructions: string;
}

export function ProductInfoAccordion({
  description,
  howToMeasure,
  careInstructions,
}: ProductInfoAccordionProps) {
  const items = [
    { id: "description", title: "Опис товару", content: description },
    { id: "measure", title: "Як правильно виміряти?", content: howToMeasure },
    {
      id: "care",
      title: "Інструкція з догляду",
      content: careInstructions,
    },
  ];

  return (
    <Accordion type="single" collapsible className="flex flex-col gap-4">
      {items.map((item) => (
        <AccordionItem
          key={item.id}
          value={item.id}
          className="bg-[#0000007A] backdrop-blur-sm rounded-2xl border-none px-5"
        >
          <AccordionTrigger className="text-white font-heading text-base leading-6 font-bold tracking-[0.03em] py-6 cursor-pointer">
            {item.title}
          </AccordionTrigger>
          <AccordionContent className="text-neutral-300 text-sm leading-relaxed">
            {item.content}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
