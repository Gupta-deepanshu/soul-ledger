// Player profile view models. Pure functions over mapped data; the output is
// plain data client components can take as props.

import type { Badge, Hero, PlayerHeroRecord, PlayerMatch, PlayerMate, Rank } from "./types";

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];
/** Teammates and enemy heroes need this many games before they're listed. */
export const MIN_GAMES = 10;
const CLIMB_MATCHES = 60;
const FORM_MATCHES = 20;
/** Match history rows sent to the page (shown 10 at a time). */
const HISTORY_ROWS = 50;

export type RankLabel = { tier: number; subrank: number; name: string; numeral: string };

export type PlayerTotals = {
  matches: number;
  ranked: number;
  wins: number;
  losses: number;
  winRate: number;
  kda: number;
  perMatch: { kills: number; deaths: number; assists: number };
  soulsPerMin: number;
  /** Average souls/min in matches at the player's tier, when known. */
  tierSoulsPerMin: number | null;
};

/** One ranked match on the climb: the badge after it, plus what the hover shows. */
export type ClimbPoint = {
  step: number;
  tier: number;
  subrank: number;
  matchId: number;
  heroName: string;
  won: boolean;
  /** Unix seconds. */
  startTime: number;
};
/** One of the last 20 matches: bar height from `kda`, the rest for the hover and link. */
export type FormPoint = {
  matchId: number;
  won: boolean;
  kda: number;
  heroName: string;
  kills: number;
  deaths: number;
  assists: number;
  souls: number;
  durationS: number;
  /** Unix seconds. */
  startTime: number;
};
export type HistoryRow = {
  matchId: number;
  heroId: number;
  heroName: string;
  heroIcon: string | null;
  won: boolean;
  kills: number;
  deaths: number;
  assists: number;
  souls: number;
  durationS: number;
  rankDelta: number | null;
  startTime: number;
};
export type PoolRow = { heroId: number; name: string; matches: number; winRate: number };
export type MateRow = { name: string; matches: number; winRate: number };

export type PlayerView = {
  accountId: number;
  name: string | null;
  initials: string;
  /** Steam avatar (184 px), or null to show the initials. */
  avatarUrl: string | null;
  rank: RankLabel | null;
  /** e.g. 22 for "top 22% of ranked players". */
  topPercent: number | null;
  firstMatch: number | null;
  lastMatch: number | null;
  totals: PlayerTotals | null;
  climb: ClimbPoint[];
  tierNames: Record<number, string>;
  form: FormPoint[];
  history: HistoryRow[];
  pool: PoolRow[];
  bestWith: MateRow[];
  /** Enemy heroes the player wins least against (10+ games). */
  toughestHeroes: PoolRow[];
};

export function rankLabel(badge: Badge | null, ranks: Rank[]): RankLabel | null {
  if (!badge) return null;
  return {
    tier: badge.tier,
    subrank: badge.subrank,
    name: ranks.find((r) => r.tier === badge.tier)?.name ?? `Tier ${badge.tier}`,
    numeral: ROMAN[badge.subrank - 1] ?? String(badge.subrank),
  };
}

/** "nightjar" → "ni", "Llama mama" → "lm". */
export function initialsOf(name: string | null): string {
  if (!name) return "?";
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2);
  return letters.toLowerCase();
}

/** Share of ranked players at or above this badge, as a whole percent (at least 1). */
export function topPercentOf(badge: Badge | null, distribution: { badge: number; players: number }[]): number | null {
  if (!badge || distribution.length === 0) return null;
  const total = distribution.reduce((s, d) => s + d.players, 0);
  if (total === 0) return null;
  const atOrAbove = distribution.filter((d) => d.badge >= badge.badge).reduce((s, d) => s + d.players, 0);
  return Math.max(1, Math.ceil((atOrAbove / total) * 100));
}

const kdaOf = (k: number, d: number, a: number) => (k + a) / Math.max(d, 1);

export function buildTotals(matches: PlayerMatch[], tierSoulsPerMin: number | null): PlayerTotals | null {
  if (matches.length === 0) return null;
  const n = matches.length;
  const sum = (f: (m: PlayerMatch) => number) => matches.reduce((s, m) => s + f(m), 0);
  const wins = matches.filter((m) => m.won).length;
  const k = sum((m) => m.kills);
  const d = sum((m) => m.deaths);
  const a = sum((m) => m.assists);
  const minutes = sum((m) => m.durationS) / 60;
  return {
    matches: n,
    ranked: matches.filter((m) => m.ranked).length,
    wins,
    losses: n - wins,
    winRate: wins / n,
    kda: kdaOf(k, d, a),
    perMatch: { kills: k / n, deaths: d / n, assists: a / n },
    soulsPerMin: minutes > 0 ? sum((m) => m.souls) / minutes : 0,
    tierSoulsPerMin,
  };
}

