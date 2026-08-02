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

import { SITE_URL } from "./site";
import { SHIPPING_COST } from "./shipping";
import type { Product, ProductImage } from "@/types";

/** A JSON-LD node. Loose by design — schema.org shapes are open-ended. */
export type JsonLdObject = Record<string, unknown>;

const BRAND_NAME = "INVITUS";
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
    "@id": `${SITE_URL}/#organization`,
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

/** The flat Nova Poshta rate the checkout adds to every order. */
function offerShippingDetails(): JsonLdObject {
  return {
    "@type": "OfferShippingDetails",
    shippingRate: {
      "@type": "MonetaryAmount",
      value: SHIPPING_COST,
      currency: CURRENCY,
    },
    shippingDestination: {
      "@type": "DefinedRegion",
      addressCountry: COUNTRY,
    },
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
      seller: { "@type": "Organization", "@id": `${SITE_URL}/#organization` },
      hasMerchantReturnPolicy: merchantReturnPolicy(),
      shippingDetails: offerShippingDetails(),
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
