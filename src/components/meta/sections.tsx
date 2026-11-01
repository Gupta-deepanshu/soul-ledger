// Meta page sections. Each loads its own data (shared calls are deduplicated
// by the cache) and renders its own loading, empty and error states, so one
// failing endpoint never takes down the page.

import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SectionError } from "@/components/ui/SectionError";
import { StatCell, StatGrid, type Stat } from "@/components/ui/StatGrid";
import { RankDistribution } from "@/components/charts/RankDistribution";
import { MatchupGrid } from "@/components/charts/MatchupGrid";
import {
  getGameTotals,
  getHeroStats,
  getHeroes,
  getItemStats,
  getItems,
  getLast24hGameTotals,
  getMatchupStats,
  getPatchWindows,
  getRankDistribution,
  getRanks,
} from "@/lib/deadlock/api";
import type { ApiFailure } from "@/lib/deadlock/client";
import {
  DEFAULT_HIGHLIGHT_TIER,
  MIN_HERO_MATCHES,
  buildHeroRows,
  buildItemRows,
  buildMatchupGrid,
  buildMovers,
  buildRankShares,
  minBadgeFor,
} from "@/lib/deadlock/meta";
import { settle } from "@/lib/deadlock/settle";
import { KING, MOTHER, TEAMS } from "@/lib/deadlock/teams";
import type { PatchWindows } from "@/lib/deadlock/types";
import { formatDuration, formatCompact, formatPercent } from "@/lib/format";
import { HeroStandings } from "./HeroStandings";
import { ItemsThatWin } from "./ItemsThatWin";
import { Movers } from "./Movers";

type SectionProps = { minTier: Promise<number | null>; index?: number };

async function requireWindows(): Promise<PatchWindows> {
  const windows = await getPatchWindows();
  if (!windows) throw new Error("The patch list came back empty");
  return windows;
}

/** Hero rows for the current patch, shared by standings, movers and the matchup grid. */
async function loadHeroRows(minBadge: number | undefined) {
  const windows = await requireWindows();
  const [current, previous, heroes, totals] = await Promise.all([
    getHeroStats(windows.current, minBadge),
    windows.previous ? getHeroStats(windows.previous, minBadge) : Promise.resolve([]),
    getHeroes(),
    getGameTotals(windows.current, minBadge),
  ]);
  return { windows, rows: totals ? buildHeroRows(current, previous, heroes, totals) : [] };
}

// ---- States -----------------------------------------------------------------

