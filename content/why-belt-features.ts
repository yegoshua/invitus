// "Why our belts" scroll-pinned section content.

export interface BeltFeature {
  id: number;
  title: string;
  description: string;
}

export const beltFeatures: BeltFeature[] = [
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
