"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { cn } from "@/lib/utils";
import { formatCompact } from "@/lib/format";
import { KING, MOTHER, TEAMS, type TeamId } from "@/lib/deadlock/teams";
import type { ScoreRow } from "@/lib/deadlock/match";
import { bestText } from "@/lib/contrast";
import { useRowHighlight } from "@/components/ui/RowHighlight";
import { ChartReadout, ChartTooltip, Muted, isPhoneViewport } from "./ChartTooltip";

// Label text inside a segment: ink or fg, whichever contrasts more with the
// shade. A couple of mid shades reach 4.5:1 with neither, so those labels get
// a dark plate behind fg text instead.
function segmentLabel(shade: string): { color: string; plate: boolean } {
  const best = bestText(shade);
  if (best.ratio >= 4.5) return { color: `var(--${best.text})`, plate: false };
  return { color: "var(--fg)", plate: true };
}

type TeamRows = { team: TeamId; rows: ScoreRow[]; total: number };

function sorted(scoreboard: Record<TeamId, ScoreRow[]>): TeamRows[] {
  return [KING, MOTHER].map((team) => {
    const rows = [...scoreboard[team]].sort((a, b) => b.heroDamage - a.heroDamage);
    return { team, rows, total: rows.reduce((s, r) => s + r.heroDamage, 0) || 1 };
  });
}

const pct = (r: ScoreRow, total: number) => `${Math.round((r.heroDamage / total) * 100)}%`;
const who = (r: ScoreRow) => r.playerName ?? "Anonymous";

/**
 * One stacked bar per team: each player's share of the team's hero damage,
 * largest first, in the team's light → dark shades. Labels sit inside the
 * segments on tablet/desktop and in a legend underneath on phones.
 *
 * Tablet/desktop: hovering a segment (or arrow keys on a focused bar) dims the
 * rest and shows the player, hero, exact damage and K/D/A. Phone: tap a
 * segment for the readout under the chart (the top damage dealer to start).
 */
