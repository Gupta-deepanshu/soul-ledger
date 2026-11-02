"use client";

import { Suspense, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StampButton } from "@/components/ui/buttons";
import { HeroBackground } from "@/components/ui/HeroBackground";
import { reportStatus } from "@/app/matches/[id]/actions";
import type { LiveDraft, LiveLineups as LiveLineupsData } from "@/lib/deadlock/live-match";
import type { LiveMatchSnapshot, LiveMatchView } from "@/lib/deadlock/live-view";
import type { Settled } from "@/lib/deadlock/settle";
import { DraftMatchup, DraftMatchupSkeleton } from "./DraftMatchup";
import { FeaturedMatch } from "./FeaturedMatch";
import { LiveDot, NowProvider, SnapshotAge, useLivePoll } from "./live-client";
import { LiveLineups, LiveLineupsSkeleton } from "./LiveLineups";
import { LiveLog } from "./LiveLog";
import { StillStandingPips } from "./StillStanding";

type LiveMatchSummaryProps = {
  matchId: number;
  initial: LiveMatchSnapshot & { match: LiveMatchView };
  /** Streamed from the server; each settles on its own so one failure doesn't hide the other. */
  lineups: Promise<Settled<LiveLineupsData>>;
  draft: Promise<Settled<LiveDraft>>;
};

/** "Match finished" with a button that opens the report once the API has processed it. */
function FinishedBanner({ matchId }: { matchId: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  function open() {
    startTransition(async () => {
      const status = await reportStatus(matchId);
      if (status === "ready") router.refresh();
      else setNote(status === "pending" ? "Report not ready yet. Try again in a minute." : "Couldn't check for the report. Try again.");
    });
  }

  return (
    <div role="status" className="flex flex-col gap-3 border border-brass bg-surface p-4 md:flex-row md:items-center md:justify-between md:p-[22px]">
      <div className="flex flex-col gap-1">
        <p className="font-serif text-[26px] leading-none md:text-[30px]">
          Match <span className="italic text-brass">finished.</span>
        </p>
        <p className="text-[13px] text-fg-2">{note ?? "Showing the last update below. The full report takes a few minutes to process."}</p>
      </div>
      <StampButton onClick={open} loading={pending} className="md:shrink-0">
        Open full report
      </StampButton>
    </div>
  );
}

/**
 * /matches/[id] while the match is still being played: souls, lead, lineups with
 * players, the draft matchup, objectives and a live log, refreshed every 30 s.
 * When the match drops out of the live list, the last update stays on screen
 * under a "Match finished" banner.
 */
export function LiveMatchSummary({ matchId, initial, lineups, draft }: LiveMatchSummaryProps) {
  const { data, error } = useLivePoll<LiveMatchSnapshot>(`/api/live?match=${matchId}`, initial);
  const snapshot = data ?? initial;

  // Keep the last live view once the match has ended (adjusting state during render).
  const [last, setLast] = useState<LiveMatchView>(initial.match);
  if (snapshot.match && snapshot.match !== last) setLast(snapshot.match);
  const ended = snapshot.match == null;
  const match = snapshot.match ?? last;

  return (
    <NowProvider initial={snapshot.fetchedAt}>
      <section className="relative flex flex-col gap-3 border-b border-line pt-[22px] pb-5 md:gap-4 md:pt-6 md:pb-7 xl:pt-14 xl:pb-10">
        <HeroBackground className="absolute top-0 -right-5 h-full w-60 md:-right-[60px] md:w-[460px] xl:-right-10 xl:w-[640px]" />
        <div className="relative flex items-start justify-between gap-3">
          <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-2 md:text-[11px] xl:text-xs">
            {!ended && <LiveDot />}
            Match {matchId} · {ended ? "ended" : "in progress · updates about every 2 minutes"}
          </p>
          <CopyButton text={String(matchId)} label="Copy match ID" look="icon" className="-mt-2.5 md:hidden" />
        </div>
        <div className="relative flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <h1 className="font-serif text-[44px] leading-[0.95] tracking-[-0.02em] md:text-[64px] xl:text-[76px]">
            Match <span className="italic text-brass">{ended ? "over." : "in progress."}</span>
          </h1>
          <CopyButton text={String(matchId)} label="Copy match ID" className="hidden md:block" />
        </div>
        <p className="relative text-[15px] text-fg-2 md:text-base xl:text-[17px]">
          {ended ? "This match has ended." : "Full report when the match ends."}
          <span className="hidden md:inline"> Copy the match ID to spectate it in-game.</span>
        </p>
      </section>

      {error && (
        <p role="status" className="mt-3 font-mono text-xs text-muted-foreground">
          Couldn&apos;t refresh · showing data from <SnapshotAge fetchedAt={snapshot.fetchedAt} />
        </p>
      )}

      <div className="mt-4 flex flex-col gap-4 md:mt-5 md:gap-5 xl:mt-8">
        {ended && <FinishedBanner matchId={matchId} />}

        <FeaturedMatch match={match} heroes={snapshot.heroes} variant="summary" />

        <Suspense fallback={<LiveLineupsSkeleton />}>
          <LiveLineups lineups={lineups} index={1} />
        </Suspense>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Suspense fallback={<DraftMatchupSkeleton />}>
            <DraftMatchup draft={draft} index={2} />
          </Suspense>
          <Card index={3} aria-labelledby="standing-title" className="self-start">
            <SectionHeader numeral="III." title="Still standing" id="standing-title" caption="Objectives each side has left" />
            <StillStandingPips match={match} teamHeaders />
          </Card>
        </div>

        <LiveLog match={ended ? null : match} fetchedAt={snapshot.fetchedAt} dataAt={snapshot.dataAt} index={4} />
      </div>
    </NowProvider>
  );
}
