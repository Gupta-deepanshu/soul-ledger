"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ItemChip, SLOT_STYLES } from "@/components/ui/ItemChip";
import { TickMeter } from "@/components/ui/TickMeter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatInt, formatPercent, formatSigned } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ItemRow } from "@/lib/deadlock/meta";
import type { ItemSlot } from "@/lib/deadlock/types";

const SLOTS: ItemSlot[] = ["weapon", "vitality", "spirit"];

// Beats the shadcn trigger's own `dark:data-active:text-foreground`.
const ACTIVE_TEXT: Record<ItemSlot, string> = {
  weapon: "dark:data-active:text-weapon-text",
  vitality: "dark:data-active:text-vitality",
  spirit: "dark:data-active:text-spirit",
};

export function ItemsThatWin({ rows, index }: { rows: Record<ItemSlot, ItemRow[]>; index?: number }) {
  const [slot, setSlot] = useState<ItemSlot>("weapon");

  return (
    <Card index={index} aria-labelledby="items-title">
      <Tabs value={slot} onValueChange={(v) => setSlot(v as ItemSlot)} className="gap-2.5 md:gap-3.5 xl:gap-4">
        <SectionHeader
          numeral="IV."
          title="Items that win"
          id="items-title"
          className="max-md:flex-col max-md:items-stretch"
          caption={
            <>
              <span className="hidden xl:inline">Win rate vs items of the same cost · ticks run −6 → +6 pts</span>
              <span className="xl:hidden">Vs same-cost items · −6 → +6 pts</span>
            </>
          }
          action={
            <TabsList
              variant="line"
              aria-label="Item category"
              className="grid h-auto w-full grid-cols-3 gap-1 p-0 md:flex md:w-auto"
            >
              {SLOTS.map((s) => (
                <TabsTrigger
                  key={s}
                  value={s}
                  className={cn(
                    "relative h-11 flex-none rounded-none border border-line-strong px-3 text-[13px] font-medium text-muted-foreground after:hidden xl:h-10 xl:px-3.5",
                    "data-active:border-transparent data-active:bg-transparent dark:data-active:border-transparent dark:data-active:bg-transparent",
                    ACTIVE_TEXT[s],
                  )}
                >
                  {slot === s && (
                    <motion.span
                      layoutId="item-slot-highlight"
                      aria-hidden="true"
                      className={cn("absolute -inset-px border", SLOT_STYLES[s].fill)}
                    />
                  )}
                  <span className="relative">{SLOT_STYLES[s].label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          }
        />
        {SLOTS.map((s) => (
          <TabsContent key={s} value={s} className="flex flex-col text-base">
            {rows[s].length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">Not enough purchases at this rank yet.</p>
            ) : (
              <AnimatePresence mode="popLayout">
                {rows[s].map((item) => (
                  <motion.div
                    key={item.itemId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-t border-rule py-2.5 md:grid-cols-[minmax(0,1fr)_240px_56px] md:gap-4 xl:grid-cols-[minmax(0,1fr)_210px_56px] xl:py-3"
                  >
                    <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-2.5 md:col-auto md:row-auto md:gap-3">
                      <ItemChip slot={item.slot} tier={item.tier} imageUrl={item.imageUrl} name={item.name} />
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-sm">{item.name}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {item.cost != null && `${formatInt(item.cost)} souls · `}
                          {formatPercent(item.winRate)} win · {formatPercent(item.buyShare, 0)} buy
                        </span>
                      </div>
                    </div>
                    {/* The meter's 44–56 range is centred on 50, so 0.5 + lift reads as −6 → +6 points. */}
                    <TickMeter winRate={0.5 + item.lift} className="col-span-2 row-start-2 md:order-2 md:col-span-1 md:row-auto" />
                    <span
                      className={cn(
                        "col-start-2 row-start-1 text-right font-mono text-sm md:order-3 md:col-auto md:row-auto md:text-[15px]",
                        item.lift < 0 && "text-mother-text",
                      )}
                    >
                      {formatSigned(item.lift * 100)}
                      <span className="sr-only"> points vs items of the same cost</span>
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  );
}
