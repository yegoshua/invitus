// Schema.org JSON-LD builders.
//
// Ground rule: every statement here has to survive being checked against the
// rendered page. Structured data that contradicts what a visitor sees is a
// manual-action risk, not merely a wasted opportunity. Three consequences that
// shaped what is — and is not — emitted below:
//
//   * No `aggregateRating` / `review`. There is no per-product rating data
//     anywhere in the system. The video testimonials are brand-level and are
//     not tied to a product, so they cannot stand in for one.
//   * One price per product, `product.price` (KeyCRM `min_price`). That is both
//     the number the catalog shows and the number lib/orders.ts actually
//     charges, whichever size the customer picks — see the pricing note there.
//   * No `sku`. Real SKUs live on the KeyCRM offers, i.e. one per size, while
//     this markup describes the product. Picking one size's SKU to stand for
//     the whole page would be a wrong identifier, which is worse than none.

import { SITE_URL } from "./site.ts";
import type { Article, Product, ProductImage } from "../types/index.ts";

/** A JSON-LD node. Loose by design — schema.org shapes are open-ended. */
export type JsonLdObject = Record<string, unknown>;

const BRAND_NAME = "INVITUS";
const LANGUAGE = "uk-UA";
const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const CURRENCY = "UAH";
const COUNTRY = "UA";
const INSTAGRAM_URL = "https://www.instagram.com/invitus.ua";
const SUPPORT_EMAIL = "invitus.ua@gmail.com";

// The coral brand mark from public/. Google wants a logo it can fetch; the
// header wordmark is live text, so this is the only raster brand asset there is.
const LOGO_PATH = "/android-chrome-512x512.png";

/**
 * Site-relative paths become absolute against the canonical origin; KeyCRM and
 * Strapi image URLs are already absolute and pass through untouched.
 */
function absolute(pathOrUrl: string): string {
  return /^https?:\/\//i.test(pathOrUrl)
    ? pathOrUrl
    : new URL(pathOrUrl, `${SITE_URL}/`).toString();
}

// ──────────────────────────────────────────────────────────────────────────
// Organization
// ──────────────────────────────────────────────────────────────────────────

export function organizationSchema(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: BRAND_NAME,
    url: `${SITE_URL}/`,
    logo: absolute(LOGO_PATH),
    description:
      "Український бренд екіпірування для пауерліфтингу: атлетичні пояси, кистьові бинти, наколінники та лямки.",
    sameAs: [INSTAGRAM_URL],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: SUPPORT_EMAIL,
      areaServed: COUNTRY,
      availableLanguage: ["uk"],
    },
  };
}

// ──────────────────────────────────────────────────────────────────────────
// WebSite
// ──────────────────────────────────────────────────────────────────────────

/**
 * No `potentialAction` / SearchAction: that promises a search results page at
 * a URL template, and the site has no search. Add it the day one exists.
 */
export function websiteSchema(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: BRAND_NAME,
    url: `${SITE_URL}/`,
    inLanguage: LANGUAGE,
    publisher: { "@id": ORGANIZATION_ID },
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Offer sub-nodes
// ──────────────────────────────────────────────────────────────────────────

/** Mirrors the three promises rendered on /refund — see content/refund.ts. */
function merchantReturnPolicy(): JsonLdObject {
  return {
    "@type": "MerchantReturnPolicy",
    applicableCountry: COUNTRY,
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: 14,
    returnMethod: "https://schema.org/ReturnByMail",
    // "Зворотня пересилка Новою поштою — повністю за наш рахунок"
    returnFees: "https://schema.org/FreeReturn",
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Product
// ──────────────────────────────────────────────────────────────────────────

export function productSchema(
  product: Product,
  categoryName?: string
): JsonLdObject {
  const url = absolute(`/product/${product.slug}`);

  const images = [
    product.mainImage,
    product.heroImage,
    ...(product.galleryImages ?? []),
  ]
    .filter((image): image is ProductImage => Boolean(image?.url))
    .map((image) => absolute(image.url));

  const schema: JsonLdObject = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    url,
    brand: { "@type": "Brand", name: BRAND_NAME },
  };

  const uniqueImages = [...new Set(images)];
  if (uniqueImages.length) schema.image = uniqueImages;
  if (product.description) schema.description = product.description;
  if (categoryName) schema.category = categoryName;

  // An Offer priced at 0 reads as "free" and is rejected as a merchant listing.
  // The category that held every such entry ("Додаткові товари") is hidden in
  // lib/api.ts, so nothing should reach this branch today — it stays as a guard
  // for the next KeyCRM item that arrives without a price.
  if (product.price > 0) {
    schema.offers = {
      "@type": "Offer",
      url,
      price: product.price,
      priceCurrency: CURRENCY,
      itemCondition: "https://schema.org/NewCondition",
      // Deliberately not derived from KeyCRM stock. Nothing in the UI gates on
      // it — the size selector offers every size and the order path never
      // checks quantity — so "in stock" is what a visitor actually finds. The
      // day stock gating lands, this has to start following it.
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", "@id": ORGANIZATION_ID },
      // No shippingDetails: the site charges nothing for delivery, the customer
      // pays Nova Poshta on collection. A rate of 0 here would read as free
      // shipping, which is a different promise from the one we make.
      hasMerchantReturnPolicy: merchantReturnPolicy(),
    };
  }

  return schema;
}

// ──────────────────────────────────────────────────────────────────────────
// Breadcrumbs
// ──────────────────────────────────────────────────────────────────────────

export interface BreadcrumbItem {
  name: string;
  /** Site-relative path, e.g. "/shop/belts". */
  path: string;
}

export function breadcrumbSchema(items: BreadcrumbItem[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absolute(item.path),
    })),
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Blog
// ──────────────────────────────────────────────────────────────────────────

/**
 * The headline is the title the page prints in its h1, never `seoTitle`: that
 * one exists for <title> only and appears nowhere a visitor can read it. The
 * description is the excerpt the /blog card prints. The author is the brand —
 * Strapi has no author field, and a person's name nobody entered would be
 * invented data.
 */
export function blogPostingSchema(article: Article): JsonLdObject {
  const url = absolute(`/blog/${article.slug}`);

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.excerpt,
    url,
    mainEntityOfPage: url,
    image: [absolute(article.cover.url)],
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    inLanguage: LANGUAGE,
    author: { "@type": "Organization", "@id": ORGANIZATION_ID, name: BRAND_NAME },
    publisher: { "@id": ORGANIZATION_ID },
  };
}
