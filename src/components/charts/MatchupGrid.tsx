"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { formatInt, formatPercent, formatSigned } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MatchupCell, MatchupGrid as MatchupGridData, MatchupHero } from "@/lib/deadlock/meta";
import { bestText } from "@/lib/contrast";
import { useRowHighlight } from "@/components/ui/RowHighlight";
import { ChartReadout, ChartTooltip, Muted, isPhoneViewport } from "./ChartTooltip";

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

type Pos = { r: number; c: number };

/** The numeric cell with the largest edge (positive only for the square Meta grid). */
function biggestEdge({ heroes, cols = heroes, cells }: MatchupGridData): Pos | null {
  // Same heroes both ways: every edge appears as a positive cell, so take the largest.
  // Two lineups: the biggest edge may favour the column hero, so compare sizes.
  const size = (v: number) => (cols === heroes ? v : Math.abs(v));
  let best: (Pos & { v: number }) | null = null;
  cells.forEach((row, r) =>
    row.forEach((v, c) => {
      if (typeof v === "number" && (!best || size(v) > size(best.v))) best = { r, c, v };
    }),
  );
  return best;
}

function describe(grid: MatchupGridData): string {
  const best = biggestEdge(grid);
  if (!best) return "Not enough matches between these heroes to compare.";
  const cols = grid.cols ?? grid.heroes;
  const v = grid.cells[best.r][best.c] as number;
  const [winner, loser] = v >= 0 ? [grid.heroes[best.r], cols[best.c]] : [cols[best.c], grid.heroes[best.r]];
  return `Biggest edge: ${winner.name} wins ${formatSigned(Math.abs(v))} points above 50% against ${loser.name}.`;
}

/** What a cell means in words: "Haze wins 53.1% of 28,382 games vs Viscous". */
function pairText(row: MatchupHero, col: MatchupHero, value: MatchupCell, games: number): string {
  if (value === null) return `${row.name} vs itself`;
  if (value === "n/a") return `${row.name} vs ${col.name}: not enough games${games ? ` (${formatInt(games)})` : ""} to compare`;
  return `${row.name} wins ${formatPercent(0.5 + value / 100)} of ${formatInt(games)} games vs ${col.name}`;
}

function Cell({
  value,
  delay,
  inView,
  dim,
  ring,
  selected,
  children,
  ...handlers
}: {
  value: MatchupCell;
  delay: number;
  inView: boolean;
  /** Outside the hovered cell's row and column. */
  dim: boolean;
  /** The hovered or focused cell. */
  ring: boolean;
  /** Phone: the cell the readout describes. */
  selected: boolean;
  children?: React.ReactNode;
  onPointerEnter?: (e: React.PointerEvent) => void;
  onClick?: () => void;
}) {
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: inView ? (dim ? 0.4 : 1) : 0 }}
      transition={{ delay: inView && !dim ? delay : 0, duration: dim ? 0.15 : 0.3 }}
      className={cn(
        "relative",
        ring && "z-10 outline-2 outline-offset-1 outline-solid outline-brass",
        selected && "max-md:outline-2 max-md:outline-offset-1 max-md:outline-solid max-md:outline-brass",
      )}
      {...handlers}
    >
      {content}
      {children}
    </motion.div>
  );
}

