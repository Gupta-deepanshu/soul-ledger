// View models for the in-progress match page: player rows, team ranks and the
// draft matchup. Pure functions over mapped data; no server imports, so client
// components can use the types.

import { MIN_HERO_MATCHES, MIN_MATCHUP_MATCHES, shortHeroName, type MatchupCell, type MatchupGrid } from "./meta";
import type { TeamId } from "./teams";
import type { Badge, Hero, HeroStat, MatchupStat, Rank } from "./types";

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

/** What RankBadge shows. */
export type RankDisplay = { name: string; numeral: string; imageUrl: string | null };

export function rankDisplay(badge: Pick<Badge, "tier" | "subrank">, ranks: Rank[]): RankDisplay {
  const asset = ranks.find((r) => r.tier === badge.tier);
  return {
    name: asset?.name ?? `Tier ${badge.tier}`,
    numeral: ROMAN[badge.subrank - 1] ?? String(badge.subrank),
    imageUrl: asset?.subrankImageUrls[badge.subrank - 1] ?? asset?.imageUrl ?? null,
  };
}

/**
 * Average of some badges on a continuous scale (tier × 6 + subrank), so tier
 * boundaries don't skew it. Null when fewer than `minCount` badges are given.
 */
export function averageBadge(badges: Pick<Badge, "tier" | "subrank">[], minCount: number): { tier: number; subrank: number } | null {
  if (badges.length === 0 || badges.length < minCount) return null;
  const steps = badges.map((b) => b.tier * 6 + (b.subrank - 1));
  const avg = Math.round(steps.reduce((sum, s) => sum + s, 0) / steps.length);
  return { tier: Math.floor(avg / 6), subrank: (avg % 6) + 1 };
}

// ---- Lineups --------------------------------------------------------------------

export type LivePlayerRow = {
  accountId: number | null;
  heroId: number;
  heroName: string;
  heroIcon: string | null;
  /** Steam name; null when private or the lookup failed. */
  name: string | null;
  /** null = unranked; undefined = unknown (the rank lookup failed). */
  rank: RankDisplay | null | undefined;
  /** All-time normal-mode record on this hero; null when unknown. */
  heroRecord: { matches: number; winRate: number } | null;
};

export type LiveLineups = {
  players: Record<TeamId, LivePlayerRow[]>;
  /** Average of the team's ranked players; null with fewer than 2 ranked. */
  teamRank: Record<TeamId, RankDisplay | null>;
};

/** A team needs this many ranked players before it gets an average rank. */
const MIN_RANKED_PER_TEAM = 2;

export function buildLiveLineups(
  players: { accountId: number | null; heroId: number; team: TeamId }[],
  heroes: Hero[],
  ranks: Rank[],
  names: Record<number, string> | null,
  badges: Map<number, Badge | null> | null,
  records: { accountId: number; heroId: number; matches: number; wins: number }[] | null,
): LiveLineups {
  const heroById = new Map(heroes.map((h) => [h.id, h]));
  const recordOf = new Map(records?.map((r) => [`${r.accountId}:${r.heroId}`, r]));

  const row = (p: (typeof players)[number]): LivePlayerRow => {
    const hero = heroById.get(p.heroId);
    const id = p.accountId;
    const badge = id == null || badges == null ? undefined : badges.get(id);
    const record = id == null ? undefined : recordOf.get(`${id}:${p.heroId}`);
    return {
      accountId: id,
      heroId: p.heroId,
      heroName: hero?.name ?? `Hero ${p.heroId}`,
      heroIcon: hero?.iconUrl ?? null,
      name: id == null ? null : (names?.[id] ?? null),
      rank: badge === undefined ? undefined : badge && rankDisplay(badge, ranks),
      heroRecord: record && record.matches > 0 ? { matches: record.matches, winRate: record.wins / record.matches } : null,
    };
  };

  const teamRank = (team: TeamId): RankDisplay | null => {
    const teamBadges = players.flatMap((p) => {
      const b = p.team === team && p.accountId != null ? badges?.get(p.accountId) : null;
      return b ? [b] : [];
    });
    const avg = averageBadge(teamBadges, MIN_RANKED_PER_TEAM);
    return avg && rankDisplay(avg, ranks);
  };

  return {
    players: { 0: players.filter((p) => p.team === 0).map(row), 1: players.filter((p) => p.team === 1).map(row) },
    teamRank: { 0: teamRank(0), 1: teamRank(1) },
  };
}

// ---- Draft matchup ---------------------------------------------------------------

/** Below this many matchup pairs with enough games, the draft edge isn't shown. */
export const MIN_DRAFT_PAIRS = 12;

export type DraftHero = { heroId: number; name: string; iconUrl: string | null; metaWinRate: number | null };

export type LiveDraft = {
  /** Rows = Hidden King heroes, columns = Archmother heroes. */
  grid: MatchupGrid;
  heroes: Record<TeamId, DraftHero[]>;
  /** Mean of the pairs' (row win rate − 50) in points; positive favours the Hidden King. Null below MIN_DRAFT_PAIRS. */
  edge: { leader: TeamId | null; points: number } | null;
  /** Pairs with enough games to count. */
  pairs: number;
};

export function buildLiveDraft(
  teamHeroes: Record<TeamId, number[]>,
  heroStats: HeroStat[],
  heroes: Hero[],
  stats: MatchupStat[],
): LiveDraft {
  const heroById = new Map(heroes.map((h) => [h.id, h]));
  // Same minimum sample as the Meta standings.
  const winRate = new Map(heroStats.filter((s) => s.matches >= MIN_HERO_MATCHES).map((s) => [s.heroId, s.winRate]));
  const toDraft = (id: number): DraftHero => ({
    heroId: id,
    name: heroById.get(id)?.name ?? `Hero ${id}`,
    iconUrl: heroById.get(id)?.iconUrl ?? null,
    metaWinRate: winRate.get(id) ?? null,
  });
  const king = teamHeroes[0].map(toDraft);
  const mother = teamHeroes[1].map(toDraft);
  const matchupHero = (h: DraftHero) => ({ heroId: h.heroId, name: h.name, shortName: shortHeroName(h.name) });

  const pairs = new Map(stats.map((s) => [`${s.heroId}:${s.enemyHeroId}`, s]));
  const values: number[] = [];
  const cells = king.map((row) =>
    mother.map((col): MatchupCell => {
      if (row.heroId === col.heroId) return null;
      const pair = pairs.get(`${row.heroId}:${col.heroId}`);
      if (!pair || pair.matches < MIN_MATCHUP_MATCHES) return "n/a";
      const v = (pair.wins / pair.matches - 0.5) * 100;
      values.push(v);
      return v;
    }),
  );

  let edge: LiveDraft["edge"] = null;
  if (values.length >= MIN_DRAFT_PAIRS) {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const points = Math.round(Math.abs(mean) * 10) / 10;
    edge = { leader: points === 0 ? null : mean > 0 ? 0 : 1, points };
  }

  return {
    grid: { heroes: king.map(matchupHero), cols: mother.map(matchupHero), cells },
    heroes: { 0: king, 1: mother },
    edge,
    pairs: values.length,
  };
}
