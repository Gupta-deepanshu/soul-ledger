// Match report view models. Pure functions over a mapped MatchReport plus
// assets; the output is plain data that client components can take as props.

import { formatCompact, formatDuration } from "@/lib/format";
import { objectiveName } from "./objectives";
import { KING, MOTHER, TEAMS, otherTeam, type TeamId } from "./teams";
import type { Hero, Item, ItemSlot, MatchReport, Rank } from "./types";

// ---- Types ----------------------------------------------------------------------

export type LeadPoint = { timeS: number; /** king − mother */ lead: number };

export type MatchEvent = {
  id: string;
  timeS: number;
  /** The team that did it. */
  team: TeamId;
  text: string;
  /** Mid-Boss and the final Patron: filled diamonds. */
  key: boolean;
  /** Short label for the chart's x axis, for key events. */
  axisLabel?: string;
};

export type ScoreRow = {
  accountId: number;
  playerName: string | null;
  heroId: number;
  heroName: string;
  heroIcon: string | null;
  team: TeamId;
  kills: number;
  deaths: number;
  assists: number;
  souls: number;
  lastHits: number;
  denies: number;
  level: number | null;
  heroDamage: number;
  objectiveDamage: number;
  healing: number;
  mvp: boolean;
};

export type TeamSummary = { team: TeamId; souls: number; kills: number; objectives: number; won: boolean };

export type BuildItem = { itemId: number; name: string; slot: ItemSlot; tier: number; /** Shop art; null when the item has none. */ imageUrl: string | null; boughtAtS: number; soldAtS: number | null };
export type PlayerBuild = { accountId: number; label: string; items: BuildItem[] };

export type MatchView = {
  id: number;
  startTime: number;
  durationS: number;
  winner: TeamId;
  ranked: boolean;
  /** "Acolyte II", or null when fewer than 4 players were ranked. */
  avgRank: string | null;
  headline: string;
  teams: Record<TeamId, TeamSummary>;
  lead: LeadPoint[];
  events: MatchEvent[];
  scoreboard: Record<TeamId, ScoreRow[]>;
  builds: PlayerBuild[];
  /** accountId of the build shown first (the MVP). */
  defaultBuild: number | null;
};

// ---- Builders -------------------------------------------------------------------

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];
const MIN_RANKED_PLAYERS = 4;

function averageRank(report: MatchReport, ranks: Rank[]): string | null {
  const steps = report.players.flatMap((p) => (p.rank ? [p.rank.tier * 6 + (p.rank.subrank - 1)] : []));
  if (steps.length < MIN_RANKED_PLAYERS) return null;
  const avg = Math.round(steps.reduce((s, x) => s + x, 0) / steps.length);
  const tier = Math.floor(avg / 6);
  const name = ranks.find((r) => r.tier === tier)?.name ?? `Tier ${tier}`;
  return `${name} ${ROMAN[avg % 6]}`;
}

function buildEvents(report: MatchReport): MatchEvent[] {
  const shrinesLost: Record<TeamId, number> = { 0: 0, 1: 0 };
  const events: MatchEvent[] = report.objectiveLosses.map((o, i) => {
    const actor = otherTeam(o.lostBy);
    const { noun, key } = objectiveName(o.objectiveId);
    let thing = noun;
    if (o.objectiveId === 10 || o.objectiveId === 11) {
      shrinesLost[o.lostBy] += 1;
      if (shrinesLost[o.lostBy] === 2) thing = "the second Shrine";
    }
    return {
      id: `obj-${i}`,
      timeS: o.timeS,
      team: actor,
      text: `${TEAMS[actor].shortName} destroys ${thing}`,
      key,
      axisLabel: key ? "Patron" : undefined,
    };
  });
  report.midBoss.forEach((m, i) => {
    const claimer = m.claimedBy ?? m.killedBy;
    if (claimer == null) return;
    const stolen = m.killedBy != null && m.claimedBy != null && m.killedBy !== m.claimedBy;
    events.push({
      id: `mid-${i}`,
      timeS: m.timeS,
      team: claimer,
      text: stolen
        ? `${TEAMS[claimer].shortName} steals the Mid-Boss from ${TEAMS[m.killedBy!].shortName}`
        : `${TEAMS[claimer].shortName} secures the Mid-Boss`,
      key: true,
      axisLabel: "Mid-Boss",
    });
  });
  return events.sort((a, b) => a.timeS - b.timeS);
}

const minutes = (s: number) => Math.round(s / 60);

/**
 * One sentence from fixed patterns, using only facts in the data. Times come
 * from stats snapshots (every 3–5 min). Patterns, first match wins:
 *  - short (< 15 min or < 3 snapshots) or one-sided (winner ahead at every
 *    snapshot and by ≥ 20k at the end): winner, duration, final souls difference
 *  - comeback (winner trailed by ≥ 3k at some snapshot)
 *  - wire-to-wire (winner ahead at every snapshot)
 *  - otherwise: how many times the lead changed hands, and the last key event
 */
