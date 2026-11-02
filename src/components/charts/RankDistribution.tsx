"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { cn } from "@/lib/utils";
import { formatCompact } from "@/lib/format";
import type { RankShare } from "@/lib/deadlock/meta";
import { Approx, ChartReadout, ChartTooltip, Muted, isPhoneViewport } from "./ChartTooltip";

function shareLabel(share: number) {
  return share > 0 && share < 0.01 ? "<1%" : `${Math.round(share * 100)}%`;
}

/** "top 9%" for this tier and up; the lowest tier covers everyone. */
function topLabel(s: RankShare) {
  return s.atOrAbove >= 0.995 ? "every ranked player" : `top ${shareLabel(s.atOrAbove)} with this rank or higher`;
}

type RankDistributionProps = {
  shares: RankShare[];
  /** Tiers at or above this are highlighted in brass. */
  highlightTier: number;
};

/**
 * Vertical bar per rank tier: share of ranked players, labels above, 3-letter
 * tier names below. Tablet/desktop: hover or arrow keys show the tier's share,
 * player count and "top X%". Phone: tap a bar for the readout underneath (the
 * most common tier to start).
 */
export function RankDistribution({ shares, highlightTier }: RankDistributionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const max = Math.max(...shares.map((s) => s.share), 0.0001);
  const topIndex = shares.reduce((best, s, i) => (s.share > shares[best].share ? i : best), 0);
  const top = shares[topIndex];
  const [active, setActive] = useState<number | null>(null);
  const [selected, setSelected] = useState(topIndex);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const step = e.key === "ArrowRight" ? 1 : -1;
      setActive((a) => (a == null ? topIndex : Math.min(shares.length - 1, Math.max(0, a + step))));
    } else if (e.key === "Escape") setActive(null);
  }

  const describeTier = (s: RankShare) =>
    `${s.name}: ${shareLabel(s.share)} of ranked players, about ${formatCompact(s.players)} players, ${topLabel(s)}`;
  const picked = shares[selected];

  return (
    <div className="flex flex-col gap-2.5">
      <div
        ref={ref}
        tabIndex={0}
        role="group"
        aria-label={`${top.name} is the most common rank, with ${shareLabel(top.share)} of ranked players. Use the arrow keys to read each rank.`}
        onKeyDown={onKeyDown}
        onBlur={() => setActive(null)}
        onPointerLeave={() => setActive(null)}
        className="flex flex-col gap-1 outline-hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-solid focus-visible:outline-brass"
      >
        <div className="flex h-[130px] items-end gap-[3px] border-b border-line-strong md:h-[170px] md:gap-1 xl:h-[150px] xl:gap-[5px]">
          {shares.map((s, i) => (
            <div
              key={s.tier}
              onPointerEnter={(e) => e.pointerType === "mouse" && setActive(i)}
              onClick={() => isPhoneViewport() && setSelected(i)}
              className={cn(
                "relative flex h-full flex-1 flex-col items-center justify-end gap-[3px] transition-colors md:gap-1",
                active === i && "bg-surface-2",
                selected === i && "max-md:outline-2 max-md:outline-offset-1 max-md:outline-solid max-md:outline-brass",
              )}
            >
              <span className={cn("font-mono text-[10px] xl:text-[11px]", active === i ? "text-fg" : "text-muted-foreground")}>
                {shareLabel(s.share)}
              </span>
              <motion.div
                className={cn("w-full origin-bottom", s.tier >= highlightTier ? "bg-brass" : "bg-line-muted")}
                style={{ height: `${(s.share / max) * 80}%` }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: inView ? 1 : 0 }}
                transition={{ duration: 0.5, delay: inView ? i * 0.03 : 0 }}
              />
              {active === i && (
                <ChartTooltip x={i < 3 ? 0 : i > shares.length - 4 ? 100 : 50}>
                  <span className="text-fg">{s.name}</span>
                  <span className="text-fg-2">
                    {shareLabel(s.share)} of ranked players · <Approx />{formatCompact(s.players)}
                  </span>
                  <Muted>{topLabel(s)}</Muted>
                </ChartTooltip>
              )}
            </div>
          ))}
        </div>
        <div aria-hidden="true" className="flex gap-[3px] md:gap-1 xl:gap-[5px]">
          {shares.map((s, i) => (
            <span
              key={s.tier}
              className={cn("flex-1 text-center font-mono text-[10px] xl:text-[11px]", active === i ? "text-fg" : "text-muted-foreground")}
            >
              {s.short}
            </span>
          ))}
        </div>
      </div>
      <p aria-live="polite" className="sr-only">
        {active != null ? describeTier(shares[active]) : ""}
      </p>

      {picked && (
        <ChartReadout>
          <span className="text-fg">{picked.name}</span>
          <span className="text-fg-2">{shareLabel(picked.share)}</span>
          <Muted><Approx />{formatCompact(picked.players)} players</Muted>
          <Muted>top {shareLabel(picked.atOrAbove)}</Muted>
        </ChartReadout>
      )}
    </div>
  );
}
