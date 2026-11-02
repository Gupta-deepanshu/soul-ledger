// Builds the Live board from cached data. Server only (used by /api/live and
// the server-rendered first paint of /live and in-progress match pages).

import { unstable_rethrow } from "next/navigation";
import {
  getActiveMatches,
  getHeroStats,
  getHeroes,
  getLiveHeroRecords,
  getLivePlayerRanks,
  getMatchAverageRank,
  getMatchupStats,
  getPatchWindows,
  getPlayerNames,
  getRanks,
  type MatchAverageRank,
} from "./api";
import { rankFilterOptions } from "./meta";
import { objectivesLeft } from "./objectives";
import { buildLiveDraft, buildLiveLineups, type LiveDraft, type LiveLineups } from "./live-match";
import { settle } from "./settle";
import type { LiveBoardData, LiveHero, LiveMatchView } from "./live-view";
import type { TeamId } from "./teams";
import type { ActiveMatch, Rank } from "./types";

let rankErrorLogged = false;

async function averageRank(match: ActiveMatch): Promise<MatchAverageRank> {
  const ids = match.players.flatMap((p) => (p.accountId == null ? [] : [p.accountId])).sort((a, b) => a - b);
  try {
    return await getMatchAverageRank(match.id, ids);
  } catch (error) {
    // Ranks are a nice-to-have: without them the match still shows, with "—".
    unstable_rethrow(error);
    if (!rankErrorLogged) {
      rankErrorLogged = true;
      console.warn("Live: player rank lookup failed; showing matches without ranks.", error);
    }
    return null;
  }
}

function toView(match: ActiveMatch, avg: MatchAverageRank, ranks: Rank[]): LiveMatchView {
  const heroesOf = (team: 0 | 1) => match.players.filter((p) => p.team === team).map((p) => p.heroId);
  return {
    id: match.id,
    startTime: match.startTime,
    ranked: match.ranked,
    region: match.region,
    souls: match.souls,
    spectators: match.spectators,
    heroes: { 0: heroesOf(0), 1: heroesOf(1) },
    objectives: { 0: objectivesLeft(match.objectivesMask[0]), 1: objectivesLeft(match.objectivesMask[1]) },
    masks: match.objectivesMask,
    avgRank: avg && {
      tier: avg.tier,
      subrank: avg.subrank,
      name: ranks.find((r) => r.tier === avg.tier)?.name ?? `Tier ${avg.tier}`,
    },
  };
}

export async function getLiveBoard(): Promise<LiveBoardData> {
  const [active, heroes, ranks] = await Promise.all([getActiveMatches(), getHeroes(), getRanks()]);
  const normal = active.matches.filter((m) => m.normalMode);
  const averages = await Promise.all(normal.map(averageRank));

  const heroMap: Record<number, LiveHero> = {};
  for (const h of heroes) heroMap[h.id] = { name: h.name, iconUrl: h.iconUrl };

  return {
    fetchedAt: Math.floor(Date.now() / 1000),
    dataAt: active.dataAt,
    matches: normal.map((m, i) => toView(m, averages[i], ranks)),
    heroes: heroMap,
    rankOptions: rankFilterOptions(ranks),
  };
}

// ---- In-progress match page ---------------------------------------------------------

/** The raw active match (with account ids), from the same 30 s cache as the board. */
export async function getActiveMatch(matchId: number): Promise<ActiveMatch | null> {
  return (await getActiveMatches()).matches.find((m) => m.id === matchId) ?? null;
}

/**
 * Player rows for one live match. Names (24 h), ranks and hero records (1 h per
 * match) are each optional: if one lookup fails, that column shows "—".
 */
export async function getLiveLineups(match: ActiveMatch): Promise<LiveLineups> {
  const known = match.players.flatMap((p) => (p.accountId == null ? [] : [{ accountId: p.accountId, heroId: p.heroId }]));
  const ids = known.map((p) => p.accountId).sort((a, b) => a - b);
  const [heroes, ranks, names, badges, records] = await Promise.all([
    getHeroes(),
    getRanks(),
    ids.length ? settle(getPlayerNames(ids)) : null,
    ids.length ? settle(getLivePlayerRanks(match.id, ids)) : null,
    known.length ? settle(getLiveHeroRecords(match.id, known)) : null,
  ]);
  return buildLiveLineups(
    match.players,
    heroes,
    ranks,
    names?.ok ? names.data : null,
    badges?.ok ? new Map(badges.data.map((b) => [b.accountId, b.badge])) : null,
    records?.ok ? records.data : null,
  );
}

/** The two lineups against each other, from current-patch meta stats (all ranks, 1 h). */
export async function getLiveDraft(teamHeroes: Record<TeamId, number[]>): Promise<LiveDraft> {
  const windows = await getPatchWindows();
  if (!windows) throw new Error("The patch list came back empty");
  const [stats, heroes, matchups] = await Promise.all([
    getHeroStats(windows.current),
    getHeroes(),
    getMatchupStats(windows.current),
  ]);
  return buildLiveDraft(teamHeroes, stats, heroes, matchups);
}
