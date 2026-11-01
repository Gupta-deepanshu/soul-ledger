"use client";

import { useEffect, useRef } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";
import { EASE } from "@/lib/motion";
import { formatCompact, formatDuration, formatInt, formatPercent } from "@/lib/format";

const FORMATS = {
  compact: (v: number) => formatCompact(v),
  int: (v: number) => formatInt(v),
  /** Value is a 0–1 ratio. */
  percent: (v: number) => formatPercent(v),
  /** Value is seconds. */
  duration: (v: number) => formatDuration(v),
  /** One decimal, e.g. KDA 3.2. */
  decimal: (v: number) => v.toFixed(1),
};

export type NumberFormat = keyof typeof FORMATS;

/**
 * A number that counts up from zero the first time it scrolls into view, and
 * tweens from its old value (never from zero) when the value changes.
 * Server-rendered with the final value, so it reads correctly without JS.
 */
export function AnimatedNumber({ value, format, className }: { value: number; format: NumberFormat; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduceMotion = useReducedMotion();
  const shown = useRef<number | null>(null);
  const fmt = FORMATS[format];

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView) return;
    const from = shown.current ?? 0;
    shown.current = value;
    if (reduceMotion || from === value) {
      el.textContent = fmt(value);
      return;
    }
    const controls = animate(from, value, {
      duration: 0.8,
      ease: EASE,
      onUpdate: (v) => {
        el.textContent = fmt(v);
      },
    });
    return () => controls.stop();
  }, [value, inView, reduceMotion, fmt]);

  return (
    <span ref={ref} className={className}>
      {fmt(value)}
    </span>
  );
}