function ErrorCard({ numeral, title, failure, index }: { numeral: string; title: string; failure: ApiFailure | null; index?: number }) {
  return (
    <Card index={index}>
      <SectionHeader numeral={numeral} title={title} />
      <SectionError failure={failure} />
    </Card>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-3 text-sm text-muted-foreground">{children}</p>;
}

const EMPTY_AT_RANK = "Not enough matches at this rank yet.";

/** Static placeholder in the card's shape. No looping animation (the live dot is the only one). */
export function CardSkeleton({ numeral, title, rows = 6, className }: { numeral: string; title: string; rows?: number; className?: string }) {
  return (
    <div aria-busy="true" className={`flex min-w-0 flex-col gap-2.5 border border-line bg-surface p-4 md:gap-3.5 md:p-[22px] xl:gap-4 xl:px-[26px] xl:py-6 ${className ?? ""}`}>
      <SectionHeader numeral={numeral} title={title} caption={<span className="sr-only">Loading…</span>} />
      <div className="flex flex-col">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-3 border-t border-rule py-3">
            <span className="size-[30px] shrink-0 bg-surface-2" />
            <span className="h-2.5 flex-1 bg-surface-2" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PatchTotalsSkeleton() {
  return (
    <section aria-busy="true" aria-label="Patch totals" className="grid grid-cols-2 gap-px border border-line bg-line xl:grid-cols-4 xl:gap-0 xl:border-0 xl:border-b xl:bg-transparent">
      {["Matches this patch", "Average match", `${TEAMS[0].shortName} wins`, "Souls per minute"].map((label) => (
        <StatCell key={label} label={label} note={<span className="opacity-0">–</span>}>
          <span className="text-faint">—</span>
        </StatCell>
      ))}
    </section>
  );
}

// ---- Sections -----------------------------------------------------------------

export async function PatchTotals({ minTier }: SectionProps) {
  const minBadge = minBadgeFor(await minTier);
  const result = await settle(
    (async () => {
      const windows = await requireWindows();
      return Promise.all([
        getGameTotals(windows.current, minBadge),
        windows.previous ? getGameTotals(windows.previous, minBadge) : Promise.resolve(null),
        getLast24hGameTotals(minBadge),
      ]);
    })(),
  );
  if (!result.ok) {
    return (
      <section aria-label="Patch totals" className="border border-line p-4 xl:border-0 xl:border-b xl:px-0">
        <SectionError failure={result.failure} />
      </section>
    );
  }
  const [totals, previous, last24h] = result.data;
  if (!totals) {
    return (
      <section aria-label="Patch totals" className="border border-line p-4 xl:border-0 xl:border-b xl:px-0">
        <Empty>{EMPTY_AT_RANK}</Empty>
      </section>
    );
  }

  const kingId = KING;
  const motherId = MOTHER;
  const decided = totals.wins[0] + totals.wins[1];
  const durationChange = previous ? totals.avgDurationS - previous.avgDurationS : null;

  const stats: Stat[] = [
    {
      label: "Matches this patch",
      value: totals.matches,
      format: "compact",
      note: last24h ? `+${formatCompact(last24h.matches)} in the last 24 h` : undefined,
    },
    {
      label: "Average match",
      value: totals.avgDurationS,
      format: "duration",
      note:
        durationChange == null || Math.abs(durationChange) < 1
          ? "minutes"
          : `minutes · ${durationChange < 0 ? "down" : "up"} ${formatDuration(Math.abs(durationChange))}`,
    },
    {
      label: `${TEAMS[kingId].shortName} wins`,
      value: decided ? totals.wins[kingId] / decided : 0,
      format: "percent",
      note: `vs ${formatPercent(decided ? totals.wins[motherId] / decided : 0)} ${TEAMS[motherId].shortName}`,
    },
    {
      label: "Souls per minute",
      value: totals.avgSouls / (totals.avgDurationS / 60),
      format: "int",
      note: "per player, all heroes",
    },
  ];
  return <StatGrid stats={stats} label="Patch totals" />;
}

export async function HeroStandingsSection({ minTier, index }: SectionProps) {
  const result = await settle(loadHeroRows(minBadgeFor(await minTier)));
  if (!result.ok) return <ErrorCard numeral="I." title="Hero standings" failure={result.failure} index={index} />;
  const { rows } = result.data;
  if (rows.length === 0) {
    return (
      <Card index={index}>
        <SectionHeader numeral="I." title="Hero standings" />
        <Empty>{EMPTY_AT_RANK}</Empty>
      </Card>
    );
  }
  return <HeroStandings rows={rows} minMatches={MIN_HERO_MATCHES} index={index} />;
}

export async function MoversSection({ minTier, index }: SectionProps) {
  const result = await settle(loadHeroRows(minBadgeFor(await minTier)));
  if (!result.ok) return <ErrorCard numeral="II." title="Movers" failure={result.failure} index={index} />;
  const { rows, windows } = result.data;
  const { rising, falling } = buildMovers(rows);
  return (
    <Card index={index} aria-labelledby="movers-title">
      <SectionHeader
        numeral="II."
        title="Movers"
        id="movers-title"
        caption={<span className="hidden xl:inline">Biggest win-rate changes since last patch</span>}
      />
      {!windows.previous ? (
        <Empty>No previous patch to compare with yet.</Empty>
      ) : rising.length + falling.length === 0 ? (
        <Empty>{EMPTY_AT_RANK}</Empty>
      ) : (
        <Movers rising={rising} falling={falling} />
      )}
    </Card>
  );
}

export async function RankDistributionSection({ minTier, index }: SectionProps) {
  const tier = await minTier;
  const result = await settle(
    (async () => {
      const windows = await requireWindows();
      return Promise.all([getRankDistribution(windows.current.since), getRanks()]);
    })(),
  );
  if (!result.ok) return <ErrorCard numeral="III." title="Where players rank" failure={result.failure} index={index} />;
  const [population, ranks] = result.data;
  const { shares, median } = buildRankShares(population, ranks);
  const highlightTier = tier ?? DEFAULT_HIGHLIGHT_TIER;
  const highlightName = ranks.find((r) => r.tier === highlightTier)?.name ?? "";

  return (
    <Card index={index} aria-labelledby="ranks-title" className="xl:flex-1">
      <SectionHeader
        numeral="III."
        title="Where players rank"
        id="ranks-title"
        caption={<span className="hidden xl:inline">Share of ranked players by badge</span>}
      />
      {shares.length === 0 ? (
        <Empty>No ranked players found for this patch yet.</Empty>
      ) : (
        <>
          <RankDistribution shares={shares} highlightTier={highlightTier} />
          <p className="text-xs text-muted-foreground md:text-[13px]">
            <span className="xl:hidden">
              Median: <span className="text-fg">{median}</span> · highlighted: {highlightName} +
            </span>
            <span className="hidden xl:inline">
              Median player: <span className="text-fg">{median}</span>. Highlighted: {highlightName} and above.
            </span>
          </p>
        </>
      )}
    </Card>
  );
}

export async function ItemsSection({ minTier, index }: SectionProps) {
  const minBadge = minBadgeFor(await minTier);
  const result = await settle(
    (async () => {
      const windows = await requireWindows();
      return Promise.all([getItemStats(windows.current, minBadge), getItems(), getGameTotals(windows.current, minBadge)]);
    })(),
  );
  if (!result.ok) return <ErrorCard numeral="IV." title="Items that win" failure={result.failure} index={index} />;
  const [stats, items, totals] = result.data;
  if (!totals) {
    return (
      <Card index={index}>
        <SectionHeader numeral="IV." title="Items that win" />
        <Empty>{EMPTY_AT_RANK}</Empty>
      </Card>
    );
  }
  return <ItemsThatWin rows={buildItemRows(stats, items, totals)} index={index} />;
}

export async function MatchupSection({ minTier, index }: SectionProps) {
  const minBadge = minBadgeFor(await minTier);
  const result = await settle(
    (async () => {
      const { windows, rows } = await loadHeroRows(minBadge);
      return { rows, stats: await getMatchupStats(windows.current, minBadge) };
    })(),
  );
  if (!result.ok) return <ErrorCard numeral="V." title="Who beats whom" failure={result.failure} index={index} />;
  const grid = buildMatchupGrid(result.data.rows, result.data.stats);

  return (
    <Card index={index} aria-labelledby="matchups-title">
      <SectionHeader
        numeral="V."
        title="Who beats whom"
        id="matchups-title"
        caption={
          <>
            <span className="md:hidden">Most-picked heroes · row vs column, win rate minus 50%</span>
            <span className="hidden md:inline">The 6 most-picked heroes · row hero&apos;s win rate vs column hero, minus 50%</span>
          </>
        }
      />
      {grid.heroes.length < 2 ? (
        <Empty>{EMPTY_AT_RANK}</Empty>
      ) : (
        <>
          <MatchupGrid grid={grid} />
          <div className="flex flex-wrap gap-3 font-mono text-[11px] text-muted-foreground md:gap-[18px] md:text-xs">
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2.5 bg-brass md:size-3" />
              Row <span className="hidden md:inline">hero</span> favoured
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2.5 bg-mother md:size-3" />
              Column <span className="hidden md:inline">hero</span> favoured
            </span>
          </div>
        </>
      )}
    </Card>
  );
}
