"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { LeadSparkline } from "@/components/charts/LeadSparkline";
import { formatDuration } from "@/lib/format";
import { TEAMS } from "@/lib/deadlock/teams";
import { addSnapshot, startLog, type LogSnapshot } from "@/lib/deadlock/live-log";
import type { LiveMatchView } from "@/lib/deadlock/live-view";

function toSnapshot(match: LiveMatchView | null, fetchedAt: number): LogSnapshot | null {
  return match && { fetchedAt, startTime: match.startTime, souls: match.souls, masks: match.masks };
}

/**
 * Souls lead and fallen objectives from the page's own 30 s polls, kept in this
 * tab only (a reload starts over). Event times are approximate: an objective
 * is placed midway between the two polls it fell between.
 */
export function LiveLog({ match, fetchedAt, index }: { match: LiveMatchView | null; fetchedAt: number; index?: number }) {
  const [log, setLog] = useState(() => startLog(toSnapshot(match, fetchedAt)));
  // A new poll: fold it in during render (no effect round-trip).
  const snap = toSnapshot(match, fetchedAt);
  if (snap && snap.fetchedAt !== log.fetchedAt) setLog(addSnapshot(log, snap));

  return (
    <Card index={index} aria-labelledby="log-title">
      <SectionHeader
        numeral="IV."
        title="Live log"
        id="log-title"
        caption="Since you started watching · kept in this tab only · times are approximate"
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] xl:gap-8">
        <div className="flex min-w-0 flex-col gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Souls lead</span>
          <LeadSparkline points={log.points} />
          {log.points.length < 2 && (
            <p className="text-[13px] text-muted-foreground">The line fills in as updates arrive, every 30 seconds.</p>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-2 xl:border-l xl:border-line xl:pl-7">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Objectives</span>
          {log.events.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No objectives have fallen since you started watching.</p>
          ) : (
            <ol aria-label="Objectives destroyed, newest first" className="flex flex-col">
              <AnimatePresence initial={false}>
                {log.events.map((e) => (
                  <motion.li
                    key={`${e.t}-${e.team}-${e.noun}`}
                    layout
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-baseline gap-3 border-t border-rule py-2 text-[13px]"
                  >
                    <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                      <span aria-hidden="true">~</span>
                      <span className="sr-only">About </span>
                      {formatDuration(e.t)}
                    </span>
                    <span>
                      <span className={TEAMS[e.team].textClass}>{TEAMS[e.team].shortName}</span> destroyed{" "}
                      <span className={cn(e.key && "text-fg")}>{e.noun}</span>
                    </span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ol>
          )}
        </div>
      </div>
    </Card>
  );
}
