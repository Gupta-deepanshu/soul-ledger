"use client";

import { useReducedMotionConfig } from "motion/react";
import { EASE } from "@/lib/motion";

/**
 * Shared rules for every button type (see soul-ledger-design § Buttons):
 * square, ≥ 44 px tall, a 2 px brass outline for keyboard focus only.
 */
export const BUTTON_BASE =
  "relative inline-flex min-h-11 shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap text-sm font-medium";

/** Keyboard focus ring. `outline-hidden` keeps it for forced-colours mode; plain `outline-none` would cancel it in Tailwind v4. */
export const FOCUS_RING =
  "outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-brass";

/** The focus ring drawn permanently, for the /dev/buttons preview. */
export const FOCUS_RING_PINNED = "outline-2 outline-offset-2 outline-solid outline-brass";

/**
 * Pins a button in one look for the /dev/buttons preview. Never set this in
 * real UI: real hover, press and focus come from the pointer and keyboard.
 */
export type PreviewState = "hover" | "pressed" | "focus";

export const HOVER_TRANSITION = { duration: 0.28, ease: EASE } as const;
export const COLOUR_TRANSITION = { duration: 0.15, ease: EASE } as const;

/**
 * True when motion should be reduced: the OS setting (through the app's
 * `MotionConfig reducedMotion="user"`) or a `MotionConfig reducedMotion="always"`
 * above, which is how the preview page's toggle works. Buttons then use
 * colour-only hovers.
 */
export function useReducedButtons(): boolean {
  return useReducedMotionConfig() ?? false;
}

/** The variant label a button animates to: a pinned preview state wins over "rest". */
export function restOrPinned(state: PreviewState | undefined): "rest" | "hover" | "pressed" {
  if (state === "hover" || state === "pressed") return state;
  return "rest";
}
