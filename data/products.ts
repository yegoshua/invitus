import type { Product } from "@/types";

export interface ProductDetail extends Product {
  sizes: string[];
  description: string;
  howToMeasure: string;
  careInstructions: string;
  heroImage: string;
  bgImage: string;
  galleryImages: { src: string; alt: string }[];
}

export const products: ProductDetail[] = [
  {
    id: "belt-classic-1",
    name: "Akatsuki Lifting Belt",
    slug: "belt-classic",
    price: 2800,
    category: "belts",
    images: [
      {
        url: "/assets/img/procunt-image-belt.png",
        alt: "Пояс Akatsuki — вигляд спереду",
      },
    ],
    sizes: ["65-80 см", "72.5-90 см", "80-100 см"],
    description:
      "Атлетичний пояс INVITUS Akatsuki створений для максимальної підтримки під час важких присідань та тяг. Виготовлений із натуральної шкіри товщиною 10 мм, із застібкою на важелі для швидкого та надійного фіксування. Унікальний дизайн натхненний японською естетикою.",
    howToMeasure:
      "Виміряйте обхват талії на рівні пупка звичайною сантиметровою стрічкою. Стрічка має щільно прилягати, але не стискати. Порівняйте результат із розмірною таблицею на сайті. Якщо ваш розмір між двома — оберіть більший.",
    careInstructions:
      "Протирайте пояс вологою ганчіркою після кожного тренування. Не замочуйте у воді та не прасуйте. Зберігайте у розправленому вигляді за кімнатної температури, уникайте прямих сонячних променів. Періодично обробляйте шкіру спеціальним кремом.",
    heroImage: "/assets/img/procunt-image-belt.png",
    bgImage: "/assets/img/product_bg.png",
    galleryImages: [
      { src: "/assets/img/item-img-1.png", alt: "Пояс Akatsuki — вигляд спереду" },
      { src: "/assets/img/item-img-2.png", alt: "Пояс Akatsuki — вигляд збоку" },
    ],
  },
];

export function getProductBySlug(slug: string): ProductDetail | undefined {
  return products.find((p) => p.slug === slug);
}
