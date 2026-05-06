// "Service benefits" trio shown in BenefitsGrid (support / delivery / returns).

export interface ServiceBenefit {
  icon: string;
  title: string;
  description: string;
}

export const serviceBenefits: ServiceBenefit[] = [
  {
    icon: "/assets/icons/support-icon.svg",
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
