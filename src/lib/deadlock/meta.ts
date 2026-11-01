// Meta page view models: filters and the numbers each section shows.
// Pure functions over mapped data, so they can be checked against fixtures.

import { formatDate } from "@/lib/format";
import type {
  GameTotals,
  Hero,
  HeroStat,
  Item,
  ItemSlot,
  ItemStat,
  MatchupStat,
  PatchWindows,
  Rank,
  RankPopulation,
} from "./types";

const HEROES_PER_MATCH = 12;

/** Heroes with fewer matches than this in the window are hidden from standings and movers. */
export const MIN_HERO_MATCHES = 10_000;
/** Matchup cells with fewer matches than this show "n/a". */
export const MIN_MATCHUP_MATCHES = 1_000;
/** Items bought in less than this share of player-games are left out of "Items that win". */
export const MIN_ITEM_BUY_SHARE = 0.01;
/** Tiers highlighted in the rank distribution when no rank filter is set (Oracle and above). */
export const DEFAULT_HIGHLIGHT_TIER = 8;

// ---- Filters --------------------------------------------------------------

/** Rank filter choices, as minimum tiers: Emissary, Oracle, Ascendant. */
const RANK_FILTER_TIERS = [7, 8, 10];

export type RankFilterOption = { value: string; label: string };

export function parseRankFilter(param: string | string[] | undefined): number | null {
  const tier = Number(Array.isArray(param) ? param[0] : param);
  return RANK_FILTER_TIERS.includes(tier) ? tier : null;
}

/** `min_average_badge` for a minimum tier (badge = tier × 10 + subrank). */
export function minBadgeFor(tier: number | null): number | undefined {
  return tier == null ? undefined : tier * 10 + 1;
}

export function rankFilterOptions(ranks: Rank[]): RankFilterOption[] {
  return [
    { value: "all", label: "All ranks" },
    ...RANK_FILTER_TIERS.flatMap((tier) => {
      const rank = ranks.find((r) => r.tier === tier);
      return rank ? [{ value: String(tier), label: `${rank.name} +` }] : [];
    }),
  ];
}

/** "Patch of Oct 15 · Ranked + unranked · Oracle + · All regions" — always describes the active filters. */
export function describeFilters(windows: PatchWindows, minTier: number | null, ranks: Rank[]): string {
  const rank = minTier == null ? null : ranks.find((r) => r.tier === minTier);
  return [
    `Patch of ${formatDate(windows.current.since, false)}`,
    "Ranked + unranked",
    rank ? `${rank.name} +` : null,
    "All regions",
  ]
    .filter(Boolean)
    .join(" · ");
}

// ---- Hero standings & movers ----------------------------------------------

export type HeroRow = {
  heroId: number;
  name: string;
  iconUrl: string | null;
  /** 1-based position by win rate. */
  position: number;
  winRate: number;
  /** Win-rate change vs the previous patch, in percentage points; null for heroes new this patch. */
  delta: number | null;
  /** Share of matches the hero was in, 0–1. */
  pickRate: number;
  kda: number;
  soulsPerMatch: number;
  matches: number;
};

export function buildHeroRows(
  current: HeroStat[],
  previous: HeroStat[],
  heroes: Hero[],
  totals: GameTotals,
): HeroRow[] {
  const byId = new Map(heroes.map((h) => [h.id, h]));
  const before = new Map(
    previous.filter((s) => s.matches >= MIN_HERO_MATCHES).map((s) => [s.heroId, s.winRate]),
  );
  return current
    .filter((s) => s.matches >= MIN_HERO_MATCHES && byId.has(s.heroId))
    .sort((a, b) => b.winRate - a.winRate)
    .map((s, i) => {
      const hero = byId.get(s.heroId)!;
      const prev = before.get(s.heroId);
      return {
        heroId: s.heroId,
        name: hero.name,
        iconUrl: hero.iconUrl,
        position: i + 1,
        winRate: s.winRate,
        delta: prev == null ? null : (s.winRate - prev) * 100,
        pickRate: s.matches / totals.matches,
        kda: s.kda,
        soulsPerMatch: s.avgSouls,
        matches: s.matches,
      };
    });
}

export type Mover = { heroId: number; name: string; delta: number };

export function buildMovers(rows: HeroRow[], count = 3): { rising: Mover[]; falling: Mover[] } {
  const changed = rows.flatMap((r) => (r.delta == null ? [] : [{ heroId: r.heroId, name: r.name, delta: r.delta }]));
  return {
    rising: changed.filter((m) => m.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, count),
    falling: changed.filter((m) => m.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, count),
  };
}

// ---- Items that win -------------------------------------------------------

