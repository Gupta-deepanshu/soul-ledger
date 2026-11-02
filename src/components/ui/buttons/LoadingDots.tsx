"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useReducedButtons } from "./shared";

const DOTS = [0, 1, 2];
/** Seconds for one dot to fill and empty; the next starts a third of the way in. */
const CYCLE = 1.2;

/**
 * Three dots in the label's colour (`currentColor`) that fill in turn. Used in
 * place of a button's label while it loads; the button keeps its width because
 * the label stays in the layout, hidden. One of the allowed loops: it only runs
 * while something is loading. With reduced motion the dots sit still, half filled.
 */
export function LoadingDots({ className }: { className?: string }) {
  const reduce = useReducedButtons();
  return (
    <span aria-hidden="true" className={cn("flex items-center justify-center gap-1.5", className)}>
      {DOTS.map((i) => (
        <motion.span
          key={i}
          className="size-1.5 bg-current"
          initial={{ opacity: reduce ? 0.6 : 0.25 }}
          animate={reduce ? { opacity: 0.6 } : { opacity: [0.25, 1, 0.25] }}
          transition={reduce ? { duration: 0 } : { duration: CYCLE, repeat: Infinity, delay: (i * CYCLE) / 3, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}
