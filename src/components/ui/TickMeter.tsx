"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { cn } from "@/lib/utils";

const TICKS = Array.from({ length: 25 }, (_, i) => 44 + i * 0.5);

/**
 * 25 ticks from 44% to 56% in 0.5 steps; ticks up to the win rate are filled
 * (darker below 50%). Fills tick by tick the first time it is seen.
 * Decorative: always show the win rate as text next to it.
 */
export function TickMeter({ winRate, className }: { winRate: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const pct = winRate * 100;
  return (
    <div ref={ref} aria-hidden="true" className={cn("flex h-3.5 gap-0.5 md:h-5 md:gap-[3px] xl:h-[22px]", className)}>
      {TICKS.map((v, i) => (
        <span key={v} className="relative flex-1 bg-line">
          {v <= pct && (
            <motion.span
              className={cn("absolute inset-0", v >= 50 ? "bg-weapon" : "bg-meter-low")}
              initial={{ opacity: 0 }}
              animate={{ opacity: inView ? 1 : 0 }}
              transition={{ delay: inView ? i * 0.015 : 0, duration: 0.2 }}
            />
          )}
        </span>
      ))}
    </div>
  );
}
