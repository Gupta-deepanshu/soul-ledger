"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { BUTTON_BASE, FOCUS_RING, FOCUS_RING_PINNED, type PreviewState } from "./shared";

export type SegmentIndicatorStyle = "underline" | "fill" | "border";

/**
 * The active-option highlight, shared by every tab and segmented control. It
 * slides between options through a shared `layoutId` (instant with reduced
 * motion, via MotionConfig). Three looks, as the designs use them:
 * - `underline`: a 2 px brass line under the label (top nav, tab bars);
 * - `fill`: a brass block behind the label, text turns ink (Live rank chips);
 * - `border`: a 1 px border in `className`'s colour over the button's own (item slots).
 * Render it inside the active option, which must be `relative`.
 */
export function SegmentIndicator({
  layoutId,
  look,
  className,
}: {
  layoutId: string;
  look: SegmentIndicatorStyle;
  className?: string;
}) {
  return (
    <motion.span
      layoutId={layoutId}
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute",
        look === "underline" && "inset-x-0 -bottom-px h-0.5 bg-brass",
        look === "fill" && "-inset-px bg-brass",
        look === "border" && "-inset-px border border-brass",
        className,
      )}
    />
  );
}

export type SegmentOption = { value: string; label: ReactNode; disabled?: boolean };

type SegmentedProps = {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
  /** Names the group for screen readers. */
  label: string;
  /** Unique per control on the page. */
  layoutId: string;
  look?: SegmentIndicatorStyle;
  className?: string;
  optionClassName?: string;
  /** Pins one option's look, for the /dev/buttons preview only. */
  preview?: { value: string; state: PreviewState };
};

/**
 * A row of toggle buttons (`aria-pressed`) where one is active: filters such as
 * the Live rank chips. For panels of content use the Radix Tabs with
 * `SegmentIndicator` inside the active trigger instead, so tab semantics stay.
 * Hover and press are colour-only (text → fg), so they're the same with
 * reduced motion.
 */
export function Segmented({
  options,
  value,
  onChange,
  label,
  layoutId,
  look = "fill",
  className,
  optionClassName,
  preview,
}: SegmentedProps) {
  return (
    <div role="group" aria-label={label} className={cn("flex flex-wrap gap-2", look === "underline" && "gap-5", className)}>
      {options.map((o) => {
        const active = o.value === value;
        const pinned = preview?.value === o.value ? preview.state : undefined;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            data-preview={pinned}
            className={cn(
              BUTTON_BASE,
              FOCUS_RING,
              pinned === "focus" && FOCUS_RING_PINNED,
              "text-[13px] text-muted-foreground transition-colors hover:text-fg active:text-fg",
              (pinned === "hover" || pinned === "pressed") && "text-fg",
              look !== "underline" && "border border-line-strong px-3.5",
              look === "underline" && "px-0.5",
              active && (look === "fill" ? "text-ink hover:text-ink active:text-ink" : "text-fg"),
              "disabled:cursor-not-allowed disabled:border-line disabled:text-tick disabled:hover:text-tick",
              optionClassName,
            )}
          >
            {active && <SegmentIndicator layoutId={layoutId} look={look} />}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
