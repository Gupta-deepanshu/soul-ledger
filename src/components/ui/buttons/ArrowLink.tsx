"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { ButtonShell, type ButtonProps } from "./ButtonShell";
import { HOVER_TRANSITION, useReducedButtons } from "./shared";

/**
 * Arrow link: brass text with a trailing →, which slides 3 px right on hover.
 * Usually a link (`href`); can be a button (`onClick`). Still 44 px tall for
 * touch, so give inline uses room (or a negative block margin).
 * Reduced motion: the text turns `fg` instead.
 */
export function ArrowLink({ className, previewState, children, ...props }: ButtonProps) {
  const reduce = useReducedButtons();
  const pinnedHover = previewState === "hover" || previewState === "pressed";
  return (
    <ButtonShell
      {...props}
      previewState={previewState}
      className={cn(
        "justify-start gap-1.5 text-brass transition-colors active:text-fg",
        previewState === "pressed" && "text-fg",
        reduce && "hover:text-fg",
        reduce && pinnedHover && "text-fg",
        "data-disabled:cursor-not-allowed data-disabled:text-muted-foreground",
        className,
      )}
    >
      {children}
      <motion.span
        aria-hidden="true"
        variants={{ rest: { x: 0 }, hover: { x: reduce ? 0 : 3 }, pressed: { x: reduce ? 0 : 3 } }}
        transition={HOVER_TRANSITION}
      >
        →
      </motion.span>
    </ButtonShell>
  );
}
