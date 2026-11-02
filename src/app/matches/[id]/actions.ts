"use server";

import { getMatchReport } from "@/lib/deadlock/api";
import { settle } from "@/lib/deadlock/settle";

/**
 * Whether a just-finished match's report can be shown yet. The API needs a few
 * minutes to process a match; until then its metadata is a 404 (not cached).
 */
export async function reportStatus(matchId: number): Promise<"ready" | "pending" | "error"> {
  if (!Number.isSafeInteger(matchId) || matchId <= 0) return "error";
  const report = await settle(getMatchReport(matchId));
  if (report.ok) return "ready";
  return report.failure?.kind === "not-found" ? "pending" : "error";
}
