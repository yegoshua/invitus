// Search-facing copy for <title> and <meta name="description">.
//
// KeyCRM names are what the shop calls things ("Final Selection Lifting Belt",
// "Лямки Вісімки"); people search for what the thing is for ("пояс для
// пауерліфтингу"). These builders put the second next to the first. Keyed by
// the site's category slug — the one lib/api.ts maps KeyCRM ids to — so a
// renamed KeyCRM category keeps its phrase, and a category with no phrase here
// falls back to its own name rather than borrowing another's.

import type { Category } from "../types/index.ts";

const BRAND = "INVITUS";

interface CategoryPhrases {
  /** Singular, as a product is searched for: "пояс для пауерліфтингу". */
  product: string;
  /** Plural heading for the category page: "Атлетичні пояси для пауерліфтингу". */
  category: string;
}

const PHRASES_BY_CATEGORY: Record<string, CategoryPhrases> = {
  belts: {
    product: "пояс для пауерліфтингу",
    category: "Атлетичні пояси для пауерліфтингу",
  },
  "wrist-wraps": {
    product: "кистьові бинти для пауерліфтингу",
    category: "Кистьові бинти для пауерліфтингу",
  },
  "knee-sleeves": {
    product: "наколінники для пауерліфтингу",
    category: "Наколінники для пауерліфтингу",
  },
  straps: {
    product: "лямки для станової тяги",
    category: "Лямки для станової тяги",
  },
};

type CategoryRef = Pick<Category, "slug" | "name">;

/** "Final Selection Lifting Belt — пояс для пауерліфтингу | INVITUS" */
export function productMetaTitle(name: string, categorySlug?: string): string {
  const phrase = categorySlug ? PHRASES_BY_CATEGORY[categorySlug]?.product : undefined;
  return phrase ? `${name} — ${phrase} | ${BRAND}` : `${name} | ${BRAND}`;
}

/** "Атлетичні пояси для пауерліфтингу — купити | INVITUS" */
export function categoryMetaTitle(category: CategoryRef): string {
  const heading = PHRASES_BY_CATEGORY[category.slug]?.category ?? category.name;
  return `${heading} — купити | ${BRAND}`;
}

/**
 * Only promises every product in the category is covered by: Nova Poshta
 * delivery, online payment or cash on delivery, the 14-day return on /refund.
 * Instalments are left out on purpose — they start at PARTS_MIN_TOTAL, which
 * most of the catalogue sits below.
 */
export function categoryMetaDescription(category: CategoryRef): string {
  const phrase = PHRASES_BY_CATEGORY[category.slug]?.product;
  const what = phrase ? `купити ${phrase}` : "купити";
  return (
    `${category.name} ${BRAND} — ${what} з доставкою Новою поштою по Україні. ` +
    "Оплата онлайн або після отримання, повернення 14 днів."
  );
}
