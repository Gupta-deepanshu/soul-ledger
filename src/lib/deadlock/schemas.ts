// zod schemas for raw Deadlock API responses, written against
// https://api.deadlock-api.com/openapi.json and checked on saved fixtures.
// Only the fields we use are listed; unknown fields are stripped.
// Raw field names stay in this folder — components see the types in ./types.ts.

import { z } from "zod";

const int = z.number().int();
const optInt = int.nullish();
const optStr = z.string().nullish();

// ---- Assets ---------------------------------------------------------------

export const heroSchema = z.object({
  id: int,
  name: z.string(),
  player_selectable: z.boolean(),
  disabled: z.boolean(),
  in_development: z.boolean(),
  /** "release" for shipped heroes (build 6711+). More reliable than `in_development`. */
  development_state: optStr,
  images: z.object({
    icon_image_small: optStr,
    icon_image_small_webp: optStr,
    icon_hero_card: optStr,
    icon_hero_card_webp: optStr,
    background_image_webp: optStr,
    name_image: optStr,
  }),
});
export const heroesSchema = z.array(heroSchema);

export const itemSlotSchema = z.enum(["weapon", "vitality", "spirit"]);

const upgradeSchema = z.object({
  id: int,
  name: z.string(),
  type: z.literal("upgrade"),
  item_slot_type: itemSlotSchema,
  item_tier: int,
  cost: optInt,
  shopable: z.boolean(),
  disabled: z.boolean().nullish(),
  is_active_item: z.boolean(),
  shop_image_webp: optStr,
  image_webp: optStr,
});

/** `/v1/assets/items` mixes abilities, weapons and shop upgrades; keep the upgrades. */
export const itemsSchema = z
  .array(z.looseObject({ type: z.string() }))
  .transform((items) => items.filter((item) => item.type === "upgrade"))
  .pipe(z.array(upgradeSchema));

export const rankSchema = z.object({
  tier: int,
  name: z.string(),
  color: z.string(),
  // large, small, small_subrank1…6 and their _webp variants.
  images: z.record(z.string(), z.string().nullable()),
});
export const ranksSchema = z.array(rankSchema);

export const patchSchema = z.object({
  title: z.string(),
  pub_date: z.string(),
  link: z.string(),
});
export const patchesSchema = z.array(patchSchema);

// ---- Analytics ------------------------------------------------------------

export const heroStatSchema = z.object({
  hero_id: int,
  matches: int,
  wins: int,
  losses: int,
  total_kills: int,
  total_deaths: int,
  total_assists: int,
  total_net_worth: int,
  total_last_hits: int,
  total_player_damage: int,
});
export const heroStatsSchema = z.array(heroStatSchema);

/** One row when unbucketed; empty when no matches fit the filters. */
export const gameStatsSchema = z.array(
  z.object({
    total_matches: int,
    total_players: int,
    avg_duration_s: z.number(),
    avg_net_worth: z.number(),
    team0_wins: int,
    team1_wins: int,
  }),
);

/** `matches` counts player-games (one per buyer per match), not matches. */
export const itemStatsSchema = z.array(
  z.object({
    item_id: int,
    wins: int,
    losses: int,
    matches: int,
    players: int,
    avg_buy_time_s: z.number().nullish(),
  }),
);

export const heroCounterStatsSchema = z.array(
  z.object({
    hero_id: int,
    enemy_hero_id: int,
    wins: int,
    matches_played: int,
  }),
);

export const rankDistributionSchema = z.array(
  z.object({
    badge: int,
    rank: int,
    subrank: int,
    players: int,
  }),
);

// ---- Matches --------------------------------------------------------------

const matchPlayerSchema = z.object({
  account_id: int,
  team: int,
  hero_id: int,
  kills: int,
  deaths: int,
  assists: int,
  net_worth: int,
  last_hits: int,
  denies: int,
  level: optInt,
  /** 1 = MVP; 2 and 3 are the next "key players". */
  mvp_rank: optInt,
  /** Rank the player entered the match with, as a badge (0 = unranked). */
  player_rank_data: z.object({ initial_display_rank: optInt }).nullish(),
  items: z.array(
    z.object({
      game_time_s: int,
      item_id: int,
      sold_time_s: optInt,
    }),
  ),
  stats: z.array(
    z.object({
      time_stamp_s: int,
      net_worth: int,
      player_damage: optInt,
      /** Healing done to teammates and self. */
      player_healing: optInt,
      /** Damage to objectives (guardians, walkers, shrines, Patron). */
      boss_damage: optInt,
      creep_damage: optInt,
    }),
  ),
});

