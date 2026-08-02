/**
 * The hero video is decoration: it renders greyscaled at 30% opacity under a
 * 60% black overlay, over a poster that already carries that exact treatment.
 * Skipping it costs the visitor nothing they can name, so the answer to "is
 * this a good moment for 1.4 MB of video?" is allowed to be no.
 *
 * Kept as a pure function so the three ways of saying no are testable without
 * a browser.
 */

/** Effective connection types on which 1.4 MB is not a decoration budget. */
const SLOW_CONNECTIONS = new Set(["slow-2g", "2g", "3g"]);

export type HeroVideoConditions = {
  /** `navigator.connection.saveData` — the visitor asked for less data. */
  saveData?: boolean;
  /** `navigator.connection.effectiveType`; absent when the browser has no Network Information API. */
  effectiveType?: string;
  /** `(prefers-reduced-motion: reduce)` matches. */
  prefersReducedMotion: boolean;
};

export function shouldLoadHeroVideo({
  saveData,
  effectiveType,
  prefersReducedMotion,
}: HeroVideoConditions): boolean {
  if (prefersReducedMotion) return false;
  if (saveData) return false;
  // Unknown means unknown: only the values we know to be slow are slow.
  if (effectiveType && SLOW_CONNECTIONS.has(effectiveType)) return false;
  return true;
}

type NetworkInformation = { saveData?: boolean; effectiveType?: string };

/** Reads the three signals off the current browser. Call inside an effect. */
export function readHeroVideoConditions(): HeroVideoConditions {
  const connection = (navigator as Navigator & { connection?: NetworkInformation })
    .connection;
  return {
    saveData: connection?.saveData,
    effectiveType: connection?.effectiveType,
    prefersReducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches,
  };
}
