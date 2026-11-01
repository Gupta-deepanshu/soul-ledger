"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { formatCompact } from "@/lib/format";
import { KING, MOTHER, TEAMS, type TeamId } from "@/lib/deadlock/teams";
import type { ScoreRow } from "@/lib/deadlock/match";

/**
 * One stacked bar per team: each player's share of the team's hero damage,
 * largest first, in the team's light → dark shades. Labels sit inside the
 * segments on tablet/desktop and in a legend underneath on phones.
 */
export function DamageShare({ scoreboard }: { scoreboard: Record<TeamId, ScoreRow[]> }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  return (
    <div ref={ref} className="flex flex-col gap-3.5 md:gap-[18px]">
      {[KING, MOTHER].map((team) => {
        const t = TEAMS[team];
        const rows = [...scoreboard[team]].sort((a, b) => b.heroDamage - a.heroDamage);
        const total = rows.reduce((s, r) => s + r.heroDamage, 0) || 1;
        const pct = (r: ScoreRow) => `${Math.round((r.heroDamage / total) * 100)}%`;
        return (
          <div key={team} className="flex flex-col gap-1.5 md:gap-2">
            <span className={`font-mono text-[11px] md:text-xs ${t.textClass}`}>
              <span className="md:hidden">{t.shortName}</span>
              <span className="hidden md:inline">{t.name}</span> · {formatCompact(total)} hero damage
            </span>
            <div
              role="img"
              aria-label={`${rows[0]?.heroName} did ${rows[0] ? pct(rows[0]) : "0%"} of ${t.name}'s hero damage.`}
              className="flex h-7 gap-0.5 md:h-10"
            >
              {rows.map((r, i) => (
                <motion.div
                  key={r.accountId}
                  className="flex min-w-0 origin-left items-end overflow-hidden pb-1 pl-1.5"
                  style={{ flexGrow: r.heroDamage, flexBasis: 0, background: t.shades[i] }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: inView ? 1 : 0 }}
                  transition={{ delay: inView ? i * 0.05 : 0, duration: 0.5 }}
                >
                  <span
                    className="hidden font-mono text-[10px] whitespace-nowrap md:inline"
                    style={{ color: i < 3 ? "var(--ink)" : "var(--fg)" }}
                  >
                    {r.heroName} {pct(r)}
                  </span>
                </motion.div>
              ))}
            </div>
            <ul aria-hidden="true" className="grid grid-cols-3 gap-x-2.5 gap-y-1 md:hidden">
              {rows.map((r, i) => (
                <li key={r.accountId} className="flex min-w-0 items-center gap-1.5 font-mono text-[10px] text-fg-2">
                  <span className="size-2 shrink-0" style={{ background: t.shades[i] }} />
                  <span className="truncate">
                    {r.heroName} {pct(r)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