export type ItemRow = {
  itemId: number;
  name: string;
  slot: ItemSlot;
  tier: number;
  cost: number | null;
  /** Shop art (null for the rare item without any). */
  imageUrl: string | null;
  winRate: number;
  /**
   * Win rate minus the average win rate of all items at the same tier (cost),
   * weighted by purchases, 0–1 scale (0.021 = 2.1 points better). Raw win rate
   * favours late, expensive items (teams that can afford them are usually
   * ahead already); comparing within a tier shows which purchase actually helps.
   */
  lift: number;
  /** Share of player-games in which it was bought, 0–1. */
  buyShare: number;
};

export function buildItemRows(stats: ItemStat[], items: Item[], totals: GameTotals, perSlot = 6): Record<ItemSlot, ItemRow[]> {
  const byId = new Map(items.map((i) => [i.id, i]));
  const playerGames = totals.matches * HEROES_PER_MATCH;
  const kept = stats.flatMap((s) => {
    const item = byId.get(s.itemId);
    const buyShare = s.buys / playerGames;
    if (!item || buyShare < MIN_ITEM_BUY_SHARE) return [];
    return [{ item, stat: s, buyShare }];
  });

  // Purchase-weighted average win rate per tier, across all slots.
  const tierTotals = new Map<number, { wins: number; buys: number }>();
  for (const { item, stat } of kept) {
    const t = tierTotals.get(item.tier) ?? { wins: 0, buys: 0 };
    t.wins += stat.wins;
    t.buys += stat.buys;
    tierTotals.set(item.tier, t);
  }
  const tierAverage = (tier: number) => {
    const t = tierTotals.get(tier);
    return t && t.buys > 0 ? t.wins / t.buys : 0.5;
  };

  const rows: ItemRow[] = kept.map(({ item, stat, buyShare }) => ({
    itemId: item.id,
    name: item.name,
    slot: item.slot,
    tier: item.tier,
    cost: item.cost,
    imageUrl: item.imageUrl,
    winRate: stat.winRate,
    lift: stat.winRate - tierAverage(item.tier),
    buyShare,
  }));
  const top = (slot: ItemSlot) =>
    rows.filter((r) => r.slot === slot).sort((a, b) => b.lift - a.lift).slice(0, perSlot);
  return { weapon: top("weapon"), vitality: top("vitality"), spirit: top("spirit") };
}

// ---- Matchup grid ---------------------------------------------------------

export type MatchupHero = { heroId: number; name: string; shortName: string };
/** Row hero's win rate vs column hero minus 50, in points; null on the diagonal; "n/a" below the sample minimum. */
export type MatchupCell = number | null | "n/a";
export type MatchupGrid = { heroes: MatchupHero[]; cells: MatchupCell[][] };

/** "Lady Geist" → "Geist", for narrow column headers. */
export function shortHeroName(name: string): string {
  const words = name.split(" ");
  return name.length > 8 && words.length > 1 ? words[words.length - 1] : name;
}

/** The `size` most-picked heroes against each other. */
export function buildMatchupGrid(rows: HeroRow[], stats: MatchupStat[], size = 6): MatchupGrid {
  const heroes = [...rows]
    .sort((a, b) => b.matches - a.matches)
    .slice(0, size)
    .map((r) => ({ heroId: r.heroId, name: r.name, shortName: shortHeroName(r.name) }));
  const pairs = new Map(stats.map((s) => [`${s.heroId}:${s.enemyHeroId}`, s]));
  const cells = heroes.map((row) =>
    heroes.map((col): MatchupCell => {
      if (row.heroId === col.heroId) return null;
      const pair = pairs.get(`${row.heroId}:${col.heroId}`);
      if (!pair || pair.matches < MIN_MATCHUP_MATCHES) return "n/a";
      return (pair.wins / pair.matches - 0.5) * 100;
    }),
  );
  return { heroes, cells };
}

// ---- Rank distribution ----------------------------------------------------

export type RankShare = { tier: number; name: string; short: string; share: number };

/** Share of ranked players per tier, Initiate (1) and up. Obscurus (0, unranked) is left out. */
export function buildRankShares(population: RankPopulation[], ranks: Rank[]): { shares: RankShare[]; median: string | null } {
  const counts = new Map(population.map((p) => [p.tier, p.players]));
  const tiers = ranks.filter((r) => r.tier >= 1);
  const total = tiers.reduce((sum, r) => sum + (counts.get(r.tier) ?? 0), 0);
  if (total === 0) return { shares: [], median: null };
  const shares = tiers.map((r) => ({
    tier: r.tier,
    name: r.name,
    short: r.name.slice(0, 3).toUpperCase(),
    share: (counts.get(r.tier) ?? 0) / total,
  }));
  let cumulative = 0;
  const median = shares.find((s) => (cumulative += s.share) >= 0.5)?.name ?? null;
  return { shares, median };
}
