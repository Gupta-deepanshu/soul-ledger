"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { formatPercent, formatSigned } from "@/lib/format";
import { ChartTooltip, Muted } from "@/components/charts/ChartTooltip";
import { HeroTile } from "@/components/ui/HeroTile";
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
                "relative flex items-center justify-between gap-2 border-t border-rule py-2 text-[13px] transition-colors md:text-sm xl:py-2.5",
                hovered === m.heroId && "bg-surface-2",
              )}
            >
              <span className="flex min-w-0 items-center gap-2 md:gap-2.5">
                <HeroTile name={m.name} iconUrl={m.iconUrl} size={22} className="md:[--tile:24px]" />
                <span className="truncate">{m.name}</span>
              </span>
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

/** Rising then falling heroes, stacked at every width so full names fit beside the portraits. */
export function Movers({ rising, falling }: { rising: Mover[]; falling: Mover[] }) {
  return (
    <div className="grid grid-cols-1 gap-1.5">
      <MoverList title="RISING" movers={rising} up />
      <MoverList title="FALLING" movers={falling} up={false} />
    </div>
  );
}
