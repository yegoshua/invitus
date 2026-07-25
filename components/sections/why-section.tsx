"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { beltFeatures as features } from "@/content/why-belt-features";

gsap.registerPlugin(ScrollTrigger);

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

export function WhySection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    // iOS activation
    const activate = () => { video.play(); video.pause(); };
    document.documentElement.addEventListener("touchstart", activate, { once: true });

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

        // Blob the video source to prevent browser from dropping segments
        const src = video.currentSrc || video.src;
        if (typeof window !== "undefined") {
          fetch(src)
            .then((res) => res.blob())
            .then((blob) => {
              const blobURL = URL.createObjectURL(blob);
              const t = video.currentTime;
              video.src = blobURL;
              video.currentTime = t + 0.01;
            });
        }

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
  }, []);

  return (
    <div className="bg-black p-2 sm:p-3 lg:p-4">
      <div
        ref={containerRef}
        className="relative bg-coral rounded-section"
        style={{ height: "700vh" }}
      >
        <div className="sticky top-0 h-screen overflow-hidden">
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
                <video
                  ref={videoRef}
                  src="/assets/belt-benefits-section-video-scrub.webm"
                  muted
                  playsInline
                  preload="auto"
                  className="w-full max-w-[816px] max-h-full object-contain"
                  style={{ background: "transparent" }}
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
