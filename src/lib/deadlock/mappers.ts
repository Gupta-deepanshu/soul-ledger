// Raw API shapes (./schemas) → Soul Ledger types (./types).

import type {
  RawActiveMatch,
  RawGameStats,
  RawHero,
  RawHeroCounterStats,
  RawHeroStat,
  RawItem,
  RawItemStats,
  RawMatchMetadata,
  RawPatch,
  RawPlayerRanks,
  RawRank,
  RawRankDistribution,
  RawSteamProfiles,
  RawMatchHistory,
} from "./schemas";
import type {
  ActiveMatch,
  Badge,
  GameTotals,
  Hero,
  HeroStat,
  Item,
  ItemStat,
  MatchPlayer,
  MatchReport,
  MatchupStat,
  Patch,
  PatchWindows,
  PlayerMatch,
  PlayerRank,
  Rank,
  RankPopulation,
} from "./types";
import { isTeamId, type TeamId } from "./teams";

export function mapHero(raw: RawHero): Hero {
  const img = raw.images;
  return {
    id: raw.id,
    name: raw.name,
    iconUrl: img.icon_image_small_webp ?? img.icon_image_small ?? null,
    cardUrl: img.icon_hero_card_webp ?? img.icon_hero_card ?? null,
    backgroundUrl: img.background_image_webp ?? null,
  };
}

/**
 * Playable heroes only. `in_development` stays true on some released heroes,
 * so `development_state` decides when the API provides it.
 */
