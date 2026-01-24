"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, MotionValue } from "framer-motion";

const features = [
  {
    id: 1,
    title: "Фіксація в один клік",
    description:
      "Забудь про метушню з пряжками. Посилена сталь тримає мертво, щоб ти думав про вагу, а не про екіп.",
  },
  {
    id: 2,
    title: "Преміум матеріали",
    description:
      "Натуральна шкіра товщиною 13мм витримує будь-які навантаження. Пояс, який переживе твої рекорди.",
  },
  {
    id: 3,
    title: "Ергономічний дизайн",
    description:
      "Анатомічна форма ідеально лягає на тіло. Жодного дискомфорту навіть на найважчих підходах.",
  },
  {
    id: 4,
    title: "Зроблено в Україні",
    description:
      "Підтримуй своїх. Кожен пояс створений українськими майстрами з любов'ю до деталей.",
  },
];

export function WhySection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  return (
    <div className="bg-black p-2 sm:p-3 lg:p-4">
      <div
        ref={containerRef}
        className="relative bg-coral rounded-2xl lg:rounded-3xl"
        style={{ height: "250vh" }}
      >
        <div className="sticky top-0 h-screen overflow-hidden">
          <div className="container-main relative z-10 h-full flex flex-col py-16 lg:py-24">
            {/* Heading - Top Left */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="font-druk text-[32px] lg:text-[40px] font-bold text-black leading-[1.1] max-w-xl"
            >
              Чому наші пояси —
              <br />
              це база
            </motion.h2>

            {/* Feature Cards - Right Side */}
            <div className="flex-1 flex justify-end items-center">
              <div className="relative w-full max-w-[576px] h-[500px] lg:h-[720px] overflow-hidden rounded-[32px] lg:rounded-[40px]">
                {features.map((feature, index) => (
                  <FeatureCard
                    key={feature.id}
                    feature={feature}
                    index={index}
                    total={features.length}
                    scrollYProgress={scrollYProgress}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  feature: {
    id: number;
    title: string;
    description: string;
  };
  index: number;
  total: number;
  scrollYProgress: MotionValue<number>;
}

function FeatureCard({
  feature,
  index,
  total,
  scrollYProgress,
}: FeatureCardProps) {
  // Each card has its own segment of the scroll
  const segmentSize = 1 / total;
  const start = index * segmentSize;
  const enterEnd = start + segmentSize * 0.5; // Card fully visible at 50% of its segment

  // When next card starts entering
  const nextStart = (index + 1) * segmentSize;
  const exitEnd = nextStart + segmentSize * 0.5;

  // Incoming animation - slide up from bottom
  const y = useTransform(
    scrollYProgress,
    index === 0 ? [0, 1] : [start, enterEnd],
    index === 0 ? ["0%", "0%"] : ["100%", "0%"],
    { clamp: true }
  );

  // Scale animation - starts slightly smaller, grows to full, then shrinks when replaced
  const scale = useTransform(
    scrollYProgress,
    index === 0
      ? index === total - 1
        ? [0, 1]
        : [0, nextStart, exitEnd]
      : index === total - 1
        ? [start, enterEnd]
        : [start, enterEnd, nextStart, exitEnd],
    index === 0
      ? index === total - 1
        ? [1, 1]
        : [1, 1, 0.9]
      : index === total - 1
        ? [0.95, 1]
        : [0.95, 1, 1, 0.9],
    { clamp: true }
  );

  // Exit animation - blur when next card comes
  const blur = useTransform(
    scrollYProgress,
    index === total - 1 ? [0, 1] : [nextStart, exitEnd],
    index === total - 1 ? [0, 0] : [0, 8],
    { clamp: true }
  );

  // Exit animation - fade slightly when next card comes
  const opacity = useTransform(
    scrollYProgress,
    index === total - 1 ? [0, 1] : [nextStart, exitEnd],
    index === total - 1 ? [1, 1] : [1, 0.6],
    { clamp: true }
  );

  return (
    <motion.div
      style={{
        y,
        zIndex: index + 1,
      }}
      className="absolute inset-0 will-change-transform"
    >
      <motion.div
        style={{
          scale,
          opacity,
          filter: useTransform(blur, (v) => `blur(${v}px)`),
        }}
        className="w-full h-full will-change-transform origin-center"
      >
        {/* Main card */}
        <div className="relative bg-black rounded-[32px] lg:rounded-[40px] p-8 lg:p-12 h-full flex flex-col justify-center">
          <h3 className="font-druk text-xl lg:text-2xl font-bold text-white mb-4">
            {feature.title}
          </h3>
          <p className="text-neutral-400 text-base lg:text-lg leading-relaxed max-w-sm">
            {feature.description}
          </p>

          {/* Card indicator */}
          <div className="absolute bottom-8 left-8 lg:bottom-12 lg:left-12 flex gap-2">
            {Array.from({ length: total }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i === index ? "bg-coral" : "bg-neutral-700"
                }`}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
