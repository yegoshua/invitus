"use client";

import { motion } from "motion/react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Pointer } from "@/components/ui/pointer";

const faqItems = [
  {
    question: "Чи можлива доставка закордон?",
    answer:
      "Так, ми здійснюємо доставку в усі країни світу. Для міжнародної доставки використовуємо Укрпошту та приватних перевізників. Вартість та терміни залежать від країни призначення.",
  },
  {
    question: "Чи можна замовити пояс з власним дизайном?",
    answer:
      "Так! Ми пропонуємо послугу кастомізації. Ви можете обрати колір поясу, тип застібки та додати персональну вишивку. Для замовлення кастомного поясу зв'яжіться з нами через Telegram.",
  },
  {
    question: "Як правильно підібрати розмір поясу?",
    answer:
      "Виміряйте обхват талії в тому місці, де ви плануєте носити пояс (зазвичай на рівні пупка). Порівняйте результат з нашою розмірною сіткою на сторінці товару. Якщо ви між розмірами — оберіть менший для щільнішої фіксації.",
  },
  {
    question: "Коли з'являться в наявності нові товари?",
    answer:
      "Ми регулярно поповнюємо асортимент. Підпишіться на наш Telegram-канал або Instagram, щоб першими дізнаватись про нові надходження та акції.",
  },
  {
    question: "Як з вами зв'язатися?",
    answer:
      "Найшвидший спосіб — написати нам у Telegram @invitus_ua. Також ви можете надіслати email на info@invitus.ua або написати в Direct в Instagram. Ми відповідаємо протягом кількох годин.",
  },
];

export function FAQSection() {
  return (
    <section className="bg-black py-20 lg:py-32 lg:pb-4 pb-4 relative">
      {/* Custom cursor */}
      <Pointer>
        <motion.div
          className="text-4xl"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          ❓
        </motion.div>
      </Pointer>

      <div className="container-main">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 lg:mb-16"
        >
          <h2 className="font-heading text-[32px] lg:text-[40px] font-bold text-white">
            Щось неясно? Розповідаємо як є
          </h2>
        </motion.div>

        {/* Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqItems.map((item, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-[#212121] rounded-2xl lg:rounded-3xl border-none overflow-hidden"
              >
                <AccordionTrigger className="font-heading text-white text-left text-xl lg:text-2xl font-bold hover:no-underline p-8 lg:p-12 cursor-none">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-neutral-400 text-base lg:text-lg px-8 lg:px-12 pb-8 lg:pb-12">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
