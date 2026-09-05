"use client";

import { useEffect, type RefObject } from "react";

/**
 * Creeps a horizontally scrollable row to its end, slowly enough to read as
 * "this moves" rather than as motion for its own sake.
 *
 * A row of chips that is cut off at the screen edge looks finished — nothing
 * says the rest is there. Scrolling it a little on the user's behalf does. It
 * runs once, only when the row actually overflows, and hands control back the
 * moment the user touches it: a hint that keeps going after the user has
 * understood it is a fight over the scrollbar. Reduced motion skips it.
 */
export function useScrollHint(
  ref: RefObject<HTMLElement | null>,
  {
    pixelsPerSecond = 18,
    delayMs = 900,
  }: { pixelsPerSecond?: number; delayMs?: number } = {}
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.scrollWidth - el.clientWidth < 8) return;

    let frame = 0;
    let stopped = false;
    let last = 0;
    let position = el.scrollLeft;

    const stop = () => {
      stopped = true;
      cancelAnimationFrame(frame);
    };
    const step = (now: number) => {
      if (stopped) return;
      if (last) {
        position += ((now - last) / 1000) * pixelsPerSecond;
        el.scrollLeft = position;
      }
      last = now;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 1) return;
      frame = requestAnimationFrame(step);
    };

    // Any input on the row is the user taking over, including a scroll that
    // is not ours (a fling from the touch events we already watch).
    const takeover: (keyof HTMLElementEventMap)[] = [
      "pointerdown",
      "touchstart",
      "wheel",
    ];
    for (const type of takeover) el.addEventListener(type, stop, { passive: true });

    const timer = window.setTimeout(() => {
      frame = requestAnimationFrame(step);
    }, delayMs);

    return () => {
      stop();
      window.clearTimeout(timer);
      for (const type of takeover) el.removeEventListener(type, stop);
    };
  }, [ref, pixelsPerSecond, delayMs]);
}
