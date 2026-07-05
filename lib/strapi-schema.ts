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
  /** Optional explicit link to the KeyCRM product (number field, add in Content-Type Builder). */
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
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}
