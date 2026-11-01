import { Suspense } from "react";
import { MetaHero } from "@/components/meta/MetaHero";
import {
  CardSkeleton,
  HeroStandingsSection,
  ItemsSection,
  MatchupSection,
  MoversSection,
  PatchTotals,
  PatchTotalsSkeleton,
  RankDistributionSection,
} from "@/components/meta/sections";
import { parseRankFilter } from "@/lib/deadlock/meta";

export default function MetaPage({ searchParams }: PageProps<"/">) {
  // Read once, awaited inside each section's Suspense boundary.
  const minTier = searchParams.then((sp) => parseRankFilter(sp.rank));

  return (
    <div className="flex flex-col">
      <MetaHero minTier={minTier} />

      <div className="mt-4 md:mt-5 xl:mt-0">
        <Suspense fallback={<PatchTotalsSkeleton />}>
          <PatchTotals minTier={minTier} />
        </Suspense>
      </div>

      <div id="heroes" className="mt-4 grid gap-4 md:mt-5 md:gap-5 xl:mt-8 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Suspense fallback={<CardSkeleton numeral="I." title="Hero standings" rows={10} />}>
          <HeroStandingsSection minTier={minTier} index={0} />
        </Suspense>
        <div className="grid gap-4 md:grid-cols-2 md:gap-5 xl:flex xl:flex-col">
          <Suspense fallback={<CardSkeleton numeral="II." title="Movers" rows={3} />}>
            <MoversSection minTier={minTier} index={1} />
          </Suspense>
          <Suspense fallback={<CardSkeleton numeral="III." title="Where players rank" rows={4} className="xl:flex-1" />}>
            <RankDistributionSection minTier={minTier} index={2} />
          </Suspense>
        </div>
      </div>

      <div id="items" className="mt-4 grid gap-4 md:mt-5 md:gap-5 xl:grid-cols-2">
        <Suspense fallback={<CardSkeleton numeral="IV." title="Items that win" rows={6} />}>
          <ItemsSection minTier={minTier} index={3} />
        </Suspense>
        <Suspense fallback={<CardSkeleton numeral="V." title="Who beats whom" rows={6} />}>
          <MatchupSection minTier={minTier} index={4} />
        </Suspense>
      </div>
    </div>
  );
}
