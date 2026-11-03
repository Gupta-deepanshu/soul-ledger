// Every saved fixture must still pass the schema its endpoint is parsed with.
// If one fails after re-saving fixtures, the API changed shape.

import type { z } from "zod";
import {
  accountHeroStatsSchema,
  accountRanksSchema,
  activeMatchesSchema,
  gameStatsSchema,
  heroCounterStatsSchema,
  heroesSchema,
  heroStatsSchema,
  itemsSchema,
  itemStatsSchema,
  matchHistorySchema,
  matchMetadataSchema,
  mateStatsSchema,
  patchesSchema,
  playerHeroStatsSchema,
  playerRankSchema,
  playerRanksSchema,
  rankDistributionSchema,
  ranksSchema,
  steamProfilesSchema,
  steamSearchSchema,
} from "@/lib/deadlock/schemas";
import { loadFixture } from "./load-fixture";

const CASES: [string, z.ZodType][] = [
  ["heroes", heroesSchema],
  ["items", itemsSchema],
  ["ranks", ranksSchema],
  ["patches", patchesSchema],
  ["hero-stats", heroStatsSchema],
  ["hero-stats-previous", heroStatsSchema],
  ["game-stats", gameStatsSchema],
  ["game-stats-previous", gameStatsSchema],
  ["game-stats-24h", gameStatsSchema],
  ["game-stats-tier-3", gameStatsSchema],
  ["item-stats", itemStatsSchema],
  ["hero-counter-stats", heroCounterStatsSchema],
  ["rank-distribution", rankDistributionSchema],
  ["active-matches", activeMatchesSchema],
  ["player-ranks-active", playerRanksSchema],
  ["player-ranks-search", accountRanksSchema],
  ["steam-profiles", steamProfilesSchema],
  ["steam-search", steamSearchSchema],
  ["live-players-hero-stats", accountHeroStatsSchema],
  ["match-128149655", matchMetadataSchema],
  ["match-96421548", matchMetadataSchema],
  ["player-1160721308-history", matchHistorySchema],
  ["player-1160721308-rank", playerRankSchema],
  ["player-1160721308-mates", mateStatsSchema],
  ["player-1160721308-heroes", playerHeroStatsSchema],
  ["player-1160721308-enemy-heroes", heroCounterStatsSchema],
];

describe("saved fixtures match their schemas", () => {
  it.each(CASES)("%s", (name, schema) => {
    const result = schema.safeParse(loadFixture(name));
    expect(result.error?.issues ?? []).toEqual([]);
  });
});

describe("itemsSchema", () => {
  it("keeps only shop upgrades", () => {
    const items = itemsSchema.parse(loadFixture("items"));
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.type === "upgrade")).toBe(true);
  });
});
