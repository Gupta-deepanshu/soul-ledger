"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { ItemChip, SLOT_STYLES } from "@/components/ui/ItemChip";
import { formatDuration } from "@/lib/format";
import type { PlayerBuild } from "@/lib/deadlock/match";
import type { ItemSlot } from "@/lib/deadlock/types";

/** One player's purchases in time order; items later sold stay, dimmed, with their sell time. */
export function BuildOrder({ builds, defaultBuild, index }: { builds: PlayerBuild[]; defaultBuild: number | null; index?: number }) {
  const [selected, setSelected] = useState(String(defaultBuild ?? builds[0]?.accountId ?? ""));
  const build = builds.find((b) => String(b.accountId) === selected) ?? builds[0];

  return (
    <Card index={index} aria-labelledby="build-title">
      <SectionHeader
        numeral="V."
        title="Build order"
        id="build-title"
        className="max-md:flex-col max-md:items-stretch"
        caption={build && <span className="hidden md:inline">{build.label} · items by purchase time</span>}
        action={
          builds.length > 0 && (
            <FilterSelect
              id="build-for"
              label="Show build for"
              options={builds.map((b) => ({ value: String(b.accountId), label: b.label }))}
              value={selected}
              onChange={setSelected}
            />
          )
        }
      />
      {!build || build.items.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">No item purchases recorded for this player.</p>
      ) : (
        <ol className="grid grid-cols-2 gap-x-3 md:grid-cols-3 md:gap-x-4 xl:grid-cols-[repeat(auto-fill,minmax(150px,1fr))]">
          <AnimatePresence mode="popLayout" initial={false}>
            {build.items.map((item, i) => (
              <motion.li
                key={`${build.accountId}-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-2 border-t border-rule py-2 md:grid-cols-[30px_minmax(0,1fr)] md:gap-2.5 md:py-2.5"
              >
                {/* Sold items: only the chip is dimmed, so the text keeps 4.5:1. */}
                <ItemChip slot={item.slot} tier={item.tier} className={item.soldAtS != null ? "opacity-50" : undefined} />
                <span className="flex min-w-0 flex-col gap-px">
                  <span className={cn("truncate text-xs md:text-[13px]", item.soldAtS != null && "text-muted-foreground")}>{item.name}</span>
                  <span className="font-mono text-[10px] text-muted-foreground md:text-[11px]">
                    {formatDuration(item.boughtAtS)}
                    {item.soldAtS != null && ` · sold ${formatDuration(item.soldAtS)}`}
                  </span>
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      )}
      <div className="flex flex-wrap gap-[18px] font-mono text-xs text-muted-foreground">
        {(Object.keys(SLOT_STYLES) as ItemSlot[]).map((slot) => (
          <span key={slot} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={cn("size-3 border", SLOT_STYLES[slot].fill)} />
            {SLOT_STYLES[slot].label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 border border-line-muted opacity-50" />
          Sold later
        </span>
      </div>
    </Card>
  );
}
