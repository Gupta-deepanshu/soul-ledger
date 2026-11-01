"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/** The 3 px double rule. Draws left → right the first time it enters view. */
export function DoubleRule({ className }: { className?: string }) {
  return (
    <motion.div
      aria-hidden="true"
      className={cn("h-0 origin-left border-t-[3px] border-double border-line-strong", className)}
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    />
  );
}
