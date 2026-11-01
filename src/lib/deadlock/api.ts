// Cached data functions. Every page and route handler gets Deadlock data
// through these. Lifetimes are the `cacheLife` profiles in next.config.ts.
// If a refresh fails (503, 504…), the error is not cached and the previous
// entry keeps being served until it expires.

import { cacheLife, cacheTag } from "next/cache";
import { deadlockFetch } from "./client";
import { loadPlayerRanks } from "./rank-batcher";
import {
  activeMatchesSchema,
  gameStatsSchema,
  heroCounterStatsSchema,
  heroStatsSchema,
  heroesSchema,
  itemStatsSchema,
  itemsSchema,
  matchHistorySchema,
  matchMetadataSchema,
  mateStatsSchema,
  patchesSchema,
  playerHeroStatsSchema,
  playerRankSchema,
  rankDistributionSchema,
  steamProfilesSchema,
  steamSearchSchema,
  accountRanksSchema,
  ranksSchema,
} from "./schemas";
import {
  mapActiveMatches,
  mapGameTotals,
  mapHeroStat,
  mapHeroes,
  mapItemStats,
  mapItems,
  mapMatchHistory,
  mapMatchReport,
  mapMatchupStats,
  mapPatchWindows,
  mapPatches,
  mapRankDistribution,
  mapRanks,
  mapSteamNames,
  mapSteamProfiles,
  steamAvatar,
  type SteamProfile,
} from "./mappers";
import type {
  ActiveMatch,
  Badge,
  GameTotals,
  Hero,
  HeroStat,
  Item,
  ItemStat,
  MatchReport,
  MatchupStat,
  Patch,
  PatchWindows,
  PlayerHeroRecord,
  PlayerMatch,
  PlayerMate,
  Rank,
  RankPopulation,
  StatsWindow,
} from "./types";

// ---- Assets (24 h) --------------------------------------------------------

export async function getHeroes(): Promise<Hero[]> {
  "use cache";
  cacheLife("assets");
  cacheTag("assets", "heroes");
  return mapHeroes(await deadlockFetch("/v1/assets/heroes", heroesSchema, { query: { only_active: true } }));
}

export async function getItems(): Promise<Item[]> {
  "use cache";
  cacheLife("assets");
  cacheTag("assets", "items");
  return mapItems(await deadlockFetch("/v1/assets/items", itemsSchema));
}

export async function getRanks(): Promise<Rank[]> {
  "use cache";
  cacheLife("assets");
  cacheTag("assets", "ranks");
  return mapRanks(await deadlockFetch("/v1/assets/ranks", ranksSchema));
}

/** Newest first. */
export async function getPatches(): Promise<Patch[]> {
  "use cache";
  cacheLife("assets");
  cacheTag("assets", "patches");
  return mapPatches(await deadlockFetch("/v1/patches", patchesSchema));
}

export async function getPatchWindows(): Promise<PatchWindows | null> {
  return mapPatchWindows(await getPatches());
}

// ---- Analytics (1 h) ------------------------------------------------------
// Default API filters apply: normal game mode, ranked + unranked matches.

/** Query params shared by the analytics endpoints. */
function analyticsQuery(window: StatsWindow, minAverageBadge?: number) {
  return {
    // The API's default, set explicitly: Street Brawl is excluded site-wide.
    game_mode: "normal",
    min_unix_timestamp: window.since,
    max_unix_timestamp: window.until,
    min_average_badge: minAverageBadge,
  };
}

/** Fixture name per window, e.g. "hero-stats-previous". Fixtures exist only for "All ranks". */
function fixtureFor(base: string, window: StatsWindow) {
  return window.kind === "previous" ? `${base}-previous` : base;
}

export async function getHeroStats(window: StatsWindow, minAverageBadge?: number): Promise<HeroStat[]> {
  "use cache";
  cacheLife("analytics");
  cacheTag("analytics", "hero-stats");
  const raw = await deadlockFetch("/v1/analytics/hero-stats", heroStatsSchema, {
    query: analyticsQuery(window, minAverageBadge),
    fixture: fixtureFor("hero-stats", window),
  });
  return raw.map(mapHeroStat);
}

