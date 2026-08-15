/**
 * Video on this site is decoration before it is anything else. The hero renders
 * greyscaled at 30% opacity under a 60% black overlay, over a poster that
 * already carries that exact treatment; the sections below the fold are motion
 * behind a message the text already carries. Skipping any of them costs the
 * visitor nothing they can name, so the answer to "is this a good moment for a
 * few megabytes of video?" is allowed to be no.
 *
 * The rule lives here, in one place, because the three below-the-fold videos
 * that #34 found each downloading on page load were three separate mistakes
 * made precisely because it lived nowhere.
 *
 * Kept as a pure function so the three ways of saying no are testable without
 * a browser.
 */

/** Effective connection types on which a video is not a decoration budget. */
const SLOW_CONNECTIONS = new Set(["slow-2g", "2g", "3g"]);

export type VideoConditions = {
  /** `navigator.connection.saveData` — the visitor asked for less data. */
  saveData?: boolean;
  /** `navigator.connection.effectiveType`; absent when the browser has no Network Information API. */
  effectiveType?: string;
  /** `(prefers-reduced-motion: reduce)` matches. */
  prefersReducedMotion: boolean;
};

export function shouldLoadDecorativeVideo({
  saveData,
  effectiveType,
  prefersReducedMotion,
}: VideoConditions): boolean {
  if (prefersReducedMotion) return false;
  if (saveData) return false;
  // Unknown means unknown: only the values we know to be slow are slow.
  if (effectiveType && SLOW_CONNECTIONS.has(effectiveType)) return false;
  return true;
}

type NetworkInformation = { saveData?: boolean; effectiveType?: string };

/** Reads the three signals off the current browser. Call inside an effect. */
export function readVideoConditions(): VideoConditions {
  const connection = (navigator as Navigator & { connection?: NetworkInformation })
    .connection;
  return {
    saveData: connection?.saveData,
    effectiveType: connection?.effectiveType,
    prefersReducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches,
  };
}
