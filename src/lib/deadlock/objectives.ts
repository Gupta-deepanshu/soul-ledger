// Team objectives in the `objectives_mask_team0/1` bitmasks. Bit i set = objective
// with `team_objective_id` i is still standing.
//
// Verified 2026-10-31: in match 128149655 each team's final mask is exactly the
// complement of the objectives it lost (match_info.objectives), and across 126
// live normal-mode matches bits 0, 2, 6 and 13 are always set — the core and the
// unused lane-2 slots on the 3-lane map (Valve's ids: 1–4 tier-1 lanes 1–4,
// 5–8 tier-2 lanes 1–4, 9 Patron, 10–11 Shrines, 12–15 base guardians lanes 1–4).
// Street Brawl uses different objectives; don't decode its masks.

export type ObjectiveKind = "guardians" | "walkers" | "shrines" | "patron";
export type ObjectiveCount = { left: number; total: number };
export type ObjectivesLeft = Record<ObjectiveKind, ObjectiveCount>;

/** In the order shown in "Still standing". Base guardians (12, 14, 15) are left out, as in the design. */
export const OBJECTIVES: { kind: ObjectiveKind; name: string; ids: number[] }[] = [
  { kind: "guardians", name: "Guardians", ids: [1, 3, 4] },
  { kind: "walkers", name: "Walkers", ids: [5, 7, 8] },
  { kind: "shrines", name: "Shrines", ids: [10, 11] },
  { kind: "patron", name: "Patron", ids: [9] },
];

/**
 * Name of an objective for the match report's event list. 9 and 0 are the
 * Patron's two stages: 9 falls first, 0 falls last and ends the match (in
 * match 128149655: 9 at 25:15, 0 at 27:54 of 27:55). Lane colours are left out
 * until confirmed.
 */
export function objectiveName(id: number): { noun: string; key: boolean } {
  if ([1, 2, 3, 4].includes(id)) return { noun: "a Guardian", key: false };
  if ([5, 6, 7, 8].includes(id)) return { noun: "a Walker", key: false };
  if ([12, 13, 14, 15].includes(id)) return { noun: "a Base Guardian", key: false };
  if (id === 10 || id === 11) return { noun: "a Shrine", key: false };
  if (id === 9) return { noun: "the Patron's first stage", key: false };
  if (id === 0) return { noun: "the Patron", key: true };
  return { noun: "an objective", key: false };
}

export function objectivesLeft(mask: number): ObjectivesLeft {
  const result = {} as ObjectivesLeft;
  for (const { kind, ids } of OBJECTIVES) {
    result[kind] = { left: ids.filter((id) => (mask >> id) & 1).length, total: ids.length };
  }
  return result;
}
