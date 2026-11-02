"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { formatPercent, formatSigned } from "@/lib/format";
import { ChartTooltip, Muted } from "@/components/charts/ChartTooltip";
import type { Mover } from "@/lib/deadlock/meta";

function MoverList({ title, movers, up }: { title: string; movers: Mover[]; up: boolean }) {
  // Tablet/desktop: hovering a hero shows last patch → this patch win rate.
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div className="flex flex-col">
      <span className="pb-1.5 font-mono text-[10px] tracking-[0.08em] text-muted-foreground md:text-[11px] xl:pb-2">
        <motion.span
          aria-hidden="true"
          className="inline-block"
          initial={{ y: 0 }}
          animate={{ y: [0, up ? -2 : 2, 0] }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          {up ? "▲" : "▼"}
        </motion.span>{" "}
        {title}
      </span>
      {movers.length === 0 ? (
        <span className="border-t border-rule py-2 text-[13px] text-muted-foreground">None</span>
      ) : (
        <ul>
          {movers.map((m) => (
            <li
              key={m.heroId}
              onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(m.heroId)}
              onPointerLeave={() => setHovered(null)}
              className={cn(
                "relative flex justify-between gap-2 border-t border-rule py-2 text-[13px] transition-colors md:text-sm xl:py-2.5",
                hovered === m.heroId && "bg-surface-2",
              )}
            >
              <span className="truncate">{m.name}</span>
              <span className={up ? "font-mono text-brass" : "font-mono text-mother-text"}>
                {formatSigned(m.delta)}
                <span className="sr-only">
                  {" "}
                  points: {formatPercent(m.winRate - m.delta / 100)} last patch, {formatPercent(m.winRate)} now
                </span>
              </span>
              {hovered === m.heroId && (
                <ChartTooltip x={up ? 0 : 100}>
                  <span className="text-fg">{m.name}</span>
                  <span>
                    <Muted>{formatPercent(m.winRate - m.delta / 100)} last patch → </Muted>
                    <span className={up ? "text-brass" : "text-mother-text"}>{formatPercent(m.winRate)} now</span>
                  </span>
                </ChartTooltip>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Rising and falling heroes. Side by side on desktop and phone, stacked on tablet (per the designs). */
export function Movers({ rising, falling }: { rising: Mover[]; falling: Mover[] }) {
  return (
    <div className="grid grid-cols-2 gap-3.5 md:grid-cols-1 md:gap-1.5 xl:grid-cols-2 xl:gap-5">
      <MoverList title="RISING" movers={rising} up />
      <MoverList title="FALLING" movers={falling} up={false} />
    </div>
  );
}
