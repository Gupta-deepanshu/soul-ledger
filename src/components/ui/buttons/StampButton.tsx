"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { ButtonShell, type ButtonProps } from "./ButtonShell";
import { COLOUR_TRANSITION, HOVER_TRANSITION, useReducedButtons } from "./shared";

/**
 * Primary "stamp": square, brass fill, ink text. Hover: a darker brass fill
 * wipes in from the left. Press: scales to 0.97. Loading: three ink dots.
 * Reduced motion: the darker fill fades in instead, and no press scale.
 * One per view, for the main action.
 */
export function StampButton({ className, ...props }: ButtonProps) {
  const reduce = useReducedButtons();
  return (
    <ButtonShell
      {...props}
      className={cn(
        "overflow-hidden bg-brass px-[18px] text-ink",
        "data-disabled:cursor-not-allowed data-disabled:bg-surface-2 data-disabled:text-muted-foreground",
        className,
      )}
      variants={{ rest: { scale: 1 }, hover: { scale: 1 }, pressed: { scale: reduce ? 1 : 0.97 } }}
      decoration={
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 origin-left bg-brass-deep"
          variants={
            reduce
              ? { rest: { opacity: 0, scaleX: 1 }, hover: { opacity: 1, scaleX: 1 }, pressed: { opacity: 1, scaleX: 1 } }
              : { rest: { opacity: 1, scaleX: 0 }, hover: { opacity: 1, scaleX: 1 }, pressed: { opacity: 1, scaleX: 1 } }
          }
          transition={reduce ? COLOUR_TRANSITION : HOVER_TRANSITION}
        />
      }
    />
  );
}
