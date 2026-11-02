"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SectionError } from "@/components/ui/SectionError";
import { LedgerLoader, LOADER_MESSAGES } from "@/components/ui/LedgerLoader";
import { BracketButton, FOCUS_RING, StampButton } from "@/components/ui/buttons";
import { RankBadge } from "@/components/ui/RankBadge";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { RelativeTime } from "@/components/ui/RelativeTime";
import type { ApiFailure } from "@/lib/deadlock/client";
import type { SearchResult, SearchRow } from "@/lib/deadlock/search";
import { parsePlayerQuery } from "@/lib/deadlock/steam-id";

const DEBOUNCE_MS = 400;
const MIN_CHARS = 2;

// ---- Recent searches: this browser only (localStorage), never the server ------

const RECENT_KEY = "soul-ledger:recent";
const RECENT_EVENT = "soul-ledger:recent-change";
const MAX_RECENT = 5;

function readRecentRaw(): string {
  try {
    return window.localStorage.getItem(RECENT_KEY) ?? "";
  } catch {
    return "";
  }
}

function parseRecent(raw: string): string[] {
  try {
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string").slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function writeRecent(list: string[]) {
  try {
    if (list.length === 0) window.localStorage.removeItem(RECENT_KEY);
    else window.localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
  } catch {
    // Storage unavailable (private mode, blocked): recent searches just don't persist.
  }
  window.dispatchEvent(new Event(RECENT_EVENT));
}

function subscribeRecent(onChange: () => void) {
  window.addEventListener(RECENT_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(RECENT_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function rememberSearch(query: string) {
  const q = query.trim();
  if (!q) return;
  const current = parseRecent(readRecentRaw());
  writeRecent([q, ...current.filter((x) => x.toLowerCase() !== q.toLowerCase())]);
}

// ---- Fetching ---------------------------------------------------------------------

class SearchError extends Error {
  constructor(readonly failure: ApiFailure) {
    super("search failed");
  }
}

async function fetchSearch(q: string, signal: AbortSignal): Promise<SearchResult> {
  const res = await fetch(`/api/players/search?q=${encodeURIComponent(q)}`, { signal, cache: "no-store" });
  if (!res.ok) {
    const kind = res.status === 503 ? "busy" : res.status === 504 ? "timeout" : "http";
    throw new SearchError({ kind, status: res.status, retryAfter: Number(res.headers.get("retry-after")) || null });
  }
  return res.json() as Promise<SearchResult>;
}

function searchable(q: string) {
  const t = q.trim();
  return t.length >= MIN_CHARS || /^\d+$/.test(t);
}

// ---- Component --------------------------------------------------------------------

export function PlayerSearch({ initialQuery, initialResult }: { initialQuery: string; initialResult: SearchResult | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState<SearchResult | null>(initialResult);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [loading, setLoading] = useState(false);
  const [navigating, startNavigation] = useTransition();
  const recent = parseRecent(useSyncExternalStore(subscribeRecent, readRecentRaw, () => ""));

  async function run(q: string) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const data = await fetchSearch(q, controller.signal);
      setResult(data);
      setFailure(null);
      window.history.replaceState(null, "", `?q=${encodeURIComponent(q.trim())}`);
    } catch (error) {
      if (controller.signal.aborted) return;
      setFailure(error instanceof SearchError ? error.failure : { kind: "network", status: null, retryAfter: null });
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }

  // Search once typing pauses. A newer search aborts the one in flight.
  useEffect(() => {
    const q = query.trim();
    if (!searchable(q) || q === result?.query) return;
    const timer = setTimeout(() => void run(q), DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // `run` and `result` are read when the timer fires; only typing should restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    if (!initialQuery) inputRef.current?.focus();
    return () => abortRef.current?.abort();
  }, [initialQuery]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!searchable(q)) return;
    rememberSearch(q);
    const parsed = parsePlayerQuery(q);
    if (parsed.kind === "id") {
      startNavigation(() => router.push(`/players/${parsed.accountId}`));
      return;
    }
    void run(q);
  }

  function pickRecent(q: string) {
    setQuery(q);
    rememberSearch(q);
    void run(q);
  }

  const showResults = searchable(query) && (result != null || loading || failure != null);
  const status = navigating ? "Opening profile…" : loading ? "Searching…" : "";

  return (
    <div className="flex flex-col gap-3 md:gap-3.5">
      <form role="search" onSubmit={onSubmit} className="relative flex gap-2">
        <label htmlFor="player-query" className="sr-only">
          Steam name, ID or profile link
        </label>
        <div className="relative flex-1 xl:max-w-[640px]">
          <Search size={18} strokeWidth={1.5} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            id="player-query"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Steam name, ID or profile link"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            aria-describedby="search-help search-status"
            className="h-[52px] w-full border border-line-strong bg-surface pr-4 pl-11 text-base text-fg placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass xl:h-14"
          />
        </div>
        <StampButton type="submit" className="hidden h-[52px] px-5 md:inline-flex xl:h-14">
          Search
        </StampButton>
      </form>

      <p id="search-status" role="status" className="min-h-4 font-mono text-[11px] text-muted-foreground">
        {status}
      </p>

      <p id="search-help" className="text-[13px] text-muted-foreground">
        <span className="text-fg-2">Where do I find my Steam ID?</span> In Steam, open Add a Friend: your friend code is your ID. Or
        paste your Steam profile link.
      </p>

      {recent.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Recent</span>
          {recent.map((q) => (
            <BracketButton key={q} onClick={() => pickRecent(q)} className="px-3 text-[13px] text-fg-2 hover:text-fg">
              <span className="block max-w-48 truncate">{q}</span>
            </BracketButton>
          ))}
          <button type="button" onClick={() => writeRecent([])} className={cn("h-11 px-2 text-[13px] text-brass transition-colors hover:text-fg", FOCUS_RING)}>
            Clear
          </button>
        </div>
      )}

      {showResults && (
        <div className="mt-2 md:mt-3">
          <Results result={result} loading={loading} failure={failure} onRetry={() => void run(query)} onOpen={() => rememberSearch(query)} />
        </div>
      )}
    </div>
  );
}

function Results({
  result,
  loading,
  failure,
  onRetry,
  onOpen,
}: {
  result: SearchResult | null;
  loading: boolean;
  failure: ApiFailure | null;
  onRetry: () => void;
  onOpen: () => void;
}) {
  const count = result?.rows.length ?? 0;
  return (
    <Card aria-labelledby="results-title" className="xl:max-w-[720px]">
      <SectionHeader
        numeral="I."
        title="Results"
        id="results-title"
        caption={
          result && !failure ? (
            `${count} ${count === 1 ? "player" : "players"} for “${result.query}”`
          ) : !failure ? (
            <LedgerLoader messages={LOADER_MESSAGES.search} />
          ) : undefined
        }
      />
      {failure ? (
        <SectionError failure={failure} onRetry={onRetry} retryKey="search" />
      ) : !result ? (
        <ul aria-busy="true">
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i} className="flex items-center gap-3 border-t border-rule py-3">
              <span className="ink-wash size-10" />
              <span className="ink-wash h-3 w-40" />
            </li>
          ))}
        </ul>
      ) : (
        <div className={cn("flex flex-col transition-opacity", loading && "opacity-60")}>
          {result.vanity && (
            <p className="pb-2 text-[13px] text-muted-foreground">
              Custom profile links can&apos;t be looked up directly, so this searched the name in the link. Try the numeric profile
              link or the friend code.
            </p>
          )}
          {count === 0 ? (
            result.accountId != null ? (
              <Link
                href={`/players/${result.accountId}`}
                onClick={onOpen}
                className="flex min-h-14 items-center justify-between gap-3 border-t border-rule py-2 text-sm text-brass hover:text-fg"
              >
                Open the profile for ID {result.accountId}
                <ArrowRight size={18} strokeWidth={1.5} aria-hidden="true" />
              </Link>
            ) : (
              <p className="border-t border-rule py-3 text-sm text-fg-2">
                No active players match “{result.query}”. Search only covers players with 5+ matches in the last 30 days. Try their
                exact Steam name, numeric ID or profile link.
              </p>
            )
          ) : (
            <ul>
              <AnimatePresence initial={false} mode="popLayout">
                {result.rows.map((row) => (
                  <motion.li key={row.accountId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <ResultRow row={row} onOpen={onOpen} />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

function ResultRow({ row, onOpen }: { row: SearchRow; onOpen: () => void }) {
  return (
    <Link
      href={`/players/${row.accountId}`}
      onClick={onOpen}
      className="grid min-h-14 grid-cols-[40px_minmax(0,1fr)_auto_18px] items-center gap-3 border-t border-rule py-2 hover:bg-surface-2"
    >
      <PlayerAvatar avatarUrl={row.avatarUrl} initials={row.initials} sizes="40px" className="size-10 bg-surface-2 text-xl" />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[15px]">{row.name ?? "Anonymous"}</span>
        <span className="truncate font-mono text-[11px] text-muted-foreground">
          {row.matches30d != null && (
            <>
              {row.matches30d}
              <span className="md:hidden"> in 30 d</span>
              <span className="hidden md:inline"> matches in 30 days</span>
            </>
          )}
          {row.lastRankedAt != null && (
            <>
              {row.matches30d != null && " · "}
              <span className="hidden md:inline">last ranked </span>
              <RelativeTime unix={row.lastRankedAt} />
            </>
          )}
        </span>
      </span>
      {row.rank === undefined ? (
        <span className="font-mono text-xs text-muted-foreground">—</span>
      ) : (
        <RankBadge rank={row.rank} />
      )}
      <ArrowRight size={18} strokeWidth={1.5} aria-hidden="true" className="text-muted-foreground" />
    </Link>
  );
}

