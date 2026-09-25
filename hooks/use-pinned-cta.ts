"use client";

import { useEffect, useState, type RefObject } from "react";
import { shouldPinCta } from "@/lib/pinned-cta";

/**
 * True once the in-flow buttons behind `ref` have been scrolled past, which is
 * when their pinned copy should show. The rule is `shouldPinCta`; this only
 * feeds it an IntersectionObserver, so it costs nothing per scroll frame.
 */
export function usePinnedCta(ref: RefObject<HTMLElement | null>): boolean {
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      setPinned(
        shouldPinCta({
          isIntersecting: entry.isIntersecting,
          top: entry.boundingClientRect.top,
        })
      );
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return pinned;
}
