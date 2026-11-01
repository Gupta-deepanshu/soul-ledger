"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { SectionError } from "@/components/ui/SectionError";
import type { LiveMatchSnapshot } from "@/lib/deadlock/live-view";
import { FeaturedMatch } from "./FeaturedMatch";
import { LiveDot, NowProvider, SnapshotAge, useLivePoll } from "./live-client";
import { HeroBackground } from "@/components/ui/HeroBackground";

/**
 * /matches/[id] while the match is still being played: souls, lead, lineups and
 * objectives, refreshed every 30 s. When the match drops out of the live list,
 * it offers to load the full report.
 */
export function LiveMatchSummary({ matchId, initial }: { matchId: number; initial: LiveMatchSnapshot }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { data, error, mutate } = useLivePoll<LiveMatchSnapshot>(`/api/live?match=${matchId}`, initial);
  const snapshot = data ?? initial;
  const match = snapshot.match;

  return (
    <NowProvider initial={snapshot.fetchedAt}>
      <section className="relative flex flex-col gap-3 overflow-hidden border-b border-line pt-[22px] pb-5 md:gap-4 md:pt-6 md:pb-7 xl:pt-14 xl:pb-10">
        <HeroBackground className="absolute top-0 -right-5 h-full w-60 md:-right-[60px] md:w-[460px] xl:-right-10 xl:w-[640px]" />
        <p className="relative flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-2 md:text-[11px] xl:text-xs">
          {match && <LiveDot />}
          Match {matchId} · {match ? "in progress · refreshed every 30 seconds" : "ended"}
        </p>
        <h1 className="relative font-serif text-[44px] leading-[0.95] tracking-[-0.02em] md:text-[64px] xl:text-[76px]">
          Match <span className="italic text-brass">{match ? "in progress." : "over."}</span>
        </h1>
        <p className="relative text-[15px] text-fg-2 md:text-base xl:text-[17px]">
          {match ? "Full report when the match ends." : "This match has ended. Its full report appears once the match data is processed."}
        </p>
      </section>

      {error && (
        <p role="status" className="mt-3 font-mono text-xs text-muted-foreground">
          Couldn&apos;t refresh · showing data from <SnapshotAge fetchedAt={snapshot.fetchedAt} />
        </p>
      )}

      <div className="mt-4 md:mt-5 xl:mt-8">
        {match ? (
          <FeaturedMatch match={match} heroes={snapshot.heroes} variant="summary" />
        ) : error && !data ? (
          <div className="border border-line bg-surface p-4 md:p-[22px]">
            <SectionError failure={error.failure} onRetry={() => void mutate()} />
          </div>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => router.refresh())}
            className="h-11 border border-line-strong px-4 text-sm font-medium text-brass hover:border-line-muted disabled:opacity-60"
          >
            {pending ? "Loading…" : "Load the report"}
          </button>
        )}
      </div>
    </NowProvider>
  );
}
