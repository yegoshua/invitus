"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

// "Fade up on scroll" — the dominant motion pattern across the app:
//   initial={{ opacity: 0, y }} whileInView animate viewport once
//
// Tuneable knobs (delay/duration/y) cover ~95% of the existing call sites.
// For non-fade-up patterns (e.g. mount animations with `animate`, x-axis
// swings) keep using <motion.div> directly.

type FadeUpProps = HTMLMotionProps<"div"> & {
  delay?: number;
  duration?: number;
  y?: number;
};

export function FadeUp({
  delay = 0,
  duration = 0.6,
  y = 20,
  children,
  ...rest
}: FadeUpProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}