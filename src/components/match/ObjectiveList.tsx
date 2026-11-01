"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/format";
import { TEAMS } from "@/lib/deadlock/teams";
import type { MatchEvent } from "@/lib/deadlock/match";
import { useEventHighlight } from "./EventHighlight";

/**
 * Objectives and the Mid-Boss in the order they fell. Hovering or focusing a row
 * highlights its diamond on the chart. The list is one tab stop; the arrow keys
 * (and Home / End) move between rows.
 */
export function ObjectiveList({ events }: { events: MatchEvent[] }) {
  const { active, setActive } = useEventHighlight();
  const [current, setCurrent] = useState(0);
  const rows = useRef<(HTMLLIElement | null)[]>([]);
  if (events.length === 0) return <p className="py-2 text-sm text-muted-foreground">No objectives fell in this match.</p>;

  const focusRow = (i: number) => {
    const next = Math.min(events.length - 1, Math.max(0, i));
    setCurrent(next);
    rows.current[next]?.focus();
  };

  function onKeyDown(e: React.KeyboardEvent, i: number) {
    const moves: Record<string, number> = {
      ArrowDown: i + 1,
      ArrowRight: i + 1,
      ArrowUp: i - 1,
      ArrowLeft: i - 1,
      Home: 0,
      End: events.length - 1,
    };
    if (!(e.key in moves)) return;
    e.preventDefault();
    focusRow(moves[e.key]);
  }

  return (
    <ol
      aria-label="Objectives in the order they fell. Use the arrow keys to move between them."
      className="grid md:grid-cols-2 md:gap-x-6 xl:grid-cols-1"
    >
      {events.map((e, i) => {
        const t = TEAMS[e.team];
        return (
          <li
            key={e.id}
            ref={(el) => {
              rows.current[i] = el;
            }}
            tabIndex={i === Math.min(current, events.length - 1) ? 0 : -1}
            onPointerEnter={() => setActive(e.id)}
            onPointerLeave={() => setActive(null)}
            onFocus={() => {
              setCurrent(i);
              setActive(e.id);
            }}
            onBlur={() => setActive(null)}
            onKeyDown={(ev) => onKeyDown(ev, i)}
            className={cn(
              "grid grid-cols-[46px_12px_minmax(0,1fr)] items-center gap-2.5 border-t border-rule py-2 text-[13px] outline-hidden focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-solid focus-visible:outline-brass md:grid-cols-[48px_12px_minmax(0,1fr)] md:py-[9px] xl:grid-cols-[56px_14px_minmax(0,1fr)] xl:gap-3 xl:py-2.5 xl:text-sm",
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
