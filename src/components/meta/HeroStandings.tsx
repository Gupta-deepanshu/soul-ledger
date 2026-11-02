"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { HeroTile } from "@/components/ui/HeroTile";
import { WinRateBar } from "@/components/ui/WinRateBar";
import { Delta } from "@/components/ui/Delta";
import { highlightHandlers, useRowHighlight } from "@/components/ui/RowHighlight";
import { cn } from "@/lib/utils";
import { BracketButton, FOCUS_RING } from "@/components/ui/buttons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCompact, formatInt, formatKda, formatPercent } from "@/lib/format";
import type { HeroRow } from "@/lib/deadlock/meta";

const TOP = 10;
const PICK_HINT = "% of matches this hero was in";

type HeroStandingsProps = {
  rows: HeroRow[];
  minMatches: number;
  index?: number;
};

export function HeroStandings({ rows, minMatches, index }: HeroStandingsProps) {
  const [showAll, setShowAll] = useState(false);
  // Hovering a row highlights the hero in "Who beats whom" (when it is one of the six there), and the reverse.
  const { active, setActive } = useRowHighlight();
  const visible = showAll ? rows : rows.slice(0, TOP);
  const canExpand = rows.length > TOP;
  const scope = showAll ? `All ${rows.length} heroes by win rate` : `Top ${Math.min(TOP, rows.length)} by win rate`;

  const toggle = (long: boolean) =>
    canExpand ? (
      <BracketButton
        onClick={() => setShowAll((v) => !v)}
        aria-expanded={showAll}
        className="px-3 text-[13px] xl:px-3.5 xl:text-sm"
      >
        {showAll ? "Show top 10" : long ? `Show all ${rows.length} heroes` : `Show all ${rows.length}`}
      </BracketButton>
    ) : null;

  return (
    <Card index={index} aria-labelledby="standings-title">
      <SectionHeader
        numeral="I."
        title="Hero standings"
        id="standings-title"
        caption={
          <>
            {scope}
            <span className="hidden xl:inline"> · min. {formatCompact(minMatches)} matches</span>
            <span className="hidden md:inline"> · change vs last patch</span>
          </>
        }
        action={
          <div className="hidden md:block">
            <span className="xl:hidden">{toggle(false)}</span>
            <span className="hidden xl:inline">{toggle(true)}</span>
          </div>
        }
      />

      {/* Tablet and desktop: table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm xl:min-w-[760px]">
          <thead>
            <tr className="text-right font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
              <th scope="col" className="hidden w-9 py-2 text-left font-normal xl:table-cell xl:py-2.5">#</th>
              <th scope="col" className="py-2 text-left font-normal xl:py-2.5">Hero</th>
              <th scope="col" className="w-[190px] py-2 text-left font-normal xl:w-[220px] xl:py-2.5">Win rate</th>
              <th scope="col" className="py-2 font-normal xl:py-2.5">
                <abbr title="Change in win rate vs last patch" className="no-underline">Δ</abbr>
              </th>
              <th scope="col" className="py-2 font-normal xl:py-2.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className={`cursor-help uppercase underline decoration-tick decoration-dotted underline-offset-4 ${FOCUS_RING}`}>
                      Pick
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{PICK_HINT}</TooltipContent>
                </Tooltip>
              </th>
              <th scope="col" className="py-2 font-normal xl:py-2.5">KDA</th>
              <th scope="col" className="py-2 font-normal xl:py-2.5">Souls/match</th>
              <th scope="col" className="hidden py-2 font-normal xl:table-cell xl:py-2.5">Matches</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {visible.map((row) => (
                <motion.tr
                  key={row.heroId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  {...highlightHandlers(setActive, row.heroId)}
                  className={cn("border-t border-rule text-right font-mono text-fg-2 transition-colors hover:bg-surface-2", active === row.heroId && "bg-surface-2")}
                >
                  <td className="hidden py-3 text-left text-muted-foreground xl:table-cell">
                    {String(row.position).padStart(2, "0")}
                  </td>
                  <td className="py-2.5 text-left xl:py-3">
                    <div className="flex items-center gap-2.5 xl:gap-3">
                      <HeroTile name={row.name} iconUrl={row.iconUrl} size={30} className="xl:[--tile:34px]" />
                      <span className="font-sans text-fg xl:text-[15px]">{row.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 text-left xl:py-3 xl:pr-4">
                    <div className="flex items-center gap-2 xl:gap-2.5">
                      <span className="w-[42px] text-fg xl:w-11">{formatPercent(row.winRate)}</span>
                      <WinRateBar winRate={row.winRate} />
                    </div>
                  </td>
                  <td className="py-2.5 xl:py-3">
                    <Delta value={row.delta} />
                  </td>
                  <td className="py-2.5 xl:py-3">{formatPercent(row.pickRate)}</td>
                  <td className="py-2.5 xl:py-3">{formatKda(row.kda)}</td>
                  <td className="py-2.5 xl:py-3">{formatInt(row.soulsPerMatch)}</td>
                  <td className="hidden py-3 text-muted-foreground xl:table-cell">{formatInt(row.matches)}</td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Phone: stacked rows */}
      <ol className="flex flex-col md:hidden">
        <AnimatePresence initial={false}>
          {visible.map((row) => (
            <motion.li
              key={row.heroId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-2.5 border-t border-rule py-2.5"
            >
              <HeroTile name={row.name} iconUrl={row.iconUrl} size={34} />
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="text-sm">
                  {row.name}{" "}
                  <span className="font-mono text-[11px] text-muted-foreground">
                    · <abbr title={PICK_HINT} className="no-underline">pick</abbr> {formatPercent(row.pickRate)} · KDA{" "}
                    {formatKda(row.kda)}
                  </span>
                </span>
                <WinRateBar winRate={row.winRate} className="flex-none" />
              </div>
              <div className="flex flex-col items-end gap-0.5 font-mono">
                <span className="text-sm">{formatPercent(row.winRate)}</span>
                <Delta value={row.delta} className="text-[11px]" />
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
      <div className="md:hidden [&>button]:w-full">{toggle(true)}</div>

      <p className="hidden font-mono text-xs text-muted-foreground xl:block">The tick on each bar marks 50%.</p>
    </Card>
  );
}
