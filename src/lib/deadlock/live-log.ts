// The in-progress match page's live log: built in the browser from the 30 s
// polls while the page is open (nothing is stored). Pure functions, so the
// poll-diffing can be checked on its own.

import { objectiveName } from "./objectives";
import type { TeamId } from "./teams";

export type LogPoint = { /** Match time, seconds. */ t: number; /** King souls − Archmother souls. */ lead: number };

export type LogEvent = {
  /** Approximate match time: midway between the two polls it fell between. */
  t: number;
  /** The team that destroyed it (the other team's bit cleared). */
  team: TeamId;
  noun: string;
  key: boolean;
};

export type LiveLog = {
  points: LogPoint[];
  /** Newest first. */
  events: LogEvent[];
  /** Server time of the last snapshot seen, to process each poll once. */
  fetchedAt: number;
  /** Objective masks at the last distinct snapshot. */
  masks: Record<TeamId, number> | null;
  /** Souls at the last distinct snapshot, to skip repeats of the same upstream data. */
  souls: Record<TeamId, number> | null;
};

export type LogSnapshot = {
  fetchedAt: number;
  startTime: number | null;
  souls: Record<TeamId, number>;
  masks: Record<TeamId, number>;
};

const MASK_BITS = 16;

export function startLog(snap: LogSnapshot | null): LiveLog {
  const empty: LiveLog = { points: [], events: [], fetchedAt: snap?.fetchedAt ?? 0, masks: null, souls: null };
  return snap ? addSnapshot(empty, snap) : empty;
}

/**
 * Adds one poll. The upstream data refreshes every 30 s, so a poll can repeat
 * the previous snapshot (same souls and objectives); those are skipped.
 */
export function addSnapshot(log: LiveLog, snap: LogSnapshot): LiveLog {
  const same =
    log.souls != null &&
    log.masks != null &&
    log.souls[0] === snap.souls[0] &&
    log.souls[1] === snap.souls[1] &&
    log.masks[0] === snap.masks[0] &&
    log.masks[1] === snap.masks[1];
  if (same || snap.startTime == null) return { ...log, fetchedAt: snap.fetchedAt };

  const t = Math.max(0, snap.fetchedAt - snap.startTime);
  const previous = log.points.at(-1);
  if (previous && t <= previous.t) return { ...log, fetchedAt: snap.fetchedAt };

  const events: LogEvent[] = [];
  if (log.masks && previous) {
    const when = Math.round((previous.t + t) / 2);
    for (const lost of [0, 1] as TeamId[]) {
      const cleared = log.masks[lost] & ~snap.masks[lost];
      for (let bit = 0; bit < MASK_BITS; bit++) {
        if ((cleared >> bit) & 1) events.push({ t: when, team: lost === 0 ? 1 : 0, ...objectiveName(bit) });
      }
    }
  }

  return {
    points: [...log.points, { t, lead: snap.souls[0] - snap.souls[1] }],
    events: [...events, ...log.events],
    fetchedAt: snap.fetchedAt,
    masks: snap.masks,
    souls: snap.souls,
  };
}