export function buildHeadline(report: MatchReport, lead: LeadPoint[], events: MatchEvent[]): string {
  const w = report.winner;
  const sign = w === KING ? 1 : -1;
  const wl = lead.map((p) => ({ timeS: p.timeS, lead: sign * p.lead }));
  const final = wl.at(-1)?.lead ?? 0;
  const finalText = `${formatCompact(Math.abs(final))} souls ${final >= 0 ? "ahead" : "behind"}`;
  const fallback = `${TEAMS[w].shortName} won in ${formatDuration(report.durationS)}, finishing ${finalText}.`;

  const alwaysAhead = wl.length > 0 && wl.every((p) => p.lead > 0);
  if (report.durationS < 15 * 60 || wl.length < 3 || (alwaysAhead && final >= 20_000)) return fallback;

  const worst = wl.reduce((a, b) => (b.lead < a.lead ? b : a), wl[0]);
  if (worst.lead <= -3_000) {
    const deficit = `Down ${formatCompact(-worst.lead)} souls at ${minutes(worst.timeS)} minutes`;
    // First snapshot after which the winner stays ahead.
    let goodFrom = -1;
    for (let i = wl.length - 1; i >= 0 && wl[i].lead > 0; i--) goodFrom = i;
    if (goodFrom <= 0) return `${deficit}, they won anyway, finishing ${finalText}.`;
    const tGood = wl[goodFrom].timeS;
    const tBefore = wl[goodFrom - 1].timeS;
    const midBoss = events.find(
      (e) => e.axisLabel === "Mid-Boss" && e.team === w && e.timeS > tBefore - 180 && e.timeS <= tGood,
    );
    return `${deficit}, they took the lead for good by ${minutes(tGood)} minutes${midBoss ? " after the Mid-Boss" : ""}.`;
  }

  if (alwaysAhead) return `They led at every check-in and finished ${finalText}.`;

  let changes = 0;
  for (let i = 1; i < wl.length; i++) if (Math.sign(wl[i].lead) !== Math.sign(wl[i - 1].lead) && wl[i].lead !== 0) changes++;
  if (changes === 0) return fallback;
  const patron = events.find((e) => e.key && e.axisLabel === "Patron");
  const ending = patron ? `; the Patron fell at ${formatDuration(patron.timeS)}` : "";
  const times = changes === 1 ? "once" : changes === 2 ? "twice" : `${changes} times`;
  return `The souls lead changed hands ${times}${ending}.`;
}

export function buildMatchView(
  report: MatchReport,
  heroes: Hero[],
  items: Item[],
  ranks: Rank[],
  names: Record<number, string>,
): MatchView {
  const heroById = new Map(heroes.map((h) => [h.id, h]));
  const itemById = new Map(items.map((i) => [i.id, i]));

  const lead = report.snapshots.map((s) => ({ timeS: s.timeS, lead: s.souls[KING] - s.souls[MOTHER] }));
  const events = buildEvents(report);

  const rows: ScoreRow[] = report.players.map((p) => {
    const hero = heroById.get(p.heroId);
    return {
      accountId: p.accountId,
      playerName: names[p.accountId] ?? null,
      heroId: p.heroId,
      heroName: hero?.name ?? `Hero ${p.heroId}`,
      heroIcon: hero?.iconUrl ?? null,
      team: p.team,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      souls: p.souls,
      lastHits: p.lastHits,
      denies: p.denies,
      level: p.level,
      heroDamage: p.heroDamage,
      objectiveDamage: p.objectiveDamage,
      healing: p.healing,
      mvp: p.mvpRank === 1,
    };
  });
  const teamRows = (t: TeamId) => rows.filter((r) => r.team === t).sort((a, b) => b.souls - a.souls);

  const summary = (t: TeamId): TeamSummary => ({
    team: t,
    souls: rows.filter((r) => r.team === t).reduce((s, r) => s + r.souls, 0),
    kills: rows.filter((r) => r.team === t).reduce((s, r) => s + r.kills, 0),
    objectives: report.objectiveLosses.filter((o) => o.lostBy !== t).length,
    won: report.winner === t,
  });

  const builds: PlayerBuild[] = [...teamRows(report.winner), ...teamRows(otherTeam(report.winner))].map((r) => {
    const player = report.players.find((p) => p.accountId === r.accountId)!;
    return {
      accountId: r.accountId,
      label: `${r.heroName} · ${r.playerName ?? "Anonymous"}`,
      items: player.purchases.flatMap((pur) => {
        const item = itemById.get(pur.itemId);
        return item
          ? [{ itemId: item.id, name: item.name, slot: item.slot, tier: item.tier, imageUrl: item.imageUrl, boughtAtS: pur.boughtAtS, soldAtS: pur.soldAtS }]
          : [];
      }),
    };
  });
  const mvp = rows.find((r) => r.mvp) ?? teamRows(report.winner)[0];

  return {
    id: report.id,
    startTime: report.startTime,
    durationS: report.durationS,
    winner: report.winner,
    ranked: report.ranked,
    avgRank: averageRank(report, ranks),
    headline: buildHeadline(report, lead, events),
    teams: { 0: summary(0), 1: summary(1) },
    lead,
    events,
    scoreboard: { 0: teamRows(0), 1: teamRows(1) },
    builds,
    defaultBuild: mvp?.accountId ?? null,
  };
}
