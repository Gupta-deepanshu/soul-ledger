"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { SampleBadge } from "@/components/ui/SampleBadge";
import { SectionError } from "@/components/ui/SectionError";
import { BracketButton, Segmented } from "@/components/ui/buttons";
import { formatInt } from "@/lib/format";
import {
  REGIONS,
  TOP_RANKED_TIER,
  filterLive,
  sortLive,
  type LiveBoardData,
} from "@/lib/deadlock/live-view";
import { FeaturedMatch } from "./FeaturedMatch";
import { LiveMatchCard, LiveMatchRow } from "./LiveMatchCard";
import { NowProvider, SnapshotAge, useLivePoll } from "./live-client";
import { PickedNow } from "./PickedNow";
import { HeroBackground } from "@/components/ui/HeroBackground";
import { InkTitle } from "@/components/ui/InkTitle";

const PAGE = 12;
const REGION_OPTIONS = [{ value: "all", label: "All regions" }, ...REGIONS];

/** Updates the query string without a server round-trip (filtering happens here, in the browser). */
function setParam(key: string, value: string | null) {
  const params = new URLSearchParams(window.location.search);
  if (value == null) params.delete(key);
  else params.set(key, value);
  const query = params.toString();
  window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
}

export function LiveBoard({ initial, sample }: { initial: LiveBoardData | null; sample: boolean }) {
  const searchParams = useSearchParams();
  const { data, error, mutate } = useLivePoll<LiveBoardData>("/api/live", initial);
  const [shown, setShown] = useState(PAGE);

  const rankOptions = data?.rankOptions ?? [{ value: "all", label: "All ranks" }];
  const rankParam = searchParams.get("rank");
  const rank = rankOptions.some((o) => o.value === rankParam) ? rankParam! : "all";
  const regionParam = searchParams.get("region");
  const region = REGIONS.some((r) => r.value === regionParam) ? regionParam! : "all";
  const minTier = rank === "all" ? null : Number(rank);

  const matches = data ? sortLive(filterLive(data.matches, minTier, region === "all" ? null : region)) : [];
  const [featured, ...rest] = matches;
  const visible = rest.slice(0, shown);
  const count = formatInt(matches.length);

  return (
    <NowProvider initial={data?.fetchedAt ?? initial?.fetchedAt ?? 0}>
      <section className="relative flex flex-col gap-3.5 pt-[18px] md:border-b md:border-line md:pt-6 md:pb-[26px] xl:flex-row xl:flex-wrap xl:items-end xl:justify-between xl:gap-8 xl:pt-[52px] xl:pb-9">
        <HeroBackground desktopOnly className="absolute top-0 h-full md:-right-[60px] md:w-[460px] xl:-right-10 xl:w-[640px]" />
        <div className="relative flex max-w-[720px] flex-col gap-3.5 xl:gap-4">
          <p className="hidden font-mono text-[11px] uppercase tracking-[0.12em] text-fg-2 md:block xl:text-xs">
            Refreshed every 30 seconds · top 200 from the in-game watch tab
          </p>
          <div className="flex items-baseline justify-between gap-3 md:hidden">
            <InkTitle
              className="font-serif text-[44px] leading-none"
              parts={["Live ", { text: "now", className: "italic text-brass" }]}
            />
            <span className="font-mono text-[11px] text-fg-2">{data ? `${count} IN PROGRESS` : ""}</span>
          </div>
          <InkTitle
            className="hidden font-serif leading-[0.95] tracking-[-0.02em] md:block md:text-[64px] xl:text-[84px]"
            parts={["Matches ", { text: "in progress.", className: "italic text-brass" }]}
          />
          {data && (
            <p className="hidden text-[17px] text-fg-2 xl:block">
              {count} {matches.length === 1 ? "game" : "games"} underway. Sorted by average rank, highest first.
            </p>
          )}
        </div>

        <div className="relative flex flex-wrap items-center gap-2.5">
          {data && (
            <span className="hidden flex-1 text-[15px] text-fg-2 md:inline xl:hidden">
              {count} games · highest rank first
            </span>
          )}
          <div className="hidden gap-2.5 md:flex">
            <FilterSelect
              id="live-rank"
              label="Rank"
              options={rankOptions}
              value={rank}
              onChange={(v) => setParam("rank", v === "all" ? null : v)}
            />
            <FilterSelect
              id="live-region"
              label="Region"
              options={REGION_OPTIONS}
              value={region}
              onChange={(v) => setParam("region", v === "all" ? null : v)}
            />
          </div>
          <div className="flex gap-1.5 md:hidden">
            <Segmented
              label="Filter"
              layoutId="live-chip"
              options={[
                { label: "Top ranked", value: String(TOP_RANKED_TIER) },
                { label: "All", value: "all" },
              ]}
              value={rank === String(TOP_RANKED_TIER) ? rank : "all"}
              onChange={(v) => setParam("rank", v === "all" ? null : v)}
              className="gap-1.5"
            />
            {sample && <SampleBadge className="self-center" />}
          </div>
        </div>
      </section>

      {error && data && (
        <p role="status" className="mt-3 font-mono text-xs text-muted-foreground">
          Couldn&apos;t refresh · showing data from <SnapshotAge fetchedAt={data.fetchedAt} />
        </p>
      )}

      {!data ? (
        error ? (
          <div className="mt-3.5 border border-line bg-surface p-4 md:mt-5 md:p-[22px] xl:mt-8">
            <SectionError failure={error.failure} onRetry={() => void mutate()} />
          </div>
        ) : (
          <LiveSkeleton />
        )
      ) : !featured ? (
        <div className="mt-3.5 flex flex-col items-start gap-3 border border-line bg-surface p-4 md:mt-5 md:p-[22px] xl:mt-8">
          <p className="text-sm text-fg-2">
            {data.matches.length === 0
              ? "No live matches right now. This list refreshes every 30 seconds."
              : "No live matches at this rank in this region right now."}
          </p>
          {data.matches.length > 0 && (
            <BracketButton
              onClick={() => {
                setParam("rank", null);
                setParam("region", null);
              }}
            >
              Show all matches
            </BracketButton>
          )}
        </div>
      ) : (
        <>
          <div className="mt-3.5 md:mt-5 xl:mt-8">
            <FeaturedMatch match={featured} heroes={data.heroes} variant="featured" />
          </div>

          {/* Tablet/desktop: card grid */}
          <motion.ul
            layout
            className="mt-5 hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-[repeat(auto-fill,minmax(380px,1fr))] xl:gap-5"
          >
            <AnimatePresence initial={false} mode="popLayout">
              {visible.map((m) => (
                <motion.li
                  key={m.id}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <LiveMatchCard match={m} heroes={data.heroes} />
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>

          {/* Phone: compact rows */}
          <ul className="mt-3.5 flex flex-col md:hidden">
            <AnimatePresence initial={false} mode="popLayout">
              {visible.map((m) => (
                <motion.li key={m.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <LiveMatchRow match={m} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          {rest.length > shown && (
            <BracketButton onClick={() => setShown((n) => n + PAGE)} className="mt-4 w-full md:mt-5 md:w-auto md:self-start">
              Show more matches ({formatInt(rest.length - shown)} left)
            </BracketButton>
          )}

          <div className="mt-5 hidden md:block">
            <PickedNow matches={matches} heroes={data.heroes} />
          </div>
        </>
      )}
    </NowProvider>
  );
}

/** Static placeholder in the board's shape (no looping animation). */
export function LiveSkeleton() {
  return (
    <div aria-busy="true" className="mt-3.5 flex flex-col gap-5 md:mt-5 xl:mt-8">
      <span className="sr-only">Loading live matches…</span>
      <div className="h-[220px] border border-line-strong bg-surface md:h-[360px] xl:h-[330px]" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-5">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-16 border border-line bg-surface md:h-[150px]" />
        ))}
      </div>
    </div>
  );
}
