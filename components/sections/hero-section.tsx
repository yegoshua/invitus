"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CTAButton } from "@/components/ui/cta-button";
import { blobUrl } from "@/lib/blob";
import { readVideoConditions, shouldLoadDecorativeVideo } from "@/lib/video-conditions";

// Re-encoded from the 19 MB original: 1920x1080 H.264, CRF 30, chroma zeroed
// (it renders greyscaled anyway, so colour was pure cost) and +faststart —
// 1.4 MB. Compression artefacts that would be obvious in a clean video are
// invisible at 30% opacity under a 60% black overlay, which is what makes the
// re-encode free. Hosted on Blob, see lib/blob.ts.
const HERO_VIDEO_URL = blobUrl("hero/hero-section.mp4");

// The video's first frame with the greyscale and the 30% opacity over #1a1a1a
// *baked in*, so the still and the first frame are the same picture and the
// fade reads as the page coming to life rather than as a swap. It stays in
// public/, served same-origin: it is the LCP element, and a DNS lookup plus a
// TLS handshake on that path would cost far more than the 19 KB it saves.
const HERO_POSTER_URL = "/assets/hero-poster.webp";

export function HeroSection() {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);

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
      <section className="relative h-[calc(100svh-16px)] sm:h-[calc(100svh-24px)] lg:h-[calc(100svh-32px)] flex items-end bg-[#1a1a1a] overflow-hidden rounded-section">
        {/* Background: the poster paints, the video fades in over it later */}
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element -- the treatment
              is already baked into a 19 KB file; the image optimiser would add
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
            // The video carries its treatment inside an opaque #1a1a1a layer
            // and that whole layer is what fades in, so at rest the hero is
            // 30% video over #1a1a1a and nothing else. Fading the bare video
            // over the poster instead would leave the poster showing through
            // its 70% — a permanent still of frame one ghosted under the
            // motion, and a background brighter than the design.
            <div
              className={`absolute inset-0 bg-[#1a1a1a] transition-opacity duration-1000 ${
                videoReady ? "opacity-100" : "opacity-0"
              }`}
            >
              <video
                src={videoSrc}
                autoPlay
                loop
                muted
                playsInline
                aria-hidden="true"
                onCanPlay={() => setVideoReady(true)}
                className="absolute inset-0 w-full h-full object-cover grayscale opacity-30"
              />
            </div>
          )}
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-[#1a1a1a]/60" />
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
