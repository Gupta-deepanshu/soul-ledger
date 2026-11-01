"use client";

import { useId, useRef } from "react";
import { formatCompact, formatDuration } from "@/lib/format";
import { KING, MOTHER, TEAMS } from "@/lib/deadlock/teams";
import type { LogPoint } from "@/lib/deadlock/live-log";
import { useViewBoxScale } from "./useViewBoxScale";

const W = 600;
const H = 150;
// Room above and below the plot for labels up to ~18 units tall (11 px on a phone).
const PLOT = { left: 8, right: W - 8, top: 24, bottom: H - 24 };
const MID = (PLOT.top + PLOT.bottom) / 2;
/** Scale steps for the lead axis, in souls. */
const STEPS = [1_000, 2_000, 5_000, 10_000, 20_000, 40_000];

function leadLabel(lead: number): string {
  if (lead === 0) return "level";
  return `${TEAMS[lead > 0 ? KING : MOTHER].shortName} +${formatCompact(Math.abs(lead))}`;
}

function describe(points: LogPoint[]): string {
  const last = points.at(-1);
  if (!last) return "No souls data yet.";
  const first = points[0];
  if (points.length === 1) return `Souls lead at ${formatDuration(last.t)}: ${leadLabel(last.lead)}.`;
  return `Souls lead since you started watching: ${leadLabel(first.lead)} at ${formatDuration(first.t)}, ${leadLabel(last.lead)} at ${formatDuration(last.t)}.`;
}

/**
 * The souls lead at each poll since the page was opened. Same encoding as the
 * match report's SoulsLeadChart (King above zero, Archmother below), smaller.
 * Real poll points only, joined by straight lines; no interpolation.
 */
export function LeadSparkline({ points }: { points: LogPoint[] }) {
  const ref = useRef<SVGSVGElement>(null);
  const scale = useViewBoxScale(ref, W) ?? 1;
  const clip = useId();

  const maxAbs = Math.max(...points.map((p) => Math.abs(p.lead)), 1);
  const range = STEPS.find((s) => s >= maxAbs) ?? Math.ceil(maxAbs / 10_000) * 10_000;
  const t0 = points[0]?.t ?? 0;
  const t1 = Math.max(points.at(-1)?.t ?? 0, t0 + 60);
  const x = (t: number) => PLOT.left + ((t - t0) / (t1 - t0)) * (PLOT.right - PLOT.left);
  const y = (lead: number) => MID - (lead / range) * (MID - PLOT.top);

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.lead).toFixed(1)}`).join(" ");
  const area = points.length > 1 ? `${line} L${x(points.at(-1)!.t).toFixed(1)},${MID} L${x(t0).toFixed(1)},${MID} Z` : "";
  const label = 11 * scale;

  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={describe(points)} className="h-auto w-full">
      <defs>
        <clipPath id={`${clip}-up`}>
          <rect x={0} y={0} width={W} height={MID} />
        </clipPath>
        <clipPath id={`${clip}-down`}>
          <rect x={0} y={MID} width={W} height={H - MID} />
        </clipPath>
      </defs>
      <line x1={PLOT.left} x2={PLOT.right} y1={PLOT.top} y2={PLOT.top} stroke="var(--line)" />
      <line x1={PLOT.left} x2={PLOT.right} y1={PLOT.bottom} y2={PLOT.bottom} stroke="var(--line)" />
      <line x1={PLOT.left} x2={PLOT.right} y1={MID} y2={MID} stroke="var(--tick)" />
      {area && (
        <>
          <path d={area} fill="var(--king)" fillOpacity={0.28} clipPath={`url(#${clip}-up)`} />
          <path d={area} fill="var(--mother)" fillOpacity={0.32} clipPath={`url(#${clip}-down)`} />
        </>
      )}
      {/* Line and dots keep the same on-screen size at every width (1.6 px line, 5 px dots). */}
      {points.length > 1 && <path d={line} fill="none" stroke="var(--fg)" strokeWidth={1.6 * scale} strokeLinejoin="round" />}
      {points.map((p) => (
        <circle key={p.t} cx={x(p.t)} cy={y(p.lead)} r={2.5 * scale} fill="var(--fg)" />
      ))}
      {/* Scale labels above the top line (King) and below the bottom line (Archmother); times under it, right. */}
      <g fill="var(--faint)" className="font-mono" style={{ fontSize: label }}>
        <text x={PLOT.left} y={PLOT.top - 6}>
          {TEAMS[KING].shortName} +{formatCompact(range)}
        </text>
        <text x={PLOT.left} y={PLOT.bottom + label}>
          {TEAMS[MOTHER].shortName} +{formatCompact(range)}
        </text>
        {points.length > 0 && (
          <text x={PLOT.right} y={PLOT.bottom + label} textAnchor="end">
            {points.length > 1 ? `${formatDuration(t0)} → ${formatDuration(points.at(-1)!.t)}` : formatDuration(t0)}
          </text>
        )}
      </g>
    </svg>
  );
}
