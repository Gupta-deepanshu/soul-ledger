import { objectiveName, objectivesLeft } from "@/lib/deadlock/objectives";
import { KING, MOTHER, TEAMS, isTeamId, otherTeam, team } from "@/lib/deadlock/teams";

describe("teams", () => {
  it("maps team 0 to the Hidden King and 1 to the Archmother", () => {
    expect(team(0).name).toBe("The Hidden King");
    expect(team(1).name).toBe("The Archmother");
    expect(KING).toBe(0);
    expect(MOTHER).toBe(1);
  });

  it("isTeamId accepts only 0 and 1", () => {
    expect([0, 1, 2, -1, null, undefined].map(isTeamId)).toEqual([true, true, false, false, false, false]);
  });

  it("otherTeam flips sides", () => {
    expect(otherTeam(0)).toBe(1);
    expect(otherTeam(1)).toBe(0);
  });

  it("gives each team six damage-share shades", () => {
    expect(TEAMS[0].shades).toHaveLength(6);
    expect(TEAMS[1].shades).toHaveLength(6);
  });
});

describe("objectivesLeft", () => {
  it("counts every objective as standing on a full mask", () => {
    expect(objectivesLeft(0xffff)).toEqual({
      guardians: { left: 3, total: 3 },
      walkers: { left: 3, total: 3 },
      shrines: { left: 2, total: 2 },
      patron: { left: 1, total: 1 },
    });
  });

  it("counts nothing on an empty mask", () => {
    const left = objectivesLeft(0);
    expect(Object.values(left).every((c) => c.left === 0)).toBe(true);
  });

  it("reads individual bits", () => {
    // Guardian 1, Walker 7, Shrine 10 and the Patron (9) standing.
    const mask = (1 << 1) | (1 << 7) | (1 << 10) | (1 << 9);
    expect(objectivesLeft(mask)).toEqual({
      guardians: { left: 1, total: 3 },
      walkers: { left: 1, total: 3 },
      shrines: { left: 1, total: 2 },
      patron: { left: 1, total: 1 },
    });
  });
});

describe("objectiveName", () => {
  it.each([
    [1, "a Guardian", false],
    [6, "a Walker", false],
    [13, "a Base Guardian", false],
    [10, "a Shrine", false],
    [9, "the Patron's first stage", false],
    [0, "the Patron", true],
    [99, "an objective", false],
  ])("id %d → %s", (id, noun, key) => {
    expect(objectiveName(id)).toEqual({ noun, key });
  });
});
