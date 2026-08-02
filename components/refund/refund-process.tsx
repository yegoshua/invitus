"use client";

import { FadeUp } from "@/components/ui/fade-up";
import { refundConditions, refundSteps } from "@/content/refund";
import CheckIcon from "@/public/assets/icons/refund/check-icon.svg";
import IconOne from "@/public/assets/icons/refund/icon-one.svg";
import IconTwo from "@/public/assets/icons/refund/icon-two.svg";
import IconThree from "@/public/assets/icons/refund/icon-three.svg";

// Paired to refundSteps by index.
const stepIcons = [IconOne, IconTwo, IconThree];

// Turns any email address inside a string into a mailto link.
const EMAIL_RE = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
function withEmailLinks(text: string) {
  return text.split(EMAIL_RE).map((part, i) =>
    EMAIL_RE.test(part) ? (
      <a
        key={i}
        href={`mailto:${part}`}
        className="underline underline-offset-2 hover:text-coral transition-colors"
      >
        {part}
      </a>
    ) : (
      part
    )
  );
}

export function RefundProcess() {
  return (
    <section className="bg-black pt-20 lg:pt-40 pb-10 lg:pb-45">
      {/* Heading */}
      <div className="container-main">
        <FadeUp className="mb-10">
          <h2 className="font-heading text-h2 font-bold text-white text-left md:text-center">
            Як повернути екіп?
          </h2>
        </FadeUp>
      </div>

      <div className="container-main [--container-px:0.5rem] sm:[--container-px:0.75rem] lg:[--container-px:clamp(1rem,5vw,2rem)]">
        {/* Conditions the gear must meet */}
        <div className="space-y-4">
          {refundConditions.map((condition, index) => (
            <FadeUp
              key={condition.title}
              delay={index * 0.1}
              className="bg-surface rounded-3xl p-6 lg:p-10 flex items-start lg:items-center gap-4 lg:gap-6"
            >
              {/* mt keeps the icon on the first line of the title while the card is top-aligned */}
              <CheckIcon className="w-7 h-7 lg:w-8 lg:h-8 shrink-0 mt-0.5 lg:mt-0" />
              {/* min-w-0 lets the column shrink; long Ukrainian words otherwise push past the card padding */}
              <div className="min-w-0">
                <h3 className="font-heading text-2xl leading-8 tracking-[0.02em] font-bold text-white mb-2 lg:mb-3 break-words">
                  {condition.title}
                </h3>
                <p className="text-white font-medium text-xl leading-7 tracking-[0.01em]">
                  {condition.description}
                </p>
              </div>
            </FadeUp>
          ))}
        </div>

        {/* Three-step return flow */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {refundSteps.map((step, index) => {
            const StepIcon = stepIcons[index];
            return (
            <FadeUp
              key={step.title}
              delay={index * 0.1}
              className="bg-surface rounded-[24px] lg:rounded-[32px] px-6 py-10 lg:p-12 text-center flex flex-col items-center"
            >
              <StepIcon className="w-10 h-10 shrink-0 mb-6" />
              <h3 className="font-heading text-base leading-6 tracking-[0.03em] font-bold text-white text-center mb-3">
                {step.title}
              </h3>
              <p className="text-white text-base leading-relaxed">
                {withEmailLinks(step.description)}
              </p>
            </FadeUp>
            );
          })}
        </div>
      </div>
    </section>
  );
}
