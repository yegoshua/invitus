// Categories temporarily hidden from the entire site: navigation, catalog,
// sitemap, featured lists and product pages. Filtered at the fetch layer in
// lib/api.ts so every consumer is covered. To bring a category back, just
// remove its id.
//
// Kept in its own dependency-free module because scripts/ imports it too —
// scripts run under bare `node`, where the `@/` alias and Next's fetch
// extensions that lib/api.ts relies on are not available. A copy in the script
// would silently drift the day a category is unhidden.

export const HIDDEN_CATEGORY_IDS = new Set<number>([
  5, // Додаткові товари — Браслет, Рушник, ID Card. Ціна 0, категорії немає в
  //    навігації, а сторінки все одно віддавались і лежали в sitemap.
  6, // Футболки — поки немає в продажу
  7, // Службове (тест) — 0.50 ₴ товар для перевірки бойового еквайрингу
]);
