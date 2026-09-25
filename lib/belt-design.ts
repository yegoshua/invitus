// Belt design: where the customer's Artwork sits on the 10 × 100 cm face of a
// Custom belt, and what that means for print.
//
// Everything is in centimetres of the physical strip, not in screen or texture
// pixels: the 2D editor, the 3D preview and the Telegram message all describe
// the same Belt design, and only centimetres mean the same thing to all three —
// and to the workshop that will eventually print it.
//
// x runs along the strip, 0 → 100 cm; y runs across it, 0 (top edge) → 10 cm.
// Which physical end x = 0 is — and that the middle is the lifter's back — is
// the Custom base's business (lib/custom-base.ts), not this module's.

export const BELT_LENGTH_CM = 100;
export const BELT_WIDTH_CM = 10;

/** The Artwork's own size, in pixels. */
export interface ArtworkSize {
  width: number;
  height: number;
}

export interface Placement {
  /** Centre of the Artwork along the strip, cm. */
  centerX: number;
  /** Centre of the Artwork across the strip, cm. */
  centerY: number;
  /** Printed width of the Artwork, cm. Its height follows from its proportions. */
  width: number;
  /** Colour of the strip wherever the Artwork does not reach. */
  background: string;
}

/** «Заповнити смугу»: cover the whole strip, cropping whatever overhangs. */
export function fillStrip(art: ArtworkSize, background: string): Placement {
  const cmPerPx = Math.max(BELT_LENGTH_CM / art.width, BELT_WIDTH_CM / art.height);
  return {
    centerX: BELT_LENGTH_CM / 2,
    centerY: BELT_WIDTH_CM / 2,
    width: art.width * cmPerPx,
    background,
  };
}

/** «Вмістити»: the whole Artwork on the strip, the rest in the background colour. */
export function fitInStrip(art: ArtworkSize, background: string): Placement {
  const cmPerPx = Math.min(BELT_LENGTH_CM / art.width, BELT_WIDTH_CM / art.height);
  return {
    centerX: BELT_LENGTH_CM / 2,
    centerY: BELT_WIDTH_CM / 2,
    width: art.width * cmPerPx,
    background,
  };
}

/**
 * Below this the print will look soft at arm's length. A warning, never a
 * gate: a Custom request is a conversation, and the team can upscale or redraw
 * — but the customer should know before falling in love with a design.
 */
export const LOW_DPI_THRESHOLD = 100;

export interface PrintQuality {
  /** Artwork pixels per printed inch at the current scale. */
  dpi: number;
  verdict: "ok" | "low";
}

export function printQuality(art: ArtworkSize, placement: Placement): PrintQuality {
  const dpi = art.width / (placement.width / 2.54);
  return { dpi, verdict: dpi >= LOW_DPI_THRESHOLD ? "ok" : "low" };
}

/** Smallest printed width a pinch can reach — past this there is nothing to grab. */
export const MIN_ARTWORK_WIDTH_CM = 1;

export function movedBy(p: Placement, dx: number, dy: number): Placement {
  return { ...p, centerX: p.centerX + dx, centerY: p.centerY + dy };
}

/** Pinch or wheel zoom around (anchorX, anchorY) — the point stays under the fingers. */
export function scaledAround(
  p: Placement,
  factor: number,
  anchorX: number,
  anchorY: number,
): Placement {
  const width = Math.max(MIN_ARTWORK_WIDTH_CM, p.width * factor);
  const k = width / p.width;
  return {
    ...p,
    width,
    centerX: anchorX + (p.centerX - anchorX) * k,
    centerY: anchorY + (p.centerY - anchorY) * k,
  };
}

/** «По центру». */
export function centered(p: Placement): Placement {
  return { ...p, centerX: BELT_LENGTH_CM / 2, centerY: BELT_WIDTH_CM / 2 };
}

/**
 * What happens to a stretch of the strip once the belt is on. Along the length
 * only — the stitch margin runs along both long edges and is its own constant.
 */
export interface PrintZone {
  kind: "back" | "side" | "under-buckle";
  /** cm along the strip, inclusive. */
  from: number;
  /** cm along the strip, exclusive — the next zone starts here. */
  to: number;
}

export function zoneAt(zones: readonly PrintZone[], x: number): PrintZone | undefined {
  return zones.find((z) => x >= z.from && (x < z.to || (x === z.to && z.to === BELT_LENGTH_CM)));
}
