import { searchPlayers } from "@/lib/deadlock/search";
import { settle } from "@/lib/deadlock/settle";

const MAX_QUERY = 200;

/** Player search for the /players page. The browser calls this; only the server calls the API. */
export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").slice(0, MAX_QUERY);
  const headers: HeadersInit = { "Cache-Control": "no-store" };

  const result = await settle(searchPlayers(q));
  if (!result.ok) {
    const failure = result.failure;
    const status = failure?.kind === "busy" ? 503 : failure?.kind === "timeout" ? 504 : 502;
    if (failure?.retryAfter) headers["Retry-After"] = String(failure.retryAfter);
    return Response.json({ error: failure?.kind ?? "error" }, { status, headers });
  }
  return Response.json(result.data, { headers });
}