export async function getGameTotals(window: StatsWindow, minAverageBadge?: number): Promise<GameTotals | null> {
  "use cache";
  cacheLife("analytics");
  cacheTag("analytics", "game-stats");
  const raw = await deadlockFetch("/v1/analytics/game-stats", gameStatsSchema, {
    query: analyticsQuery(window, minAverageBadge),
    fixture: fixtureFor("game-stats", window),
  });
  return mapGameTotals(raw);
}

/** Totals for the last 24 hours, measured from the top of the current hour. */
export async function getLast24hGameTotals(minAverageBadge?: number): Promise<GameTotals | null> {
  "use cache";
  cacheLife("analytics");
  cacheTag("analytics", "game-stats");
  const hour = Math.floor(Date.now() / 3_600_000) * 3600;
  const raw = await deadlockFetch("/v1/analytics/game-stats", gameStatsSchema, {
    query: { game_mode: "normal", min_unix_timestamp: hour - 86_400, min_average_badge: minAverageBadge },
    fixture: "game-stats-24h",
  });
  return mapGameTotals(raw);
}

export async function getItemStats(window: StatsWindow, minAverageBadge?: number): Promise<ItemStat[]> {
  "use cache";
  cacheLife("analytics");
  cacheTag("analytics", "item-stats");
  const raw = await deadlockFetch("/v1/analytics/item-stats", itemStatsSchema, {
    query: analyticsQuery(window, minAverageBadge),
    fixture: fixtureFor("item-stats", window),
  });
  return mapItemStats(raw);
}

export async function getMatchupStats(window: StatsWindow, minAverageBadge?: number): Promise<MatchupStat[]> {
  "use cache";
  cacheLife("analytics");
  cacheTag("analytics", "hero-counter-stats");
  const raw = await deadlockFetch("/v1/analytics/hero-counter-stats", heroCounterStatsSchema, {
    query: analyticsQuery(window, minAverageBadge),
    fixture: fixtureFor("hero-counter-stats", window),
  });
  return mapMatchupStats(raw);
}

/** Ranked players by tier, from each player's latest ranked match since `since`. */
export async function getRankDistribution(since: number): Promise<RankPopulation[]> {
  "use cache";
  cacheLife("analytics");
  cacheTag("analytics", "rank-distribution");
  const raw = await deadlockFetch("/v1/players/rank/distribution", rankDistributionSchema, {
    query: { min_unix_timestamp: since },
  });
  return mapRankDistribution(raw);
}

/** Ranked players per exact badge (for "top X% of ranked players"). */
export async function getBadgeDistribution(since: number): Promise<{ badge: number; players: number }[]> {
  "use cache";
  cacheLife("analytics");
  cacheTag("analytics", "rank-distribution");
  const raw = await deadlockFetch("/v1/players/rank/distribution", rankDistributionSchema, {
    query: { min_unix_timestamp: since },
  });
  return raw.filter((r) => r.rank >= 1).map((r) => ({ badge: r.badge, players: r.players }));
}

/** Average souls per minute in matches whose average badge is in `tier`. */
export async function getTierSoulsPerMinute(tier: number): Promise<number | null> {
  "use cache";
  cacheLife("analytics");
  cacheTag("analytics", "game-stats");
  const raw = await deadlockFetch("/v1/analytics/game-stats", gameStatsSchema, {
    query: { game_mode: "normal", min_average_badge: tier * 10 + 1, max_average_badge: tier * 10 + 6 },
    fixture: `game-stats-tier-${tier}`,
  });
  const totals = mapGameTotals(raw);
  return totals && totals.avgDurationS > 0 ? totals.avgSouls / (totals.avgDurationS / 60) : null;
}

// ---- Players (5 min, tag player-<id> so Refresh can expire them) -----------

