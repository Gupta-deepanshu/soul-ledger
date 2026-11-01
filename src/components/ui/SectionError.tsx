"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCw } from "lucide-react";
import type { ApiFailure } from "@/lib/deadlock/client";

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

/**
 * Error state for one section, with a retry button where retrying can help.
 * Retry re-renders the page on the server unless `onRetry` is given (e.g. an SWR revalidate).
 */
export function SectionError({ failure, onRetry }: { failure: ApiFailure | null; onRetry?: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { text, retry } = message(failure);
  return (
    <div role="alert" className="flex flex-col items-start gap-3 py-2">
      <p className="text-sm text-fg-2">{text}</p>
      {retry && (
        <button
          type="button"
          onClick={() => startTransition(() => (onRetry ? onRetry() : router.refresh()))}
          disabled={pending}
          className="flex h-11 items-center gap-2 border border-line-strong px-3.5 text-sm font-medium text-brass hover:border-line-muted disabled:opacity-60"
        >
          <RotateCw size={16} strokeWidth={1.5} aria-hidden="true" className={pending ? "opacity-50" : undefined} />
          {pending ? "Retrying…" : "Try again"}
        </button>
      )}
    </div>
  );
}
