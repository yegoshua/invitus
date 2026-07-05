// FeaturesGrid content (alternating image cards + numbered stat cards).
// `image` cards are pure illustration; `stat` cards have number + copy.

import FeatureImage1 from "@/public/assets/Landing Image 1.svg";
import FeatureImage2 from "@/public/assets/Landing Image 2.svg";
import FeatureImage3 from "@/public/assets/Landing Image 3.svg";
import Stat5Percent from "@/public/assets/icons/stat-5-percent.svg";
import Stat3x from "@/public/assets/icons/stat-3x.svg";
import Stat10 from "@/public/assets/icons/stat-10.svg";
import type { StaticImageData } from "next/image";
import type { FC, SVGProps } from "react";

export type FeatureCard =
  | {
      kind: "image";
      image: StaticImageData;
      lgOrder: string;
    }
  | {
      kind: "stat";
      eyebrow?: string;
      number: FC<SVGProps<SVGSVGElement>>;
      /** Vertical scale factor for shorter glyphs so they read closer in height to "10" (e.g. 1.2 = +20%). */
      scaleY?: number;
      title: string;
      description: string[];
      lgOrder: string;
    };

export const featureCards: FeatureCard[] = [
  { kind: "image", image: FeatureImage1, lgOrder: "lg:order-1" },
  {
    kind: "stat",
    number: Stat5Percent,
    scaleY: 1.2,
    title: "Плюс 5% до рекорду",
    description: [
      "Пояс — це не «чарівна» пігулка, яка зробить тебе новим Арнольдом.",
      "Але за рахунок підвищення внутрішньочеревного тиску точно збільшить власний рекорд.",
    ],
    lgOrder: "lg:order-2",
  },
  { kind: "image", image: FeatureImage2, lgOrder: "lg:order-4" },
  {
    kind: "stat",
    eyebrow: "3Х МЕНШЕ НАВАНТАЖЕННЯ",
    number: Stat3x,
    scaleY: 1.1,
    title: "Захист попереку",
    description: [
      "Якось нам написали коментар, що «ремонт» грижі коштує дешевше, ніж атлетичний пояс.",
      "Ми не сперечались. Просто не в курсі цін на лікування, оскільки завжди тренуємось у поясі.",
    ],
    lgOrder: "lg:order-3",
  },
  { kind: "image", image: FeatureImage3, lgOrder: "lg:order-5" },
  {
    kind: "stat",
    eyebrow: "10 РІЗНИХ ВАРІАНТІВ В ЛІНІЙЦІ",
    number: Stat10,
    title: "Стиль у дзеркалі",
    description: [
      "У сучасному світі соцмереж є речі, які сприяють більшої кількості лайків на фото.",
      "І якщо якісний памп залежить від вас, то стиль на фото беремо повністю на себе.",
    ],
    lgOrder: "lg:order-6",
  },
];