export function mapHeroes(raw: RawHero[]): Hero[] {
  const released = (h: RawHero) => (h.development_state ? h.development_state === "release" : !h.in_development);
  return raw
    .filter((h) => h.player_selectable && !h.disabled && released(h))
    .map(mapHero)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function mapItem(raw: RawItem): Item {
  return {
    id: raw.id,
    name: raw.name,
    slot: raw.item_slot_type,
    tier: raw.item_tier,
    cost: raw.cost ?? null,
    isActive: raw.is_active_item,
    imageUrl: raw.shop_image_webp ?? null,
  };
}

/**
 * All shop upgrades, including ones no longer sold, so old match builds still
 * resolve to a name. Filter on `shopable` where only the current shop matters.
 */
export function mapItems(raw: RawItem[]): Item[] {
  return raw.map(mapItem);
}

export function mapRank(raw: RawRank): Rank {
  const img = raw.images;
  return {
    tier: raw.tier,
    name: raw.name,
    color: raw.color,
    imageUrl: img.large_webp ?? img.large ?? null,
    subrankImageUrls: [1, 2, 3, 4, 5, 6].map(
      (n) => img[`small_subrank${n}_webp`] ?? img[`small_subrank${n}`] ?? null,
    ),
  };
}

export function mapRanks(raw: RawRank[]): Rank[] {
  return raw.map(mapRank).sort((a, b) => a.tier - b.tier);
}

/** Badge numbers encode tier as the leading digits and subrank as the last digit (per the API spec). */
export function decodeBadge(badge: number): Badge {
  return { badge, tier: Math.floor(badge / 10), subrank: badge % 10 };
}

export function mapPatches(raw: RawPatch[]): Patch[] {
  return raw
    .map((p) => ({ title: p.title, publishedAt: Math.floor(Date.parse(p.pub_date) / 1000), url: p.link }))
    .filter((p) => Number.isFinite(p.publishedAt))
    .sort((a, b) => b.publishedAt - a.publishedAt);
}

const PATCH_GAP_S = 3 * 86_400;

/**
 * Current and previous patch windows. The patch feed sometimes publishes
 * several entries within seconds or days of each other; entries less than
 * 3 days apart count as one patch. `patches` must be newest first.
 */
export function mapPatchWindows(patches: Patch[]): PatchWindows | null {
  if (patches.length === 0) return null;
  const starts = patches.filter((p, i) => i === 0 || patches[i - 1].publishedAt - p.publishedAt >= PATCH_GAP_S);
  const current = starts[0].publishedAt;
  const previous = starts[1]?.publishedAt;
  return {
    patch: patches[0],
    current: { kind: "current", since: current },
    previous: previous ? { kind: "previous", since: previous, until: current } : null,
  };
}

export function mapGameTotals(raw: RawGameStats): GameTotals | null {
  const row = raw[0];
  if (!row || row.total_matches === 0) return null;
  return {
    matches: row.total_matches,
    avgDurationS: row.avg_duration_s,
    avgSouls: row.avg_net_worth,
    wins: { 0: row.team0_wins, 1: row.team1_wins },
  };
}

export function mapItemStats(raw: RawItemStats): ItemStat[] {
  return raw.map((s) => ({
    itemId: s.item_id,
    buys: s.matches,
    wins: s.wins,
    winRate: s.wins / Math.max(s.wins + s.losses, 1),
  }));
}

export function mapMatchupStats(raw: RawHeroCounterStats): MatchupStat[] {
  return raw.map((s) => ({
    heroId: s.hero_id,
    enemyHeroId: s.enemy_hero_id,
    matches: s.matches_played,
    wins: s.wins,
  }));
}

/** Players per rank tier (subranks summed). */
export function mapRankDistribution(raw: RawRankDistribution): RankPopulation[] {
  const byTier = new Map<number, number>();
  for (const row of raw) byTier.set(row.rank, (byTier.get(row.rank) ?? 0) + row.players);
  return [...byTier].map(([tier, players]) => ({ tier, players })).sort((a, b) => a.tier - b.tier);
}

export function mapHeroStat(raw: RawHeroStat): HeroStat {
  const matches = Math.max(raw.matches, 1);
  return {
    heroId: raw.hero_id,
    matches: raw.matches,
    wins: raw.wins,
    losses: raw.losses,
    winRate: raw.wins / matches,
    kda: (raw.total_kills + raw.total_assists) / Math.max(raw.total_deaths, 1),
    avgSouls: raw.total_net_worth / matches,
    avgLastHits: raw.total_last_hits / matches,
    avgHeroDamage: raw.total_player_damage / matches,
  };
}

/** `match_mode` 4 = ranked (ECitadelMatchMode: 1 unranked, 2 private lobby, 3 bots, 4 ranked…). */
const RANKED_MATCH_MODE = 4;

export function mapMatchReport(raw: RawMatchMetadata): MatchReport {
  const info = raw.match_info;
  if (!isTeamId(info.winning_team)) {
    throw new Error(`Match ${info.match_id}: unexpected winning_team ${info.winning_team}`);
  }

  const players: MatchPlayer[] = info.players.flatMap((p) => {
    if (!isTeamId(p.team)) return [];
    const last = p.stats.at(-1);
    const badge = p.player_rank_data?.initial_display_rank ?? 0;
    return [
      {
        accountId: p.account_id,
        team: p.team,
        heroId: p.hero_id,
        kills: p.kills,
        deaths: p.deaths,
        assists: p.assists,
        souls: p.net_worth,
        lastHits: p.last_hits,
        denies: p.denies,
        level: p.level ?? null,
        heroDamage: last?.player_damage ?? 0,
        objectiveDamage: last?.boss_damage ?? 0,
        healing: last?.player_healing ?? 0,
        mvpRank: p.mvp_rank ?? null,
        rank: badge > 0 ? decodeBadge(badge) : null,
        purchases: [...p.items]
          .sort((a, b) => a.game_time_s - b.game_time_s)
          .map((i) => ({ itemId: i.item_id, boughtAtS: i.game_time_s, soldAtS: i.sold_time_s ? i.sold_time_s : null })),
      },
    ];
  });

  // Team souls at each snapshot time every player reports.
  const byTime = new Map<number, Record<TeamId, number>>();
  for (const p of info.players) {
    if (!isTeamId(p.team)) continue;
    for (const s of p.stats) {
      const row = byTime.get(s.time_stamp_s) ?? { 0: 0, 1: 0 };
      row[p.team] += s.net_worth;
      byTime.set(s.time_stamp_s, row);
    }
  }
  const snapshots = [...byTime].map(([timeS, souls]) => ({ timeS, souls })).sort((a, b) => a.timeS - b.timeS);

  return {
    id: info.match_id,
    startTime: info.start_time,
    durationS: info.duration_s,
    winner: info.winning_team,
    ranked: info.match_mode === RANKED_MATCH_MODE,
    players,
    snapshots,
    objectiveLosses: info.objectives
      .flatMap((o) =>
        o.destroyed_time_s && isTeamId(o.team)
          ? [{ timeS: o.destroyed_time_s, lostBy: o.team, objectiveId: o.team_objective_id }]
          : [],
      )
      .sort((a, b) => a.timeS - b.timeS),
    midBoss: (info.mid_boss ?? []).flatMap((m) =>
      m.destroyed_time_s
        ? [
            {
              timeS: m.destroyed_time_s,
              killedBy: isTeamId(m.team_killed) ? m.team_killed : null,
              claimedBy: isTeamId(m.team_claimed) ? m.team_claimed : null,
            },
          ]
        : [],
    ),
  };
}

/** Newest first. */
export function mapMatchHistory(raw: RawMatchHistory): PlayerMatch[] {
  return raw
    .map((m) => {
      const ranked = m.match_mode === RANKED_MATCH_MODE;
      const badge = m.ranked_display_badge ?? 0;
      return {
        matchId: m.match_id,
        heroId: m.hero_id,
        startTime: m.start_time,
        durationS: m.match_duration_s,
        won: m.match_result === m.player_team,
        ranked,
        normalMode: m.game_mode === 1,
        kills: m.player_kills,
        deaths: m.player_deaths,
        assists: m.player_assists,
        souls: m.net_worth,
        rankDelta: ranked ? (m.ranked_delta ?? 0) : null,
        badge: ranked && badge > 0 ? decodeBadge(badge) : null,
      };
    })
    .sort((a, b) => b.startTime - a.startTime);
}

export type SteamProfile = { name: string | null; avatarUrl: string | null };

/** Steam's grey "?" avatar, shown for accounts that never set one. */
const DEFAULT_AVATAR = "fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb";

/**
 * A Steam avatar URL we can show, or null. Only https avatars.steamstatic.com
 * (the host allowed in next.config.ts), and never the default "?" avatar.
 */
export function steamAvatar(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || u.hostname !== "avatars.steamstatic.com") return null;
    if (u.pathname.includes(DEFAULT_AVATAR)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function mapSteamProfiles(raw: RawSteamProfiles): Record<number, SteamProfile> {
  const profiles: Record<number, SteamProfile> = {};
  for (const p of raw) profiles[p.account_id] = { name: p.personaname || null, avatarUrl: steamAvatar(p.avatarfull) };
  return profiles;
}

export function mapSteamNames(raw: RawSteamProfiles): Record<number, string> {
  const names: Record<number, string> = {};
  for (const p of raw) if (p.personaname) names[p.account_id] = p.personaname;
  return names;
}

export function mapActiveMatch(raw: RawActiveMatch): ActiveMatch | null {
  if (raw.match_id == null) return null;
  return {
    id: raw.match_id,
    startTime: raw.start_time ?? null,
    souls: { 0: raw.net_worth_team_0 ?? 0, 1: raw.net_worth_team_1 ?? 0 },
    objectivesMask: { 0: raw.objectives_mask_team0 ?? 0, 1: raw.objectives_mask_team1 ?? 0 },
    spectators: raw.spectators ?? 0,
    ranked: raw.match_mode_parsed === "Ranked",
    normalMode: raw.game_mode_parsed === "KECitadelGameModeNormal",
    region: raw.region_mode_parsed ?? null,
    players: raw.players.flatMap((p) =>
      p.hero_id != null && isTeamId(p.team)
        ? [{ accountId: p.account_id ?? null, heroId: p.hero_id, team: p.team }]
        : [],
    ),
  };
}

export function mapPlayerRanks(raw: RawPlayerRanks): PlayerRank[] {
  return raw.map((r) => ({
    accountId: r.account_id,
    badge: r.badge > 0 && r.rank > 0 ? { badge: r.badge, tier: r.rank, subrank: r.subrank } : null,
  }));
}

export function mapActiveMatches(raw: RawActiveMatch[]): ActiveMatch[] {
  return raw.flatMap((m) => mapActiveMatch(m) ?? []);
}
