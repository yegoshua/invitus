"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { CTAButton } from "@/components/ui/cta-button";
import { blobUrl } from "@/lib/blob";
import { readVideoConditions, shouldLoadDecorativeVideo } from "@/lib/video-conditions";
import { useStableScreenHeight } from "@/hooks/use-stable-screen-height";

// From the 27 MB camera original: 1920x1080, 60 -> 30 fps, chroma zeroed (it
// is shown greyscale), a light denoise and CRF 28 — 4.4 MB. The denoise is
// what makes even that size possible: this clip is grainy, grain is noise to
// a codec, and CRF 28 without it costs 16 MB. This is the higher-quality half
// of a pair; the same encode at CRF 30 is 2.3 MB and the difference between
// them is hard to see on a still, let alone on a moving background.
// Hosted on Blob, see lib/blob.ts; a recut gets a new path rather than
// overwriting the old one, so a deployment still serving the old poster keeps
// the video that matches it.
const HERO_VIDEO_URL = blobUrl("hero/hero-gym-1080-hq.mp4");

// The video's first frame, greyscale like the video, at 1280 wide and WebP
// quality 50 — 53 KB. It is the LCP element and it is replaced within about a
// second, so it is sized for arriving fast rather than for being inspected;
// full width at a quality that survives inspection is 66 KB. It stays in
// public/, served same-origin: a DNS lookup plus a TLS handshake on that path
// would cost far more than it saves.
const HERO_POSTER_URL = "/assets/hero-poster.webp";

export function HeroSection() {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  // `100svh` is already the stable unit in a browser that only hides its
  // chrome. It is not stable in an in-app browser, which resizes its web view
  // outright — and there the hero is the first of several viewport-sized boxes
  // that would all move at once. Pinned, it is the same box either way.
  const screenHeight = useStableScreenHeight();

  useEffect(() => {
    if (!shouldLoadDecorativeVideo(readVideoConditions())) return;

    // Nothing about the video may compete with the page arriving, so it is not
    // requested until everything else has landed.
    let cancelled = false;
    const start = () => {
      if (!cancelled) setVideoSrc(HERO_VIDEO_URL);
    };

    if (document.readyState === "complete") {
      const timer = window.setTimeout(start, 0);
      return () => {
        cancelled = true;
        window.clearTimeout(timer);
      };
    }

    window.addEventListener("load", start, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", start);
    };
  }, []);

  return (
    <div className="bg-black p-2 pt-0 sm:p-3 lg:p-4">
      <section
        style={{ "--screen": screenHeight } as CSSProperties}
        className="relative h-[calc(var(--screen)-16px)] sm:h-[calc(var(--screen)-24px)] lg:h-[calc(var(--screen)-32px)] flex items-end bg-[#1a1a1a] overflow-hidden rounded-section"
      >
        {/* Background: the poster paints, the video fades in over it later */}
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element -- the file is
              already a 53 KB WebP; the image optimiser would add
              a round trip to the LCP path and save nothing. */}
          <img
            src={HERO_POSTER_URL}
            alt=""
            aria-hidden="true"
            width={1920}
            height={1080}
            fetchPriority="high"
            decoding="sync"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {videoSrc && (
            <video
              src={videoSrc}
              autoPlay
              loop
              muted
              playsInline
              aria-hidden="true"
              onCanPlay={() => setVideoReady(true)}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
                videoReady ? "opacity-100" : "opacity-0"
              }`}
            />
          )}
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-[#1a1a1a]/20" />
        </div>

        {/* Content */}
        <div className="container-main relative z-10 pb-8 lg:pb-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 lg:gap-16">
            {/* H1 Title - Left Bottom */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex-1 text-h1 text-white max-w-4xl"
            >
              Твій Gym Bro
              <br />
              на кожному підході
            </motion.h1>

            {/* CTA Button - Right Bottom */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <CTAButton href="/shop/belts">
                <span className="hidden lg:inline">ЗАБРАТИ СВІЙ ПОЯС</span>
                <span className="lg:hidden">ЗАБРАТИ ПОЯС</span>
              </CTAButton>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
