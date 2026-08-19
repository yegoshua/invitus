"use client";

import { useRef, useEffect, useState, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useVideoGate } from "@/hooks/use-video-gate";
import { beltFeatures as features } from "@/content/why-belt-features";
import { useStableScreenHeight } from "@/hooks/use-stable-screen-height";

gsap.registerPlugin(ScrollTrigger);

// Mobile browser chrome collapsing on scroll fires a resize, and a resize makes
// ScrollTrigger recompute every start/end below — mid-scroll, which reads on
// screen as the cards re-snapping to a position the finger never asked for.
// The section's own geometry is pinned to a stable height (see SCRUB_SCREENS),
// so there is nothing for that refresh to correct.
ScrollTrigger.config({ ignoreMobileResize: true });

// Stays in the repo's public assets rather than on Blob: unlike the hero, this
// is not recut content. Its playback is bound to the card timings below, so it
// changes only when this file changes.
const SCRUB_SRC = "/assets/belt-benefits-section-video-scrub.webm";

// Two screens of warning rather than the usual one and a half. The section sits
// about two screens down, so the fetch starts within a moment of the page
// finishing — which is what "ready on arrival" costs for a 9.6 MB file that
// nothing is allowed to re-encode.
const SCRUB_LOAD_MARGIN = "200% 0px";

// Seconds, relative to belt-benefits-section-video-scrub.webm (~14.17s).
// Each tuple is [fullyVisibleStart, fullyVisibleEnd]; gaps between cards are
// the transition windows where the previous card exits and the next enters.
const CARD_TIMINGS: Array<[number, number]> = [
  [0, 2],
  [2.5, 4],
  [5.5, 7],
  [8, Infinity],
];

// Trim the effective scroll-mapped duration so the section doesn't drag on
// after the last card lands. Last card enter ends at 8s; +1s buffer for it
// to breathe before the section releases.
const EFFECTIVE_DURATION_S = 9;

// The scroll runway, in screens. It used to be written straight into the
// container as `700vh`, which is what made the page lurch on mobile: measured
// at 375x752 → 375x852, 100px of browser chrome bought 800px of jump. The rule
// that fixes it, and the reasoning, are in `lib/stable-viewport.ts`.
const SCRUB_SCREENS = 7;

