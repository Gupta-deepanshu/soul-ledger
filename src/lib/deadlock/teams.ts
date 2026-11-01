// The one place team ids map to names and colours.

// Verified 2026-10-31 against match 96421548 (fixture src/data/fixtures/match-96421548.json),
// whose sides were confirmed on statlocker.gg: the Archmother won in 21:49 with 57 total
// kills; Hidden King heroes Venator, Calico, Vindicta, Paradox, Billy, Dynamo. In
// /v1/matches/96421548/metadata those six heroes are on team 0 and winning_team is 1,
// so 0 = The Hidden King (formerly Amber Hand) and 1 = The Archmother (formerly
// Sapphire Flame). Nothing else in the app hard-codes team ids.

export type TeamId = 0 | 1;
export type TeamKey = "king" | "mother";

export type Team = {
  id: TeamId;
  key: TeamKey;
  name: string;
  shortName: string;
  /** CSS colour for SVG fills and strokes. */
  color: string;
  /** Tailwind classes; literal strings so Tailwind can see them. */
  textClass: string;
  fillClass: string;
  borderClass: string;
  /** Light → dark shades for per-player breakdowns (damage share), largest share first. */
  shades: string[];
};

export const TEAMS: Record<TeamId, Team> = {
  0: {
    id: 0,
    key: "king",
    name: "The Hidden King",
    shortName: "Hidden King",
    color: "var(--king)",
    textClass: "text-king",
    fillClass: "bg-king",
    borderClass: "border-king",
    shades: ["#F0912E", "#C97526", "#A35F20", "#7E4A1A", "#5C3614", "#40260F"],
  },
  1: {
    id: 1,
    key: "mother",
    name: "The Archmother",
    shortName: "Archmother",
    color: "var(--mother)",
    textClass: "text-mother-text",
    fillClass: "bg-mother",
    borderClass: "border-mother",
    shades: ["#5E8BFF", "#4C72D4", "#3D5CAB", "#2F4784", "#22345F", "#182543"],
  },
};

/** Team ids by side, for layouts that always show the Hidden King on the left. */
export const KING: TeamId = TEAMS[0].key === "king" ? 0 : 1;
export const MOTHER: TeamId = KING === 0 ? 1 : 0;

export function isTeamId(value: number | null | undefined): value is TeamId {
  return value === 0 || value === 1;
}

export function team(id: TeamId): Team {
  return TEAMS[id];
}

export function otherTeam(id: TeamId): TeamId {
  return id === 0 ? 1 : 0;
}
