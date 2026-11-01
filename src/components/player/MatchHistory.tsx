"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { HeroTile } from "@/components/ui/HeroTile";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { formatCompact, formatDuration, formatSigned } from "@/lib/format";
import type { HistoryRow } from "@/lib/deadlock/player";
import { BracketButton } from "@/components/ui/buttons";

const PAGE = 10;

function rankPts(delta: number | null) {
  return delta == null ? "—" : formatSigned(delta, 0);
}

const resultClass = (won: boolean) => (won ? "text-brass" : "text-mother-text");

/**
 * Newest first. After "Refresh", new matches slide in at the top (rows are
 * keyed by match id, so only new ones animate).
 */
export function MatchHistory({ rows }: { rows: HistoryRow[] }) {
  const [shown, setShown] = useState(PAGE);
  const visible = rows.slice(0, shown);
  const enter = { initial: { opacity: 0, y: -8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0 } };

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm xl:min-w-[680px]">
          <thead>
            <tr className="text-right font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
              <th scope="col" className="py-2 text-left font-normal">Hero</th>
              <th scope="col" className="py-2 text-left font-normal">Result</th>
              <th scope="col" className="py-2 font-normal">K / D / A</th>
              <th scope="col" className="py-2 font-normal">Souls</th>
              <th scope="col" className="py-2 font-normal">Length</th>
              <th scope="col" className="py-2 font-normal">Rank pts</th>
              <th scope="col" className="py-2 font-normal">When</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {visible.map((r) => (
                <motion.tr key={r.matchId} {...enter} className="border-t border-rule text-right font-mono text-fg-2">
                  <td className="py-2.5 text-left xl:py-[11px]">
                    <Link href={`/matches/${r.matchId}`} className="flex items-center gap-2 hover:text-fg xl:gap-2.5">
                      <HeroTile name={r.heroName} iconUrl={r.heroIcon} size={28} />
                      <span className="font-sans text-fg">{r.heroName}</span>
                    </Link>
                  </td>
                  <td className={cn("py-2.5 text-left xl:py-[11px]", resultClass(r.won))}>{r.won ? "Win" : "Loss"}</td>
                  <td className="py-2.5 text-fg xl:py-[11px]">
                    {r.kills} / {r.deaths} / {r.assists}
                  </td>
                  <td className="py-2.5 xl:py-[11px]">{formatCompact(r.souls)}</td>
                  <td className="py-2.5 xl:py-[11px]">{formatDuration(r.durationS)}</td>
                  <td className={cn("py-2.5 xl:py-[11px]", r.rankDelta == null ? "text-muted-foreground" : resultClass(r.rankDelta >= 0))}>
                    {rankPts(r.rankDelta)}
                  </td>
                  <td className="py-2.5 text-muted-foreground xl:py-[11px]">
                    <RelativeTime unix={r.startTime} />
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col md:hidden">
        <AnimatePresence initial={false}>
          {visible.map((r) => (
            <motion.li key={r.matchId} {...enter}>
              <Link
                href={`/matches/${r.matchId}`}
                className="grid min-h-[52px] grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-2.5 border-t border-rule py-1.5"
              >
                <HeroTile name={r.heroName} iconUrl={r.heroIcon} size={32} />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm">
                    {r.heroName} <span className={cn("font-mono text-xs", resultClass(r.won))}>· {r.won ? "Win" : "Loss"}</span>
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {r.kills} / {r.deaths} / {r.assists} · {formatCompact(r.souls)} souls
                  </span>
                </span>
                <span className="flex flex-col items-end gap-0.5 font-mono">
                  <span className={cn("text-[13px]", r.rankDelta == null ? "text-muted-foreground" : resultClass(r.rankDelta >= 0))}>
                    {rankPts(r.rankDelta)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    <RelativeTime unix={r.startTime} />
                  </span>
                </span>
              </Link>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {rows.length > shown && (
        <BracketButton onClick={() => setShown((n) => n + PAGE)} className="w-full md:w-auto md:self-start">
          Show more matches
        </BracketButton>
      )}
    </>
  );
}
