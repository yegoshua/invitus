"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { testimonials } from "@/content/testimonials";

export function TestimonialsSection() {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    slidesToScroll: 1,
    containScroll: false,
    startIndex: 5, // Start in the middle
  });

  const [selectedIndex, setSelectedIndex] = useState(5);
  const [isMuted, setIsMuted] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1280);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi]
  );

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  // Manage video playback - only play the selected video
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (video) {
        if (index === selectedIndex) {
          video.play().catch(() => {});
        } else {
          video.pause();
          video.currentTime = 0;
        }
      }
    });
  }, [selectedIndex]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    videoRefs.current.forEach((video) => {
      if (video) {
        video.muted = !isMuted;
      }
    });
  };

  return (
    <section className="bg-black pt-20 lg:pt-45 overflow-hidden">
      <div className="container-main">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-left md:text-center mb-10 lg:mb-20"
        >
          <h2 className="text-h2 font-bold text-white">
            Ті, хто вже рвуть рекорди
          </h2>
        </motion.div>
      </div>

      {/* Carousel - full width */}
      <div className="relative">
        <div ref={emblaRef}>
          <div className="flex">
            {testimonials.map((testimonial, index) => {
              const isSelected = index === selectedIndex;
              const scale = isSelected ? 1 : (isMobile ? 0.95 : 0.83);

              return (
                <div
                  key={testimonial.id}
                  className="flex-[0_0_318px] xl:flex-[0_0_384px] px-2 lg:px-3 h-[604px] xl:h-[720px] flex items-center justify-center"
                >
                  <div
                    className={`relative bg-surface rounded-[32px] lg:rounded-[40px] overflow-hidden w-[318px] h-[566px] xl:w-[384px] xl:h-[682px] ${
                      !isSelected ? "cursor-pointer" : ""
                    }`}
                    style={{
                      transform: `scale(${scale})`,
                      opacity: isSelected ? 1 : 0.5,
                      transition: "transform 0.4s ease-out, opacity 0.4s ease-out",
                    }}
                    onClick={() => !isSelected && scrollTo(index)}
                  >
                    <video
                      ref={(el) => {
                        videoRefs.current[index] = el;
                      }}
                      src={testimonial.video}
                      className="absolute inset-0 w-full h-full object-cover"
                      loop
                      muted={isMuted}
                      playsInline
                      preload="metadata"
                    />

                    {/* Mute button - only on selected */}
                    {isSelected && (
                      <button
                        onClick={toggleMute}
                        className="absolute bottom-6 right-6 z-20"
                        aria-label={isMuted ? "Unmute" : "Mute"}
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          {isMuted ? (
                            <path d="M16.25 16.8001L14.05 14.6001L16.65 12.0001L14.05 9.4001L16.25 7.2001L18.85 9.8001L21.45 7.2001L23.65 9.4001L21.05 12.0001L23.65 14.6001L21.45 16.8001L18.85 14.2001L16.25 16.8001ZM1.34998 15.8501V8.1501H5.84998L12.05 1.9751V22.0251L5.84998 15.8501H1.34998ZM8.89998 9.5751L7.14998 11.3001H4.49998V12.7001H7.14998L8.89998 14.4251V9.5751Z" fill="white"/>
                          ) : (
                            <path d="M18.5 12C18.5 10.23 17.48 8.71 16 7.97V16.02C17.48 15.29 18.5 13.77 18.5 12ZM5.84998 15.8501H1.34998V8.1501H5.84998L12.05 1.9751V22.0251L5.84998 15.8501Z" fill="white"/>
                          )}
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="hidden xl:flex justify-center gap-3 mt-8 lg:mt-12">
          <button
            onClick={scrollPrev}
            className="w-12 h-12 flex items-center justify-center border-2 border-coral rounded-[16px] text-coral hover:bg-coral hover:text-black transition-all duration-300"
            aria-label="Previous"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={scrollNext}
            className="w-12 h-12 flex items-center justify-center border-2 border-coral rounded-[16px] text-coral hover:bg-coral hover:text-black transition-all duration-300"
            aria-label="Next"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
