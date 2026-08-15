"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";
import { useIsHydrated } from "@/hooks/use-is-hydrated";
import {
  readVideoConditions,
  shouldLoadDecorativeVideo,
} from "@/lib/video-conditions";

/**
 * The rule for every below-the-fold video on the site: nothing is requested
 * before the page has finished arriving, nothing is requested until the visitor
 * is on their way to it, nothing plays once it has left the screen, and a
 * visitor who asked for less data or less motion gets none of it at all.
 *
 * This is the hook underneath `<LazyVideo>`. Reach for it directly only when a
 * section needs the gate but not the playback — a carousel that decides for
 * itself which of its videos plays, or a scrub whose `currentTime` is driven by
 * scroll rather than by the clock. Everything else should use the component.
 */

/**
 * A viewport and a half of warning. Enough for a few megabytes to land before
 * the section arrives — the point is that playback is *ready* on arrival, not
 * that it visibly starts on arrival — and not so much that a video three
 * screens down is fetched while the visitor is still reading the hero.
 */
const DEFAULT_LOAD_MARGIN = "150% 0px";

function subscribeToWindowLoad(onChange: () => void): () => void {
  if (document.readyState === "complete") return () => {};
  window.addEventListener("load", onChange, { once: true });
  return () => window.removeEventListener("load", onChange);
}

export type VideoGate<T extends HTMLElement> = {
  /** Attach to the element whose approach should open the gate. */
  ref: RefObject<T | null>;
  /** True once the element is near the viewport *and* the conditions allow video at all. Until then, render no `src`. */
  shouldLoad: boolean;
  /** True while the element is actually on screen. Play on true, pause on false. */
  isInView: boolean;
};

export type VideoGateOptions = {
  /** Overrides how far ahead of the viewport loading begins. */
  loadMargin?: string;
  /**
   * Set when the section does not work without its video — the belt scrub, whose
   * 700vh of card animation is driven off the video's own duration and would
   * otherwise be seven screens of nothing.
   *
   * Such a video is still deferred, exactly as any other; it is only exempt from
   * being *skipped*, because `save-data` and `prefers-reduced-motion` are asks
   * for less, not asks for a broken section. Do not reach for this to keep a
   * decorative video alive — that is the case the skipping exists for.
   */
  essential?: boolean;
};

export function useVideoGate<T extends HTMLElement = HTMLVideoElement>({
  loadMargin = DEFAULT_LOAD_MARGIN,
  essential = false,
}: VideoGateOptions = {}): VideoGate<T> {
  const ref = useRef<T | null>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [isInView, setIsInView] = useState(false);

  // Every signal here reads off the browser, so none of it exists until
  // hydration — which is what keeps the server from rendering a `src` and
  // requesting the video during the page load this whole hook exists to
  // protect. The gate can only ever open later.
  const hydrated = useIsHydrated();
  // Nothing here may compete with the page arriving. Without this a section
  // close enough to the fold to fall inside the load margin at rest — the belt
  // scrub sits about two screens down — would be requested during the page load
  // regardless of the observer, which is the whole cost this hook exists to
  // remove. The hero has followed the same rule since #37.
  const pageLoaded = useSyncExternalStore(
    subscribeToWindowLoad,
    () => document.readyState === "complete",
    () => false,
  );
  const allowed =
    hydrated &&
    pageLoaded &&
    (essential || shouldLoadDecorativeVideo(readVideoConditions()));
  // A browser without IntersectionObserver gets the video the ordinary way
  // rather than never — the gate is an optimisation, not a feature.
  const canObserve = hydrated && typeof IntersectionObserver !== "undefined";

  useEffect(() => {
    const element = ref.current;
    if (!element || !allowed || !canObserve || nearViewport) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        // One-way: once the bytes are paid for, moving away does not unpay them.
        setNearViewport(true);
        observer.disconnect();
      },
      { rootMargin: loadMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [allowed, canObserve, nearViewport, loadMargin]);

  useEffect(() => {
    const element = ref.current;
    if (!element || !canObserve) return;

    const observer = new IntersectionObserver(([entry]) =>
      setIsInView(entry.isIntersecting),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [canObserve]);

  // Without an observer there is nothing to wait for and nothing to pause on,
  // so the gate stands open and the video behaves as it did before this hook.
  return {
    ref,
    shouldLoad: allowed && (nearViewport || !canObserve),
    isInView: isInView || !canObserve,
  };
}
