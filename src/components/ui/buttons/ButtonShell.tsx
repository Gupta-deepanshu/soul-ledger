"use client";

import type { ButtonHTMLAttributes, HTMLAttributes, MouseEvent, ReactNode, Ref } from "react";
import Link from "next/link";
import { motion, type MotionStyle, type Variants } from "motion/react";
import { cn } from "@/lib/utils";
import { LoadingDots } from "./LoadingDots";
import { BUTTON_BASE, FOCUS_RING, FOCUS_RING_PINNED, restOrPinned, type PreviewState } from "./shared";

const MotionLink = motion.create(Link);

// Handlers whose types differ between React and Motion props.
type Conflicts =
  | "onDrag"
  | "onDragStart"
  | "onDragEnd"
  | "onDragOver"
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onAnimationIteration"
  | "style"
  | "children";

// Typed against HTMLElement so the same props fit a <button> and a link.
export type ButtonProps = Omit<HTMLAttributes<HTMLElement>, Conflicts> & {
  /** Renders a Next.js link instead of a `<button>`. */
  href?: string;
  /** Link only (e.g. `_blank` for external pages); ignored on buttons. */
  target?: string;
  /** Link only (e.g. `noreferrer` with `target="_blank"`); ignored on buttons. */
  rel?: string;
  type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
  disabled?: boolean;
  /** Associates a submit button with a form elsewhere on the page. */
  form?: string;
  /** Replaces the label with three dots; the button keeps its width and ignores clicks. */
  loading?: boolean;
  /** Pins a look for the /dev/buttons preview only. */
  previewState?: PreviewState;
  children: ReactNode;
  ref?: Ref<HTMLElement>;
};

type ShellProps = ButtonProps & {
  /** Variants for the root and (by propagation) its motion children: rest, hover, pressed. */
  variants?: Variants;
  style?: MotionStyle;
  /** Wraps the label for loading; off for buttons whose children are the whole content. */
  label?: boolean;
  /** Aria-hidden layers drawn behind/around the label (hover fill, corner brackets). */
  decoration?: ReactNode;
};

/**
 * The element behind every button type: a `<button>` or a link, with the shared
 * size, focus ring, disabled and loading behaviour, and the rest → hover →
 * pressed variants that each type's motion children follow.
 *
 * Disabled buttons use the native `disabled`; disabled links render a span with
 * `aria-disabled`. Loading keeps the button focusable (`aria-disabled`, `aria-busy`)
 * and keeps the label in the accessibility tree while it is hidden.
 * Style the disabled look with `data-disabled:` and loading with `data-loading:`.
 */
export function ButtonShell({
  href,
  target,
  rel,
  loading = false,
  disabled = false,
  previewState,
  className,
  children,
  variants,
  style,
  label = true,
  decoration,
  onClick,
  type = "button",
  ref,
  form,
  ...rest
}: ShellProps) {
  const inert = disabled || loading;
  const motionProps = {
    variants,
    initial: false as const,
    animate: inert ? "rest" : restOrPinned(previewState),
    whileHover: inert || previewState ? undefined : "hover",
    whileTap: inert || previewState ? undefined : "pressed",
    style,
  };
  const classes = cn(BUTTON_BASE, FOCUS_RING, previewState === "focus" && FOCUS_RING_PINNED, className);
  const data = {
    "data-disabled": disabled || undefined,
    "data-loading": loading || undefined,
    "data-preview": previewState,
  };
  const content = (
    <>
      {decoration}
      {label ? (
        <>
          <span className={cn("relative inline-flex items-center gap-[inherit]", loading && "opacity-0")}>{children}</span>
          {loading && <LoadingDots className="absolute inset-0" />}
        </>
      ) : (
        children
      )}
    </>
  );
  const blockWhileLoading = (e: MouseEvent<HTMLElement>) => {
    if (loading) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };

  if (href) {
    if (disabled) {
      return (
        <motion.span role="link" aria-disabled="true" className={classes} {...data} {...motionProps}>
          {content}
        </motion.span>
      );
    }
    return (
      <MotionLink
        ref={ref as Ref<HTMLAnchorElement>}
        href={href}
        target={target}
        rel={rel}
        aria-disabled={loading || undefined}
        aria-busy={loading || undefined}
        onClick={blockWhileLoading}
        className={classes}
        {...data}
        {...motionProps}
        {...rest}
      >
        {content}
      </MotionLink>
    );
  }

  return (
    <motion.button
      ref={ref as Ref<HTMLButtonElement>}
      type={type}
      form={form}
      disabled={disabled}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      onClick={blockWhileLoading}
      className={classes}
      {...data}
      {...motionProps}
      {...rest}
    >
      {content}
    </motion.button>
  );
}