export async function getPlayerHistory(accountId: number): Promise<PlayerMatch[]> {
  "use cache";
  cacheLife("player");
  cacheTag("player", `player-${accountId}`);
  return mapMatchHistory(await deadlockFetch(`/v1/players/${accountId}/match-history`, matchHistorySchema));
}

/** Current rank badge, or null when the player has no recent ranked match. */
export async function getPlayerRank(accountId: number): Promise<Badge | null> {
  "use cache";
  cacheLife("player");
  cacheTag("player", `player-${accountId}`);
  const raw = await deadlockFetch(`/v1/players/${accountId}/rank`, playerRankSchema);
  return raw.badge > 0 && raw.rank > 0 ? { badge: raw.badge, tier: raw.rank, subrank: raw.subrank } : null;
}

export async function getPlayerHeroRecords(accountId: number): Promise<PlayerHeroRecord[]> {
  "use cache";
  cacheLife("player");
  cacheTag("player", `player-${accountId}`);
  const raw = await deadlockFetch("/v1/players/hero-stats", playerHeroStatsSchema, {
    query: { account_ids: accountId, game_mode: "normal" },
    fixture: `player-${accountId}-heroes`,
  });
  return raw.map((h) => ({ heroId: h.hero_id, matches: h.matches_played, wins: h.wins }));
}

/**
 * The player's record against each enemy hero (normal mode, all time), for
 * "Toughest heroes". The API returns one row per (own hero, enemy hero) pair,
 * so rows are summed per enemy hero. Each enemy hero appears at most once per
 * match, so the sum is matches played against it. Only covers matches the
 * analytics data has, which can be fewer than the full history.
 */
export async function getPlayerEnemyHeroes(accountId: number): Promise<PlayerHeroRecord[]> {
  "use cache";
  cacheLife("player");
  cacheTag("player", `player-${accountId}`);
  const raw = await deadlockFetch("/v1/analytics/hero-counter-stats", heroCounterStatsSchema, {
    query: { account_id: accountId, game_mode: "normal", min_unix_timestamp: 0, min_matches: 1 },
    fixture: `player-${accountId}-enemy-heroes`,
  });
  const byEnemy = new Map<number, PlayerHeroRecord>();
  for (const r of raw) {
    const rec = byEnemy.get(r.enemy_hero_id) ?? { heroId: r.enemy_hero_id, matches: 0, wins: 0 };
    rec.matches += r.matches_played;
    rec.wins += r.wins;
    byEnemy.set(r.enemy_hero_id, rec);
  }
  return [...byEnemy.values()];
}

export async function getPlayerMates(accountId: number): Promise<PlayerMate[]> {
  "use cache";
  cacheLife("player");
  cacheTag("player", `player-${accountId}`);
  const raw = await deadlockFetch(`/v1/players/${accountId}/mate-stats`, mateStatsSchema, {
    query: { game_mode: "normal" },
  });
  return raw.map((m) => ({ accountId: m.mate_id, matches: m.matches_played, wins: m.wins }));
}

export type SearchHit = { accountId: number; name: string | null; avatarUrl: string | null; matches30d: number | null };

/**
 * Steam profile search by name or account id (5 min per query). The API only
 * returns players with 5+ matches in the last 30 days unless `includeInactive`.
 */
export async function getPlayerSearch(query: string, includeInactive: boolean): Promise<SearchHit[]> {
  "use cache";
  cacheLife("player");
  cacheTag("player-search");
  const raw = await deadlockFetch("/v1/players/steam-search", steamSearchSchema, {
    query: { search_query: query, limit: 8, min_matches_played_last_30d: includeInactive ? 0 : undefined },
    fixture: "steam-search",
  });
  return raw.map((p) => ({
    accountId: p.account_id,
    name: p.personaname ?? null,
    avatarUrl: steamAvatar(p.avatarmedium),
    matches30d: p.matches_played_last_30d ?? null,
  }));
}

