"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    id: 1,
    title: "Фіксація в один клік",
    description:
      "Забудь про метушню з пряжками. Посилена сталь тримає мертво, щоб ти думав про вагу, а не про екіп.",
  },
  {
    id: 2,
    title: "Преміум матеріали",
    description:
      "Натуральна шкіра товщиною 13мм витримує будь-які навантаження. Пояс, який переживе твої рекорди.",
  },
  {
    id: 3,
    title: "Ергономічний дизайн",
    description:
      "Анатомічна форма ідеально лягає на тіло. Жодного дискомфорту навіть на найважчих підходах.",
  },
  {
    id: 4,
    title: "Зроблено в Україні",
    description:
      "Підтримуй своїх. Кожен пояс створений українськими майстрами з любов'ю до деталей.",
  },
];

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

        tl.fromTo(
          video,
          { currentTime: 0 },
          { currentTime: video.duration || 1 }
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
        cardRefs.current.forEach((card, index) => {
          if (!card) return;

          const segmentSize = 1 / total;
          const start = index * segmentSize;
          const enterEnd = start + segmentSize * 0.4;
          const nextStart = (index + 1) * segmentSize;
          const exitEnd = nextStart + segmentSize * 0.4;

          const inner = card.querySelector("[data-card-inner]") as HTMLElement;
          if (!inner) return;

          // Set initial state explicitly so reverse restores it
          gsap.set(inner, { scale: 1, opacity: 1, filter: "blur(0px)" });

          // Enter: slide up from below (except first card)
          if (index > 0) {
            gsap.set(card, { yPercent: 100 });
            gsap.to(card, {
              yPercent: 0,
              ease: "power2.out",
              scrollTrigger: {
                trigger: container,
                start: `${start * 100}% top`,
                end: `${enterEnd * 100}% top`,
                scrub: true,
              },
            });
          }

          // Exit: scale down + blur + fade (except last card)
          if (index < total - 1) {
            gsap.to(inner, {
              scale: 0.9,
              opacity: 0.6,
              filter: "blur(8px)",
              ease: "power1.in",
              scrollTrigger: {
                trigger: container,
                start: `${nextStart * 100}% top`,
                end: `${exitEnd * 100}% top`,
                scrub: true,
              },
            });
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
        style={{ height: "1000vh" }}
      >
        <div className="sticky top-0 h-screen overflow-hidden">
          <div className="container-main relative z-10 h-full flex flex-col py-16 lg:py-30">
            {/* Heading */}
            <h2 className="text-h2 font-bold text-black leading-[1.1] max-w-xl">
              Чому наші пояси —
              <br className="lg:block hidden" />
              це база
            </h2>

            {/* Main content row */}
            <div className="flex-1 flex items-center justify-between gap-8">
              {/* Left: scroll-controlled video (desktop only) */}
              <div className="hidden lg:flex flex-1 items-center justify-center">
                <video
                  ref={videoRef}
                  src="/assets/belt-benefits-section-video-scrub.webm"
                  muted
                  playsInline
                  preload="auto"
                  className="w-full max-w-[816px] object-contain"
                  style={{ background: "transparent" }}
                />
              </div>

              {/* Right: Feature Cards */}
              <div className="relative w-full max-w-xl h-125 lg:h-180 overflow-hidden rounded-[32px] lg:rounded-[40px]">
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
                      <div className="relative bg-black rounded-[32px] lg:rounded-[40px] p-8 lg:p-12 h-full flex flex-col justify-center">
                        <h3 className="font-heading text-xl lg:text-2xl font-bold text-white mb-4">
                          {feature.title}
                        </h3>
                        <p className="text-neutral-400 text-base lg:text-lg leading-relaxed max-w-sm">
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
