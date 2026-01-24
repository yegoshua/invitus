"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight, Volume2, VolumeX } from "lucide-react";

// Gym/fitness videos from Pexels (portrait orientation)
const testimonials = [
  { id: 1, video: "https://videos.pexels.com/video-files/5319095/5319095-hd_1080_1920_25fps.mp4" },
  { id: 2, video: "https://videos.pexels.com/video-files/5319429/5319429-hd_1080_1920_25fps.mp4" },
  { id: 3, video: "https://videos.pexels.com/video-files/4686178/4686178-hd_1080_1920_30fps.mp4" },
  { id: 4, video: "https://videos.pexels.com/video-files/5319856/5319856-hd_1080_1920_25fps.mp4" },
  { id: 5, video: "https://videos.pexels.com/video-files/5837737/5837737-hd_1080_1920_24fps.mp4" },
  { id: 6, video: "https://videos.pexels.com/video-files/5319754/5319754-hd_1080_1920_25fps.mp4" },
  { id: 7, video: "https://videos.pexels.com/video-files/7187456/7187456-hd_1080_1920_24fps.mp4" },
  { id: 8, video: "https://videos.pexels.com/video-files/4684359/4684359-hd_1080_1920_24fps.mp4" },
  { id: 9, video: "https://videos.pexels.com/video-files/7423843/7423843-hd_1080_1920_30fps.mp4" },
  { id: 10, video: "https://videos.pexels.com/video-files/6389061/6389061-hd_1080_1920_25fps.mp4" },
];

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
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

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
    <section className="bg-black py-20 lg:py-32 overflow-hidden">
      <div className="container-main">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 lg:mb-16"
        >
          <h2 className="font-druk text-[32px] lg:text-[40px] font-bold text-white">
            Ті, хто вже рвуть рекорди
          </h2>
        </motion.div>
      </div>

      {/* Carousel - full width */}
      <div className="relative">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {testimonials.map((testimonial, index) => {
              const isSelected = index === selectedIndex;
              // Scale factor: 330/384 ≈ 0.86 for width, 568/682 ≈ 0.83 for height
              const scale = isSelected ? 1 : 0.83;

              return (
                <div
                  key={testimonial.id}
                  className="flex-[0_0_384px] px-2 lg:px-3 h-[720px] flex items-center justify-center"
                >
                  <div
                    className={`relative bg-[#212121] rounded-[32px] lg:rounded-[40px] overflow-hidden w-[384px] h-[682px] ${
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
                        className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors z-20"
                        aria-label={isMuted ? "Unmute" : "Mute"}
                      >
                        {isMuted ? (
                          <VolumeX className="w-5 h-5" />
                        ) : (
                          <Volume2 className="w-5 h-5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-center gap-3 mt-8 lg:mt-12">
          <button
            onClick={scrollPrev}
            className="p-3 lg:p-4 border-2 border-coral rounded-xl text-coral hover:bg-coral hover:text-black transition-all duration-300"
            aria-label="Previous"
          >
            <ArrowLeft className="w-5 h-5 lg:w-6 lg:h-6" />
          </button>
          <button
            onClick={scrollNext}
            className="p-3 lg:p-4 border-2 border-coral rounded-xl text-coral hover:bg-coral hover:text-black transition-all duration-300"
            aria-label="Next"
          >
            <ArrowRight className="w-5 h-5 lg:w-6 lg:h-6" />
          </button>
        </div>
      </div>
    </section>
  );
}
