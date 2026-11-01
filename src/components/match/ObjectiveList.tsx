"use client";

import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/format";
import { TEAMS } from "@/lib/deadlock/teams";
import type { MatchEvent } from "@/lib/deadlock/match";
import { useEventHighlight } from "./EventHighlight";

/** Objectives and the Mid-Boss in the order they fell. Hovering or focusing a row highlights its diamond on the chart. */
export function ObjectiveList({ events }: { events: MatchEvent[] }) {
  const { active, setActive } = useEventHighlight();
  if (events.length === 0) return <p className="py-2 text-sm text-muted-foreground">No objectives fell in this match.</p>;

  return (
    <ol className="grid md:grid-cols-2 md:gap-x-6 xl:grid-cols-1">
      {events.map((e) => {
        const t = TEAMS[e.team];
        return (
          <li
            key={e.id}
            tabIndex={0}
            onPointerEnter={() => setActive(e.id)}
            onPointerLeave={() => setActive(null)}
            onFocus={() => setActive(e.id)}
            onBlur={() => setActive(null)}
            className={cn(
              "grid grid-cols-[46px_12px_minmax(0,1fr)] items-center gap-2.5 border-t border-rule py-2 text-[13px] outline-none md:grid-cols-[48px_12px_minmax(0,1fr)] md:py-[9px] xl:grid-cols-[56px_14px_minmax(0,1fr)] xl:gap-3 xl:py-2.5 xl:text-sm",
              active === e.id && "bg-surface-2",
            )}
          >
            <span className="font-mono text-xs text-muted-foreground md:text-[13px] xl:text-sm">{formatDuration(e.timeS)}</span>
            <span
              aria-hidden="true"
              className={cn("size-2 rotate-45 border-[1.5px] xl:size-[9px]", t.borderClass, e.key ? t.fillClass : "bg-transparent")}
            />
            <span>{e.text}</span>
          </li>
        );
      })}
    </ol>
  );
}
