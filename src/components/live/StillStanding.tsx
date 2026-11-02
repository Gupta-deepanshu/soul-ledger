import { cn } from "@/lib/utils";
import { OBJECTIVES } from "@/lib/deadlock/objectives";
import { KING, MOTHER, TEAMS, type TeamId } from "@/lib/deadlock/teams";
import type { LiveMatchView } from "@/lib/deadlock/live-view";

function Pips({ team, left, total, alignEnd }: { team: TeamId; left: number; total: number; alignEnd?: boolean }) {
  const t = TEAMS[team];
  return (
    <div className={cn("flex gap-1", alignEnd && "justify-end")}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn("size-2.5 rotate-45 border-[1.5px]", t.borderClass, i < left ? t.fillClass : "bg-transparent")}
        />
      ))}
    </div>
  );
}

/** Desktop panel: diamond pips per objective, filled = standing, hollow = destroyed. */
export function StillStandingPips({ match, teamHeaders = false }: { match: LiveMatchView; teamHeaders?: boolean }) {
  return (
    <div className="flex flex-col">
      {teamHeaders && (
        <div aria-hidden="true" className="grid grid-cols-[90px_minmax(0,1fr)_minmax(0,1fr)] gap-2.5 pb-1.5 text-xs">
          <span />
          <span className={TEAMS[KING].textClass}>{TEAMS[KING].shortName}</span>
          <span className={cn("text-right", TEAMS[MOTHER].textClass)}>{TEAMS[MOTHER].shortName}</span>
        </div>
      )}
      {OBJECTIVES.map(({ kind, name }) => {
        const k = match.objectives[KING][kind];
        const m = match.objectives[MOTHER][kind];
        return (
          <div
            key={kind}
            className="grid grid-cols-[90px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2.5 border-t border-rule py-2 text-[13px]"
          >
            <span className="text-fg-2">{name}</span>
            <span role="img" aria-label={`${TEAMS[KING].name}: ${k.left} of ${k.total} ${name} standing`}>
              <Pips team={KING} left={k.left} total={k.total} />
            </span>
            <span role="img" aria-label={`${TEAMS[MOTHER].name}: ${m.left} of ${m.total} ${name} standing`}>
              <Pips team={MOTHER} left={m.left} total={m.total} alignEnd />
            </span>
          </div>
        );
      })}
      <span className="pt-2 font-mono text-[11px] text-muted-foreground">Filled = standing · hollow = destroyed</span>
    </div>
  );
}

/** Tablet (and phone summary): "GUARDIANS LEFT  1 / 2" cells. */
export function StillStandingGrid({ match, className }: { match: LiveMatchView; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-4", className)}>
      {OBJECTIVES.map(({ kind, name }) => (
        <div key={kind} className="flex flex-col gap-1.5 bg-surface px-3 py-2.5">
          <dt className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">{name} left</dt>
          <dd className="font-mono text-sm">
            <span className={TEAMS[KING].textClass}>
              <span className="sr-only">{TEAMS[KING].shortName} </span>
              {match.objectives[KING][kind].left}
            </span>{" "}
            <span className="text-tick">/</span>{" "}
            <span className={TEAMS[MOTHER].textClass}>
              <span className="sr-only">{TEAMS[MOTHER].shortName} </span>
              {match.objectives[MOTHER][kind].left}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

const SINGULAR: Record<string, string> = { Guardians: "Guardian", Walkers: "Walker", Shrines: "Shrine", Patron: "Patron" };

/** Phone one-liner: the most advanced objective type that has fallen, e.g. "2 Walkers down each". */
export function objectiveSummary(match: LiveMatchView): string {
  for (const { kind, name } of [...OBJECTIVES].reverse()) {
    const k = match.objectives[KING][kind];
    const m = match.objectives[MOTHER][kind];
    const kDown = k.total - k.left;
    const mDown = m.total - m.left;
    if (kDown + mDown === 0) continue;
    if (kDown === mDown) return `${kDown} ${kDown === 1 ? SINGULAR[name] : name} down each`;
    return `${name} down ${kDown} – ${mDown}`;
  }
  return "No objectives down yet";
}
