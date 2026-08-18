"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether a CSS media query currently matches. `false` on the server and
 * through hydration, then the real answer.
 *
 * Exists so a component can be mounted for one breakpoint only. Tailwind's
 * `lg:hidden` / `hidden lg:block` pair hides markup, it does not skip it — both
 * branches mount, and for anything that owns a resource (a WebGL canvas, a
 * video element) that means paying for it twice and animating one copy nobody
 * can see.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query]
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  );
}

/** The `lg` breakpoint, where the product page swaps to its desktop layout. */
export const DESKTOP_QUERY = "(min-width: 1024px)";
