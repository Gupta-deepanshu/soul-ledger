import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { LiveMatchSummary } from "@/components/live/LiveMatchSummary";
import { MatchReportView } from "@/components/match/MatchReportView";
import { SectionError } from "@/components/ui/SectionError";
import { getHeroes, getItems, getMatchReport, getPlayerNames, getRanks } from "@/lib/deadlock/api";
import { isSampleData, type ApiFailure } from "@/lib/deadlock/client";
import { getActiveMatch, getLiveBoard, getLiveDraft, getLiveLineups } from "@/lib/deadlock/live";
import { buildMatchView } from "@/lib/deadlock/match";
import { settle } from "@/lib/deadlock/settle";
import { formatInt } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/matches/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: /^\d+$/.test(id) ? `Match ${formatInt(Number(id))}` : "Match" };
}

export default function MatchPage({ params }: PageProps<"/matches/[id]">) {
  return (
    <Suspense fallback={<MatchSkeleton />}>
      <MatchContent params={params} />
    </Suspense>
  );
}

async function MatchContent({ params }: { params: PageProps<"/matches/[id]">["params"] }) {
  const { id } = await params;
  const matchId = Number(id);
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(matchId)) notFound();
  await connection();

  // 1. Still being played? Show the live summary. Checked first: it's cached for
  //    30 s, while a metadata 404 for an unfinished match isn't cached at all.
  const board = await settle(getLiveBoard());
  const live = board.ok ? board.data.matches.find((m) => m.id === matchId) : undefined;
  if (board.ok && live) {
    // Player rows and the draft stream in after the souls card (not awaited here).
    const raw = getActiveMatch(matchId);
    const lineups = settle(raw.then((m) => (m ? getLiveLineups(m) : Promise.reject(new Error(`Match ${matchId} left the live list`)))));
    const draft = settle(getLiveDraft(live.heroes));
    return (
      <LiveMatchSummary
        matchId={matchId}
        initial={{ fetchedAt: board.data.fetchedAt, match: live, heroes: board.data.heroes }}
        lineups={lineups}
        draft={draft}
      />
    );
  }

  // 2. Finished: the full report (metadata cached 7 days).
  const report = await settle(getMatchReport(matchId));
  if (!report.ok) {
    return report.failure?.kind === "not-found" ? <MatchNotFound id={matchId} /> : <MatchError id={matchId} failure={report.failure} />;
  }
  const assets = await settle(Promise.all([getHeroes(), getItems(), getRanks()]));
  if (!assets.ok) return <MatchError id={matchId} failure={assets.failure} />;

  // Names are a nice-to-have: without them the report shows "Anonymous".
  const accountIds = report.data.players.map((p) => p.accountId).sort((a, b) => a - b);
  const names = await settle(getPlayerNames(accountIds));

  const [heroes, items, ranks] = assets.data;
  const view = buildMatchView(report.data, heroes, items, ranks, names.ok ? names.data : {});
  return <MatchReportView view={view} sample={isSampleData()} />;
}

function MatchMessage({ id, title, children }: { id: number; title: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col items-start gap-3.5 py-8 md:py-10">
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Match № {formatInt(id)}</p>
      <h1 className="font-serif text-[44px] leading-[0.95] tracking-[-0.02em] md:text-[60px]">{title}</h1>
      {children}
    </section>
  );
}

function MatchNotFound({ id }: { id: number }) {
  return (
    <MatchMessage id={id} title={<>Match <span className="italic text-brass">not found.</span></>}>
      <p className="max-w-[560px] text-fg-2">
        There&apos;s no report for this match. It may still be processing after it ended, or the ID may be wrong.
      </p>
      <Link href="/live" className="flex h-11 items-center border border-line-strong px-4 text-sm font-medium text-brass hover:border-line-muted">
        See live matches
      </Link>
    </MatchMessage>
  );
}

function MatchError({ id, failure }: { id: number; failure: ApiFailure | null }) {
  return (
    <MatchMessage id={id} title={<>Match <span className="italic text-brass">report.</span></>}>
      <SectionError failure={failure} />
    </MatchMessage>
  );
}

function MatchSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-5 pt-6">
      <span className="sr-only">Loading match…</span>
      <div className="h-40 border-b border-line" />
      <div className="h-[300px] border border-line bg-surface" />
      <div className="grid gap-5 xl:grid-cols-[1fr_2fr]">
        <div className="h-[420px] border border-line bg-surface" />
        <div className="h-[420px] border border-line bg-surface" />
      </div>
    </div>
  );
}