export const matchMetadataSchema = z.object({
  match_info: z.object({
    match_id: int,
    start_time: int,
    duration_s: int,
    winning_team: int,
    game_mode: optInt,
    match_mode: optInt,
    average_badge_team0: optInt,
    average_badge_team1: optInt,
    players: z.array(matchPlayerSchema),
    /** `team` is the side that owned (and lost) the objective; time 0/null = not destroyed. */
    objectives: z.array(
      z.object({
        destroyed_time_s: optInt,
        team: int,
        team_objective_id: int,
      }),
    ),
    /** Empty when no Mid-Boss was taken. Shape seen in match 96421548. */
    mid_boss: z
      .array(
        z.object({
          team_killed: optInt,
          team_claimed: optInt,
          destroyed_time_s: optInt,
        }),
      )
      .nullish(),
  }),
});

// ---- Players --------------------------------------------------------------

/**
 * `/v1/players/{id}/match-history`. `match_result` is the winning team (checked
 * on match 128149655), so a win is `match_result === player_team`.
 * `player_match_outcome` (0/1/2/5) is not win/loss and isn't used.
 */
export const matchHistorySchema = z.array(
  z.object({
    match_id: int,
    hero_id: int,
    start_time: int,
    game_mode: optInt,
    match_mode: optInt,
    player_team: int,
    match_result: int,
    player_kills: int,
    player_deaths: int,
    player_assists: int,
    net_worth: int,
    match_duration_s: int,
    /** Rank progress points this match gave (1000 = one subrank); 0/null when unranked. */
    ranked_delta: optInt,
    /** Badge after the match (0 when unranked). */
    ranked_display_badge: optInt,
  }),
);

/** `/v1/players/{id}/rank`: all 0 when the player has no recent ranked match. */
export const playerRankSchema = z.object({ badge: int, rank: int, subrank: int });

export const playerHeroStatsSchema = z.array(
  z.object({
    hero_id: int,
    matches_played: int,
    wins: int,
  }),
);

/** `/v1/players/hero-stats` for several accounts: one row per (account, hero). */
export const accountHeroStatsSchema = z.array(
  z.object({
    account_id: int,
    hero_id: int,
    matches_played: int,
    wins: int,
  }),
);

export const mateStatsSchema = z.array(
  z.object({
    mate_id: int,
    wins: int,
    matches_played: int,
  }),
);

/** `/v1/players/steam-search`: only the fields the site shows. */
export const steamSearchSchema = z.array(
  z.object({
    account_id: int,
    personaname: optStr,
    avatarmedium: optStr,
    matches_played_last_30d: optInt,
  }),
);

/** `/v1/players/rank` with the time of each player's latest ranked match. */
export const accountRanksSchema = z.array(
  z.object({
    account_id: int,
    badge: int,
    rank: int,
    subrank: int,
    last_match: z.object({ start_time: optInt }).nullish(),
  }),
);

/** `/v1/players/steam`: only the fields the site shows. */
export const steamProfilesSchema = z.array(
  z.object({
    account_id: int,
    personaname: optStr,
    avatarfull: optStr,
  }),
);

export const activeMatchSchema = z.object({
  match_id: optInt,
  start_time: optInt,
  duration_s: optInt,
  net_worth_team_0: optInt,
  net_worth_team_1: optInt,
  objectives_mask_team0: optInt,
  objectives_mask_team1: optInt,
  spectators: optInt,
  /** Undocumented. Tracks rank in ranked matches but not in unranked ones, so it isn't used. */
  match_score: optInt,
  match_mode_parsed: optStr,
  game_mode_parsed: optStr,
  region_mode_parsed: optStr,
  players: z.array(
    z.object({
      account_id: optInt,
      hero_id: optInt,
      team: optInt,
    }),
  ),
});
export const activeMatchesSchema = z.array(activeMatchSchema);

/** `/v1/players/rank`: badge/rank/subrank are 0 when the player has no recent ranked match. */
export const playerRanksSchema = z.array(
  z.object({
    account_id: int,
    badge: int,
    rank: int,
    subrank: int,
  }),
);

export type RawHero = z.infer<typeof heroSchema>;
export type RawItem = z.infer<typeof upgradeSchema>;
export type RawRank = z.infer<typeof rankSchema>;
export type RawPatch = z.infer<typeof patchSchema>;
export type RawHeroStat = z.infer<typeof heroStatSchema>;
export type RawGameStats = z.infer<typeof gameStatsSchema>;
export type RawItemStats = z.infer<typeof itemStatsSchema>;
export type RawHeroCounterStats = z.infer<typeof heroCounterStatsSchema>;
export type RawRankDistribution = z.infer<typeof rankDistributionSchema>;
export type RawMatchMetadata = z.infer<typeof matchMetadataSchema>;
export type RawActiveMatch = z.infer<typeof activeMatchSchema>;
export type RawPlayerRanks = z.infer<typeof playerRanksSchema>;
export type RawSteamProfiles = z.infer<typeof steamProfilesSchema>;
export type RawMatchHistory = z.infer<typeof matchHistorySchema>;
