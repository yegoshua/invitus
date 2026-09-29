# Article brief

Shown to the owner in Ukrainian, in this order. Short: the owner approves positions and facts, so every line must be something they can say yes or no to. No prose paragraphs, no draft text.

```md
**Тема:** <цільовий запит> — намір: обрати | порівняти | навчитися
**Для кого:** <хто читає і що вже знає>
**Категорія:** <одна з CATEGORIES у scripts/publish-article.mts>
**Робоча назва:** <title> · slug: <транслітерований цільовий запит, коротко: yak-obraty-atletychnyy-poyas>
**SEO:** seoTitle: <≤ 60 символів> · seoDescription: <≤ 160>

**План:** <H2 по черзі — те, що читач шукає, а не «Технічні характеристики»>

**Наша позиція** (що стаття однозначно радить і чому):
1. <«бери X, бо Y»>
2. …

**Факти про наш товар** (звідки — сторінка товару / потрібне підтвердження):
- <факт> — <джерело або «підтверди»>

**Чим закінчується:** <рішення, до якого читач приходить; як повертаємось до нашого товару>

**Посилання:** <1–2 URL товарів із sitemap> · категорія в кінці: <URL /shop/…> · <внутрішні статті, якщо є>

**Фото:**
- обкладинка: <шлях у Photo library | Pexels-URL (сцена без товару) | потрібне фото: …>
- <розділ>: <…>

**Чого в статті не буде:** <теми, які лишаємо на інші статті>
```

The «Факти про наш товар» list is the one the owner must check hardest: anything the live product page does not state (layers, leather, stitching) is marked «підтверди» — a plausible guess about our own product is the worst mistake an article can make.

## Photo library

**Strapi media library.** `GET /api/upload/files?pagination[pageSize]=500` with `STRAPI_API_TOKEN`. Names are often camera names (`DSCF2696.jpg`), so build a contact sheet of the `small` formats with sharp and look at it rather than guessing from names. Download the chosen ones from the **original** `url` — `formats.large` is only ~667 px wide. The cover is shown at **16:9 with `object-cover`**, so crop a preview of a vertical shot to 16:9 before proposing it. The `…Wrist Wrap — фон` style entries are gradients with no product in them.

**Never pull Instagram through its internal API or by scripting the page.** Tried once with the owner's logged-in session: the first request came back **429** — continuing risks a block on the brand account the shop sells from. The export below is the only way.

If `content/photo-library/INDEX.md` does not exist, tell the owner, once per article, how to create it:

1. Instagram → Налаштування → Центр облікових записів → Ваша інформація і дозволи → Завантажити вашу інформацію → лише «Дописи», формат **JSON**, якість медіа висока.
2. Розпакувати архів у `content/photo-library/`.
3. `pnpm photos:index`.

Meanwhile use the Strapi photos, Pexels for scenes without product, and «потрібне фото: …» for the rest — a missing export does not block the brief.