/**
 * Row hero's win rate vs column hero, minus 50%. Cells fade in on a diagonal sweep.
 *
 * Tablet/desktop: hovering a cell (or moving with the arrow keys once the grid
 * has focus) lights up its row and column, dims the rest and shows the pair's
 * win rate and games in a tooltip. Phone: tapping a cell selects it and fills
 * the readout under the grid; the biggest edge is selected to start.
 */
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
  // The label column grows past --label-col to fit the longest name (e.g. "Deadman Danny") instead of clipping it.
  const columns = `minmax(var(--label-col), max-content) repeat(${cols.length}, minmax(0, 1fr))`;
  const [active, setActive] = useState<Pos | null>(null);
  // Shared with Hero standings (Meta): its hovered hero lights up here, and hovering a cell lights up the row hero there.
  const { active: linked, setActive: setLinked } = useRowHighlight();
  const [selected, setSelected] = useState<Pos | null>(() => biggestEdge(grid) ?? (grid.heroes.length > 1 ? { r: 0, c: 1 } : null));

  const text = (p: Pos) => pairText(grid.heroes[p.r], cols[p.c], grid.cells[p.r][p.c], grid.games[p.r]?.[p.c] ?? 0);

  function onKeyDown(e: React.KeyboardEvent) {
    const moves: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (e.key === "Escape") return setActive(null);
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    setActive((a) => {
      const from = a ?? selected ?? { r: 0, c: 0 };
      if (!a) return from;
      return {
        r: Math.min(grid.heroes.length - 1, Math.max(0, from.r + move[0])),
        c: Math.min(cols.length - 1, Math.max(0, from.c + move[1])),
      };
    });
  }

  const picked = selected && grid.cells[selected.r]?.[selected.c] !== undefined ? selected : null;
  const pickedValue = picked ? grid.cells[picked.r][picked.c] : null;

  return (
    <div className="flex flex-col gap-2.5">
      <div
        ref={ref}
        tabIndex={0}
        role="group"
        aria-label={`${describe(grid)} Use the arrow keys to read each pair.`}
        onKeyDown={onKeyDown}
        onBlur={() => setActive(null)}
        onPointerLeave={() => {
          setActive(null);
          setLinked(null);
        }}
        className="grid gap-0.5 outline-hidden [--label-col:64px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-solid focus-visible:outline-brass md:gap-[3px] md:[--label-col:96px]"
        style={{ gridTemplateColumns: columns }}
      >
        <span />
        {cols.map((h, c) => (
          <span
            key={h.heroId}
            className={cn(
              "truncate pb-1 text-center font-mono text-[10px] transition-opacity md:pb-1.5 md:text-[11px]",
              colLabelClassName,
              active && (active.c === c ? "underline decoration-brass decoration-2 underline-offset-4" : "md:opacity-50"),
              !active && linked === h.heroId && "text-fg underline decoration-brass decoration-2 underline-offset-4",
            )}
          >
            {h.shortName}
          </span>
        ))}
        {grid.heroes.map((rowHero, r) => [
          <span
            key={`label-${rowHero.heroId}`}
            className={cn(
              "flex items-center whitespace-nowrap pr-2 text-[11px] transition-opacity md:text-[13px]",
              rowLabelClassName,
              active && (active.r === r ? "underline decoration-brass decoration-2 underline-offset-4" : "md:opacity-50"),
              !active && linked === rowHero.heroId && "text-fg underline decoration-brass decoration-2 underline-offset-4",
            )}
          >
            {rowHero.name}
          </span>,
          ...grid.cells[r].map((value, c) => {
            const on = active?.r === r && active?.c === c;
            return (
              <Cell
                key={`${rowHero.heroId}-${cols[c].heroId}`}
                value={value}
                delay={(r + c) * 0.03}
                inView={inView}
                dim={active != null && active.r !== r && active.c !== c}
                ring={on}
                selected={picked?.r === r && picked?.c === c}
                onPointerEnter={(e) => {
                  if (e.pointerType !== "mouse") return;
                  setActive({ r, c });
                  setLinked(rowHero.heroId);
                }}
                onClick={() => isPhoneViewport() && setSelected({ r, c })}
              >
                {on && value !== null && (
                  <ChartTooltip x={c < 2 ? 0 : c > cols.length - 3 ? 100 : 50}>
                    <span className="text-fg">
                      {rowHero.name} vs {cols[c].name}
                    </span>
                    {typeof value === "number" ? (
                      <>
                        <span className={value >= 0 ? "text-brass" : "text-mother-text"}>
                          {rowHero.name} wins {formatPercent(0.5 + value / 100)}
                        </span>
                        <Muted>{formatInt(grid.games[r]?.[c] ?? 0)} games this patch</Muted>
                      </>
                    ) : (
                      <Muted>Not enough games to compare</Muted>
                    )}
                  </ChartTooltip>
                )}
              </Cell>
            );
          }),
        ])}
      </div>
      <p aria-live="polite" className="sr-only">
        {active ? text(active) : ""}
      </p>

      {picked && pickedValue !== null && (
        <ChartReadout>
          <span className="text-fg">
            {grid.heroes[picked.r].shortName} vs {cols[picked.c].shortName}
          </span>
          {typeof pickedValue === "number" ? (
            <>
              <span className={pickedValue >= 0 ? "text-brass" : "text-mother-text"}>{formatPercent(0.5 + pickedValue / 100)}</span>
              <Muted>{formatInt(grid.games[picked.r]?.[picked.c] ?? 0)} games</Muted>
            </>
          ) : (
            <Muted>not enough games</Muted>
          )}
        </ChartReadout>
      )}
    </div>
  );
}
