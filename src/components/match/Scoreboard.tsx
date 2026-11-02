"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { HeroTile } from "@/components/ui/HeroTile";
import { ArrowLink, FOCUS_RING } from "@/components/ui/buttons";
import { highlightHandlers, useRowHighlight } from "@/components/ui/RowHighlight";
import { formatCompact, formatInt } from "@/lib/format";
import { KING, MOTHER, TEAMS, type TeamId } from "@/lib/deadlock/teams";
import type { ScoreRow } from "@/lib/deadlock/match";

function Mvp() {
  return <span className="ml-1.5 font-mono text-[10px] tracking-[0.06em] text-brass">MVP</span>;
}

function PlayerName({ row, className }: { row: ScoreRow; className?: string }) {
  if (!row.playerName) return <span className={cn("text-muted-foreground", className)}>Anonymous</span>;
  return (
    <Link href={`/players/${row.accountId}`} className={cn("text-muted-foreground hover:text-fg", className)}>
      {row.playerName}
    </Link>
  );
}

const kda = (r: ScoreRow) => `${r.kills} / ${r.deaths} / ${r.assists}`;

function TeamTable({ team, rows }: { team: TeamId; rows: ScoreRow[] }) {
  // Hovering a row highlights the player in "Who did the damage", and the reverse.
  const { active, setActive } = useRowHighlight();
  const t = TEAMS[team];
  return (
    <div className="overflow-x-auto">
      {/* Fixed column widths so both teams' tables line up column for column. */}
      <table className="w-full table-fixed border-collapse text-[13px] xl:min-w-[720px] xl:text-sm">
        <caption className={cn("pb-2 text-left font-mono text-xs uppercase tracking-[0.08em]", t.textClass)}>{t.name}</caption>
        <colgroup>
          <col className="w-[34%]" />
          <col className="w-[16%]" />
          <col className="w-[10%]" />
          <col className="w-[10%]" />
          <col className="w-[10%]" />
          <col className="w-[10%]" />
          <col className="w-[10%]" />
        </colgroup>
        <thead>
          <tr className="text-right font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground xl:text-[11px]">
            <th scope="col" className="py-2 text-left font-normal">Hero · player</th>
            <th scope="col" className="py-2 font-normal">K / D / A</th>
            <th scope="col" className="py-2 font-normal">Souls</th>
            <th scope="col" className="py-2 font-normal">Last hits</th>
            <th scope="col" className="py-2 font-normal">Hero dmg</th>
            <th scope="col" className="py-2 font-normal">Obj dmg</th>
            <th scope="col" className="py-2 font-normal">Healing</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.accountId}
              {...highlightHandlers(setActive, r.accountId)}
              className={cn("border-t border-rule text-right font-mono text-fg-2 transition-colors", active === r.accountId && "bg-surface-2")}
            >
              <th scope="row" className="py-[9px] text-left font-normal xl:py-2.5">
                <div className="flex items-center gap-2 xl:gap-2.5">
                  <HeroTile name={r.heroName} iconUrl={r.heroIcon} size={28} borderClass={t.borderClass} className="xl:[--tile:30px]" />
                  <span className="flex min-w-0 flex-col gap-px">
                    <span className="font-sans text-fg">
                      {r.heroName}
                      {r.mvp && <Mvp />}
                    </span>
                    <PlayerName row={r} className="truncate text-xs" />
                  </span>
                </div>
              </th>
              <td className="py-[9px] text-fg xl:py-2.5">{kda(r)}</td>
              <td className="py-[9px] xl:py-2.5">{formatCompact(r.souls)}</td>
              <td className="py-[9px] xl:py-2.5">{formatInt(r.lastHits)}</td>
              <td className="py-[9px] xl:py-2.5">{formatCompact(r.heroDamage)}</td>
              <td className="py-[9px] xl:py-2.5">{formatCompact(r.objectiveDamage)}</td>
              <td className="py-[9px] xl:py-2.5">{formatCompact(r.healing)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PhoneRow({ row, team }: { row: ScoreRow; team: TeamId }) {
  const [open, setOpen] = useState(false);
  const t = TEAMS[team];
  const panelId = `score-${row.accountId}`;
  const stats: [string, string][] = [
    ["Last hits", formatInt(row.lastHits)],
    ["Hero dmg", formatCompact(row.heroDamage)],
    ["Obj dmg", formatCompact(row.objectiveDamage)],
    ["Healing", formatCompact(row.healing)],
    ["Denies", formatInt(row.denies)],
    ["Level", row.level == null ? "—" : String(row.level)],
  ];
  return (
    <motion.li layout className="border-t border-rule">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={cn("grid min-h-[52px] w-full grid-cols-[30px_minmax(0,1fr)_auto_16px] items-center gap-2.5 py-1.5 text-left", FOCUS_RING)}
      >
        <HeroTile name={row.heroName} iconUrl={row.heroIcon} size={30} borderClass={t.borderClass} />
        <span className="flex min-w-0 flex-col gap-px">
          <span className="text-sm">
            {row.heroName}
            {row.mvp && <Mvp />}
          </span>
          <span className="truncate font-mono text-[11px] text-muted-foreground">{row.playerName ?? "Anonymous"}</span>
        </span>
        <span className="flex flex-col items-end gap-px font-mono">
          <span className="text-[13px]">{kda(row)}</span>
          <span className="text-[11px] text-muted-foreground">{formatCompact(row.souls)} souls</span>
        </span>
        <ChevronDown size={16} strokeWidth={1.5} aria-hidden="true" className={cn("text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-2 pb-3 pl-10"
          >
            <dl className="grid grid-cols-3 gap-x-3 gap-y-2">
              {stats.map(([label, value]) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">{label}</dt>
                  <dd className="font-mono text-[13px]">{value}</dd>
                </div>
              ))}
            </dl>
            {row.playerName && (
              <ArrowLink href={`/players/${row.accountId}`} className="self-start text-[13px]">
                Player profile
              </ArrowLink>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

export function Scoreboard({ scoreboard }: { scoreboard: Record<TeamId, ScoreRow[]> }) {
  return (
    <>
      <div className="hidden flex-col gap-[18px] md:flex">
        {[KING, MOTHER].map((team) => (
          <TeamTable key={team} team={team} rows={scoreboard[team]} />
        ))}
      </div>
      <div className="flex flex-col gap-3.5 md:hidden">
        {[KING, MOTHER].map((team) => (
          <div key={team} className="flex flex-col">
            <span className={cn("pb-1.5 font-mono text-[11px] uppercase tracking-[0.08em]", TEAMS[team].textClass)}>{TEAMS[team].name}</span>
            <ul>
              {scoreboard[team].map((r) => (
                <PhoneRow key={r.accountId} row={r} team={team} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  );
}
