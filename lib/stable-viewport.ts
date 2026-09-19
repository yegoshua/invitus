/**
 * One rule, kept in a module of its own because it is the fix for a bug that
 * looks like nothing when you read the markup that caused it.
 *
 * A scroll-driven section needs a runway many screens long, and the obvious way
 * to write that is a viewport unit — `700vh`. On mobile that is a trap. The
 * browser chrome collapses and expands as the visitor scrolls, the viewport
 * height changes with it, and a viewport unit multiplied by seven turns ~100px
 * of toolbar into ~800px of height change in a section that sits above most of
 * the page. Chrome absorbs it with scroll anchoring; WebKit has never shipped
 * scroll anchoring, so on iOS — and worst of all in the Instagram in-app
 * browser, which resizes its web view outright — the page lurches most of a
 * screen while the finger is still moving.
 *
 * So the runway is measured in pixels and re-measured only when the viewport
 * *width* changes: an orientation change or a desktop window drag, both real
 * layout changes a visitor expects to cost a reflow. A height-only change is
 * the toolbar and nothing else.
 */

export type Viewport = { width: number; height: number };

/**
 * The measurement a viewport-pinned section should use, given what it is
 * already pinned to. Returns `previous` unchanged when only the height moved —
 * returning an equal-but-new object would still re-render and re-layout.
 */
export function pinnedViewport(
  previous: Viewport | null,
  current: Viewport
): Viewport {
  if (previous && previous.width === current.width) return previous;
  return current;
}

/**
 * How the pinned height is *measured*, which matters as much as when.
 *
 * The obvious source is `window.innerHeight`, and it is wrong in the one case
 * that counts: a visitor who reloads with the chrome already collapsed reports
 * the large height, so a section whose server-rendered fallback was `100svh`
 * would jump on hydration — on a page whose LCP element is one of them.
 *
 * So the value comes from a throwaway element sized in `svh`. What is pinned is
 * then the same quantity the fallback already painted, and the hydration shift
 * is not "small" but zero by construction. `svh` is also the right quantity on
 * its own terms: the viewport with the chrome showing, which is what a pinned
 * panel must fit inside.
 */
export interface ViewportProbeEnv {
  supportsSmallViewport: () => boolean;
  createProbe: () => { measure: () => number; dispose: () => void };
}

export function measureSmallViewportHeight(
  env: ViewportProbeEnv,
  fallback: () => number
): number {
  if (!env.supportsSmallViewport()) return fallback();
  const probe = env.createProbe();
  try {
    const measured = probe.measure();
    // A zero reading means the element never laid out — pinning it would
    // collapse the section to nothing, which is worse than the bug.
    return measured > 0 ? measured : fallback();
  } finally {
    probe.dispose();
  }
}

/** The browser-backed environment. Separated so the rule above stays testable. */
export function domProbeEnv(): ViewportProbeEnv {
  return {
    supportsSmallViewport: () =>
      typeof CSS !== "undefined" &&
      typeof CSS.supports === "function" &&
      CSS.supports("height", "100svh"),
    createProbe: () => {
      const el = document.createElement("div");
      // Out of flow and invisible, so measuring costs no paint and no scroll.
      el.style.cssText =
        "position:fixed;top:0;left:0;width:0;height:100svh;visibility:hidden;pointer-events:none";
      document.documentElement.appendChild(el);
      return {
        measure: () => el.getBoundingClientRect().height,
        dispose: () => el.remove(),
      };
    },
  };
}
