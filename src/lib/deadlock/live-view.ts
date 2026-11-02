// Live page view types and helpers. No server imports, so client components
// (the board polls /api/live) can use them.

import type { ObjectivesLeft } from "./objectives";
import type { TeamId } from "./teams";

export type LiveMatchView = {
  id: number;
  /** Unix seconds. */
  startTime: number | null;
  ranked: boolean;
  region: string | null;
  souls: Record<TeamId, number>;
  spectators: number;
  heroes: Record<TeamId, number[]>;
  objectives: Record<TeamId, ObjectivesLeft>;
  /** Raw objective bitmasks (see ./objectives.ts), for the live log's events. */
  masks: Record<TeamId, number>;
  avgRank: { tier: number; subrank: number; name: string } | null;
};

export type LiveHero = { name: string; iconUrl: string | null };

export type LiveBoardData = {
  /** Server time of this snapshot, unix seconds. */
  fetchedAt: number;
  /**
   * When the data source produced these numbers, unix seconds. The API refreshes
   * the live list about every 2 minutes, so this can trail `fetchedAt` by minutes.
   */
  dataAt: number;
  /** Normal-mode matches only (Street Brawl is excluded). */
  matches: LiveMatchView[];
  heroes: Record<number, LiveHero>;
  rankOptions: { value: string; label: string }[];
};

/** Response of /api/live?match=<id>. */
export type LiveMatchSnapshot = {
  fetchedAt: number;
  /** See LiveBoardData.dataAt. */
  dataAt: number;
  match: LiveMatchView | null;
  heroes: Record<number, LiveHero>;
};

export const REGIONS: { value: string; label: string }[] = [
  { value: "row", label: "Rest of world" },
  { value: "europe", label: "Europe" },
  { value: "se_asia", label: "SE Asia" },
  { value: "s_america", label: "South America" },
  { value: "russia", label: "Russia" },
  { value: "oceania", label: "Oceania" },
];

export function regionLabel(region: string | null): string {
  return REGIONS.find((r) => r.value === region)?.label ?? "Unknown region";
}

/** Phone "Top ranked" chip: Oracle and above. */
export const TOP_RANKED_TIER = 8;

function rankStep(m: LiveMatchView): number {
  return m.avgRank ? m.avgRank.tier * 6 + m.avgRank.subrank : -1;
}

/** Highest average rank first; unknown ranks last; ties by spectators. */
export function sortLive(matches: LiveMatchView[]): LiveMatchView[] {
  return [...matches].sort((a, b) => rankStep(b) - rankStep(a) || b.spectators - a.spectators);
}

export function filterLive(matches: LiveMatchView[], minTier: number | null, region: string | null): LiveMatchView[] {
  return matches.filter(
    (m) => (minTier == null || (m.avgRank != null && m.avgRank.tier >= minTier)) && (region == null || m.region === region),
  );
}

/** The leading team and its souls lead; null leader when level. */
export function leadOf(m: LiveMatchView): { leader: TeamId | null; lead: number } {
  const diff = m.souls[0] - m.souls[1];
  return { leader: diff === 0 ? null : diff > 0 ? 0 : 1, lead: Math.abs(diff) };
}

/** Heroes by number of live matches they're in, most first. */
export function pickCounts(matches: LiveMatchView[], top = 8): { heroId: number; count: number }[] {
  const counts = new Map<number, number>();
  for (const m of matches) for (const id of [...m.heroes[0], ...m.heroes[1]]) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts].map(([heroId, count]) => ({ heroId, count })).sort((a, b) => b.count - a.count).slice(0, top);
}
