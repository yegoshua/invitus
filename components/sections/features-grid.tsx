"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import CardDistortion from "@/components/sections/benefit-card-image-bg.png";
import { featureCards, type FeatureCard } from "@/content/features";
import { cn } from "@/lib/utils";

// Cards always fly in from the outside towards the centre.
//
// The direction can't come from the DOM index alone: on lg the grid re-orders
// cards via `lg:order-N`, so index 2 can sit in the right column while index 3
// sits in the left. Driving the offset off the index made that pair animate
// outwards from the centre instead of into it.
//
// So the offset is a CSS variable set per breakpoint — mobile keeps the
// original alternating slide-in (single column), lg derives the column from the
// order number: odd order → left column, even order → right column. Pure CSS,
// so it stays correct on resize with no hydration mismatch.
function enterOffsetClasses(index: number, lgOrder: string): string {
  const mobile = index % 2 === 0 ? "[--enter-x:-100px]" : "[--enter-x:100px]";
  const order = orderOf(index, lgOrder);
  const desktop =
    order % 2 === 1 ? "lg:[--enter-x:-100px]" : "lg:[--enter-x:100px]";
  return `${mobile} ${desktop}`;
}

function orderOf(index: number, lgOrder: string): number {
  return Number(lgOrder.match(/(\d+)$/)?.[1] ?? index + 1);
}

// Stagger, same story: the DOM index is not the visual position on lg, so it
// made the pair land out of sync. On lg both cards of a row share one delay so
// they meet in the centre together, and rows follow each other. Mobile is a
// single column, so cards keep flying in one after another.
//
// Unlike `initial`, `transition` is read when the animation fires (on scroll),
// so a JS breakpoint check is safe here — it has long settled by then.
function enterDelay(index: number, lgOrder: string, isDesktop: boolean): number {
  if (!isDesktop) return index * 0.1;
  const row = Math.floor((orderOf(index, lgOrder) - 1) / 2);
  return row * 0.15;
}

export function FeaturesGrid() {
  // Matches the `lg:` breakpoint the grid switches to two columns at.
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <section className="bg-black pt-20 lg:pt-45 overflow-hidden">
      <div className="container-main [--container-px:0.5rem] sm:[--container-px:0.75rem] lg:[--container-px:clamp(1rem,5vw,2rem)]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-10 md:mb-16"
        >
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl text-left md:text-center font-bold text-white mb-4">
            Ми знаємо, що тобі потрібно
          </h2>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-4">
          {featureCards.map((card, index) => (
            <motion.div
              key={card.kind === "stat" ? card.title : `image-${index}`}
              initial={{ opacity: 0, y: 0, x: "var(--enter-x)" }}
              whileInView={{ opacity: 1, y: 0, x: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.6,
                delay: enterDelay(index, card.lgOrder, isDesktop),
              }}
              className={cn(
                "relative group",
                card.lgOrder,
                enterOffsetClasses(index, card.lgOrder)
              )}
            >
              <FeatureCardView card={card} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCardView({ card }: { card: FeatureCard }) {
  if (card.kind === "image") {
    return (
      <div className="relative bg-coral rounded-4xl lg:rounded-[40px] h-[468px] md:h-[620px] lg:h-[770px] flex items-center justify-center overflow-hidden">
        <Image src={card.image} alt="" className="w-full h-full object-contain" />
      </div>
    );
  }

  const NumberSvg = card.number;

  return (
    <div className="relative bg-surface rounded-4xl lg:rounded-[40px] p-6 md:p-20 h-[468px] md:h-[620px] lg:h-[770px] overflow-hidden">
      {/* Big background number */}
      <div className="absolute inset-x-0 bottom-0 flex justify-center min-[744px]:justify-start pointer-events-none">
        <NumberSvg
          className="w-full h-auto select-none"
          style={
            card.scaleY
              ? { transform: `scaleY(${card.scaleY})`, transformOrigin: "bottom" }
              : undefined
          }
        />
      </div>

      {/* Distortion overlay — above number, below text */}
      <Image
        src={CardDistortion}
        alt=""
        fill
        className="object-cover pointer-events-none z-10"
      />

      {/* Text content — above distortion */}
      <div className="relative z-20 flex flex-col h-full">
        {card.eyebrow && (
          <p className="text-xs lg:text-sm font-bold uppercase tracking-wider text-white/60 mb-3">
            {card.eyebrow}
          </p>
        )}
        <h3 className="font-heading text-xl lg:text-2xl font-bold text-white mb-3 md:mb-4">
          {card.title}
        </h3>
        <div className="space-y-4 text-white leading-relaxed">
          {card.description.map((paragraph, i) => (
            <p key={i} className="text-base lg:text-lg">{paragraph}</p>
          ))}
        </div>
      </div>
    </div>
  );
}