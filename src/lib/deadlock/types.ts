// Soul Ledger's own data types. Components use these, never raw API shapes.

import type { TeamId } from "./teams";

export type ItemSlot = "weapon" | "vitality" | "spirit";

export type Hero = {
  id: number;
  name: string;
  /** Small square portrait for HeroTile (WebP preferred). */
  iconUrl: string | null;
  cardUrl: string | null;
  backgroundUrl: string | null;
};

export type Item = {
  id: number;
  name: string;
  slot: ItemSlot;
  /** 1–5 in the current game data. */
  tier: number;
  cost: number | null;
  isActive: boolean;
  /** Shop art: the square item illustration shown in the in-game shop. */
  imageUrl: string | null;
};

export type Rank = {
  tier: number;
  name: string;
  color: string;
  imageUrl: string | null;
  /** Badge images for subranks 1–6, index 0 = subrank 1. */
  subrankImageUrls: (string | null)[];
};

/** A badge number decoded: tier = leading digits, subrank = last digit. */
export type Badge = {
  badge: number;
  tier: number;
  subrank: number;
};

export type Patch = {
  title: string;
  /** Unix seconds. */
  publishedAt: number;
  url: string;
};

export type HeroStat = {
  heroId: number;
  matches: number;
  wins: number;
  losses: number;
  /** 0–1. */
  winRate: number;
  kda: number;
  avgSouls: number;
  avgLastHits: number;
  avgHeroDamage: number;
};

/** A time range for analytics queries, in unix seconds. `until` absent = up to now. */
export type StatsWindow = {
  kind: "current" | "previous";
  since: number;
  until?: number;
};

export type PatchWindows = {
  /** The newest patch entry (for its title, date and notes link). */
  patch: Patch;
  current: StatsWindow;
  previous: StatsWindow | null;
};

export type GameTotals = {
  matches: number;
  avgDurationS: number;
  /** Average souls per player at the end of a match. */
  avgSouls: number;
  wins: Record<TeamId, number>;
};

export type ItemStat = {
  itemId: number;
  /** Player-games in which the item was bought. */
  buys: number;
  wins: number;
  /** 0–1. */
  winRate: number;
};

export type MatchupStat = {
  heroId: number;
  enemyHeroId: number;
  matches: number;
  wins: number;
};

export type RankPopulation = {
  tier: number;
  players: number;
};

export type MatchPlayer = {
  accountId: number;
  team: TeamId;
  heroId: number;
  kills: number;
  deaths: number;
  assists: number;
  souls: number;
  lastHits: number;
  denies: number;
  level: number | null;
  /** From the last stats snapshot. */
  heroDamage: number;
  objectiveDamage: number;
  healing: number;
  /** 1 = MVP, 2–3 = key players. */
  mvpRank: number | null;
  /** Rank entering the match; null if unranked. */
  rank: Badge | null;
  /** Purchases in time order (abilities included; filter against item assets). */
  purchases: { itemId: number; boughtAtS: number; soldAtS: number | null }[];
};

/** Team souls at one stats snapshot (every 3–5 min). */
export type SoulsSnapshot = { timeS: number; souls: Record<TeamId, number> };

export type ObjectiveLoss = {
  timeS: number;
  /** The team that owned and lost it. */
  lostBy: TeamId;
  objectiveId: number;
};

export type MidBossKill = { timeS: number; killedBy: TeamId | null; claimedBy: TeamId | null };

export type MatchReport = {
  id: number;
  startTime: number;
  durationS: number;
  winner: TeamId;
  ranked: boolean;
  players: MatchPlayer[];
  snapshots: SoulsSnapshot[];
  objectiveLosses: ObjectiveLoss[];
  midBoss: MidBossKill[];
};

export type PlayerMatch = {
  matchId: number;
  heroId: number;
  startTime: number;
  durationS: number;
  won: boolean;
  ranked: boolean;
  /** False for Street Brawl and other modes. */
  normalMode: boolean;
  kills: number;
  deaths: number;
  assists: number;
  souls: number;
  /** Rank progress points from this match; null when unranked. */
  rankDelta: number | null;
  /** Badge after the match; null when unranked. */
  badge: Badge | null;
};

export type PlayerHeroRecord = { heroId: number; matches: number; wins: number };
export type PlayerMate = { accountId: number; matches: number; wins: number };

export type ActiveMatch = {
  id: number;
  /** Unix seconds. `duration_s` is always null in practice, so elapsed time comes from this. */
  startTime: number | null;
  souls: Record<TeamId, number>;
  /** Bitmask of objectives still standing per team (see ./objectives.ts). */
  objectivesMask: Record<TeamId, number>;
  spectators: number;
  ranked: boolean;
  /** False for Street Brawl and other modes. */
  normalMode: boolean;
  region: string | null;
  players: { accountId: number | null; heroId: number; team: TeamId }[];
};

export type PlayerRank = {
  accountId: number;
  /** null when the player has no recent ranked match. */
  badge: Badge | null;
};
