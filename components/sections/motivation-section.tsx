"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  ScrollVelocityContainer,
  ScrollVelocityRow,
} from "@/components/ui/scroll-based-velocity";

export function MotivationSection() {
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  return (
    <section className="bg-black pt-20 lg:pt-45 relative overflow-hidden">
      {/* Background ScrollVelocity */}
      <ScrollVelocityContainer className="font-heading text-[120px] md:text-[237px] leading-none space-y-10 lg:space-y-0 mb-40 lg:mb-0 lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:absolute font-bold text-surface z-0">
        <ScrollVelocityRow baseVelocity={10} direction={1}>
          &nbsp;INVITUS&nbsp;
        </ScrollVelocityRow>
        <div className="lg:hidden">
          <ScrollVelocityRow baseVelocity={10} direction={-1}>
            &nbsp;INVITUS&nbsp;
          </ScrollVelocityRow>
        </div>
      </ScrollVelocityContainer>

      {/* Centered Video Container */}
      <div className="container-main [--container-px:0.5rem] sm:[--container-px:0.75rem] lg:[--container-px:clamp(1rem,5vw,2rem)] relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex justify-center"
        >
          <div className="relative w-full max-w-[384px] h-[500px] lg:h-[682px] rounded-[32px] lg:rounded-[40px] overflow-hidden bg-neutral-900">
            {/* Video */}
            <video
              ref={videoRef}
              autoPlay
              loop
              muted={isMuted}
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src="/assets/Motivation Section.MP4" type="video/mp4" />
            </video>

            {/* Mute/Unmute Button */}
            <button
              onClick={toggleMute}
              className="absolute bottom-6 right-6 z-20 cursor-pointer"
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
          </div>
        </motion.div>
      </div>
    </section>
  );
}