type Inputs = {
  accountId: number;
  name: string | null;
  avatarUrl: string | null;
  history: PlayerMatch[];
  rank: Badge | null;
  heroRecords: PlayerHeroRecord[];
  /** Record against each enemy hero (`heroId` is the enemy's hero). */
  enemyHeroes: PlayerHeroRecord[];
  mates: PlayerMate[];
  mateNames: Record<number, string>;
  heroes: Hero[];
  ranks: Rank[];
  distribution: { badge: number; players: number }[];
  tierSoulsPerMin: number | null;
};

/** Top teammates by games together (10+), up to `count`. */
export function topMates(mates: PlayerMate[], count = 3): PlayerMate[] {
  return mates
    .filter((m) => m.matches >= MIN_GAMES)
    .sort((a, b) => b.matches - a.matches)
    .slice(0, count);
}

export function buildPlayerView(input: Inputs): PlayerView {
  const heroById = new Map(input.heroes.map((h) => [h.id, h]));
  const heroName = (id: number) => heroById.get(id)?.name ?? `Hero ${id}`;
  // Street Brawl and other modes are excluded site-wide. History is newest first.
  const normal = input.history.filter((m) => m.normalMode);

  const climb = normal
    .filter((m) => m.badge)
    .slice(0, CLIMB_MATCHES)
    .reverse()
    .map((m) => ({
      step: m.badge!.tier * 6 + (m.badge!.subrank - 1),
      tier: m.badge!.tier,
      subrank: m.badge!.subrank,
      matchId: m.matchId,
      heroName: heroName(m.heroId),
      won: m.won,
      startTime: m.startTime,
    }));

  const form = normal
    .slice(0, FORM_MATCHES)
    .reverse()
    .map((m) => ({
      matchId: m.matchId,
      won: m.won,
      kda: kdaOf(m.kills, m.deaths, m.assists),
      heroName: heroName(m.heroId),
      kills: m.kills,
      deaths: m.deaths,
      assists: m.assists,
      souls: m.souls,
      durationS: m.durationS,
      startTime: m.startTime,
    }));

  const records = input.heroRecords.filter((r) => r.matches > 0);
  const pool = [...records]
    .sort((a, b) => b.matches - a.matches)
    .slice(0, 5)
    .map((r) => ({ heroId: r.heroId, name: heroName(r.heroId), matches: r.matches, winRate: r.wins / r.matches }));
  // Enemy heroes, not the player's own: their own heroes are already in Hero pool.
  const toughestHeroes = input.enemyHeroes
    .filter((r) => r.matches >= MIN_GAMES)
    .map((r) => ({ heroId: r.heroId, name: heroName(r.heroId), matches: r.matches, winRate: r.wins / r.matches }))
    .sort((a, b) => a.winRate - b.winRate)
    .slice(0, 3);

  const bestWith = topMates(input.mates)
    .filter((m) => input.mateNames[m.accountId])
    .map((m) => ({ name: input.mateNames[m.accountId], matches: m.matches, winRate: m.wins / m.matches }))
    .sort((a, b) => b.winRate - a.winRate);

  const tierNames: Record<number, string> = {};
  for (const r of input.ranks) tierNames[r.tier] = r.name;

  return {
    accountId: input.accountId,
    name: input.name,
    initials: initialsOf(input.name),
    avatarUrl: input.avatarUrl,
    rank: rankLabel(input.rank, input.ranks),
    topPercent: topPercentOf(input.rank, input.distribution),
    firstMatch: normal.at(-1)?.startTime ?? null,
    lastMatch: normal[0]?.startTime ?? null,
    totals: buildTotals(normal, input.tierSoulsPerMin),
    climb,
    tierNames,
    form,
    history: normal.slice(0, HISTORY_ROWS).map((m) => ({
      matchId: m.matchId,
      heroId: m.heroId,
      heroName: heroName(m.heroId),
      heroIcon: heroById.get(m.heroId)?.iconUrl ?? null,
      won: m.won,
      kills: m.kills,
      deaths: m.deaths,
      assists: m.assists,
      souls: m.souls,
      durationS: m.durationS,
      rankDelta: m.rankDelta,
      startTime: m.startTime,
    })),
    pool,
    bestWith,
    toughestHeroes,
  };
}
