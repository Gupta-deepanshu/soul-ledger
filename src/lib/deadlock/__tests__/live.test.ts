import { addSnapshot, startLog, type LogSnapshot } from "@/lib/deadlock/live-log";
import { filterLive, leadOf, pickCounts, sortLive, type LiveMatchView } from "@/lib/deadlock/live-view";

const FULL = 0xffff;

function snap(overrides: Partial<LogSnapshot>): LogSnapshot {
  return {
    fetchedAt: 1000,
    dataAt: 1000,
    startTime: 0,
    souls: { 0: 10_000, 1: 10_000 },
    masks: { 0: FULL, 1: FULL },
    ...overrides,
  };
}

describe("live log", () => {
  it("starts empty without a snapshot", () => {
    expect(startLog(null)).toEqual({ points: [], events: [], fetchedAt: 0, masks: null, souls: null });
  });

  it("adds a point timed by when the data was produced", () => {
    const log = startLog(snap({ dataAt: 600, fetchedAt: 700, souls: { 0: 12_000, 1: 10_000 } }));
    expect(log.points).toEqual([{ t: 600, lead: 2000 }]);
    expect(log.fetchedAt).toBe(700);
  });

  it("skips repeated snapshots but remembers the poll", () => {
    const first = startLog(snap({ dataAt: 600 }));
    const next = addSnapshot(first, snap({ dataAt: 630, fetchedAt: 1030 }));
    expect(next.points).toHaveLength(1);
    expect(next.fetchedAt).toBe(1030);
  });

  it("skips snapshots that go back in time or have no start time", () => {
    const first = startLog(snap({ dataAt: 600 }));
    expect(addSnapshot(first, snap({ dataAt: 500, souls: { 0: 1, 1: 2 } })).points).toHaveLength(1);
    expect(addSnapshot(first, snap({ startTime: null, souls: { 0: 1, 1: 2 } })).points).toHaveLength(1);
  });

  it("logs a cleared objective bit as destroyed by the other team, between the two polls", () => {
    const first = startLog(snap({ dataAt: 600 }));
    // Team 0 loses Guardian 1; team 1 loses its Patron (0).
    const next = addSnapshot(
      first,
      snap({ dataAt: 720, souls: { 0: 11_000, 1: 13_000 }, masks: { 0: FULL & ~(1 << 1), 1: FULL & ~1 } }),
    );
    expect(next.points.at(-1)).toEqual({ t: 720, lead: -2000 });
    expect(next.events).toEqual([
      { t: 660, team: 1, noun: "a Guardian", key: false },
      { t: 660, team: 0, noun: "the Patron", key: true },
    ]);
  });
});

function match(overrides: Partial<LiveMatchView>): LiveMatchView {
  return {
    id: 1,
    startTime: 0,
    ranked: true,
    region: "Europe",
    souls: { 0: 0, 1: 0 },
    spectators: 0,
    heroes: { 0: [], 1: [] },
    objectives: {} as LiveMatchView["objectives"],
    masks: { 0: FULL, 1: FULL },
    avgRank: null,
    ...overrides,
  };
}

describe("live board helpers", () => {
  const oracle = match({ id: 1, avgRank: { tier: 8, subrank: 2, name: "Oracle" }, region: "Europe" });
  const oracleHigher = match({ id: 2, avgRank: { tier: 8, subrank: 5, name: "Oracle" }, region: "NAmerica" });
  const low = match({ id: 3, avgRank: { tier: 3, subrank: 1, name: "Arcanist" }, spectators: 50 });
  const unknownBusy = match({ id: 4, spectators: 100 });
  const unknownQuiet = match({ id: 5, spectators: 1 });

  it("sorts by average rank, unknown ranks last, ties by spectators", () => {
    expect(sortLive([unknownQuiet, low, oracle, unknownBusy, oracleHigher]).map((m) => m.id)).toEqual([2, 1, 3, 4, 5]);
  });

  it("filters by minimum tier and region", () => {
    const all = [oracle, oracleHigher, low, unknownBusy];
    expect(filterLive(all, 8, null).map((m) => m.id)).toEqual([1, 2]);
    expect(filterLive(all, null, "Europe").map((m) => m.id)).toEqual([1, 3, 4]);
    expect(filterLive(all, 8, "Europe").map((m) => m.id)).toEqual([1]);
    expect(filterLive(all, null, null)).toHaveLength(4);
  });

  it("finds the leading team", () => {
    expect(leadOf(match({ souls: { 0: 5000, 1: 3000 } }))).toEqual({ leader: 0, lead: 2000 });
    expect(leadOf(match({ souls: { 0: 1000, 1: 3000 } }))).toEqual({ leader: 1, lead: 2000 });
    expect(leadOf(match({ souls: { 0: 1000, 1: 1000 } }))).toEqual({ leader: null, lead: 0 });
  });

  it("counts hero picks across matches, most first", () => {
    const picks = pickCounts(
      [match({ heroes: { 0: [1, 2], 1: [3] } }), match({ heroes: { 0: [2], 1: [1] } }), match({ heroes: { 0: [2], 1: [] } })],
      2,
    );
    expect(picks).toEqual([
      { heroId: 2, count: 3 },
      { heroId: 1, count: 2 },
    ]);
  });
});
