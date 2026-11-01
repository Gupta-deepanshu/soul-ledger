import { unstable_rethrow } from "next/navigation";
import { toApiFailure, type ApiFailure } from "./client";

export type Settled<T> = { ok: true; data: T } | { ok: false; failure: ApiFailure | null };

/**
 * Awaits data for one page section without throwing, so a failing endpoint
 * shows that section's error state instead of breaking the whole page.
 */
export async function settle<T>(promise: Promise<T>): Promise<Settled<T>> {
  try {
    return { ok: true, data: await promise };
  } catch (error) {
    // Let Next.js's own control-flow errors (prerender bailouts, notFound…) through.
    unstable_rethrow(error);
    const failure = toApiFailure(error);
    if (!failure || failure.kind === "invalid") console.error(error);
    return { ok: false, failure };
  }
}
