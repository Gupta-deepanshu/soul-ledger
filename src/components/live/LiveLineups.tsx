"use client";

import { use } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SectionError } from "@/components/ui/SectionError";
import { HeroTile } from "@/components/ui/HeroTile";
import { RankBadge } from "@/components/ui/RankBadge";
import { formatInt, formatPercent } from "@/lib/format";
import { KING, MOTHER, TEAMS, type TeamId } from "@/lib/deadlock/teams";
import type { LiveLineups as LiveLineupsData, LivePlayerRow } from "@/lib/deadlock/live-match";
import type { Settled } from "@/lib/deadlock/settle";

const Dash = () => <span className="text-faint">—</span>;

function PlayerRow({ row, team }: { row: LivePlayerRow; team: TeamId }) {
  const t = TEAMS[team];
  return (
    <li className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-x-3 border-t border-rule py-2.5 xl:grid-cols-[34px_minmax(0,1fr)_auto]">
      <HeroTile name={row.heroName} iconUrl={row.heroIcon} size={32} borderClass={t.borderClass} className="xl:[--tile:34px]" />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm">{row.heroName}</span>
        <span className="truncate text-[13px] text-fg-2">
          {row.name && row.accountId != null ? (
            <Link href={`/players/${row.accountId}`} className="hover:text-fg hover:underline">
              {row.name}
            </Link>
          ) : (
            <Dash />
          )}
        </span>
      </span>
      <span className="flex flex-col items-end gap-0.5 text-right">
        {row.rank === undefined ? <Dash /> : <RankBadge rank={row.rank} className="text-[13px]" />}
        <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
          {row.heroRecord ? (
            <>
              {formatInt(row.heroRecord.matches)} g · {formatPercent(row.heroRecord.winRate, 0)}
              <span className="sr-only"> win rate on {row.heroName}</span>
            </>
          ) : (
            <Dash />
          )}
        </span>
      </span>
    </li>
  );
}

function Team({ data, team }: { data: LiveLineupsData; team: TeamId }) {
  const t = TEAMS[team];
  const avg = data.teamRank[team];
  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pb-2">
        <h3 className={cn("text-sm font-medium", t.textClass)}>{t.name}</h3>
        <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          Avg {avg ? <RankBadge rank={avg} className="normal-case tracking-normal text-fg-2" /> : <Dash />}
        </span>
      </div>
      <ul aria-label={`${t.name} players`}>
        {data.players[team].map((row) => (
          <PlayerRow key={`${row.heroId}-${row.accountId}`} row={row} team={team} />
        ))}
      </ul>
    </div>
  );
}

/** Both lineups with each player's Steam name, rank and record on their hero. */
export function LiveLineups({ lineups, index }: { lineups: Promise<Settled<LiveLineupsData>>; index?: number }) {
  const result = use(lineups);
  return (
    <Card index={index} aria-labelledby="lineups-title">
      <SectionHeader
        numeral="I."
        title="Lineups"
        id="lineups-title"
        caption={
          <>
            <span className="md:hidden">Rank · games and win rate on this hero</span>
            <span className="hidden md:inline">Steam name · current rank · games and win rate on this hero, all time</span>
          </>
        }
      />
      {result.ok ? (
        <div className="grid gap-5 md:grid-cols-2 md:gap-6 xl:gap-8">
          <Team data={result.data} team={KING} />
          <Team data={result.data} team={MOTHER} />
        </div>
      ) : (
        <SectionError failure={result.failure} />
      )}
    </Card>
  );
}

export function LiveLineupsSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-5 border border-line bg-surface p-4 md:grid-cols-2 md:gap-6 md:p-[22px] xl:px-[26px] xl:py-6">
      <span className="sr-only">Loading lineups…</span>
      {[0, 1].map((team) => (
        <div key={team} className="flex flex-col">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 border-t border-rule py-2.5">
              <span className="size-8 shrink-0 bg-surface-2" />
              <span className="h-2.5 flex-1 bg-surface-2" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
