"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { formatSigned } from "@/lib/format";
import type { MatchupCell, MatchupGrid as MatchupGridData } from "@/lib/deadlock/meta";

function cellStyle(v: number): React.CSSProperties {
  const alpha = Math.min(0.85, 0.15 + Math.abs(v) / 4.5);
  const colour = v > 0 ? "var(--brass)" : "var(--mother)";
  return {
    background: `color-mix(in srgb, ${colour} ${Math.round(alpha * 100)}%, transparent)`,
    color: Math.abs(v) > 2.6 ? "var(--ink)" : "var(--fg)",
  };
}

function describe({ heroes, cells }: MatchupGridData): string {
  let best: { row: number; col: number; v: number } | null = null;
  for (let r = 0; r < cells.length; r++) {
    for (let c = 0; c < cells[r].length; c++) {
      const v = cells[r][c];
      if (typeof v === "number" && (!best || v > best.v)) best = { row: r, col: c, v };
    }
  }
  if (!best) return "Not enough matches between these heroes to compare.";
  const { row, col, v } = best;
  return `Biggest edge: ${heroes[row].name} wins ${formatSigned(v)} points above 50% against ${heroes[col].name}.`;
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
export function MatchupGrid({ grid }: { grid: MatchupGridData }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const columns = `repeat(${grid.heroes.length}, minmax(0, 1fr))`;
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
        {grid.heroes.map((h) => (
          <span key={h.heroId} className="truncate pb-1 text-center font-mono text-[10px] text-muted-foreground md:pb-1.5 md:text-[11px]">
            {h.shortName}
          </span>
        ))}
        {grid.heroes.map((rowHero, r) => [
          <span key={`label-${rowHero.heroId}`} className="flex items-center truncate pr-1 text-[11px] md:text-[13px]">
            {rowHero.name}
          </span>,
          ...grid.cells[r].map((value, c) => (
            <Cell key={`${rowHero.heroId}-${grid.heroes[c].heroId}`} value={value} delay={(r + c) * 0.03} inView={inView} />
          )),
        ])}
      </div>
    </div>
  );
}
