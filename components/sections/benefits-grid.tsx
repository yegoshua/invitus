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
    <section className="bg-black pb-32">
      <div className="container-main">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-[#212121] rounded-[32px] p-8 lg:p-12 text-center h-[358px] flex flex-col justify-center"
            >
              <div className="flex justify-center mb-6">
                <Image
                  src={benefit.icon}
                  alt={benefit.title}
                  width={48}
                  height={48}
                  className="w-12 h-12"
                />
              </div>
              <div className="max-w-74.5 w-full self-center">
                <h3 className="font-druk font-bold italic text-white mb-3">
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
