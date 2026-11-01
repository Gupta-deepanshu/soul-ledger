"use client";

import { useId, useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { cn } from "@/lib/utils";
import { formatCompact, formatDuration } from "@/lib/format";
import { KING, MOTHER, TEAMS } from "@/lib/deadlock/teams";
import type { LeadPoint, MatchEvent } from "@/lib/deadlock/match";
import { useEventHighlight } from "@/components/match/EventHighlight";
import { useViewBoxScale } from "./useViewBoxScale";

/** On-screen size of every chart label, in CSS px, at any width. */
const LABEL_PX = 11;

// viewBox geometry (see the soul-ledger-charts skill).
const W = 800;
const H = 320;
const X0 = 40;
const X1 = 780;
const ZERO = 120;
const HALF = 100;
const DIAMOND_Y = 262;

/** Round the largest lead up to 5k / 10k / 20k, then whole 10ks. */
function niceScale(maxAbs: number) {
  if (maxAbs <= 5_000) return 5_000;
  if (maxAbs <= 10_000) return 10_000;
  if (maxAbs <= 20_000) return 20_000;
  return Math.ceil(maxAbs / 10_000) * 10_000;
}

function leadText(lead: number) {
  if (lead === 0) return "level";
  return `${TEAMS[lead > 0 ? KING : MOTHER].shortName} +${formatCompact(Math.abs(lead))}`;
}

/** One-sentence takeaway for screen readers, from the data. */
function describe(lead: LeadPoint[]) {
  if (lead.length === 0) return "No souls data for this match.";
  const kingBest = lead.reduce((a, b) => (b.lead > a.lead ? b : a));
  const motherBest = lead.reduce((a, b) => (b.lead < a.lead ? b : a));
  const parts: string[] = [];
  if (kingBest.lead > 0) parts.push(`the Hidden King led by up to ${formatCompact(kingBest.lead)} at ${formatDuration(kingBest.timeS)}`);
  if (motherBest.lead < 0) parts.push(`the Archmother led by up to ${formatCompact(-motherBest.lead)} at ${formatDuration(motherBest.timeS)}`);
  const last = lead[lead.length - 1];
  return `Souls lead at each stats snapshot: ${parts.join("; ") || "level throughout"}; at the end, ${leadText(last.lead)}.`;
}

type Props = { lead: LeadPoint[]; events: MatchEvent[]; durationS: number };

export function SoulsLeadChart({ lead, events, durationS }: Props) {
  const uid = useId();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const { active, setActive } = useEventHighlight();
  const [cursor, setCursor] = useState<number | null>(null);
  // Labels are sized in viewBox units, so convert 11 px on screen into units
  // once the chart's width is known (the classes below are the pre-measure fallback).
  const k = useViewBoxScale(ref, W);
  const labelStyle = k == null ? undefined : { fontSize: LABEL_PX * k };

  const scale = niceScale(Math.max(...lead.map((p) => Math.abs(p.lead)), 1));
  const x = (t: number) => X0 + (t / Math.max(durationS, 1)) * (X1 - X0);
  const y = (v: number) => ZERO - (v / scale) * HALF;

  const points = lead.map((p) => `${x(p.timeS).toFixed(1)},${y(p.lead).toFixed(1)}`);
  const line = points.length ? `M${points.join(" L")}` : "";
  const area = lead.length
    ? `M${x(lead[0].timeS).toFixed(1)},${ZERO} L${points.join(" L")} L${x(lead[lead.length - 1].timeS).toFixed(1)},${ZERO} Z`
    : "";

  const grid = [scale, scale / 2, -scale / 2, -scale];
  const label = (v: number) => (v > 0 ? `+${formatCompact(v)}` : formatCompact(-v));

  // X-axis labels: start, key events, end — skipping any that would overlap.
  const axis = (minGap: number) => {
    const raw = [
      { x: X0, text: "0:00" },
      ...events.filter((e) => e.axisLabel).map((e) => ({ x: x(e.timeS), text: `${Math.round(e.timeS / 60)} · ${e.axisLabel}` })),
      { x: X1, text: formatDuration(durationS) },
    ];
    const kept: typeof raw = [];
    for (const l of raw) {
      const isEnd = l === raw[raw.length - 1];
      if (isEnd) {
        while (kept.length > 1 && l.x - kept[kept.length - 1].x < minGap) kept.pop();
        kept.push(l);
      } else if (!kept.length || l.x - kept[kept.length - 1].x >= minGap) kept.push(l);
    }
    return kept;
  };

  function nearest(clientX: number) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || lead.length === 0) return null;
    const vx = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    lead.forEach((p, i) => {
      if (Math.abs(x(p.timeS) - vx) < Math.abs(x(lead[best].timeS) - vx)) best = i;
    });
    return best;
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (lead.length === 0) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const step = e.key === "ArrowRight" ? 1 : -1;
      setCursor((c) => (c == null ? (step > 0 ? 0 : lead.length - 1) : Math.min(lead.length - 1, Math.max(0, c + step))));
    } else if (e.key === "Escape") setCursor(null);
  }

  const point = cursor == null ? null : lead[cursor];

  return (
    <div
      ref={ref}
      tabIndex={0}
      role="group"
      aria-label="Souls lead chart. Use the left and right arrow keys to step through the stats snapshots."
      onKeyDown={onKeyDown}
      onBlur={() => setCursor(null)}
      onPointerMove={(e) => setCursor(nearest(e.clientX))}
      onPointerLeave={() => setCursor(null)}
      className="relative outline-hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-solid focus-visible:outline-brass"
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full overflow-visible" role="img" aria-label={describe(lead)}>
        <defs>
          <clipPath id={`${uid}-above`}>
            <rect x="0" y="0" width={W} height={ZERO} />
          </clipPath>
          <clipPath id={`${uid}-below`}>
            <rect x="0" y={ZERO} width={W} height={H - ZERO} />
          </clipPath>
        </defs>

        <g stroke="var(--line)" strokeWidth="1">
          {grid.map((v) => (
            <line key={v} x1={X0} y1={y(v)} x2={X1} y2={y(v)} />
          ))}
        </g>
        <line x1={X0} y1={ZERO} x2={X1} y2={ZERO} stroke="var(--tick)" strokeWidth="1" />

        {/* Y labels: outside the plot on tablet/desktop, inside it (larger) on phones. */}
        <g fill="var(--faint)" className="hidden font-mono text-[11px] md:block" style={labelStyle}>
          {grid.map((v) => (
            <text key={v} x={X0 - 8} y={y(v) + 4} textAnchor="end">
              {label(v)}
            </text>
          ))}
          <text x={X0 - 8} y={ZERO + 4} textAnchor="end">
            0
          </text>
        </g>
        <g fill="var(--faint)" className="font-mono text-[22px] md:hidden" style={labelStyle}>
          {[scale, -scale].map((v) => (
            <text key={v} x={X0 + 6} y={y(v) - 8}>
              {label(v)}
            </text>
          ))}
        </g>

        <motion.g initial={{ opacity: 0 }} animate={{ opacity: inView ? 1 : 0 }} transition={{ delay: inView ? 0.9 : 0, duration: 0.4 }}>
          <path d={area} clipPath={`url(#${uid}-above)`} fill="var(--king)" fillOpacity="0.28" />
          <path d={area} clipPath={`url(#${uid}-below)`} fill="var(--mother)" fillOpacity="0.32" />
        </motion.g>

        {/* Objective guides and diamonds at their exact times. */}
        {events.map((e, i) => {
          const ex = x(e.timeS);
          const on = active === e.id;
          const color = TEAMS[e.team].color;
          return (
            <g key={e.id} onPointerEnter={() => setActive(e.id)} onPointerLeave={() => setActive(null)}>
              <line
                x1={ex}
                y1={20}
                x2={ex}
                y2={DIAMOND_Y}
                stroke={on ? color : "var(--line-strong)"}
                strokeDasharray="2 4"
                strokeWidth={on ? 1.5 : 1}
              />
              <motion.g
                initial={{ opacity: 0, y: -12 }}
                animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: -12 }}
                transition={{ delay: inView ? 1 + i * 0.06 : 0, duration: 0.3 }}
              >
                <rect
                  x={ex - (on ? 7 : 4.5)}
                  y={DIAMOND_Y - (on ? 7 : 4.5)}
                  width={on ? 14 : 9}
                  height={on ? 14 : 9}
                  transform={`rotate(45 ${ex} ${DIAMOND_Y})`}
                  stroke={color}
                  strokeWidth="1.6"
                  fill={e.key ? color : "var(--ink)"}
                  className="max-md:[stroke-width:3]"
                >
                  <title>{`${formatDuration(e.timeS)} · ${e.text}`}</title>
                </rect>
              </motion.g>
            </g>
          );
        })}

        <motion.path
          d={line}
          fill="none"
          stroke="var(--fg)"
          strokeLinejoin="round"
          className="[stroke-width:4] md:[stroke-width:1.6]"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: inView ? 1 : 0 }}
          transition={{ duration: 0.9 }}
        />
        {/* A dot at each real snapshot. */}
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: inView ? 1 : 0 }} transition={{ delay: inView ? 0.9 : 0 }}>
          {lead.map((p, i) => (
            <circle
              key={p.timeS}
              cx={x(p.timeS)}
              cy={y(p.lead)}
              fill={cursor === i ? "var(--brass)" : "var(--fg)"}
              className={cursor === i ? "[r:9] md:[r:5]" : "[r:6] md:[r:3]"}
            />
          ))}
        </motion.g>

        {point && (
          <line x1={x(point.timeS)} y1={14} x2={x(point.timeS)} y2={DIAMOND_Y} stroke="var(--brass)" strokeWidth="1" />
        )}

        <g fill="var(--faint)" className="hidden font-mono text-[11px] md:block" style={labelStyle}>
          {axis(k == null ? 70 : 70 * k).map((l) => (
            <text key={`${l.x}-${l.text}`} x={l.x} y={300} textAnchor="middle">
              {l.text}
            </text>
          ))}
        </g>
        <g fill="var(--faint)" className="font-mono text-[22px] md:hidden" style={labelStyle}>
          {axis(k == null ? 150 : 64 * k).map((l, i, all) => (
            <text key={`${l.x}-${l.text}`} x={l.x} y={308} textAnchor={i === 0 ? "start" : i === all.length - 1 ? "end" : "middle"}>
              {l.text.split(" · ")[0]}
            </text>
          ))}
        </g>
      </svg>

      {point && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 flex -translate-x-1/2 flex-col gap-0.5 border border-line-strong bg-ink px-2.5 py-1.5 font-mono text-[11px] whitespace-nowrap"
          style={{ left: `clamp(60px, ${(x(point.timeS) / W) * 100}%, calc(100% - 60px))` }}
        >
          <span className="text-muted-foreground">{formatDuration(point.timeS)}</span>
          <span className={cn(point.lead === 0 ? "text-fg" : TEAMS[point.lead > 0 ? KING : MOTHER].textClass)}>{leadText(point.lead)}</span>
        </div>
      )}
      <p aria-live="polite" className="sr-only">
        {point ? `${formatDuration(point.timeS)}: ${leadText(point.lead)}` : ""}
      </p>
    </div>
  );
}
