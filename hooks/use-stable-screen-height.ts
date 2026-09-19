"use client";

import { useEffect, useState } from "react";
import {
  domProbeEnv,
  measureSmallViewportHeight,
  pinnedViewport,
  type Viewport,
} from "@/lib/stable-viewport";

/**
 * A screen height that does not move when the mobile browser chrome does.
 *
 * Returns a CSS length to put wherever `100svh` would otherwise go. Before
 * hydration — and if anything about the measurement fails — that is literally
 * `100svh`, so the server-rendered box and the pinned one are the same box.
 *
 * Why any of this exists, and why re-measuring is tied to the viewport *width*
 * rather than to resize events in general, is in `lib/stable-viewport.ts`.
 */
export function useStableScreenHeight(): string {
  const [pinned, setPinned] = useState<Viewport | null>(null);

  useEffect(() => {
    let current: Viewport | null = null;
    const env = domProbeEnv();

    const measure = () => {
      const next = pinnedViewport(current, {
        width: window.innerWidth,
        height: measureSmallViewportHeight(env, () => window.innerHeight),
      });
      if (next === current) return;
      current = next;
      setPinned(next);
    };

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, []);

  return pinned ? `${pinned.height}px` : "100svh";
}
