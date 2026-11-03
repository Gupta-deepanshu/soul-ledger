import {
  decodeBadge,
  mapActiveMatches,
  mapHeroes,
  mapHeroStat,
  mapItemStats,
  mapMatchHistory,
  mapMatchReport,
  mapPatches,
  mapPatchWindows,
  mapPlayerRanks,
  mapRankDistribution,
  mapRanks,
  steamAvatar,
} from "@/lib/deadlock/mappers";
import {
  activeMatchesSchema,
  heroesSchema,
  matchHistorySchema,
  matchMetadataSchema,
  patchesSchema,
  ranksSchema,
  type RawHero,
  type RawHeroStat,
} from "@/lib/deadlock/schemas";
import { loadFixture } from "./load-fixture";

const DAY = 86_400;

function rawHero(overrides: Partial<RawHero>): RawHero {
  return {
    id: 1,
    name: "Hero",
    player_selectable: true,
    disabled: false,
    in_development: false,
    development_state: "release",
    images: {},
    ...overrides,
  };
}

describe("mapHeroes", () => {
  it("keeps only playable, released heroes, sorted by name", () => {
    const heroes = mapHeroes([
      rawHero({ id: 1, name: "Zed" }),
      rawHero({ id: 2, name: "Abe" }),
      rawHero({ id: 3, name: "Hidden", player_selectable: false }),
      rawHero({ id: 4, name: "Off", disabled: true }),
      rawHero({ id: 5, name: "Wip", development_state: "in_development" }),
      // development_state wins over a stale in_development flag.
      rawHero({ id: 6, name: "Stale", in_development: true, development_state: "release" }),
      // Without development_state, in_development decides.
      rawHero({ id: 7, name: "Old", in_development: true, development_state: null }),
    ]);
    expect(heroes.map((h) => h.name)).toEqual(["Abe", "Stale", "Zed"]);
  });

  it("prefers webp images and falls back to png", () => {
    const [hero] = mapHeroes([
      rawHero({ images: { icon_image_small: "a.png", icon_hero_card_webp: "card.webp", icon_hero_card: "card.png" } }),
    ]);
    expect(hero.iconUrl).toBe("a.png");
    expect(hero.cardUrl).toBe("card.webp");
    expect(hero.backgroundUrl).toBeNull();
  });

  it("maps the saved heroes fixture", () => {
    const heroes = mapHeroes(heroesSchema.parse(loadFixture("heroes")));
    expect(heroes.length).toBeGreaterThan(30);
    expect(new Set(heroes.map((h) => h.id)).size).toBe(heroes.length);
  });
});

describe("mapRanks", () => {
  it("sorts by tier and resolves six subrank images", () => {
    const ranks = mapRanks(ranksSchema.parse(loadFixture("ranks")));
    expect(ranks.map((r) => r.tier)).toEqual([...ranks.map((r) => r.tier)].sort((a, b) => a - b));
    for (const r of ranks) expect(r.subrankImageUrls).toHaveLength(6);
  });
});

describe("decodeBadge", () => {
  it("splits tier and subrank", () => {
    expect(decodeBadge(83)).toEqual({ badge: 83, tier: 8, subrank: 3 });
    expect(decodeBadge(116)).toEqual({ badge: 116, tier: 11, subrank: 6 });
  });
});

describe("patches", () => {
  const patches = mapPatches(patchesSchema.parse(loadFixture("patches")));

  it("sorts newest first", () => {
    for (let i = 1; i < patches.length; i++) expect(patches[i - 1].publishedAt).toBeGreaterThanOrEqual(patches[i].publishedAt);
  });

  it("drops entries with unparseable dates", () => {
    expect(mapPatches([{ title: "x", pub_date: "not a date", link: "https://example.com" }])).toEqual([]);
  });

  it("merges entries less than 3 days apart into one patch window", () => {
    const at = (s: number) => ({ title: String(s), publishedAt: s, url: "" });
    const windows = mapPatchWindows([at(100 * DAY), at(90 * DAY), at(90 * DAY - 60), at(89 * DAY), at(50 * DAY)]);
    expect(windows?.current).toEqual({ kind: "current", since: 100 * DAY });
    // 90d, 90d−60s and 89d are one patch; its newest entry starts the window.
    expect(windows?.previous).toEqual({ kind: "previous", since: 90 * DAY, until: 100 * DAY });
  });

  it("has no previous window with a single patch, and nothing with none", () => {
    expect(mapPatchWindows([{ title: "a", publishedAt: DAY, url: "" }])?.previous).toBeNull();
    expect(mapPatchWindows([])).toBeNull();
  });

  it("reads the saved feed (Oct 15 patch, previous from Sep 16)", () => {
    const windows = mapPatchWindows(patches);
    expect(windows?.current.since).toBe(Date.parse("2026-10-15T03:12:00Z") / 1000);
    expect(windows?.previous?.since).toBe(Date.parse("2026-09-16T22:41:46Z") / 1000);
  });
});

describe("mapHeroStat", () => {
  const raw: RawHeroStat = {
    hero_id: 7,
    matches: 200,
    wins: 110,
    losses: 90,
    total_kills: 1000,
    total_deaths: 500,
    total_assists: 1500,
    total_net_worth: 6_000_000,
    total_last_hits: 40_000,
    total_player_damage: 5_000_000,
  } as RawHeroStat;

  it("computes rates and per-match averages", () => {
    expect(mapHeroStat(raw)).toMatchObject({
      heroId: 7,
      winRate: 0.55,
      kda: 5,
      avgSouls: 30_000,
      avgLastHits: 200,
      avgHeroDamage: 25_000,
    });
  });

  it("does not divide by zero", () => {
    const zero = mapHeroStat({ ...raw, matches: 0, wins: 0, total_deaths: 0 });
    expect(Number.isFinite(zero.winRate)).toBe(true);
    expect(Number.isFinite(zero.kda)).toBe(true);
  });
});

