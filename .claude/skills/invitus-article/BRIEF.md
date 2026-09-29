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

If `content/photo-library/INDEX.md` does not exist, tell the owner, once per article, how to create it:

1. Instagram → Налаштування → Центр облікових записів → Ваша інформація і дозволи → Завантажити вашу інформацію → лише «Дописи», формат **JSON**, якість медіа висока.
2. Розпакувати архів у `content/photo-library/`.
3. `pnpm photos:index`.

Then continue with Pexels (scenes without product) and «потрібне фото: …» for the rest — a missing library does not block the brief.
