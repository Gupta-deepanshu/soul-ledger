"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { formatSigned } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MatchupCell, MatchupGrid as MatchupGridData } from "@/lib/deadlock/meta";
import { bestText } from "@/lib/contrast";

const BRASS = "#d9b26f";
const MOTHER = "#5e8bff";

/**
 * Fill strength grows with |v| (15% → 85%), and the text is ink or fg, whichever
 * reads better on the result. Some mid strengths reach 4.5:1 with neither
 * (brass around ±1.6–2.2, blue around ±2.4–2.9), so those cells are eased
 * lighter until fg text passes. Cells sit on the card's `surface`.
 */
function cellStyle(v: number): React.CSSProperties {
  const hue = v > 0 ? BRASS : MOTHER;
  let alpha = Math.min(0.85, 0.15 + Math.abs(v) / 4.5);
  let text = bestText(hue, alpha);
  while (text.ratio < 4.5 && alpha > 0.15) {
    alpha -= 0.01;
    text = bestText(hue, alpha);
  }
  return {
    background: `color-mix(in srgb, ${v > 0 ? "var(--brass)" : "var(--mother)"} ${Math.round(alpha * 100)}%, transparent)`,
    color: `var(--${text.text})`,
  };
}

function describe({ heroes, cols = heroes, cells }: MatchupGridData): string {
  // Same heroes both ways: every edge appears as a positive cell, so take the largest.
  // Two lineups: the biggest edge may favour the column hero, so compare sizes.
  const size = (v: number) => (cols === heroes ? v : Math.abs(v));
  let best: { row: number; col: number; v: number } | null = null;
  for (let r = 0; r < cells.length; r++) {
    for (let c = 0; c < cells[r].length; c++) {
      const v = cells[r][c];
      if (typeof v === "number" && (!best || size(v) > size(best.v))) best = { row: r, col: c, v };
    }
  }
  if (!best) return "Not enough matches between these heroes to compare.";
  const { row, col, v } = best;
  const [winner, loser] = v >= 0 ? [heroes[row], cols[col]] : [cols[col], heroes[row]];
  return `Biggest edge: ${winner.name} wins ${formatSigned(Math.abs(v))} points above 50% against ${loser.name}.`;
}

function Cell({ value, delay, inView }: { value: MatchupCell; delay: number; inView: boolean }) {
  const base = "flex h-10 items-center justify-center font-mono text-[10px] md:h-11 md:text-xs";
  const content =
    value === null ? (
      <span className={`${base} bg-surface-2 text-tick`}>—</span>
    ) : value === "n/a" ? (
      <span className={`${base} bg-surface-2 text-muted-foreground`}>n/a</span>
    ) : (
      <span className={base} style={cellStyle(value)}>
        {formatSigned(value)}
      </span>
    );
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: inView ? 1 : 0 }} transition={{ delay: inView ? delay : 0, duration: 0.3 }}>
      {content}
    </motion.div>
  );
}

/** Row hero's win rate vs column hero, minus 50%. Cells fade in on a diagonal sweep. */
export function MatchupGrid({
  grid,
  rowLabelClassName,
  colLabelClassName = "text-muted-foreground",
}: {
  grid: MatchupGridData;
  /** e.g. a team text colour when rows and columns are two lineups. */
  rowLabelClassName?: string;
  colLabelClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const cols = grid.cols ?? grid.heroes;
  const columns = `repeat(${cols.length}, minmax(0, 1fr))`;
  return (
    <div className="overflow-x-auto">
      <div
        ref={ref}
        role="img"
        aria-label={describe(grid)}
        className="grid gap-0.5 [--label-col:64px] md:gap-[3px] md:[--label-col:96px] xl:min-w-[460px]"
        style={{ gridTemplateColumns: `var(--label-col) ${columns}` }}
      >
        <span />
        {cols.map((h) => (
          <span key={h.heroId} className={cn("truncate pb-1 text-center font-mono text-[10px] md:pb-1.5 md:text-[11px]", colLabelClassName)}>
            {h.shortName}
          </span>
        ))}
        {grid.heroes.map((rowHero, r) => [
          <span key={`label-${rowHero.heroId}`} className={cn("flex items-center truncate pr-1 text-[11px] md:text-[13px]", rowLabelClassName)}>
            {rowHero.name}
          </span>,
          ...grid.cells[r].map((value, c) => (
            <Cell key={`${rowHero.heroId}-${cols[c].heroId}`} value={value} delay={(r + c) * 0.03} inView={inView} />
          )),
        ])}
      </div>
    </div>
  );
}
