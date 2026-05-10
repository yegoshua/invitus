"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FadeUp } from "@/components/ui/fade-up";
import { faqItems } from "@/content/faq";

export function FAQSection() {
  return (
    <section className="bg-black lg:pt-45 lg:pb-4 pb-4 relative mt-20 lg:mt-0">
      <div className="container-main">
        {/* Heading */}
        <FadeUp className="text-center mb-10 lg:mb-20">
          <h2 className="font-heading sm:text-center text-left text-h2 font-bold text-white">
            Щось неясно? Розповідаємо як є
          </h2>
        </FadeUp>
      </div>

      {/* Accordion */}
      <div className="container-main [--container-px:0.5rem] sm:[--container-px:0.75rem] lg:[--container-px:clamp(1rem,5vw,2rem)]">
        <FadeUp delay={0.2}>
          <Accordion type="single" collapsible className="space-y-4">
            {faqItems.map((item, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-surface rounded-3xl border-none overflow-hidden"
              >
                <AccordionTrigger className="font-heading text-white text-left text-base lg:text-2xl font-bold hover:no-underline px-6 py-5 data-[state=open]:max-lg:pb-3 lg:p-12 data-[state=open]:lg:pb-4">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-white text-base lg:text-lg lg:px-12 px-6 pb-5 lg:pb-12">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </FadeUp>
      </div>
    </section>
  );
}
