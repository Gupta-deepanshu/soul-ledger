"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { ButtonShell, type ButtonProps } from "./ButtonShell";
import { LoadingDots } from "./LoadingDots";
import { HOVER_TRANSITION, useReducedButtons } from "./shared";
import { useMagnet } from "./useMagnet";

type IconButtonProps = Omit<ButtonProps, "children" | "aria-label"> & {
  /** The lucide icon (size 18, stroke 1.5), marked aria-hidden. */
  icon: ReactNode;
  /** Required: the button has no visible text. */
  "aria-label": string;
};

/**
 * Icon button: 44 px square outline. Hover: the icon nudges 2 px; on desktop
 * with a mouse, the whole button is pulled up to 4 px toward the cursor.
 * Reduced motion: the icon turns brass instead, and no magnet.
 */
export function IconButton({ icon, className, previewState, loading, disabled, onPointerMove, onPointerLeave, ...props }: IconButtonProps) {
  const reduce = useReducedButtons();
  const magnet = useMagnet(4, !reduce && !disabled && !loading && !previewState);
  const pinnedHover = previewState === "hover" || previewState === "pressed";
  return (
    <ButtonShell
      {...props}
      previewState={previewState}
      loading={loading}
      disabled={disabled}
      label={false}
      style={magnet.style}
      onPointerMove={(e) => {
        magnet.onPointerMove(e);
        onPointerMove?.(e);
      }}
      onPointerLeave={(e) => {
        magnet.onPointerLeave();
        onPointerLeave?.(e);
      }}
      className={cn(
        "size-11 border border-line-strong bg-surface text-fg transition-colors hover:border-line-muted active:bg-surface-2",
        previewState === "pressed" && "bg-surface-2",
        pinnedHover && "border-line-muted",
        reduce && "hover:text-brass",
        reduce && pinnedHover && "text-brass",
        "data-disabled:cursor-not-allowed data-disabled:border-line data-disabled:text-muted-foreground data-disabled:hover:border-line data-disabled:active:bg-surface",
        className,
      )}
    >
      {loading ? (
        <LoadingDots />
      ) : (
        <motion.span
          aria-hidden="true"
          className="flex"
          variants={{ rest: { x: 0 }, hover: { x: reduce ? 0 : 2 }, pressed: { x: reduce ? 0 : 2 } }}
          transition={HOVER_TRANSITION}
        >
          {icon}
        </motion.span>
      )}
    </ButtonShell>
  );
}
