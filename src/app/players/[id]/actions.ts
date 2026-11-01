"use server";

import { updateTag } from "next/cache";
import { deadlockFetch, isSampleData, toApiFailure } from "@/lib/deadlock/client";
import { matchHistorySchema } from "@/lib/deadlock/schemas";

/** At most one refresh per player per minute. */
const PER_PLAYER_S = 60;
/** `force_refetch` is limited to 1 request/hour per IP — our server's, shared by all visitors. */
const FORCE_REFETCH_S = 60 * 60;

// Per server instance. Good enough as a guard; the API enforces its own limits too.
const lastRefresh = new Map<number, number>();
let forceRefetchBlockedUntil = 0;

export type RefreshResult =
  | { status: "updated"; source: "live" | "stored" }
  | { status: "wait"; retryInS: number }
  | { status: "invalid" };

/**
 * Refresh a player's matches. Tries the API's `force_refetch` (fetches the
 * newest matches from Steam) when it hasn't been used in the last hour, and
 * otherwise re-reads the API's stored history. Either way our 5-minute cache
 * for this player is expired so the page shows the result immediately.
 */
export async function refreshPlayer(accountId: number): Promise<RefreshResult> {
  if (!Number.isSafeInteger(accountId) || accountId <= 0) return { status: "invalid" };

  const now = Date.now() / 1000;
  const last = lastRefresh.get(accountId) ?? 0;
  if (now - last < PER_PLAYER_S) return { status: "wait", retryInS: Math.ceil(PER_PLAYER_S - (now - last)) };
  lastRefresh.set(accountId, now);

  let source: "live" | "stored" = "stored";
  if (!isSampleData() && now >= forceRefetchBlockedUntil) {
    try {
      await deadlockFetch(`/v1/players/${accountId}/match-history`, matchHistorySchema, { query: { force_refetch: true } });
      source = "live";
      forceRefetchBlockedUntil = now + FORCE_REFETCH_S;
    } catch (error) {
      // Rate-limited or failed: fall back to the stored history.
      forceRefetchBlockedUntil = now + (toApiFailure(error)?.retryAfter ?? FORCE_REFETCH_S);
    }
  }

  updateTag(`player-${accountId}`);
  return { status: "updated", source };
}
