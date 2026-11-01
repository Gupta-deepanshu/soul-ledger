"use client";

import { use } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SectionError } from "@/components/ui/SectionError";
import { MatchupGrid } from "@/components/charts/MatchupGrid";
import { formatPercent } from "@/lib/format";
import { KING, MOTHER, TEAMS, type TeamId } from "@/lib/deadlock/teams";
import type { LiveDraft } from "@/lib/deadlock/live-match";
import type { Settled } from "@/lib/deadlock/settle";

function Edge({ draft }: { draft: LiveDraft }) {
  const { edge } = draft;
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
      <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Draft edge</span>
      {edge == null ? (
        <span className="text-fg-2">Not enough matchup data for these heroes</span>
      ) : edge.leader == null ? (
        <span className="font-mono">Even</span>
      ) : (
        <span className={cn("font-mono", TEAMS[edge.leader].textClass)}>
          {TEAMS[edge.leader].shortName} +{edge.points.toFixed(1)} pts
        </span>
      )}
      <span className="text-xs text-muted-foreground">· from meta stats, not a prediction</span>
    </p>
  );
}

function MetaRates({ draft, team }: { draft: LiveDraft; team: TeamId }) {
  const t = TEAMS[team];
  return (
    <div className="flex min-w-0 flex-col">
      <span className={cn("pb-1 text-xs font-medium", t.textClass)}>{t.shortName}</span>
      <dl className="flex flex-col">
        {draft.heroes[team].map((h) => (
          <div key={h.heroId} className="flex items-baseline justify-between gap-2 border-t border-rule py-1 text-[13px]">
            <dt className="truncate">{h.name}</dt>
            <dd className="font-mono text-xs text-fg-2 tabular-nums">{h.metaWinRate == null ? "—" : formatPercent(h.metaWinRate)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function DraftMatchupSkeleton() {
  return (
    <div aria-busy="true" className="flex min-w-0 flex-col gap-2.5 border border-line bg-surface p-4 md:gap-3.5 md:p-[22px] xl:px-[26px] xl:py-6">
      <SectionHeader numeral="II." title="Draft matchup" caption={<span className="sr-only">Loading…</span>} />
      {/* The grid's shape, with room for the row labels on the left. */}
      <div className="grid grid-cols-6 gap-0.5 pl-16 md:gap-[3px] md:pl-24">
        {Array.from({ length: 36 }, (_, i) => (
          <span key={i} className="h-10 bg-surface-2 md:h-11" />
        ))}
      </div>
    </div>
  );
}

/** The two lineups as a counter grid, each hero's meta win rate, and a rough draft edge. */
export function DraftMatchup({ draft, index }: { draft: Promise<Settled<LiveDraft>>; index?: number }) {
  const result = use(draft);
  return (
    <Card index={index} aria-labelledby="draft-title">
      <SectionHeader
        numeral="II."
        title="Draft matchup"
        id="draft-title"
        caption={
          <>
            <span className="md:hidden">Row vs column hero, win rate minus 50% · this patch</span>
            <span className="hidden md:inline">
              {TEAMS[KING].shortName} heroes (rows) vs {TEAMS[MOTHER].shortName} heroes (columns) · row win rate minus 50%, this patch
            </span>
          </>
        }
      />
      {result.ok ? (
        <>
          <Edge draft={result.data} />
          <MatchupGrid grid={result.data.grid} rowLabelClassName={TEAMS[KING].textClass} colLabelClassName={TEAMS[MOTHER].textClass} />
          <div className="flex flex-wrap gap-3 font-mono text-[11px] text-muted-foreground md:gap-[18px] md:text-xs">
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2.5 bg-brass md:size-3" />
              {TEAMS[KING].shortName} hero favoured
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2.5 bg-mother md:size-3" />
              {TEAMS[MOTHER].shortName} hero favoured
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Meta win rate this patch</span>
            <div className="grid grid-cols-2 gap-4 md:gap-6">
              <MetaRates draft={result.data} team={KING} />
              <MetaRates draft={result.data} team={MOTHER} />
            </div>
          </div>
        </>
      ) : (
        <SectionError failure={result.failure} />
      )}
    </Card>
  );
}
