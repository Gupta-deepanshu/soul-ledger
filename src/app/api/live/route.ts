import { getLiveBoard } from "@/lib/deadlock/live";
import type { LiveMatchSnapshot } from "@/lib/deadlock/live-view";
import { settle } from "@/lib/deadlock/settle";

/**
 * Live matches for the browser to poll. Reads the 30 s cache, so polling costs
 * one upstream call per 30 s however many people watch.
 * `?match=<id>` returns just that match (null once it has ended).
 */
export async function GET(request: Request) {
  const result = await settle(getLiveBoard());
  if (!result.ok) {
    const failure = result.failure;
    const status = failure?.kind === "busy" ? 503 : failure?.kind === "timeout" ? 504 : 502;
    const headers: HeadersInit = { "Cache-Control": "no-store" };
    if (failure?.retryAfter) headers["Retry-After"] = String(failure.retryAfter);
    return Response.json({ error: failure?.kind ?? "error" }, { status, headers });
  }

  const board = result.data;
  const matchParam = new URL(request.url).searchParams.get("match");
  if (matchParam != null) {
    const id = Number(matchParam);
    const snapshot: LiveMatchSnapshot = {
      fetchedAt: board.fetchedAt,
      dataAt: board.dataAt,
      match: board.matches.find((m) => m.id === id) ?? null,
      heroes: board.heroes,
    };
    return Response.json(snapshot, { headers: { "Cache-Control": "no-store" } });
  }
  return Response.json(board, { headers: { "Cache-Control": "no-store" } });
}
