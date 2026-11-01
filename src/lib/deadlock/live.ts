// Builds the Live board from cached data. Server only (used by /api/live and
// the server-rendered first paint of /live and in-progress match pages).

import { unstable_rethrow } from "next/navigation";
import { getActiveMatches, getHeroes, getMatchAverageRank, getRanks, type MatchAverageRank } from "./api";
import { rankFilterOptions } from "./meta";
import { objectivesLeft } from "./objectives";
import type { LiveBoardData, LiveHero, LiveMatchView } from "./live-view";
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
    avgRank: avg && {
      tier: avg.tier,
      subrank: avg.subrank,
      name: ranks.find((r) => r.tier === avg.tier)?.name ?? `Tier ${avg.tier}`,
    },
  };
}

export async function getLiveBoard(): Promise<LiveBoardData> {
  const [active, heroes, ranks] = await Promise.all([getActiveMatches(), getHeroes(), getRanks()]);
  const normal = active.filter((m) => m.normalMode);
  const averages = await Promise.all(normal.map(averageRank));

  const heroMap: Record<number, LiveHero> = {};
  for (const h of heroes) heroMap[h.id] = { name: h.name, iconUrl: h.iconUrl };

  return {
    fetchedAt: Math.floor(Date.now() / 1000),
    matches: normal.map((m, i) => toView(m, averages[i], ranks)),
    heroes: heroMap,
    rankOptions: rankFilterOptions(ranks),
  };
}
