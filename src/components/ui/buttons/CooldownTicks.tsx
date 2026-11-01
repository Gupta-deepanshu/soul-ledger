"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const TICKS = 25;

/**
 * A cooldown shown as a row of TickMeter-style ticks that empty right → left,
 * one every `durationS / 25` seconds, until `until` (epoch ms). Decorative:
 * pair it with a status message for screen readers. Ticks switch colour
 * (no movement), so it is the same with reduced motion.
 */
export function CooldownTicks({ until, durationS, className }: { until: number | null; durationS: number; className?: string }) {
  // 0 until the first interval tick: no Date.now() during render (prerender-safe).
  // Until then `remaining` is ≥ 1, so the row starts full, which is right.
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (until == null) return;
    const step = (durationS * 1000) / TICKS;
    const id = window.setInterval(() => setNow(Date.now()), Math.min(250, step));
    const stop = window.setTimeout(() => window.clearInterval(id), Math.max(0, until - Date.now()) + 50);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(stop);
    };
  }, [until, durationS]);

  const remaining = until == null ? 0 : Math.max(0, until - now) / (durationS * 1000);
  const filled = Math.ceil(Math.min(1, remaining) * TICKS);

  return (
    <div aria-hidden="true" className={cn("flex h-1.5 gap-0.5 md:gap-[3px]", className)}>
      {Array.from({ length: TICKS }, (_, i) => (
        <span
          key={i}
          className={cn("flex-1 transition-colors duration-200", i < filled ? "bg-brass" : "bg-line")}
        />
      ))}
    </div>
  );
}
