"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { formatKda } from "@/lib/format";
import type { FormPoint } from "@/lib/deadlock/player";

/**
 * Last matches, oldest first: wins grow up in brass, losses down in `mother`,
 * height ∝ KDA (wins scaled to the best win, losses to the best loss).
 */
export function FormBars({ form }: { form: FormPoint[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const wins = form.filter((f) => f.won);
  const maxWin = Math.max(...wins.map((f) => f.kda), 0.1);
  const maxLoss = Math.max(...form.filter((f) => !f.won).map((f) => f.kda), 0.1);
  const avgKda = form.reduce((s, f) => s + f.kda, 0) / Math.max(form.length, 1);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={`${wins.length} wins and ${form.length - wins.length} losses in the last ${form.length} matches; average KDA ${formatKda(avgKda)}.`}
      className="flex flex-col"
    >
      <div className="flex h-[70px] items-end gap-[3px] md:h-20 xl:h-[90px] xl:gap-1">
        {form.map((f, i) => (
          <motion.div
            key={f.matchId}
            className="flex-1 origin-bottom bg-brass"
            style={{ height: f.won ? `${Math.max(4, (f.kda / maxWin) * 100)}%` : 0 }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: inView ? 1 : 0 }}
            transition={{ delay: inView ? i * 0.03 : 0, duration: 0.35 }}
          />
        ))}
      </div>
      <div className="h-px bg-tick" />
      <div className="flex h-[38px] items-start gap-[3px] md:h-11 xl:h-[50px] xl:gap-1">
        {form.map((f, i) => (
          <motion.div
            key={f.matchId}
            className="flex-1 origin-top bg-mother"
            style={{ height: f.won ? 0 : `${Math.max(4, (f.kda / maxLoss) * 100)}%` }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: inView ? 1 : 0 }}
            transition={{ delay: inView ? i * 0.03 : 0, duration: 0.35 }}
          />
        ))}
      </div>
    </div>
  );
}
