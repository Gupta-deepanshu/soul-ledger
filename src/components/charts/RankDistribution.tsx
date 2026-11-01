"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { cn } from "@/lib/utils";
import type { RankShare } from "@/lib/deadlock/meta";

function shareLabel(share: number) {
  return share > 0 && share < 0.01 ? "<1%" : `${Math.round(share * 100)}%`;
}

type RankDistributionProps = {
  shares: RankShare[];
  /** Tiers at or above this are highlighted in brass. */
  highlightTier: number;
};

/** Vertical bar per rank tier: share of ranked players, labels above, 3-letter tier names below. */
export function RankDistribution({ shares, highlightTier }: RankDistributionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const max = Math.max(...shares.map((s) => s.share), 0.0001);
  const top = shares.reduce((a, b) => (b.share > a.share ? b : a), shares[0]);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={`${top.name} is the most common rank, with ${shareLabel(top.share)} of ranked players.`}
      className="flex flex-col gap-1"
    >
      <div className="flex h-[130px] items-end gap-[3px] border-b border-line-strong md:h-[170px] md:gap-1 xl:h-[150px] xl:gap-[5px]">
        {shares.map((s, i) => (
          <div key={s.tier} className="flex h-full flex-1 flex-col items-center justify-end gap-[3px] md:gap-1">
            <span className="font-mono text-[9px] text-muted-foreground xl:text-[10px]">{shareLabel(s.share)}</span>
            <motion.div
              className={cn("w-full origin-bottom", s.tier >= highlightTier ? "bg-brass" : "bg-line-muted")}
              style={{ height: `${(s.share / max) * 80}%` }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: inView ? 1 : 0 }}
              transition={{ duration: 0.5, delay: inView ? i * 0.03 : 0 }}
            />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="flex gap-[3px] md:gap-1 xl:gap-[5px]">
        {shares.map((s) => (
          <span key={s.tier} className="flex-1 text-center font-mono text-[8px] text-muted-foreground md:text-[9px] xl:text-[10px]">
            {s.short}
          </span>
        ))}
      </div>
    </div>
  );
}
