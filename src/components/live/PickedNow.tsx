"use client";

import { AnimatePresence, motion } from "motion/react";
import { HeroTile } from "@/components/ui/HeroTile";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { formatInt } from "@/lib/format";
import { pickCounts, type LiveHero, type LiveMatchView } from "@/lib/deadlock/live-view";

/** Most-picked heroes across the filtered live matches. Tablet and desktop only, as in the designs. */
export function PickedNow({ matches, heroes }: { matches: LiveMatchView[]; heroes: Record<number, LiveHero> }) {
  const picks = pickCounts(matches);
  const max = picks[0]?.count ?? 1;
  const top = picks[0] ? heroes[picks[0].heroId]?.name : null;

  return (
    <section aria-labelledby="picks-title" className="flex flex-col gap-3 border border-line bg-surface p-[22px] xl:gap-4 xl:px-[26px] xl:py-6">
      <SectionHeader
        title="Picked right now"
        id="picks-title"
        caption={`Heroes in the ${formatInt(matches.length)} live ${matches.length === 1 ? "game" : "games"}`}
      />
      {picks.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">No live games to count.</p>
      ) : (
        <ul
          role="img"
          aria-label={`${top} is in the most live games right now (${max}).`}
          className="grid grid-cols-2 gap-x-7 xl:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] xl:gap-x-8"
        >
          <AnimatePresence initial={false} mode="popLayout">
            {picks.map((p) => (
              <motion.li
                key={p.heroId}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-[128px_minmax(0,1fr)_48px] items-center gap-2.5 border-t border-rule py-2 text-[13px] xl:grid-cols-[140px_minmax(0,1fr)_52px] xl:gap-3 xl:text-sm"
              >
                <span className="flex min-w-0 items-center gap-2 xl:gap-2.5">
                  <HeroTile name={heroes[p.heroId]?.name ?? `Hero ${p.heroId}`} iconUrl={heroes[p.heroId]?.iconUrl ?? null} size={26} className="xl:[--tile:28px]" />
                  <span className="truncate">{heroes[p.heroId]?.name ?? `Hero ${p.heroId}`}</span>
                </span>
                <div className="h-1.5 bg-rule">
                  <motion.div
                    className="h-full w-full origin-left bg-brass"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: p.count / max }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <span className="text-right font-mono text-fg-2">{formatInt(p.count)}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}
