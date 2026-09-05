// OFFLINE FALLBACK for presentation content (3D models, hero backgrounds,
// measurement guides, featured flags). The primary source is Strapi — see
// lib/product-extras.ts. Entries here are used only for products that Strapi
// doesn't cover or when Strapi is unreachable.
//
// Key = KeyCRM product id — the only identifier that survives renames.
// Find it in the KeyCRM admin URL of the product, or in the API response.
// Keep the product name in a comment next to each entry.

import type { ProductImage } from "@/types";

/**
 * A pointer from Strapi to a KeyCRM product, left unresolved on purpose.
 *
 * Strapi relations (`relatedProducts`, and the two homepage lists) name Strapi
 * entries; the site renders KeyCRM products. Only lib/api.ts holds the KeyCRM
 * listing needed to turn one into the other, so this carries both halves of the
 * join — `keycrmId` when the entry has it, the slugified name as the legacy
 * fallback — and lib/api.ts resolves it, warning about anything that resolves
 * to nothing.
 */
export interface ProductRef {
  /** Explicit KeyCRM id from the Strapi entry. Survives a rename in KeyCRM. */
  keycrmId?: number;
  /** `slugify(strapi.name)` — the pre-`keycrmId` join. Breaks on rename. */
  slug: string;
  /** Strapi's name for the entry, so an unresolvable ref can be named in a log. */
  name: string;
}

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
  /**
   * Marketing copy for the product. KeyCRM has a description field too, but it
   * is empty on every belt, and a manager editing it there would be editing the
   * wrong system — the description is presentation, so Strapi wins when it has
   * one and KeyCRM's is only the fallback.
   */
  description?: string;
  howToMeasure?: string;
  careInstructions?: string;
  /** The story behind the design, shown as its own panel under the photos. */
  designStory?: string;
  /**
   * Emergency fallback for the homepage sections only.
   *
   * Everyday placement is the curated `showcase` / `shopCta` lists on the
   * Strapi Homepage single type; this is the layer under them, used when a list
   * is empty or short. Kept because those lists live in Strapi and this file is
   * what renders when Strapi is unreachable.
   */
  featured?: boolean;
  /**
   * Editorial position within the category, ascending. Numbered per category in
   * steps of 10 by scripts/backfill-strapi-placement.mts.
   *
   * Absent means "no opinion", which sorts to the *end* rather than the front:
   * a product created in KeyCRM minutes ago has no Strapi entry yet and must
   * still appear, just at the bottom. Same when Strapi is down and every
   * product loses its order at once — the catalog degrades to KeyCRM creation
   * order, which is exactly what it showed before this field existed.
   */
  order?: number;
  /**
   * Explicit cross-sell for the "Твій фул-сет тут" row, in the order they were
   * dragged into in Strapi. Unlike the category-mate fallback, these may point
   * at other categories — a belt can suggest wrist wraps.
   */
  relatedProducts?: ProductRef[];
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
