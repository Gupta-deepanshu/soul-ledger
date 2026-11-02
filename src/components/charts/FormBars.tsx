"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView } from "motion/react";
import { cn } from "@/lib/utils";
import { formatCompact, formatDuration, formatKda } from "@/lib/format";
import { ArrowLink } from "@/components/ui/buttons";
import { useRelativeTime } from "@/components/ui/RelativeTime";
import { useRowHighlight } from "@/components/ui/RowHighlight";
import type { FormPoint } from "@/lib/deadlock/player";
import { ChartReadout, ChartTooltip, Muted, isPhoneViewport } from "./ChartTooltip";

function Result({ won }: { won: boolean }) {
  return <span className={won ? "text-brass" : "text-mother-text"}>{won ? "Win" : "Loss"}</span>;
}

/**
 * Last matches, oldest first: wins grow up in brass, losses down in `mother`,
 * height ∝ KDA (wins scaled to the best win, losses to the best loss).
 *
 * Each match is a link to its report. Tablet/desktop: hover or keyboard focus
 * shows a tooltip; click or Enter opens the match. Phone: the first tap selects
 * a bar (brass outline) and fills the readout under the chart, which has the
 * "Open match" link; the latest match is selected to start.
 */
export function FormBars({ form }: { form: FormPoint[] }) {
  const ref = useRef<HTMLOListElement>(null);
  const inView = useInView(ref, { once: true });
  const ago = useRelativeTime();
  const [active, setActive] = useState<number | null>(null);
  const [selected, setSelected] = useState(form.length - 1);
  // Shared with Match history: its hovered row's bar lights up, and the reverse.
  const { active: linked, setActive: setLinked } = useRowHighlight();

  const wins = form.filter((f) => f.won);
  const maxWin = Math.max(...wins.map((f) => f.kda), 0.1);
  const maxLoss = Math.max(...form.filter((f) => !f.won).map((f) => f.kda), 0.1);
  const avgKda = form.reduce((s, f) => s + f.kda, 0) / Math.max(form.length, 1);
  const summary = `${wins.length} wins and ${form.length - wins.length} losses in the last ${form.length} matches, oldest first; average KDA ${formatKda(avgKda)}. Each bar opens its match.`;

  const hovered = active == null ? null : form[active];
  const picked = form[selected];

  return (
    <div className="flex flex-col gap-2.5">
      <div className="relative">
        {/* The centre line, behind the columns so the gaps don't break it. */}
        <div aria-hidden="true" className="absolute inset-x-0 top-[70px] h-px bg-tick md:top-20 xl:top-[90px]" />
        <ol ref={ref} aria-label={summary} className="relative flex gap-[3px] xl:gap-1">
          {form.map((f, i) => (
            <li key={f.matchId} className="flex-1">
              <Link
                href={`/matches/${f.matchId}`}
                aria-label={`Match ${i + 1}: ${f.heroName}, ${f.won ? "win" : "loss"}, KDA ${formatKda(f.kda)}, ${ago(f.startTime)}`}
                onPointerEnter={(e) => {
                  setActive(i);
                  if (e.pointerType === "mouse") setLinked(f.matchId);
                }}
                onPointerLeave={() => {
                  setActive((a) => (a === i ? null : a));
                  setLinked(null);
                }}
                onFocus={() => setActive(i)}
                onBlur={() => setActive((a) => (a === i ? null : a))}
                onClick={(e) => {
                  // Phone: the first tap selects; the readout's link (or a second tap) opens it.
                  if (isPhoneViewport() && selected !== i) {
                    e.preventDefault();
                    setSelected(i);
                  }
                }}
                className={cn(
                  "flex flex-col outline-hidden transition-colors hover:bg-surface-2",
                  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-solid focus-visible:outline-brass",
                  selected === i && "max-md:outline-2 max-md:outline-offset-1 max-md:outline-solid max-md:outline-brass",
                  (active === i || linked === f.matchId) && "bg-surface-2",
                  // Its row in Match history is hovered: outline the bar too (tablet/desktop).
                  linked === f.matchId && active !== i && "md:outline-1 md:outline-solid md:outline-brass",
                )}
              >
                <span className="flex h-[70px] items-end md:h-20 xl:h-[90px]">
                  <motion.span
                    className="block w-full origin-bottom bg-brass"
                    style={{ height: f.won ? `${Math.max(4, (f.kda / maxWin) * 100)}%` : 0 }}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: inView ? 1 : 0 }}
                    transition={{ delay: inView ? i * 0.03 : 0, duration: 0.35 }}
                  />
                </span>
                <span className="h-px" />
                <span className="flex h-[38px] items-start md:h-11 xl:h-[50px]">
                  <motion.span
                    className="block w-full origin-top bg-mother"
                    style={{ height: f.won ? 0 : `${Math.max(4, (f.kda / maxLoss) * 100)}%` }}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: inView ? 1 : 0 }}
                    transition={{ delay: inView ? i * 0.03 : 0, duration: 0.35 }}
                  />
                </span>
              </Link>
            </li>
          ))}
        </ol>

        {hovered && active != null && (
          <ChartTooltip x={((active + 0.5) / form.length) * 100}>
            <span className="flex gap-2">
              <span className="text-fg">{hovered.heroName}</span>
              <Result won={hovered.won} />
            </span>
            <span className="text-fg-2">
              {hovered.kills} / {hovered.deaths} / {hovered.assists} · KDA {formatKda(hovered.kda)}
            </span>
            <Muted>
              {formatCompact(hovered.souls)} souls · {formatDuration(hovered.durationS)} · {ago(hovered.startTime)}
            </Muted>
          </ChartTooltip>
        )}
      </div>

      {picked && (
        <ChartReadout
          action={
            <ArrowLink href={`/matches/${picked.matchId}`} className="text-xs">
              Open match
            </ArrowLink>
          }
        >
          <span className="text-fg">{picked.heroName}</span>
          <Result won={picked.won} />
          <span className="text-fg-2">
            {picked.kills}/{picked.deaths}/{picked.assists}
          </span>
          <Muted>{ago(picked.startTime)}</Muted>
        </ChartReadout>
      )}
    </div>
  );
}
