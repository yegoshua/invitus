"use client";

import { FadeUp } from "@/components/ui/fade-up";
import { refundGuarantees } from "@/content/refund";
import TimeIcon from "@/public/assets/icons/refund/time-icon.svg";
import DeliveryIcon from "@/public/assets/icons/refund/delivery-icon.svg";
import MoneyIcon from "@/public/assets/icons/refund/money-icon.svg";

// Paired to refundGuarantees by index.
const guaranteeIcons = [TimeIcon, DeliveryIcon, MoneyIcon];

export function RefundGuarantees() {
  return (
    <section className="bg-black">
      <div className="container-main [--container-px:0.5rem] sm:[--container-px:0.75rem] lg:[--container-px:clamp(1rem,5vw,2rem)]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {refundGuarantees.map((guarantee, index) => {
            const Icon = guaranteeIcons[index];
            return (
              <FadeUp
                key={guarantee.title}
                duration={0.5}
                delay={index * 0.1}
                className="bg-surface rounded-[24px] lg:rounded-[32px] px-6 py-10 lg:p-12 text-center flex flex-col items-center gap-6"
              >
                <Icon className="w-10 h-10 lg:w-12 lg:h-12 shrink-0" />
                <div>
                  <h3 className="font-heading text-base leading-6 tracking-[0.03em] font-bold text-white text-center mb-3">
                    {guarantee.title}
                  </h3>
                  <p className="text-white text-base leading-relaxed">
                    {guarantee.description}
                  </p>
                </div>
              </FadeUp>
            );
          })}
        </div>
      </div>
    </section>
  );
}
