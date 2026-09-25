// The Custom base: the one belt every Custom belt is printed on. The customer
// never picks it — changing it is changing this file.
//
// It is the Dragon Lifting Belt because its model keeps the printed face as a
// material of its own, so a Belt design can replace that face and leave the
// lever, the screws and the inside of the belt exactly as they are.

import type { PrintZone } from "./belt-design.ts";
import type { StripOrientation } from "./strip-mapping.ts";

/**
 * Measured from the Dragon model, not from the workshop's pattern — treat as
 * approximate until someone lays a tape measure on a real belt.
 *
 * The two ends of the strip meet at the front under the lever, so the middle of
 * a Belt design is the lifter's back: the one wide, unbroken stretch the gym
 * sees during a squat. On the model the back faces straight away at ~47 cm and
 * turns to the sides at ~35 and ~60; the lever and the overlapping tongue hide
 * 0–8 and 84–100.
 */
const printZones: readonly PrintZone[] = [
  { kind: "under-buckle", from: 0, to: 8 },
  { kind: "side", from: 8, to: 35 },
  { kind: "back", from: 35, to: 60 },
  { kind: "side", from: 60, to: 84 },
  { kind: "under-buckle", from: 84, to: 100 },
];

export const CUSTOM_BASE = {
  /**
   * The KeyCRM product — Dragon Lifting Belt — whose model and size grid the
   * Custom base borrows. By id, not by slug: the slug is the product's name,
   * and a rename would quietly leave the builder on the placeholder shape.
   */
  keycrmProductId: 45,
  /** The glTF material that carries the printed face. */
  printMaterial: "Dragon",
  /**
   * The Dragon atlas runs its strip from 100 cm to 0 and bottom edge to top, so
   * a design laid on it the natural way reads upside down. Found by eye on the
   * prototype, with a centimetre grid painted on the model.
   */
  orientation: { reverseLength: true, reverseWidth: true } satisfies StripOrientation,
  printZones,
  /** Along both long edges; stitched through, so nothing there survives intact. */
  stitchMarginCm: 0.5,
} as const;
