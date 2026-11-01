"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import type { ClimbPoint } from "@/lib/deadlock/player";
import { useViewBoxScale } from "./useViewBoxScale";

const W = 800;
const H = 230;
/** Left edge of the plot when the tier labels fit (desktop). */
const X0_MIN = 124;
/** On-screen size of the tier labels, in CSS px. */
const LABEL_PX = 11;
/** Geist Mono advance width per em, rounded up. */
const MONO_EM = 0.62;
const X1 = 784;
const TOP = 14;
const BOTTOM = 210;
const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

/**
 * Rank badge across recent ranked matches: a brass step line over alternating
 * tier bands (the tiers the data passes through, plus one above).
 */
export function RankClimb({ climb, tierNames }: { climb: ClimbPoint[]; tierNames: Record<number, string> }) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true });
  // Size labels to 11 px on screen; widen the label column if they need it.
  const k = useViewBoxScale(ref, W);
  const tierLabel = (tier: number) => (tierNames[tier] ?? `T${tier}`).slice(0, 8);
  const fontSize = k == null ? null : LABEL_PX * k;

  const minTier = Math.min(...climb.map((p) => p.tier));
  const maxTier = Math.min(11, Math.max(...climb.map((p) => p.tier)) + 1);
  const tiers = Array.from({ length: maxTier - minTier + 1 }, (_, i) => minTier + i);
  const steps = tiers.length * 6;
  const y = (step: number) => BOTTOM - ((step - minTier * 6 + 0.5) / steps) * (BOTTOM - TOP);
  const bandH = (BOTTOM - TOP) / tiers.length;
  const longest = Math.max(...tiers.map((tier) => tierLabel(tier).length));
  const X0 = fontSize == null ? X0_MIN : Math.max(X0_MIN, Math.ceil(longest * MONO_EM * fontSize) + 16);
  const x = (i: number) => (climb.length === 1 ? X1 : X0 + (i / (climb.length - 1)) * (X1 - X0));

  let path = `M${x(0).toFixed(1)},${y(climb[0].step).toFixed(1)}`;
  for (let i = 1; i < climb.length; i++) path += ` H${x(i).toFixed(1)} V${y(climb[i].step).toFixed(1)}`;

  const label = (p: ClimbPoint) => `${tierNames[p.tier] ?? `Tier ${p.tier}`} ${ROMAN[p.subrank - 1] ?? p.subrank}`;
  const first = climb[0];
  const last = climb[climb.length - 1];
  const peak = climb.reduce((a, b) => (b.step > a.step ? b : a));
  const summary = `Rank over the last ${climb.length} ranked matches: from ${label(first)} to ${label(last)}${
    peak.step > last.step ? `, peaking at ${label(peak)}` : ""
  }.`;

  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={summary}>
      {tiers.map((tier, i) => {
        const top = BOTTOM - (i + 1) * bandH;
        return (
          <g key={tier}>
            {i % 2 === 0 && <rect x={X0} y={top} width={X1 - X0} height={bandH} fill="var(--surface-2)" />}
            <text
              x={X0 - 10}
              y={top + bandH / 2 + (fontSize == null ? 4 : fontSize * 0.35)}
              textAnchor="end"
              fill="var(--faint)"
              className="font-mono text-[22px] uppercase md:text-[15px]"
              style={fontSize == null ? undefined : { fontSize }}
            >
              {tierLabel(tier)}
            </text>
          </g>
        );
      })}
      <motion.path
        d={path}
        fill="none"
        stroke="var(--brass)"
        strokeLinejoin="round"
        className="[stroke-width:5] md:[stroke-width:2.5]"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: inView ? 1 : 0 }}
        transition={{ duration: 1.2, ease: "linear" }}
      />
      <motion.circle
        cx={x(climb.length - 1)}
        cy={y(last.step)}
        fill="var(--brass)"
        className="[r:10] md:[r:5]"
        initial={{ scale: 0 }}
        animate={{ scale: inView ? 1 : 0 }}
        transition={{ delay: inView ? 1.2 : 0, duration: 0.3 }}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      />
    </svg>
  );
}