export function WhySection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const screenHeight = useStableScreenHeight();
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // The runway only ever changes on a width change (see the hook), and when it
  // does every trigger below is measured against the old one.
  useEffect(() => {
    ScrollTrigger.refresh();
  }, [screenHeight]);

  // `essential`, because the 700vh of card animation below is driven off this
  // video's duration: skipped, the section is seven screens of a single card.
  // Deferred is fine; absent is not.
  const { ref: videoRef, shouldLoad } = useVideoGate<HTMLVideoElement>({
    loadMargin: SCRUB_LOAD_MARGIN,
    essential: true,
  });
  const [sourceAttached, setSourceAttached] = useState(false);

  // The file is fetched into a blob and handed straight to the element, which
  // is also what stops the browser dropping decoded segments mid-scrub. It used
  // to be a *second* download on top of an eager `preload="auto"`, and the swap
  // between the two is what the old `currentTime + 0.01` was repairing. Fetching
  // it once and never attaching the plain URL removes the second download and
  // the swap together.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shouldLoad) return;

    let cancelled = false;
    let objectUrl: string | undefined;

    const attach = (src: string) => {
      if (cancelled) return;
      video.src = src;
      setSourceAttached(true);
      // iOS plays VP9 only after a user gesture has touched this element, and
      // there is nothing to touch until it has a source — so the listener is
      // registered here rather than on mount.
      const activate = () => {
        video.play();
        video.pause();
      };
      document.documentElement.addEventListener("touchstart", activate, {
        once: true,
      });
    };

    fetch(SCRUB_SRC)
      .then((res) => res.blob())
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        attach(objectUrl);
      })
      // A failed fetch must not cost the visitor the section; the element can
      // stream the file itself.
      .catch(() => attach(SCRUB_SRC));

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [videoRef, shouldLoad]);

  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video || !sourceAttached) return;

    const setupTimeline = () => {
      const ctx = gsap.context(() => {
        const total = features.length;

        // ── Video scroll scrub (fromTo on currentTime) ───────────────
        const tl = gsap.timeline({
          defaults: { duration: 1 },
          scrollTrigger: {
            trigger: container,
            start: "top top",
            end: "bottom bottom",
            scrub: true,
          },
        });

        const scrubEnd = Math.min(EFFECTIVE_DURATION_S, video.duration || EFFECTIVE_DURATION_S);

        tl.fromTo(
          video,
          { currentTime: 0 },
          { currentTime: scrubEnd }
        );

        // ── Card animations ──────────────────────────────────────────
        const duration = scrubEnd;
        const toProgress = (s: number) => Math.min(s, duration) / duration;

        cardRefs.current.forEach((card, index) => {
          if (!card) return;

          const [visibleStart] = CARD_TIMINGS[index];
          const prevVisibleEnd =
            index > 0 ? CARD_TIMINGS[index - 1][1] : 0;

          const enterStart = toProgress(prevVisibleEnd);
          const enterEnd = toProgress(visibleStart);

          const inner = card.querySelector("[data-card-inner]") as HTMLElement;
          if (!inner) return;

          // Set initial state explicitly so reverse restores it
          gsap.set(inner, { scaleX: 1, scaleY: 1, opacity: 1, filter: "blur(0px)" });

          // Enter: slide up from below (except first card)
          if (index > 0) {
            gsap.set(card, { yPercent: 100 });
            gsap.to(card, {
              yPercent: 0,
              ease: "power2.out",
              scrollTrigger: {
                trigger: container,
                start: `${enterStart * 100}% top`,
                end: `${enterEnd * 100}% top`,
                scrub: true,
              },
            });
          }

          // Exit cascade.
          //  - Depth 1 (just-previous): stays visible at opacity 0.4 (peek)
          //    and shrinks slightly so it sits behind the active card.
          //  - Depth 2+ (skipped): snaps to opacity 0 the instant the NEXT
          //    card starts entering, so it doesn't stack with depth 1.
          for (let j = index + 1; j < total; j++) {
            const transitionStart = toProgress(CARD_TIMINGS[j - 1][1]);
            const transitionEnd = toProgress(CARD_TIMINGS[j][0]);
            const depth = j - index;
            const isImmediatePrev = depth === 1;

            // Scale + blur scrub across the transition (visual cascade)
            gsap.to(inner, {
              scaleX: 1 - depth * 0.15,
              scaleY: 1 - depth * 0.05,
              filter: isImmediatePrev ? "blur(2px)" : "blur(0px)",
              ease: "power1.in",
              scrollTrigger: {
                trigger: container,
                start: `${transitionStart * 100}% top`,
                end: `${transitionEnd * 100}% top`,
                scrub: true,
              },
            });

            if (isImmediatePrev) {
              // Smooth fade to peek opacity during the transition
              gsap.to(inner, {
                opacity: 0.4,
                ease: "power1.in",
                scrollTrigger: {
                  trigger: container,
                  start: `${transitionStart * 100}% top`,
                  end: `${transitionEnd * 100}% top`,
                  scrub: true,
                },
              });
            } else {
              // Hard snap to 0 the moment this becomes "skipped" (another new
              // card entering after the just-previous), so it can't stack
              // behind the depth-1 peek.
              ScrollTrigger.create({
                trigger: container,
                start: `${transitionStart * 100}% top`,
                onEnter: () => gsap.set(inner, { opacity: 0 }),
                onLeaveBack: () => gsap.set(inner, { opacity: 0.4 }),
              });
            }
          }
        });
      }, container);

      return ctx;
    };

    let ctx: gsap.Context | undefined;

    if (video.readyState >= 1) {
      ctx = setupTimeline();
    } else {
      video.addEventListener("loadedmetadata", () => {
        ctx = setupTimeline();
      }, { once: true });
    }

    return () => {
      ctx?.revert();
    };
  }, [videoRef, sourceAttached]);

  return (
    <div className="bg-black p-2 sm:p-3 lg:p-4">
      <div
        ref={containerRef}
        className="relative bg-coral rounded-section"
        style={{
          "--scrub-screen": screenHeight,
          height: `calc(var(--scrub-screen) * ${SCRUB_SCREENS})`,
        } as CSSProperties}
      >
        <div className="sticky top-0 h-[var(--scrub-screen)] overflow-hidden">
          {/* pt clears the fixed header (64px on mobile) — the section is
              pinned, so the heading would otherwise sit under it. */}
          <div className="container-main relative z-10 h-full flex flex-col pt-20 pb-6 lg:py-30">
            {/* Heading */}
            <h2 className="text-h2 font-bold text-black leading-[1.1] max-w-xl">
              Чому наші пояси —&nbsp;
              <br className="lg:block hidden" />
              це база
            </h2>

            {/* Main content row — belt above cards on mobile/tablet,
                side by side from lg up. */}
            <div className="flex-1 min-h-0 flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-8">
              {/* Scroll-controlled belt. Takes whatever height the cards
                  leave; object-contain keeps it whole at any size. */}
              <div className="flex flex-1 min-h-0 w-full items-center justify-center lg:h-full">
                {/* VP9/WebM carrying transparency in an alpha channel, so the
                    belt sits directly on the section's coral.

                    Do NOT swap this for an H.264 with the coral baked in.
                    That was tried to fix Safari (which plays VP9 but ignores
                    its alpha, leaving the belt on a black rectangle on iOS)
                    and it broke every other browser instead: the baked coral
                    renders as a visibly lighter rectangle against the CSS
                    coral. Matching the two by eye is not enough — the browser
                    colour-manages the tagged video before painting it, so a
                    bake that measures identical in the file does not land
                    identical on screen. Safari still needs a real fix; a
                    mismatched box for everyone is not it. */}
                {/* No `src` and `preload="none"`: the source is a blob URL
                    attached by the effect above once the visitor is on their
                    way here. An eager preload alongside that fetch is what used
                    to download this 9.6 MB file twice. */}
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  preload="none"
                  className="w-full max-w-[816px] max-h-full object-contain"
                />
              </div>

              {/* Feature Cards — fixed height on mobile so the belt gets the rest */}
              <div className="relative w-full max-w-xl h-[264px] shrink-0 lg:shrink lg:h-full lg:max-h-180 overflow-hidden rounded-[32px] lg:rounded-[40px]">
                {features.map((feature, index) => (
                  <div
                    key={feature.id}
                    ref={(el) => { cardRefs.current[index] = el; }}
                    style={{ zIndex: index + 1 }}
                    className="absolute inset-0 will-change-transform"
                  >
                    <div
                      data-card-inner
                      className="w-full h-full will-change-transform origin-center"
                    >
                      <div className="relative bg-black rounded-[32px] lg:rounded-[40px] p-6 lg:p-12 h-full flex flex-col justify-start lg:justify-center">
                        <h3 className="font-heading text-xl lg:text-2xl font-bold text-white mb-3 lg:mb-4">
                          {feature.title}
                        </h3>
                        <p className="text-white text-base lg:text-lg leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
