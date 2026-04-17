"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const benefits = [
  {
    icon: "/assets/icons/support.svg",
    title: "Підтримка",
    description: "Допоможемо, навіть якщо на годиннику вже 18:01",
  },
  {
    icon: "/assets/icons/delivery.svg",
    title: "Доставка",
    description: "Зробимо відправлення, навіть якщо на вулиці спека 40 градусів",
  },
  {
    icon: "/assets/icons/return-back.svg",
    title: "Повернення",
    description: "Віддамо гроші назад, навіть якщо вже пройшло 15 днів",
  },
];

export function BenefitsGrid() {
  return (
    <section className="bg-black pb-10 md:pb-30">
      <div className="container-main [--container-px:0.5rem] sm:[--container-px:0.75rem] lg:[--container-px:clamp(1.5rem,5vw,2rem)]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
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
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
