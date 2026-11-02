"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ApiFailure } from "@/lib/deadlock/client";
import { BracketButton } from "@/components/ui/buttons";
import { LedgerLoader } from "@/components/ui/LedgerLoader";

/** Automatic retries when the API is busy (503) before showing the normal error. */
const MAX_AUTO_RETRIES = 3;
/** Wait when a 503 comes without Retry-After, and the longest wait we'll show. */
const DEFAULT_WAIT_S = 10;
const MAX_WAIT_S = 60;
/** A count older than this starts over (the section has probably loaded since). */
const COUNT_TTL_MS = 5 * 60_000;
const TICKS = 25;

// Retries made per section, kept outside React: a server re-render after a
// retry can remount this component, and the count must survive that.
const retries = new Map<string, { count: number; at: number }>();
function retriesSoFar(key: string): number {
  const entry = retries.get(key);
  return entry && Date.now() - entry.at < COUNT_TTL_MS ? entry.count : 0;
}

function message(failure: ApiFailure | null): { text: string; retry: boolean } {
  switch (failure?.kind) {
    case "busy":
      return {
        text: `The data source is busy right now.${failure.retryAfter ? ` Try again in ${failure.retryAfter} s.` : ""}`,
        retry: true,
      };
    case "timeout":
      return {
        text: "This query hit the data source's time limit and will keep failing for a few minutes. Try a different rank filter.",
        retry: false,
      };
    default:
      return { text: "Couldn't load this section.", retry: true };
  }
}

/** TickMeter-style countdown: 25 ticks that empty right → left. Colour only, so the same with reduced motion. */
function Countdown({ remaining, total }: { remaining: number; total: number }) {
  const filled = Math.ceil((remaining / total) * TICKS);
  return (
    <span aria-hidden="true" className="flex h-1.5 w-full max-w-60 gap-0.5 md:gap-[3px]">
      {Array.from({ length: TICKS }, (_, i) => (
        <span key={i} className={cn("flex-1 transition-colors duration-200", i < filled ? "bg-brass" : "bg-line")} />
      ))}
    </span>
  );
}

/** "The ledger is busy, trying again in 8s", counting down, then calls `onDone` once. */
function BusyCountdown({ waitS, onDone }: { waitS: number; onDone: () => void }) {
  const [left, setLeft] = useState(waitS);

  useEffect(() => {
    const startedAt = Date.now();
    const id = window.setInterval(() => {
      const next = Math.max(0, waitS - Math.floor((Date.now() - startedAt) / 1000));
      setLeft(next);
      if (next === 0) {
        window.clearInterval(id);
        onDone();
      }
    }, 250);
    return () => window.clearInterval(id);
    // onDone is stable for one countdown (the component is re-keyed per attempt).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitS]);

  return (
    <div aria-busy="true" className="flex flex-col items-start gap-2.5 py-2">
      <LedgerLoader messages={[`The ledger is busy, trying again in ${left}s`]} delayed={false} />
      <Countdown remaining={left} total={waitS} />
    </div>
  );
}

/**
 * Error state for one section, with a retry button where retrying can help.
 * Retry re-renders the page on the server unless `onRetry` is given (e.g. an SWR revalidate).
 *
 * API busy (503): counts down the Retry-After wait with the ledger loader and a
 * tick countdown, then retries by itself, up to 3 times; after that, the normal
 * error with a Try again button. `retryKey` keeps each section's count apart
 * when several fail on one page.
 */
export function SectionError({
  failure,
  onRetry,
  retryKey,
}: {
  failure: ApiFailure | null;
  onRetry?: () => void;
  retryKey?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const key = `${pathname}|${retryKey ?? "section"}`;
  const [pending, startTransition] = useTransition();
  const [attempts, setAttempts] = useState(() => retriesSoFar(key));
  const { text, retry } = message(failure);
  const run = () => startTransition(() => (onRetry ? onRetry() : router.refresh()));

  // A retry is on its way: keep the loader up until the new result replaces this.
  if (failure?.kind === "busy" && pending) {
    return (
      <div aria-busy="true" className="py-2">
        <LedgerLoader messages={["Trying the ledger again…"]} delayed={false} announce={false} />
      </div>
    );
  }

  if (failure?.kind === "busy" && attempts < MAX_AUTO_RETRIES) {
    const waitS = Math.min(MAX_WAIT_S, Math.max(1, failure.retryAfter ?? DEFAULT_WAIT_S));
    return (
      <BusyCountdown
        key={attempts}
        waitS={waitS}
        onDone={() => {
          retries.set(key, { count: attempts + 1, at: Date.now() });
          setAttempts(attempts + 1);
          run();
        }}
      />
    );
  }

  return (
    <div role="alert" className="flex flex-col items-start gap-3 py-2">
      <p className="text-sm text-fg-2">{text}</p>
      {retry && (
        <BracketButton loading={pending} onClick={run}>
          <RotateCw size={16} strokeWidth={1.5} aria-hidden="true" />
          Try again
        </BracketButton>
      )}
    </div>
  );
}
