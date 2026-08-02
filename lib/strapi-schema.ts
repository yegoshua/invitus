// Raw Strapi response shapes. PRIVATE to the adapter — do not import from UI code.
// All fields here mirror the Strapi schema and have no business meaning.
// The translation to domain types happens in lib/api.ts.

export interface StrapiResponse<T> {
  data: T;
  meta: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface StrapiMediaFormat {
  name: string;
  hash: string;
  ext: string;
  mime: string;
  width: number;
  height: number;
  size: number;
  url: string;
}

export interface StrapiMedia {
  id: number;
  documentId: string;
  name: string;
  alternativeText: string | null;
  caption: string | null;
  width: number;
  height: number;
  formats: {
    thumbnail?: StrapiMediaFormat;
    small?: StrapiMediaFormat;
    medium?: StrapiMediaFormat;
    large?: StrapiMediaFormat;
  } | null;
  url: string;
}

export interface StrapiVariant {
  id: number;
  sku: string | null;
  name: string;
  stock: number;
  priceModifier: number;
}

export interface StrapiAttribute {
  id: number;
  name: string;
  value: string;
}

export interface StrapiGalleryImage {
  id: number;
  alt: string;
  image: StrapiMedia;
}

export interface StrapiCategory {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  description: string | null;
  order: number;
  image: StrapiMedia | null;
  filterTags?: StrapiFilterTag[];
  products?: StrapiProduct[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface StrapiFilterTag {
  id: number;
  documentId: string;
  label: string;
  slug: string;
  order: number;
  category?: StrapiCategory;
  createdAt: string;
  updatedAt: string;
}

export interface StrapiProduct {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  /** Explicit link to the KeyCRM product. Optional — null until backfilled. */
  keycrmId?: number | null;
  price: number;
  description: string | null;
  shortDescription: string | null;
  howToMeasure: string | null;
  careInstructions: string | null;
  featured: boolean;
  order: number;
  seoTitle: string | null;
  seoDescription: string | null;
  mainImage: StrapiMedia | null;
  heroImage: StrapiMedia | null;
  backgroundImage: StrapiMedia | null;
  model3d: StrapiMedia | null;
  galleryImages: StrapiGalleryImage[];
  variants: StrapiVariant[];
  attributes: StrapiAttribute[];
  category?: StrapiCategory;
  filterTags?: StrapiFilterTag[];
  /** One-way relation; populated with `name`/`keycrmId` only. Order is manual. */
  relatedProducts?: StrapiProductRef[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

/**
 * A product as it comes back inside a relation, populated with just enough to
 * find it in KeyCRM. The products themselves are always re-read from KeyCRM —
 * Strapi's own `price`/`variants` are stale copies and must never be rendered.
 */
export interface StrapiProductRef {
  id: number;
  documentId: string;
  name: string;
  keycrmId?: number | null;
}

/**
 * The `Homepage` single type. Note it is `draftAndPublish: false`, so there is
 * no Publish button and no draft state — but the entry does not exist at all
 * until someone saves it once, and Strapi answers 404 until then.
 */
export interface StrapiHomepage {
  id: number;
  documentId: string;
  showcase?: StrapiProductRef[];
  shopCta?: StrapiProductRef[];
}
