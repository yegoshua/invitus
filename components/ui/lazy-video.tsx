"use client";

import { useEffect, useRef } from "react";
import { useVideoGate } from "@/hooks/use-video-gate";

/**
 * A `<video>` that costs nothing until the visitor is on their way to it.
 *
 * It renders the element from the first paint — same box, same classes, so the
 * layout is identical whether or not the video ever loads and CLS stays 0 —
 * and attaches the source only once the gate opens. It plays on screen and
 * pauses off it, so a section the visitor has scrolled past stops spending
 * their battery.
 *
 * Under `save-data`, a slow connection, or `prefers-reduced-motion` the source
 * is never attached at all. `onActiveChange` is how a section finds that out,
 * so it can drop controls that would otherwise sit over an empty box.
 */

export type LazyVideoProps = {
  src: string;
  className?: string;
  /** Live: flipping this mutes and unmutes the element. */
  muted?: boolean;
  loop?: boolean;
  poster?: string;
  /** Fires with `true` when the source has been attached, `false` while the gate is shut. */
  onActiveChange?: (active: boolean) => void;
  /** Overrides how far ahead of the viewport loading begins. Defaults to a viewport and a half. */
  loadMargin?: string;
};

export function LazyVideo({
  src,
  className,
  muted = true,
  loop = true,
  poster,
  onActiveChange,
  loadMargin,
}: LazyVideoProps) {
  const { ref, shouldLoad, isInView } = useVideoGate<HTMLVideoElement>({
    loadMargin,
  });

  // Held in a ref so a caller passing an inline arrow — the ordinary thing to
  // do — does not turn every render into another notification.
  const onActiveChangeRef = useRef(onActiveChange);
  useEffect(() => {
    onActiveChangeRef.current = onActiveChange;
  });
  useEffect(() => {
    onActiveChangeRef.current?.(shouldLoad);
  }, [shouldLoad]);

  useEffect(() => {
    const video = ref.current;
    if (!video || !shouldLoad) return;

    if (isInView) {
      // Rejected when the browser declines to autoplay; there is nothing to do
      // about it and nothing to report.
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [ref, shouldLoad, isInView]);

  return (
    <video
      ref={ref}
      // `undefined` rather than "": an empty src resolves against the document
      // and makes the browser request the page itself.
      src={shouldLoad ? src : undefined}
      poster={poster}
      muted={muted}
      loop={loop}
      playsInline
      preload="none"
      className={className}
    />
  );
}