export type AccountRank = { accountId: number; badge: Badge | null; lastRankedAt: number | null };

/**
 * Ranks for a handful of accounts in one request (5 min). `/v1/players/rank`
 * allows 20 requests/min per IP, so callers must treat a failure as "no rank".
 */
export async function getAccountRanks(accountIds: number[]): Promise<AccountRank[]> {
  "use cache";
  cacheLife("player");
  cacheTag("player-search");
  const raw = await deadlockFetch("/v1/players/rank", accountRanksSchema, {
    query: { account_ids: accountIds.join(",") },
    fixture: "player-ranks-search",
  });
  return raw.map((r) => ({
    accountId: r.account_id,
    badge: r.badge > 0 && r.rank > 0 ? { badge: r.badge, tier: r.rank, subrank: r.subrank } : null,
    lastRankedAt: r.last_match?.start_time ?? null,
  }));
}

// ---- Matches --------------------------------------------------------------

/** Finished matches never change, so these are kept for 7 days. A 404 isn't cached. */
export async function getMatchReport(matchId: number): Promise<MatchReport> {
  "use cache";
  cacheLife("match");
  cacheTag("match", `match-${matchId}`);
  return mapMatchReport(await deadlockFetch(`/v1/matches/${matchId}/metadata`, matchMetadataSchema));
}

/** Steam display names by account id (24 h). Accounts without a public name are left out. */
export async function getPlayerNames(accountIds: number[]): Promise<Record<number, string>> {
  "use cache";
  cacheLife("assets");
  cacheTag("steam-names");
  const raw = await deadlockFetch("/v1/players/steam", steamProfilesSchema, {
    query: { account_ids: accountIds.join(",") },
  });
  const wanted = new Set(accountIds);
  return mapSteamNames(raw.filter((p) => wanted.has(p.account_id)));
}

/** Steam names and avatars by account id (24 h). Same endpoint as getPlayerNames. */
export async function getPlayerProfiles(accountIds: number[]): Promise<Record<number, SteamProfile>> {
  "use cache";
  cacheLife("assets");
  cacheTag("steam-names");
  const raw = await deadlockFetch("/v1/players/steam", steamProfilesSchema, {
    query: { account_ids: accountIds.join(",") },
  });
  const wanted = new Set(accountIds);
  return mapSteamProfiles(raw.filter((p) => wanted.has(p.account_id)));
}

/** Average rank of a live match, or null when fewer than 4 of its players have a rank. */
export type MatchAverageRank = { tier: number; subrank: number; rankedPlayers: number } | null;

const MIN_RANKED_PLAYERS = 4;

/**
 * Cached per match for 1 h (its players don't change). Cache misses from many
 * new matches at once are batched into a few rank requests by ./rank-batcher.
 */
export async function getMatchAverageRank(matchId: number, accountIds: number[]): Promise<MatchAverageRank> {
  "use cache";
  cacheLife("liveRank");
  cacheTag("live-rank", `live-rank-${matchId}`);
  const ranks = await loadPlayerRanks(accountIds);
  // Average on a continuous scale (tier × 6 + subrank) so tier boundaries don't skew it.
  const steps = accountIds.flatMap((id) => {
    const badge = ranks.get(id)?.badge;
    return badge ? [badge.tier * 6 + (badge.subrank - 1)] : [];
  });
  if (steps.length < MIN_RANKED_PLAYERS) return null;
  const avg = Math.round(steps.reduce((sum, s) => sum + s, 0) / steps.length);
  return { tier: Math.floor(avg / 6), subrank: (avg % 6) + 1, rankedPlayers: steps.length };
}

/**
 * Matches in progress. 30 s cache: the Live page polls /api/live, which reads
 * this, so polling costs one upstream call per 30 s however many people watch.
 */
export async function getActiveMatches(): Promise<ActiveMatch[]> {
  "use cache";
  cacheLife("live");
  cacheTag("live");
  return mapActiveMatches(await deadlockFetch("/v1/matches/active", activeMatchesSchema));
}
