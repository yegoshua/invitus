"use client";

import Image from "next/image";
import { FadeUp } from "@/components/ui/fade-up";
import { serviceBenefits } from "@/content/benefits";

export function BenefitsGrid() {
  return (
    <section className="bg-black pb-10 md:pb-30">
      <div className="container-main [--container-px:0.5rem] sm:[--container-px:0.75rem] lg:[--container-px:clamp(1.5rem,5vw,2rem)]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {serviceBenefits.map((benefit, index) => (
            <FadeUp
              key={benefit.title}
              duration={0.5}
              delay={index * 0.1}
              className="bg-surface rounded-[24px] lg:rounded-[32px] px-6 py-10 lg:p-12 text-center flex flex-col items-center gap-6"
            >
              <div className="flex justify-center">
                <Image
                  src={benefit.icon}
                  alt={benefit.title}
                  width={48}
                  height={48}
                  className="w-12 h-12"
                />
              </div>
              <div>
                <h3 className="font-heading font-bold text-white mb-3">
                  {benefit.title}
                </h3>
                <p className="text-white text-base leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