describe("mapItemStats", () => {
  it("computes win rate from wins and losses, safely when both are 0", () => {
    expect(
      mapItemStats([
        { item_id: 1, matches: 10, wins: 3, losses: 1 },
        { item_id: 2, matches: 0, wins: 0, losses: 0 },
      ] as Parameters<typeof mapItemStats>[0]).map((s) => s.winRate),
    ).toEqual([0.75, 0]);
  });
});

describe("mapRankDistribution", () => {
  it("sums subranks per tier, sorted by tier", () => {
    expect(
      mapRankDistribution([
        { rank: 2, players: 5 },
        { rank: 1, players: 3 },
        { rank: 2, players: 7 },
      ] as Parameters<typeof mapRankDistribution>[0]),
    ).toEqual([
      { tier: 1, players: 3 },
      { tier: 2, players: 12 },
    ]);
  });
});

describe("mapMatchReport (match 128149655)", () => {
  const report = mapMatchReport(matchMetadataSchema.parse(loadFixture("match-128149655")));

  it("reads the headline facts", () => {
    expect(report.id).toBe(128149655);
    expect(report.durationS).toBe(1675);
    expect(report.winner).toBe(1);
    expect(report.ranked).toBe(true);
    expect(report.players).toHaveLength(12);
  });

  it("puts six players on each team", () => {
    expect(report.players.filter((p) => p.team === 0)).toHaveLength(6);
    expect(report.players.filter((p) => p.team === 1)).toHaveLength(6);
  });

  it("sorts purchases, snapshots and objective losses by time", () => {
    const sorted = (xs: number[]) => xs.every((x, i) => i === 0 || xs[i - 1] <= x);
    for (const p of report.players) expect(sorted(p.purchases.map((i) => i.boughtAtS))).toBe(true);
    expect(sorted(report.snapshots.map((s) => s.timeS))).toBe(true);
    expect(sorted(report.objectiveLosses.map((o) => o.timeS))).toBe(true);
  });

  it("ends with the losing team's Patron falling", () => {
    const last = report.objectiveLosses.at(-1);
    expect(last).toEqual({ timeS: 1674, lostBy: 0, objectiveId: 0 });
  });

  it("rejects a match without a valid winner", () => {
    const raw = matchMetadataSchema.parse(loadFixture("match-128149655"));
    raw.match_info.winning_team = 2;
    expect(() => mapMatchReport(raw)).toThrow(/unexpected winning_team 2/);
  });
});

describe("mapMatchHistory", () => {
  const history = mapMatchHistory(matchHistorySchema.parse(loadFixture("player-1160721308-history")));

  it("sorts newest first", () => {
    for (let i = 1; i < history.length; i++) expect(history[i - 1].startTime).toBeGreaterThanOrEqual(history[i].startTime);
  });

  it("only gives rank changes and badges to ranked matches", () => {
    for (const m of history.filter((m) => !m.ranked)) {
      expect(m.rankDelta).toBeNull();
      expect(m.badge).toBeNull();
    }
  });

  it("counts a win when match_result equals the player's team", () => {
    const [won, lost] = mapMatchHistory([
      { match_id: 1, hero_id: 1, start_time: 2, player_team: 1, match_result: 1, player_kills: 0, player_deaths: 0, player_assists: 0, net_worth: 0, match_duration_s: 0 },
      { match_id: 2, hero_id: 1, start_time: 1, player_team: 0, match_result: 1, player_kills: 0, player_deaths: 0, player_assists: 0, net_worth: 0, match_duration_s: 0 },
    ]);
    expect(won.won).toBe(true);
    expect(lost.won).toBe(false);
  });
});

describe("steamAvatar", () => {
  it("allows https avatars.steamstatic.com only", () => {
    expect(steamAvatar("https://avatars.steamstatic.com/abc_full.jpg")).toBe("https://avatars.steamstatic.com/abc_full.jpg");
    expect(steamAvatar("http://avatars.steamstatic.com/abc_full.jpg")).toBeNull();
    expect(steamAvatar("https://evil.example.com/abc_full.jpg")).toBeNull();
    expect(steamAvatar("not a url")).toBeNull();
    expect(steamAvatar(null)).toBeNull();
  });

  it("hides Steam's default '?' avatar", () => {
    expect(steamAvatar("https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg")).toBeNull();
  });
});

describe("mapActiveMatches", () => {
  it("maps the saved live list, dropping matches without an id", () => {
    const raw = activeMatchesSchema.parse(loadFixture("active-matches"));
    const matches = mapActiveMatches([...raw, { players: [] }]);
    expect(matches).toHaveLength(raw.filter((m) => m.match_id != null).length);
    for (const m of matches) for (const p of m.players) expect([0, 1]).toContain(p.team);
  });
});

describe("mapPlayerRanks", () => {
  it("returns null badges for unranked players", () => {
    expect(
      mapPlayerRanks([
        { account_id: 1, badge: 83, rank: 8, subrank: 3 },
        { account_id: 2, badge: 0, rank: 0, subrank: 0 },
      ]),
    ).toEqual([
      { accountId: 1, badge: { badge: 83, tier: 8, subrank: 3 } },
      { accountId: 2, badge: null },
    ]);
  });
});
