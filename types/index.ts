// Domain types — public interface of the data layer.
// The Strapi adapter (lib/api.ts) returns these. UI never imports Strapi schema.

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

  sizes?: string[];
  filterTags?: string[];

  variants?: ProductVariant[];
  attributes?: ProductAttribute[];

  featured?: boolean;
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
  size?: string;
}

export interface CartState {
  items: CartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (product: Product, size?: string) => void;
  removeItem: (productId: string, size?: string) => void;
  updateQuantity: (productId: string, quantity: number, size?: string) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}
