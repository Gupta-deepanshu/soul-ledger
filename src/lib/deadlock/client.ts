// The single gateway to api.deadlock-api.com. Server only: never import this
// from a client component. Caching lives one level up, in ./api.ts.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const BASE_URL = "https://api.deadlock-api.com";
const TIMEOUT_MS = 15_000;
const FIXTURES_DIR = path.join(process.cwd(), "src", "data", "fixtures");

/** True while the app reads saved fixtures instead of the live API (`DATA_SOURCE=fixtures`). */
export function isSampleData(): boolean {
  return process.env.DATA_SOURCE === "fixtures";
}

export type ApiFailureKind = "busy" | "timeout" | "not-found" | "http" | "network" | "invalid";

export type ApiFailure = {
  kind: ApiFailureKind;
  status: number | null;
  /** Seconds to wait before retrying (503/504 `Retry-After`). */
  retryAfter: number | null;
};

// An error thrown inside `"use cache"` reaches the caller as a new error: in
// production its message is replaced ("…omitted in production builds…") and
// only `digest` survives. Next keeps a digest the error already has, so the
// failure details travel in it (they contain nothing sensitive).
const DIGEST_PATTERN = /^DEADLOCK_API\|(\S+)\|(\S+)\|(\S+)$/;

export class DeadlockApiError extends Error implements ApiFailure {
  readonly kind: ApiFailureKind;
  readonly status: number | null;
  readonly retryAfter: number | null;
  readonly digest: string;

  constructor(failure: ApiFailure, detail: string) {
    super(`DeadlockApiError (${failure.kind}): ${detail}`);
    this.name = "DeadlockApiError";
    this.kind = failure.kind;
    this.status = failure.status;
    this.retryAfter = failure.retryAfter;
    this.digest = `DEADLOCK_API|${failure.kind}|${failure.status ?? "-"}|${failure.retryAfter ?? "-"}`;
  }
}

/** The API failure behind an error, or null if it wasn't one. Use in error states. */
export function toApiFailure(error: unknown): ApiFailure | null {
  if (error instanceof DeadlockApiError) {
    return { kind: error.kind, status: error.status, retryAfter: error.retryAfter };
  }
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : "";
  const match = DIGEST_PATTERN.exec(digest);
  if (!match) return null;
  const num = (s: string) => (s === "-" ? null : Number(s));
  return { kind: match[1] as ApiFailureKind, status: num(match[2]), retryAfter: num(match[3]) };
}

type Query = Record<string, string | number | boolean | undefined>;

type FetchOptions = {
  query?: Query;
  /** Fixture file to read in sample mode, when the path alone doesn't identify it (e.g. "hero-stats-previous"). */
  fixture?: string;
};

/** Fetches an endpoint (or its fixture), validates it with `schema` and returns the parsed data. */
export async function deadlockFetch<S extends z.ZodType>(
  pathname: string,
  schema: S,
  options: FetchOptions = {},
): Promise<z.output<S>> {
  return (await deadlockFetchTimed(pathname, schema, options)).data;
}

/**
 * Like deadlockFetch, plus when the response's data was produced (unix seconds):
 * now minus the `Age` header. The API caches responses (e.g. active matches for
 * up to ~4 min with stale-while-revalidate), so this can be well before "now".
 */
export async function deadlockFetchTimed<S extends z.ZodType>(
  pathname: string,
  schema: S,
  { query = {}, fixture }: FetchOptions = {},
): Promise<{ data: z.output<S>; producedAt: number }> {
  const now = Math.floor(Date.now() / 1000);
  const { json, ageS } = isSampleData() ? { json: await readFixture(pathname, fixture), ageS: 0 } : await fetchLive(pathname, query);
  const result = schema.safeParse(json);
  if (!result.success) {
    throw new DeadlockApiError(
      { kind: "invalid", status: null, retryAfter: null },
      `${pathname} did not match its schema:\n${z.prettifyError(result.error)}`,
    );
  }
  return { data: result.data, producedAt: now - ageS };
}

async function fetchLive(pathname: string, query: Query): Promise<{ json: unknown; ageS: number }> {
  const url = new URL(pathname, BASE_URL);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const headers: HeadersInit = { Accept: "application/json" };
  const apiKey = process.env.DEADLOCK_API_KEY;
  if (apiKey) headers["X-API-KEY"] = apiKey;

  let res: Response;
  try {
    res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (cause) {
    throw new DeadlockApiError({ kind: "network", status: null, retryAfter: null }, `${pathname}: ${String(cause)}`);
  }

  if (!res.ok) {
    const retryAfter = Number(res.headers.get("retry-after")) || null;
    // 429 (rate limit) is handled like 503: wait and retry later.
    const kind: ApiFailureKind =
      res.status === 503 || res.status === 429
        ? "busy"
        : res.status === 504
          ? "timeout"
          : res.status === 404
            ? "not-found"
            : "http";
    throw new DeadlockApiError({ kind, status: res.status, retryAfter }, `${pathname} responded ${res.status}`);
  }
  // Seconds the response sat in the API's cache; missing on a fresh response.
  const ageS = Math.max(0, Number(res.headers.get("age")) || 0);
  return { json: await res.json(), ageS };
}

// Endpoint → fixture file in src/data/fixtures (saved by scripts/save-fixtures.mjs).
const FIXTURES: [RegExp, (m: RegExpExecArray) => string][] = [
  [/^\/v1\/assets\/heroes$/, () => "heroes"],
  [/^\/v1\/assets\/items$/, () => "items"],
  [/^\/v1\/assets\/ranks$/, () => "ranks"],
  [/^\/v1\/patches$/, () => "patches"],
  [/^\/v1\/analytics\/hero-stats$/, () => "hero-stats"],
  [/^\/v1\/analytics\/game-stats$/, () => "game-stats"],
  [/^\/v1\/analytics\/item-stats$/, () => "item-stats"],
  [/^\/v1\/analytics\/hero-counter-stats$/, () => "hero-counter-stats"],
  [/^\/v1\/players\/rank\/distribution$/, () => "rank-distribution"],
  [/^\/v1\/matches\/active$/, () => "active-matches"],
  // Ranks of the players in active-matches.json (any id subset returns the whole file).
  [/^\/v1\/players\/rank$/, () => "player-ranks-active"],
  // Names for the players in the saved match fixtures.
  [/^\/v1\/players\/steam$/, () => "steam-profiles"],
  [/^\/v1\/players\/(\d+)\/match-history$/, (m) => `player-${m[1]}-history`],
  [/^\/v1\/players\/(\d+)\/rank$/, (m) => `player-${m[1]}-rank`],
  [/^\/v1\/players\/(\d+)\/mate-stats$/, (m) => `player-${m[1]}-mates`],
  [/^\/v1\/matches\/(\d+)\/metadata$/, (m) => `match-${m[1]}`],
];

async function readFixture(pathname: string, fixture?: string): Promise<unknown> {
  let name = fixture;
  for (const [pattern, toName] of FIXTURES) {
    const match = name ? null : pattern.exec(pathname);
    if (match) name = toName(match);
  }
  if (name) {
    try {
      return JSON.parse(await readFile(path.join(FIXTURES_DIR, `${name}.json`), "utf8"));
    } catch {
      // Fall through to not-found.
    }
  }
  throw new DeadlockApiError({ kind: "not-found", status: 404, retryAfter: null }, `no fixture for ${pathname}`);
}
