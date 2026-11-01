import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { LiveBoard, LiveSkeleton } from "@/components/live/LiveBoard";
import { isSampleData } from "@/lib/deadlock/client";
import { getLiveBoard } from "@/lib/deadlock/live";
import { settle } from "@/lib/deadlock/settle";

export const metadata: Metadata = {
  title: "Live",
  description: "Deadlock matches in progress: souls, leads, lineups and objectives, refreshed every 30 seconds.",
};

export default function LivePage() {
  return (
    <Suspense fallback={<LiveSkeleton />}>
      <LiveContent />
    </Suspense>
  );
}

/** First paint comes from the server; the board then polls /api/live every 30 s. */
async function LiveContent() {
  await connection();
  const result = await settle(getLiveBoard());
  return <LiveBoard initial={result.ok ? result.data : null} sample={isSampleData()} />;
}
