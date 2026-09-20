// Content for the «Покупка частинами» page and the FAQ entry that points at it.
// Static today; if migrated to CMS, swap this file for a fetcher.
//
// The numbers come from lib/installments.ts so the page can never promise a
// plan the checkout does not offer.

import { formatPrice } from "@/lib/format";
import { PARTS_MIN_TOTAL, PARTS_OPTIONS } from "@/lib/installments";
import type { FAQItem } from "./faq";

const minTotal = `${formatPrice(PARTS_MIN_TOTAL)} ₴`;
const plans = PARTS_OPTIONS.join(", ").replace(/, (\d+)$/, " або $1");

/** The one FAQ answer, reused on the homepage and product page FAQ. */
export const installmentsFaqItem: FAQItem = {
  question: "Чи можна оплатити частинами?",
  answer: `Так, через Покупку Частинами monobank — це безкоштовна розстрочка без комісій, доступна для замовлень від ${minTotal} на ${plans} платежів. Перший платіж списується під час оформлення, решта — рівними частинами щомісяця. Обирай цей спосіб на чекауті й підтверди покупку в застосунку mono.`,
};

export const installmentsSteps: FAQItem[] = [
  {
    question: "Як це працює?",
    answer: `На сторінці товару натисни «Від … ₴ / міс» або обери «Оплата частинами monobank» на чекауті й кількість платежів — ${plans}. Після оформлення в застосунок mono прийде запит на підтвердження. Підтверди його — і перший платіж спишеться одразу, а замовлення піде в роботу.`,
  },
  {
    question: "Скільки це коштує?",
    answer:
      "Нічого зверху. Покупка частинами monobank для покупця без відсотків і без комісій: сума замовлення просто ділиться на рівні платежі. Комісію банку сплачуємо ми.",
  },
  {
    question: "Кому доступно?",
    answer: `Клієнтам monobank з українським номером телефону, у яких є ліміт на покупку частинами в застосунку. Мінімальна сума замовлення — ${minTotal}. Ліміт і рішення — на боці банку: якщо він відмовить, ти побачиш причину одразу й зможеш обрати інший спосіб оплати.`,
  },
  {
    question: "Коли списуються платежі?",
    answer:
      "Перший — у момент підтвердження в застосунку mono. Наступні — щомісяця, автоматично з картки monobank. Графік і залишок завжди видно в застосунку.",
  },
  {
    question: "Що з поверненням?",
    answer:
      "Умови повернення ті самі, що й для будь-якої оплати — дивись сторінку «Повернення товару». Після повернення екіпу ми закриваємо розстрочку в monobank, і банк повертає списані платежі на картку.",
  },
];
