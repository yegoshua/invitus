"use client";

import { useEffect, useRef, useState } from "react";

export function ConfettiOverlay() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onEnded = () => setHidden(true);
    video.addEventListener("ended", onEnded);
    return () => video.removeEventListener("ended", onEnded);
  }, []);

  if (hidden) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[100] overflow-hidden"
    >
      <video
        ref={videoRef}
        src="/assets/animations/cup-confetti-transparent.webm"
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover"
      />
    </div>
  );
}
