// OFFLINE FALLBACK for presentation content (3D models, hero backgrounds,
// measurement guides, featured flags). The primary source is Strapi — see
// lib/product-extras.ts. Entries here are used only for products that Strapi
// doesn't cover or when Strapi is unreachable.
//
// Key = KeyCRM product id — the only identifier that survives renames.
// Find it in the KeyCRM admin URL of the product, or in the API response.
// Keep the product name in a comment next to each entry.

import type { ProductImage } from "@/types";

export interface ProductExtras {
  /** Path to a .glb under public/models/ (or a full URL). */
  model3dUrl?: string;
  /**
   * Main product photo — overrides the KeyCRM thumbnail when present.
   * Use it when KeyCRM's photo has a baked-in background and Strapi holds a
   * cleaner (e.g. transparent) shot for the hero slot.
   */
  heroImage?: ProductImage;
  /** Hero background image for the product page (falls back to product_bg.png). */
  bgImage?: ProductImage;
  /** Gallery rendered below the product; overrides KeyCRM attachments when present. */
  galleryImages?: ProductImage[];
  howToMeasure?: string;
  careInstructions?: string;
  /** Marks the product for the homepage showcase. */
  featured?: boolean;
  /**
   * KeyCRM offer SKU → the label to show instead of KeyCRM's own size.
   *
   * Belts are stocked as S/M/L but sold by waist range, so the page has to say
   * "65-80 см" while the order still carries "S". The SKU is the join because
   * it is the one identifier both systems already share per size — matching on
   * the letter would break the moment a belt has XS or 2XL and Strapi lists
   * only three variants, and matching on position is worse still.
   *
   * A size with no entry here simply shows KeyCRM's value.
   */
  sizeLabelsBySku?: Record<string, string>;
}

export const productExtras: Record<number, ProductExtras> = {
  // Akatsuki Lifting Belt
  1: {
    bgImage: {
      url: "/assets/img/belts/akatsuki-belt.jpeg",
      alt: "Akatsuki Lifting Belt",
    },
    featured: true,
  },
  // Berserk Lifting Belt
  8: {
    bgImage: {
      url: "/assets/img/belts/berserk-belt.jpeg",
      alt: "Berserk Lifting Belt",
    },
    featured: true,
  },
  // Poseidon Lifting Belt
  9: {
    bgImage: {
      url: "/assets/img/belts/poseidon-belt.jpeg",
      alt: "Poseidon Lifting Belt",
    },
    featured: true,
    // model3dUrl: "/models/poseidon.glb", // ← приклад: поклади .glb у public/models/ і розкоментуй
  },
};
