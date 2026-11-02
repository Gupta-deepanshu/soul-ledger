"use client";

import { cn } from "@/lib/utils";

/** Phones (< 768 px) get the readout under the chart instead of floating tooltips. */
const PHONE_QUERY = "(max-width: 767px)";

/** Checked at event time (taps, clicks), so no state or hydration concerns. */
export function isPhoneViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia(PHONE_QUERY).matches;
}

/**
 * Floating detail box for one data point, tablet and desktop only (`hidden md:flex`).
 * `x` is the point's position across the chart, 0–100 %. The box sits above the
 * chart and leans away from the edges so it never overflows the card.
 * Decorative copy of what the focused element's label or the live region says:
 * aria-hidden.
 */
export function ChartTooltip({
  x,
  className,
  children,
}: {
  x: number;
  className?: string;
  children: React.ReactNode;
}) {
  const align = x < 25 ? "start" : x > 75 ? "end" : "center";
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute bottom-full z-10 mb-2 hidden flex-col gap-0.5 border border-line-strong bg-ink px-2.5 py-1.5 font-mono text-[11px] whitespace-nowrap tabular-nums md:flex",
        align === "center" && "-translate-x-1/2",
        align === "end" && "-translate-x-full",
        className,
      )}
      style={{ left: `${x}%` }}
    >
      {children}
    </div>
  );
}

/**
 * Phone-only (`md:hidden`) one-line detail under a chart: the latest item by
 * default, the tapped one after a tap. Announced politely when it changes.
 */
export function ChartReadout({
  action,
  className,
  children,
}: {
  /** A link at the end of the line (e.g. "Open match"); never wraps or shrinks. */
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-h-11 items-center gap-3 border-t border-rule pt-1 font-mono text-xs tabular-nums md:hidden", className)}>
      {/* One line: long details are cut with an ellipsis rather than pushing the link down. */}
      <p aria-live="polite" className="min-w-0 flex-1 truncate [&>*+*]:ml-2">
        {children}
      </p>
      {action && <span className="shrink-0">{action}</span>}
    </div>
  );
}

/** Secondary text inside readouts and tooltips, e.g. the date. */
/**
 * "≈" drawn as SVG. Our Geist subsets don't include U+2248, so the text glyph
 * falls back to a system font and sits off-centre next to the digits. This one is
 * centred on the digits' middle and takes the colour of the text around it.
 */
export function Approx() {
  return (
    <>
      <svg
        aria-hidden="true"
        viewBox="0 0 12 20"
        className="mr-[0.35em] inline-block h-[1em] w-[0.6em] align-[-0.12em]"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.3}
        strokeLinecap="round"
      >
        <path d="M1.5 9 q2.25 -2.2 4.5 0 t4.5 0" />
        <path d="M1.5 13 q2.25 -2.2 4.5 0 t4.5 0" />
      </svg>
      <span className="sr-only">about </span>
    </>
  );
}

export function Muted({ children }: { children: React.ReactNode }) {
  return <span className="text-muted-foreground">{children}</span>;
}