export function DamageShare({ scoreboard }: { scoreboard: Record<TeamId, ScoreRow[]> }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const teams = sorted(scoreboard);
  const [active, setActive] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(() => {
    const top = teams.flatMap((t) => t.rows).sort((a, b) => b.heroDamage - a.heroDamage)[0];
    return top?.accountId ?? null;
  });

  const find = (accountId: number | null) => {
    for (const t of teams) {
      const row = t.rows.find((r) => r.accountId === accountId);
      if (row) return { ...t, row };
    }
    return null;
  };
  // Shared with the scoreboard: a hovered scoreboard row dims the other segments here, and the reverse.
  const { active: linked, setActive: setLinked } = useRowHighlight();
  const picked = find(selected);
  const hovered = find(active);
  const focus = find(active ?? (typeof linked === "number" ? linked : null));

  function onKeyDown(e: React.KeyboardEvent, t: TeamRows) {
    if (e.key === "Escape") return setActive(null);
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = t.rows.findIndex((r) => r.accountId === active);
    const next = i < 0 ? 0 : Math.min(t.rows.length - 1, Math.max(0, i + (e.key === "ArrowRight" ? 1 : -1)));
    setActive(t.rows[next]?.accountId ?? null);
  }

  return (
    <div ref={ref} className="flex flex-col gap-3.5 md:gap-[18px]">
      {teams.map((tr) => {
        const { team, rows, total } = tr;
        const t = TEAMS[team];
        // Each segment's middle across the bar, 0–100 %, for placing its tooltip.
        const mids = rows.map((_, i) => ((rows.slice(0, i).reduce((s, r) => s + r.heroDamage, 0) + rows[i].heroDamage / 2) / total) * 100);
        const activeIndex = rows.findIndex((r) => r.accountId === active);
        const activeRow = activeIndex >= 0 ? rows[activeIndex] : null;
        return (
          <div key={team} className="flex flex-col gap-1.5 md:gap-2">
            <span className={`font-mono text-[11px] md:text-xs ${t.textClass}`}>
              <span className="md:hidden">{t.shortName}</span>
              <span className="hidden md:inline">{t.name}</span> · {formatCompact(total)} hero damage
            </span>
            <div className="relative">
              <div
                tabIndex={0}
                role="group"
                aria-label={`${rows[0]?.heroName} did ${rows[0] ? pct(rows[0], total) : "0%"} of ${t.name}'s hero damage. Use the arrow keys to read each player.`}
                onKeyDown={(e) => onKeyDown(e, tr)}
                onBlur={() => setActive(null)}
                onPointerLeave={() => {
                  setActive(null);
                  setLinked(null);
                }}
                className="flex h-7 gap-0.5 outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-brass md:h-10"
              >
                {rows.map((r, i) => {
                  const lbl = segmentLabel(t.shades[i]);
                  const dim = focus != null && focus.team === team && focus.row.accountId !== r.accountId;
                  return (
                    <motion.div
                      key={r.accountId}
                      onPointerEnter={(e) => {
                        if (e.pointerType !== "mouse") return;
                        setActive(r.accountId);
                        setLinked(r.accountId);
                      }}
                      onClick={() => isPhoneViewport() && setSelected(r.accountId)}
                      className={cn(
                        "flex min-w-0 origin-left items-end overflow-hidden pb-1 pl-1.5 transition-opacity",
                        dim && "opacity-45",
                        selected === r.accountId && "max-md:outline-2 max-md:outline-offset-1 max-md:outline-solid max-md:outline-brass",
                      )}
                      style={{ flexGrow: r.heroDamage, flexBasis: 0, background: t.shades[i] }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: inView ? 1 : 0 }}
                      transition={{ delay: inView ? i * 0.05 : 0, duration: 0.5 }}
                    >
                      <span
                        className={`hidden font-mono text-[10px] whitespace-nowrap md:inline ${lbl.plate ? "-ml-0.5 bg-ink/70 px-0.5" : ""}`}
                        style={{ color: lbl.color }}
                      >
                        {r.heroName} {pct(r, total)}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
              {/* Outside the segments, which clip their contents. Placed over the hovered segment's middle. */}
              {activeRow && (
                <ChartTooltip x={mids[activeIndex]}>
                  <span className="text-fg">
                    {who(activeRow)} <Muted>· {activeRow.heroName}</Muted>
                  </span>
                  <span className={t.textClass}>
                    {formatCompact(activeRow.heroDamage)} hero damage · {pct(activeRow, total)} of team
                  </span>
                  <Muted>
                    {activeRow.kills} / {activeRow.deaths} / {activeRow.assists} · {formatCompact(activeRow.souls)} souls
                  </Muted>
                </ChartTooltip>
              )}
            </div>
            <ul aria-hidden="true" className="grid grid-cols-3 gap-x-2.5 gap-y-1 md:hidden">
              {rows.map((r, i) => (
                <li key={r.accountId} className="flex min-w-0 items-center gap-1.5 font-mono text-[10px] text-fg-2">
                  <span className="size-2 shrink-0" style={{ background: t.shades[i] }} />
                  <span className="truncate">
                    {r.heroName} {pct(r, total)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <p aria-live="polite" className="sr-only">
        {hovered ? `${who(hovered.row)}, ${hovered.row.heroName}: ${formatCompact(hovered.row.heroDamage)} hero damage, ${pct(hovered.row, hovered.total)} of ${TEAMS[hovered.team].name}'s` : ""}
      </p>

      {picked && (
        <ChartReadout>
          <span className={TEAMS[picked.team].textClass}>{picked.row.heroName}</span>
          <span className="text-fg">{who(picked.row)}</span>
          <span className="text-fg-2">
            {formatCompact(picked.row.heroDamage)} · {pct(picked.row, picked.total)}
          </span>
        </ChartReadout>
      )}
    </div>
  );
}
