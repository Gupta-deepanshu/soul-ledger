import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LoadingPreview } from "@/components/dev/LoadingPreview";
import { CardSkeleton, PatchTotalsSkeleton } from "@/components/meta/sections";
import { LiveSkeleton } from "@/components/live/LiveBoard";
import { DraftMatchupSkeleton } from "@/components/live/DraftMatchup";
import { LiveLineupsSkeleton } from "@/components/live/LiveLineups";

// TEMPORARY: a review page for the loading states. Delete with components/dev/.

export const metadata: Metadata = {
  title: "Loading (dev)",
  robots: { index: false, follow: false },
};

export default function DevLoadingPage() {
  // Development only: production builds answer 404.
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <LoadingPreview
      skeletons={
        <>
          <PatchTotalsSkeleton />
          <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <CardSkeleton numeral="I." title="Hero standings" rows={5} />
            <CardSkeleton numeral="II." title="Movers" rows={3} />
          </div>
          <LiveLineupsSkeleton />
          <DraftMatchupSkeleton />
          <LiveSkeleton />
        </>
      }
    />
  );
}
