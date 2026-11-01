"use client";

import { createContext, useContext, useEffect, useState } from "react";
import useSWR from "swr";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { formatCompact, formatDuration } from "@/lib/format";
import { TEAMS } from "@/lib/deadlock/teams";
import type { ApiFailure } from "@/lib/deadlock/client";
import { leadOf, type LiveMatchView } from "@/lib/deadlock/live-view";

export const POLL_MS = 30_000;

// ---- Polling ------------------------------------------------------------------

export class LiveFetchError extends Error {
  constructor(
    readonly failure: ApiFailure,
  ) {
    super(`Live fetch failed: ${failure.status ?? "network"}`);
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    throw new LiveFetchError({ kind: "network", status: null, retryAfter: null });
  }
  if (!res.ok) {
    const kind = res.status === 503 ? "busy" : res.status === 504 ? "timeout" : "http";
    throw new LiveFetchError({ kind, status: res.status, retryAfter: Number(res.headers.get("retry-after")) || null });
  }
  return res.json() as Promise<T>;
}

/** Polls one of our /api/live URLs every 30 s (paused while the tab is hidden). */
export function useLivePoll<T>(url: string, initial: T | null) {
  return useSWR<T, LiveFetchError>(url, fetchJson<T>, {
    fallbackData: initial ?? undefined,
    revalidateOnMount: initial == null,
    refreshInterval: POLL_MS,
    dedupingInterval: 10_000,
    keepPreviousData: true,
  });
}

// ---- Clock ----------------------------------------------------------------------

const NowContext = createContext(0);

/**
 * One shared 1 s ticker for every match clock. Starts from the server's
 * snapshot time so server and client render the same text.
 */
export function NowProvider({ initial, children }: { initial: number; children: React.ReactNode }) {
  const [now, setNow] = useState(initial);
  useEffect(() => {
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);
  return <NowContext value={now}>{children}</NowContext>;
}

export function useNow() {
  return useContext(NowContext);
}

/** Elapsed match time, counting up each second. */
export function MatchClock({ startTime }: { startTime: number | null }) {
  const now = useNow();
  if (startTime == null) return <span>—</span>;
  return <time dateTime={`PT${Math.max(0, now - startTime)}S`}>{formatDuration(now - startTime)}</time>;
}

/** "1 min ago" style age of a snapshot. */
export function SnapshotAge({ fetchedAt }: { fetchedAt: number }) {
  const s = Math.max(0, useNow() - fetchedAt);
  return <>{s < 60 ? `${s} s ago` : `${Math.floor(s / 60)} min ago`}</>;
}

// ---- Bits -----------------------------------------------------------------------

/** The softly pulsing live dot — the only looping animation on the site. */
export function LiveDot({ className }: { className?: string }) {
  return (
    <motion.span
      aria-hidden="true"
      className={cn("inline-block size-[7px] rounded-full bg-brass", className)}
      animate={{ opacity: [1, 0.35, 1] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

/** "+7.5k" (or "Hidden King +7.5k" with `withTeam`) in the leading team's colour. */
export function LeadText({ match, withTeam = false, className }: { match: LiveMatchView; withTeam?: boolean; className?: string }) {
  const { leader, lead } = leadOf(match);
  if (leader == null) return <span className={cn("font-mono text-muted-foreground", className)}>Level</span>;
  const team = TEAMS[leader];
  return (
    <span className={cn("font-mono", team.textClass, className)}>
      {withTeam ? `${team.shortName} ` : <span className="sr-only">{team.shortName} </span>}+{formatCompact(lead)}
    </span>
  );
}
