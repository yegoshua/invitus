// Strapi API response types

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

// Component types
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

// Collection types
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
  galleryImages: StrapiGalleryImage[];
  variants: StrapiVariant[];
  attributes: StrapiAttribute[];
  category?: StrapiCategory;
  filterTags?: StrapiFilterTag[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

// Transformed types for frontend use (matching existing Product interface)
export interface TransformedProduct {
  id: string;
  documentId: string;
  name: string;
  slug: string;
  price: number;
  images: { url: string; alt: string }[];
  category?: string;
  description?: string;
  sizes?: string[];
  filterTags?: string[];
  // Extended fields
  shortDescription?: string;
  howToMeasure?: string;
  careInstructions?: string;
  heroImage?: string;
  bgImage?: string;
  galleryImages?: { src: string; alt: string }[];
  variants?: { name: string; stock: number; sku?: string; priceModifier?: number }[];
  attributes?: { name: string; value: string }[];
  featured?: boolean;
}

export interface TransformedCategory {
  slug: string;
  name: string;
  description?: string;
  image?: string;
  filters: { slug: string; label: string }[];
}
