// Domain types — public interface of the data layer.
// The Strapi adapter (lib/api.ts) returns these. UI never imports Strapi schema.

// Type-only, so it is erased: lib/article-body.ts ships a function too, and this
// module is imported by client components that have no use for it.
import type { BlocksNode } from "@/lib/article-body";

export interface ProductImage {
  url: string;
  alt: string;
}

export interface ProductVariant {
  name: string;
  stock: number;
  sku?: string;
  priceModifier?: number;
}

export interface ProductAttribute {
  name: string;
  value: string;
}

/**
 * One selectable size, with the two halves kept apart on purpose.
 *
 * KeyCRM knows belts as S/M/L; customers shop for them in centimetres. The
 * label is what the page shows, the value is what KeyCRM matches an offer by —
 * send the label with an order and pricing fails, show the value and the belt
 * page stops telling anyone what it actually fits.
 */
export interface ProductSize {
  /** KeyCRM's own size, e.g. "S". Sent with the order; never displayed. */
  value: string;
  /** What the customer sees, e.g. "65-80 см". Falls back to `value`. */
  label: string;
}

export interface Product {
  id: string;
  documentId: string;
  name: string;
  slug: string;
  price: number;
  category?: string;

  description?: string;
  shortDescription?: string;
  howToMeasure?: string;
  careInstructions?: string;

  mainImage?: ProductImage;
  heroImage?: ProductImage;
  bgImage?: ProductImage;
  galleryImages?: ProductImage[];

  model3dUrl?: string;

  sizes?: ProductSize[];
  filterTags?: string[];

  variants?: ProductVariant[];
  attributes?: ProductAttribute[];

  featured?: boolean;
}

// Blog

/**
 * An article as the listing shows it: everything the card needs and nothing
 * else. The body stays in the loader — it is what `readingTimeMinutes` is
 * computed from, and shipping a dozen full articles to render a dozen cards
 * would be paying for the whole blog to show its index.
 */
export interface ArticleSummary {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  /** One of the Article type's enumeration values, e.g. "ЕКІПІРУВАННЯ". */
  category: string;
  /** Strapi's publish timestamp — the sort key; there is no separate date field. */
  publishedAt: string;
  /** Derived from the body, never stored. See lib/article-body.ts. */
  readingTimeMinutes: number;
  cover: {
    url: string;
    alt: string;
    width?: number;
    height?: number;
  };
}

/**
 * A whole article, as the article page needs it. The body is the Strapi Blocks
 * document — `components/blog/article-body.tsx` is the only thing that reads it.
 */
export interface Article extends ArticleSummary {
  body: BlocksNode[];
  seoTitle?: string;
  seoDescription?: string;
}

export interface FilterTag {
  slug: string;
  label: string;
}

export interface Category {
  slug: string;
  name: string;
  description?: string;
  image?: string;
  filters: FilterTag[];
}

// Cart

export interface CartItem {
  product: Product;
  quantity: number;
  /** KeyCRM's size value — the line's identity, and what the order carries. */
  size?: string;
  /** Display copy for `size`. Absent on carts persisted before labels existed. */
  sizeLabel?: string;
}

export interface CartState {
  items: CartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (product: Product, size?: string, sizeLabel?: string) => void;
  removeItem: (productId: string, size?: string) => void;
  updateQuantity: (productId: string, quantity: number, size?: string) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}
