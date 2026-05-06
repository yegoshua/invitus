# Architecture Changes Log

Хронологічний журнал архітектурних refactor'ів. Кожен запис фіксує: **навіщо**, **що змінено**, **як використовувати тепер**. Майбутні зміни додаємо зверху.

Vocab з `LANGUAGE.md`: **module / interface / implementation / depth / seam / adapter / leverage / locality**.

---

## Index

1. [Strapi Adapter — clean domain seam](#1-strapi-adapter--clean-domain-seam)
2. [ProductImage component — unified image rendering](#2-productimage-component--unified-image-rendering)
3. [Filter — API kept, UI removed](#3-filter--api-kept-ui-removed)
4. [Cart selector hooks + CartItem decoupling](#4-cart-selector-hooks--cartitem-decoupling)
5. [Section content extraction](#5-section-content-extraction)
6. [Misc duplicate cleanup (formatPrice, ArrowOutForward, FadeUp)](#6-misc-duplicate-cleanup)

---

## 1. Strapi Adapter — clean domain seam

**Date:** 2026-05-06

### Why
Раніше `lib/api.ts` робив часткову трансформацію Strapi → frontend, але типи `TransformedProduct`/`TransformedCategory` стирчали наскрізь у UI (через `@/types/strapi`). Будь-яка зміна в Strapi (нове поле, перейменування, інша media-структура) вимагала ходити по 3 місцях: `types/strapi.ts`, transform-функцій у `api.ts`, плюс компоненти. Не було єдиного власника знань про Strapi.

### What changed

**Created**
- `lib/strapi-schema.ts` — raw Strapi response shapes. **PRIVATE до адаптера**, не імпортувати з UI.
- Domain types у `types/index.ts`: `Product`, `Category`, `FilterTag`, `ProductImage`, `ProductVariant`, `ProductAttribute`.

**Removed**
- `types/strapi.ts` — Strapi-схеми вилучено з public types, залишок (transformed shapes) злився з domain `Product`.
- `Product.images: { url, alt }[]` (масив) → одиничні поля `mainImage`, `heroImage`, `bgImage` (тип `ProductImage`).
- Невикористаний prop `variant?: "dark" | "gray" | "coral"` з `ProductCard` (плюс місця, де його даремно передавали).

**Restructured**
- `lib/api.ts` — `toProduct(StrapiProduct) → Product` і `toCategory(StrapiCategory, …) → Category` тепер єдині point-of-translation. Усі fallback-правила (heroImage → mainImage, media URL resolution) тут.
- `CartItem` тепер `{ product: Product, quantity, size }` (раніше було `extends Product` — спадок Product у CartItem було складно розширити). Persist `version: 2` з migration що чистить старі корзини. Це підготовка до #4.

### How to use
- UI/components ніколи не імпортують з `lib/strapi-schema` чи `lib/strapi`. Тільки `import type { Product, Category, FilterTag, ProductImage } from "@/types"`.
- Доступ до зображення: `product.mainImage?.url` / `product.mainImage?.alt`. Колишнє `product.images[0]` більше не існує.
- Якщо потрібна нова Strapi-фіча: додати `Strapi*` поле у `lib/strapi-schema.ts`, оновити `toProduct`/`toCategory` у `lib/api.ts`, при потребі додати domain-поле у `types/index.ts`.

### Files touched
- `types/index.ts` — повна перепис під domain
- `lib/strapi-schema.ts` — створено (приватні типи)
- `lib/api.ts` — переписано адаптер
- `lib/strapi.ts` — без змін (низькорівневий fetch + media URL)
- `types/strapi.ts` — видалено
- `stores/cart.ts` — нова форма `CartItem`, `version: 2`
- `components/ui/product-card.tsx`, `components/product/product-page-content.tsx`, `components/product/product-images-section.tsx`, `components/product/related-products.tsx`, `components/sections/catalog-grid.tsx`, `components/layout/cart-drawer.tsx`, `app/product/[slug]/page.tsx` — оновлено споживачів

### Verified
- `pnpm tsc --noEmit` — pass (exit 0)
- `pnpm lint` — нові помилки не з'явилися (наявні warnings/errors залишились, всі вони pre-existing у model-loader, header, testimonials, features-grid)

---

## 2. ProductMedia component — unified image rendering

**Date:** 2026-05-06

### Why
В чотирьох місцях незалежно дублювалося одне й те саме: «якщо є зображення — `<Image fill .../>`, якщо нема — або плейсхолдер `INVITUS`, або статична fallback-URL». Кожне місце трохи по-своєму вирішувало fallback (різний колір тексту, різний size, інколи без fallback взагалі). При зміні правил треба було ходити по 4 файлах.

### What changed

**Created**
- `components/ui/product-media.tsx` — `<ProductMedia>` обгортка над `next/image` з єдиним правилом fallback'у.
  - Приймає `image?: ProductImage` (domain тип) + усі стандартні `next/image` props.
  - Якщо image присутнє — рендерить `Image`.
  - Інакше якщо передано `fallbackSrc` — рендерить `Image` з тією URL.
  - Інакше — рендерить центрований текст «INVITUS» (розмір/колір через `fallbackBrandTextClassName`).

**Removed**
- Дублікат «image OR INVITUS placeholder» у `product-card.tsx` (картка), `cart-drawer.tsx` (мініатюра).
- Дублікат «image OR `/assets/img/product_bg.png`» у `product-page-content.tsx` (mobile + desktop hero bg).
- Голий `<Image>` у `product-images-section.tsx` (тепер уніфіковано через `ProductMedia`).

### How to use
```tsx
// Звичайний випадок з brand fallback
<ProductMedia image={product.mainImage} fill className="object-cover" />

// Кастомний розмір/колір INVITUS-тексту
<ProductMedia
  image={product.mainImage}
  fill
  fallbackBrandTextClassName="text-xs text-neutral-600"
/>

// Fallback на статичну URL (наприклад hero bg)
<ProductMedia
  image={product.bgImage}
  fallbackSrc="/assets/img/product_bg.png"
  fill
  priority
  className="object-cover"
/>
```

Контейнер з `position: relative` лишається на стороні caller'а — це вимога `next/image` коли `fill` true.

### Files touched
- `components/ui/product-media.tsx` — створено
- `components/ui/product-card.tsx` — використовує `<ProductMedia>`
- `components/layout/cart-drawer.tsx` — використовує `<ProductMedia>` для мініатюри
- `components/product/product-page-content.tsx` — використовує `<ProductMedia>` для bg (mobile+desktop)
- `components/product/product-images-section.tsx` — використовує `<ProductMedia>`

### Verified
- `pnpm tsc --noEmit` — pass

---

## 3. Filter — API kept, UI removed

**Date:** 2026-05-06

### Why
Спочатку планувався повний Filter-модуль (URL state + chip UI + хук). Під час роботи власник продукту попросив прибрати чипи з UI каталогу — нехай каталог показує тільки заголовок з кількістю та сітку. API-частина (Strapi-фільтрація, помічники) лишається — щоб у будь-який момент можна було повернути UI.

### What changed

**Created (kept)**
- `lib/filter.ts` — `FILTER_PARAM`, `ALL_FILTER_SLUG`, `ALL_FILTER`, `isAllFilter()`, `readFilterFromSearchParams()`. Це власник «що значить фільтр» на рівні даних. URL-конвенція `?filter=<slug>` фіксована тут.

**Removed**
- `components/ui/filter-chip.tsx` — більше нікого не рендерить.
- `hooks/use-filter-navigation.ts` — створювався під цей UI, без споживачів видалений.

(`components/ui/chip-button.tsx` лишається — використовується `SizeSelector`.)
- Props `filters` та `activeFilter` з `CatalogHero`.
- Render блока з чипами у `catalog-hero.tsx`.

**Restructured**
- `lib/api.ts` — `ALL_FILTER` тепер імпортується з `lib/filter.ts` (раніше був дубльований inline).
- `app/shop/[category]/page.tsx` — параметр `filter` все ще читається з URL і передається у `getProducts({ filter })`, але CatalogHero більше не отримує `filters`/`activeFilter`. Використовує константу `ALL_FILTER_SLUG` замість магічного `"all"`.

### How to use
- API готове: `getProducts({ category, filter: "compression" })` працює як раніше; URL `?filter=compression` теж.
- Якщо завтра треба повернути UI — додати компонент чипів, передати йому `category.filters` (вже у domain `Category`) та navigator. Контракт URL фіксований, нічого винаходити.
- Пресет «УСІ» — імпорт `ALL_FILTER` з `@/lib/filter`. Не хардкодити slug `"all"` чи string `"УСІ"` поза цим модулем.

### Files touched
- `lib/filter.ts` — створено (data-side helpers)
- `lib/api.ts` — використовує `ALL_FILTER` з `lib/filter`
- `app/shop/[category]/page.tsx` — використовує `ALL_FILTER_SLUG`, без UI props
- `components/sections/catalog-hero.tsx` — спрощено, без чипів
- `components/ui/filter-chip.tsx` — видалено
- `hooks/use-filter-navigation.ts` — видалено

### Verified
- `pnpm tsc --noEmit` — pass
- Жодних посилань на `FilterChip` / `useFilterNavigation` не залишилось

---

## 4. Cart selector hooks + CartItem decoupling

**Date:** 2026-05-06

### Why
Раніше кожен споживач кошика тягнув з Zustand-store потрібні шматки сам:
```ts
const itemCount = useCartStore((state) => state.getItemCount());
const openCart = useCartStore((state) => state.openCart);
const items = useCartStore((state) => state.items);
// …
```
Це робило сам store **інтерфейсом**: будь-яка зміна (наприклад додати поле `promotionalPrice`) вимагала ходити по всіх споживачах. Плюс `CartItem extends Product` зчіплював форму корзини з формою продукту — Product не міг розширитися без оновлення корзини.

### What changed

**Created**
- `hooks/use-cart.ts` — публічний інтерфейс кошика:
  - **Reads:** `useCartItems`, `useCartIsOpen`, `useCartCount`, `useCartTotal`
  - **Actions:** `useOpenCart`, `useCloseCart`, `useAddToCart`, `useRemoveFromCart`, `useUpdateCartQuantity`, `useClearCart`

**Restructured**
- `CartItem` (вже у #1): з `Product & { quantity, size }` → `{ product: Product, quantity, size }` — композиція замість успадкування.
- `stores/cart.ts` — тепер implementation detail. Споживачі ходять через хуки.
- `components/layout/header.tsx`, `components/layout/cart-drawer.tsx`, `components/product/product-page-content.tsx` — переписані на нові хуки. Видалено мертвий prop `onClose` у `EmptyState`.

### How to use
```tsx
import { useCartCount, useOpenCart, useAddToCart } from "@/hooks/use-cart";

function MyComponent() {
  const count = useCartCount();
  const openCart = useOpenCart();
  const addToCart = useAddToCart();
  // …
}
```
Імпорт `useCartStore` з `@/stores/cart` — лише всередині `hooks/use-cart.ts`. Якщо desire'ите розширити Cart API — додавайте новий хук, не давайте споживачам прямий доступ.

### Files touched
- `hooks/use-cart.ts` — створено
- `components/layout/header.tsx` — на хуках
- `components/layout/cart-drawer.tsx` — на хуках, тип `CartItem` через domain types, прибраний мертвий `onClose`
- `components/product/product-page-content.tsx` — на хуках

### Verified
- `pnpm tsc --noEmit` — pass
- `grep useCartStore` поза `hooks/use-cart.ts` та `stores/cart.ts` — нічого не повертає

---

## 5. Section content extraction

**Date:** 2026-05-06

### Why
Inline mock-data (FAQ-айтеми, фічі поясу, бенефіти доставки/повернення, перелік відео тестімоніалів, навігація) лежали прямо у компонентах-секціях, переплетені з рендером. Будь-яке оновлення копірайту тягнуло за собою git-diff у JSX. Та й одна й та сама `navLinks` дублювалась у `header.tsx` та `mobile-menu-drawer.tsx`.

Це поки що **stage-1** (просто витягли в `content/*`) — без зовнішнього CMS-адаптера. Якщо/коли з'явиться CMS, цей поверх стане другим adapter'ом за тим самим інтерфейсом.

### What changed

**Created (data modules)**
- `content/faq.ts` — `FAQItem` + `faqItems`
- `content/benefits.ts` — `ServiceBenefit` + `serviceBenefits` (підтримка / доставка / повернення)
- `content/features.ts` — `FeatureCard` (discriminated union `image | stat`) + `featureCards`
- `content/why-belt-features.ts` — `BeltFeature` + `beltFeatures` (4 фічі поясу для scroll-pinned секції)
- `content/testimonials.ts` — `Testimonial` + `testimonials` (Pexels videos)
- `content/navigation.ts` — `NavLink` + `navLinks` + `socialLinks`

**Restructured (sections now just render)**
- `components/sections/faq-section.tsx` — без inline даних
- `components/sections/benefits-grid.tsx` — без inline даних
- `components/sections/features-grid.tsx` — переписано під discriminated union (`card.kind === "image" | "stat"`)
- `components/sections/why-section.tsx` — без inline даних
- `components/sections/testimonials-section.tsx` — без inline даних
- `components/layout/header.tsx` + `components/layout/mobile-menu-drawer.tsx` — обидва ходять у спільний `content/navigation.ts` замість дублювати `navLinks` локально

### How to use
Зміна копірайту — у відповідному файлі `content/*.ts`, не в JSX. Якщо завтра з'являється CMS — створити другий модуль (наприклад, `lib/content-cms.ts`), що повертає такі самі типи (`FAQItem`, `ServiceBenefit` тощо), і секції підмінять імпорт.

### Files touched
- `content/faq.ts`, `content/benefits.ts`, `content/features.ts`, `content/why-belt-features.ts`, `content/testimonials.ts`, `content/navigation.ts` — створено
- `components/sections/faq-section.tsx`, `benefits-grid.tsx`, `features-grid.tsx`, `why-section.tsx`, `testimonials-section.tsx` — оновлено
- `components/layout/header.tsx`, `components/layout/mobile-menu-drawer.tsx` — оновлено

### Verified
- `pnpm tsc --noEmit` — pass

---

## 6. Misc duplicate cleanup

**Date:** 2026-05-06

### Why
Після основних refactor'ів проявилися дрібніші дублікати — формат ціни, SVG-стрілка, motion-патерн «fade-up on scroll». Кожен невеликий, але разом створюють шум при правках.

### What changed

**B. Money formatting → `lib/format.ts`**
- `formatPrice(amount)` — `1 999`, без символу
- `formatPriceWithCurrency(amount)` — `1 999 ₴` через `Intl currency`
- Заміна 4 inline `new Intl.NumberFormat(...)` у `product-card.tsx`, `cart-drawer.tsx` (×2), `product-page-content.tsx`.

**C. ArrowOutForward icon — імпорт SVG напряму через SVGR**
- Видалено 3 inline копії `<svg path d="..."/>` (cta-link, cart-drawer, product-page-content).
- Усі тепер імпортують `arrow-outforward-icon.svg` напряму:
  ```tsx
  import ArrowOutForwardIcon from "@/public/assets/icons/arrow-outforward-icon.svg";
  ```
- (Спочатку я був створив React-компонент-обгортку `components/ui/icons/arrow-right-up.tsx`, але це зайвий рівень — SVGR вже робить SVG використовним як React FC. Видалено.)

**D. Motion `fade-up` patten → `<FadeUp>`**
- `components/ui/fade-up.tsx` — обгортка з `delay`/`duration`/`y` knob'ами над домінуючим патерном `initial={{opacity:0,y:20}} whileInView animate viewport once`.
- Замінено в: `benefits-grid`, `faq-section`, `product-showcase`, `shop-cta`, `related-products`, `product-images-section`, `catalog-grid`.
- Не замінено у: `features-grid` (x-axis swing), `motivation-section` (`y: 30`, `initial+animate`, не `whileInView`), `testimonials-section` (`initial+animate`), `product-card` (`motion.article` + index-based delay), `catalog-hero` (`animate`), `hero-section` (`animate`), `product-page-content` (`animate`). Ці випадки відрізняються від базового патерну достатньо щоб шов через `<FadeUp>` був натягнутим.

### How to use
```tsx
import { FadeUp } from "@/components/ui/fade-up";
import { formatPrice, formatPriceWithCurrency } from "@/lib/format";
import ArrowOutForwardIcon from "@/public/assets/icons/arrow-outforward-icon.svg";

<FadeUp delay={0.2} className="text-center">
  <h2>{formatPriceWithCurrency(1999)}</h2>
  <ArrowOutForwardIcon className="w-5 h-5" />
</FadeUp>
```

Конвенція проекту для іконок — імпорт `.svg` напряму, без обгортки. Дивись `feedback_svg_icons.md` у memory.

### Files touched
- `lib/format.ts` — створено
- `components/ui/fade-up.tsx` — створено
- `components/ui/cta-link.tsx`, `components/layout/cart-drawer.tsx`, `components/product/product-page-content.tsx`, `components/ui/product-card.tsx` — formatPrice + ArrowOutForward
- `components/sections/benefits-grid.tsx`, `faq-section.tsx`, `product-showcase.tsx`, `shop-cta.tsx`, `catalog-grid.tsx`, `components/product/related-products.tsx`, `product-images-section.tsx` — на `<FadeUp>`

### Verified
- `pnpm tsc --noEmit` — pass
- `pnpm lint` — 5 помилок (всі pre-existing у `header.tsx`, `model-loader.tsx`, `testimonials-section.tsx`); refactor забрав 2 попередні warnings
- 3 inline копії `M6.65078 18.825…` SVG-path — `grep` нічого не повертає
- 0 `Intl.NumberFormat` поза `lib/format.ts`

---

