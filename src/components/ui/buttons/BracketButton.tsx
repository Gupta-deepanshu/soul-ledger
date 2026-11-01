"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { ButtonShell, type ButtonProps } from "./ButtonShell";
import { HOVER_TRANSITION, useReducedButtons } from "./shared";

/** Each corner: where it sits, which two sides draw the bracket, and where it slides in from. */
const CORNERS = [
  { at: "-top-px -left-px border-t-2 border-l-2", from: { x: -4, y: -4 } },
  { at: "-top-px -right-px border-t-2 border-r-2", from: { x: 4, y: -4 } },
  { at: "-bottom-px -left-px border-b-2 border-l-2", from: { x: -4, y: 4 } },
  { at: "-bottom-px -right-px border-b-2 border-r-2", from: { x: 4, y: 4 } },
] as const;

/**
 * Secondary "bracket": thin `line-strong` outline, `fg` text. Hover: four small
 * brass corner brackets slide in from the corners. Press: `surface-2` fill.
 * Reduced motion: the outline turns brass instead (colour only).
 */
export function BracketButton({ className, previewState, ...props }: ButtonProps) {
  const reduce = useReducedButtons();
  const pinnedHover = previewState === "hover" || previewState === "pressed";
  return (
    <ButtonShell
      {...props}
      previewState={previewState}
      className={cn(
        "border border-line-strong px-4 text-fg transition-colors active:bg-surface-2",
        previewState === "pressed" && "bg-surface-2",
        reduce && "hover:border-brass",
        reduce && pinnedHover && "border-brass",
        "data-disabled:cursor-not-allowed data-disabled:border-line data-disabled:text-muted-foreground data-disabled:active:bg-transparent",
        className,
      )}
      decoration={
        !reduce &&
        CORNERS.map((c) => (
          <motion.span
            key={c.at}
            aria-hidden="true"
            className={cn("pointer-events-none absolute size-1.5 border-brass", c.at)}
            variants={{
              rest: { opacity: 0, ...c.from },
              hover: { opacity: 1, x: 0, y: 0 },
              pressed: { opacity: 1, x: 0, y: 0 },
            }}
            transition={HOVER_TRANSITION}
          />
        ))
      }
    />
  );
}
