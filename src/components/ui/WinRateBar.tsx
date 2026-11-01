"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { cn } from "@/lib/utils";

/** Fill share for a 0–1 win rate on the 40–60% scale. */
export function winRateFill(winRate: number) {
  return Math.min(1, Math.max(0, (winRate * 100 - 40) / 20));
}

/**
 * Win-rate track on a 40–60% scale with a tick at 50%. Grows from zero the
 * first time it is seen and resizes smoothly when the value changes.
 */
export function WinRateBar({
  winRate,
  className,
  fillClass = "bg-brass",
}: {
  winRate: number;
  className?: string;
  /** Fill colour; the hero pool uses `bg-mother` below 50%. */
  fillClass?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  return (
    <div ref={ref} aria-hidden="true" className={cn("relative h-[5px] flex-1 bg-rule md:h-1.5", className)}>
      <motion.div
        className={cn("h-full w-full origin-left", fillClass)}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: inView ? winRateFill(winRate) : 0 }}
        transition={{ duration: 0.5 }}
      />
      <span className="absolute top-[-3px] left-1/2 h-[11px] w-px bg-tick md:h-3" />
    </div>
  );
}
