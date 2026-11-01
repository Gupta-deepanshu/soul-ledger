import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PlayerProfileView } from "@/components/player/PlayerProfileView";
import { SectionError } from "@/components/ui/SectionError";
import {
  getBadgeDistribution,
  getHeroes,
  getPatchWindows,
  getPlayerEnemyHeroes,
  getPlayerHeroRecords,
  getPlayerHistory,
  getPlayerMates,
  getPlayerNames,
  getPlayerProfiles,
  getPlayerRank,
  getRanks,
  getTierSoulsPerMinute,
} from "@/lib/deadlock/api";
import { isSampleData } from "@/lib/deadlock/client";
import { buildPlayerView, topMates } from "@/lib/deadlock/player";
import { settle } from "@/lib/deadlock/settle";

function parseId(id: string): number | null {
  const n = Number(id);
  return /^\d+$/.test(id) && Number.isSafeInteger(n) && n > 0 ? n : null;
}

export async function generateMetadata({ params }: PageProps<"/players/[id]">): Promise<Metadata> {
  const accountId = parseId((await params).id);
  if (accountId == null) return { title: "Player" };
  const names = await settle(getPlayerNames([accountId]));
  return { title: (names.ok && names.data[accountId]) || "Player" };
}

export default function PlayerPage({ params }: PageProps<"/players/[id]">) {
  return (
    <Suspense fallback={<PlayerSkeleton />}>
      <PlayerContent params={params} />
    </Suspense>
  );
}

async function PlayerContent({ params }: { params: PageProps<"/players/[id]">["params"] }) {
  const accountId = parseId((await params).id);
  if (accountId == null) notFound();
  await connection();

  // The history drives most of the page; everything else is optional.
  const [history, rank, heroRecords, enemyHeroes, mates, heroes, ranks, windows] = await Promise.all([
    settle(getPlayerHistory(accountId)),
    settle(getPlayerRank(accountId)),
    settle(getPlayerHeroRecords(accountId)),
    settle(getPlayerEnemyHeroes(accountId)),
    settle(getPlayerMates(accountId)),
    settle(getHeroes()),
    settle(getRanks()),
    settle(getPatchWindows()),
  ]);
  if (!history.ok) {
    return (
      <section className="flex flex-col gap-3.5 py-8 md:py-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Player {accountId}</p>
        <h1 className="font-serif text-[44px] leading-[0.95] tracking-[-0.02em] md:text-[60px]">
          Player <span className="italic text-brass">profile.</span>
        </h1>
        <SectionError failure={history.failure} />
      </section>
    );
  }

  const badge = rank.ok ? rank.data : null;
  const shownMates = mates.ok ? topMates(mates.data) : [];
  const [names, distribution, tierSpm] = await Promise.all([
    settle(getPlayerProfiles([accountId, ...shownMates.map((m) => m.accountId)].sort((a, b) => a - b))),
    windows.ok && windows.data ? settle(getBadgeDistribution(windows.data.current.since)) : null,
    badge ? settle(getTierSoulsPerMinute(badge.tier)) : null,
  ]);
  const profiles = names.ok ? names.data : {};
  const nameMap: Record<number, string> = {};
  for (const [id, prof] of Object.entries(profiles)) if (prof.name) nameMap[Number(id)] = prof.name;

  const view = buildPlayerView({
    accountId,
    name: nameMap[accountId] ?? null,
    avatarUrl: profiles[accountId]?.avatarUrl ?? null,
    history: history.data,
    rank: badge,
    heroRecords: heroRecords.ok ? heroRecords.data : [],
    enemyHeroes: enemyHeroes.ok ? enemyHeroes.data : [],
    mates: mates.ok ? mates.data : [],
    mateNames: nameMap,
    heroes: heroes.ok ? heroes.data : [],
    ranks: ranks.ok ? ranks.data : [],
    distribution: distribution?.ok ? distribution.data : [],
    tierSoulsPerMin: tierSpm?.ok ? tierSpm.data : null,
  });
  return <PlayerProfileView view={view} sample={isSampleData()} />;
}

function PlayerSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-5 pt-6">
      <span className="sr-only">Loading player…</span>
      <div className="flex items-end gap-6 border-b border-line pb-8">
        <div className="size-[72px] border border-line-muted bg-surface md:size-[100px] xl:size-[120px]" />
        <div className="h-16 w-64 bg-surface" />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="h-[280px] border border-line bg-surface" />
        <div className="h-[280px] border border-line bg-surface" />
      </div>
      <div className="h-[420px] border border-line bg-surface" />
    </div>
  );
}
