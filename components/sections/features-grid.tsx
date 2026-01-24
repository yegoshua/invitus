"use client";

import { motion } from "framer-motion";
import { Dumbbell, Shield, Clock, LucideProps } from "lucide-react";
import FeatureImage1 from "@/public/assets/Landing Image 1.png";
import FeatureImage2 from "@/public/assets/Landing Image 2.png";
import FeatureImage3 from "@/public/assets/Landing Image 3.png";
import Image, { StaticImageData } from "next/image";
import { ForwardRefExoticComponent, ReactNode, RefAttributes } from "react";
import { Pointer } from "../ui/pointer";

type TFeature = {
  image?: StaticImageData;
  color: string;
  number?: string;
  title?: string;
  description?: string;
  icon?: ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>
  >;
};

const FEATURES: TFeature[] = [
  {
    image: FeatureImage1,
    color: "bg-coral",
  },
  {
    number: "20",
    title: "+20 кг до рекорду",
    description:
      "Правильна фіксація корпусу допомагає підняти більше. Наші атлети регулярно б'ють особисті рекорди.",
    icon: Dumbbell,
    color: "bg-neutral-800",
  },
  {
    number: "13",
    title: "Залізний захист попереку",
    description:
      "13-міліметрова товщина забезпечує максимальний захист поперекового відділу під час важких підходів.",
    icon: Shield,
    color: "bg-neutral-800",
  },
  {
    image: FeatureImage2,
    color: "bg-coral",
  },
  {
    image: FeatureImage3,
    color: "bg-coral",
  },
  {
    number: "10",
    title: "10 років гарантії",
    description:
      "Ми настільки впевнені в якості наших виробів, що даємо розширену гарантію на всі пояси.",
    icon: Clock,
    color: "bg-neutral-800",
  },
];

export function FeaturesGrid() {
  return (
    <section className="bg-black py-20 lg:py-32 overflow-hidden">
      <div className="container-main">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            Ми знаємо, що тобі потрібно
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={feature.title ?? index}
              initial={{ opacity: 0, y: 0, x: index % 2 !== 0 ? 100 : -100 }}
              whileInView={{ opacity: 1, y: 0, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.4 }}
              className="relative group"
            >
              <FeatureCard feature={feature} />
              <Pointer>
                <motion.div
                  animate={{
                    scale: [0.8, 1, 0.8],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <div className="text-5xl">💪</div>
                </motion.div>
              </Pointer>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ feature }: { feature: TFeature }) {
  if (feature.image) {
    return (
      <div
        className={`relative bg-coral rounded-2xl p-8 lg:p-10 h-full transition-transform duration-300 group-hover:-translate-y-2`}
      >
        <div className="flex flex-col h-full">
          <div className={`p-3 rounded-xl w-fit mb-6`}>
            <Image src={feature.image} alt="test" />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div
      className={`relative ${feature.color} rounded-2xl p-8 lg:pt-32 h-full transition-transform duration-300 group-hover:-translate-y-2 overflow-hidden`}
    >
      <div className="flex flex-col h-full max-w-md">
        <h3 className="font-display text-xl lg:text-2xl font-bold text-white mb-4">
          {feature.title}
        </h3>

        <p
          className={`${
            feature.color === "bg-coral" ? "text-white/80" : "text-neutral-400"
          } leading-relaxed`}
        >
          {feature.description}
        </p>
        <div className="absolute -bottom-20 -left-24 pointer-events-none">
          <span className="font-display text-[120px] lg:text-[500px] font-bold text-white/5 leading-none select-none">
            {feature.number}
          </span>
        </div>
      </div>
    </div>
  );
}
