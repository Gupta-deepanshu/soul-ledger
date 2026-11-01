"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type CardProps = {
  children: React.ReactNode;
  className?: string;
  /** Position on the page, for the 40 ms entrance stagger. */
  index?: number;
  "aria-labelledby"?: string;
};

/** Square surface card. Fades up 8 px when it first appears. */
export function Card({ children, className, index = 0, ...aria }: CardProps) {
  return (
    <motion.section
      {...aria}
      data-entrance=""
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn(
        "flex min-w-0 flex-col gap-2.5 border border-line bg-surface p-4 md:gap-3.5 md:p-[22px] xl:gap-4 xl:px-[26px] xl:py-6",
        className,
      )}
    >
      {children}
    </motion.section>
  );
}
