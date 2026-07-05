"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import CardDistortion from "@/components/sections/benefit-card-image-bg.png";
import { featureCards, type FeatureCard } from "@/content/features";

export function FeaturesGrid() {
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
              initial={{ opacity: 0, y: 0, x: index % 2 !== 0 ? 100 : -100 }}
              whileInView={{ opacity: 1, y: 0, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={`relative group ${card.lgOrder}`}
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