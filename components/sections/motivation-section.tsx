"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
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
    <section className="bg-black py-20 lg:py-32 relative overflow-hidden">
      {/* Background ScrollVelocity */}
      <ScrollVelocityContainer className=" text-4xl md:text-[237px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-bold absolute text-[#212121] z-0">
        <ScrollVelocityRow baseVelocity={25} direction={1}>
          &nbsp;INVITUS&nbsp;
        </ScrollVelocityRow>
      </ScrollVelocityContainer>

      {/* Centered Video Container */}
      <div className="container-main relative z-10">
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
              className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-sm rounded-lg text-white hover:bg-black/70 transition-colors"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
