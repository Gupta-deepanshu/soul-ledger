"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { refreshPlayer } from "@/app/players/[id]/actions";

/** Refreshes this player's matches (see `refreshPlayer`) and shows a short status. */
export function RefreshButton({ accountId, className }: { accountId: number; className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function onClick() {
    startTransition(async () => {
      const result = await refreshPlayer(accountId);
      if (result.status === "wait") setMessage(`Try again in ${result.retryInS} s`);
      else if (result.status === "updated") {
        setMessage(result.source === "live" ? "Updated" : "Updated from stored history");
        router.refresh();
      } else setMessage("Couldn't refresh this player");
    });
  }

  return (
    <div className={cn("flex flex-col items-stretch gap-1.5 md:items-end", className)}>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="flex h-11 items-center justify-center gap-2 bg-brass px-[18px] text-sm font-medium text-ink hover:bg-fg disabled:opacity-70"
      >
        <RotateCw size={16} strokeWidth={1.5} aria-hidden="true" className={pending ? "opacity-60" : undefined} />
        {pending ? "Refreshing…" : (
          <>
            <span className="md:hidden">Refresh</span>
            <span className="hidden md:inline">Refresh matches</span>
          </>
        )}
      </button>
      <p role="status" className="min-h-4 font-mono text-[11px] text-muted-foreground">
        {message}
      </p>
    </div>
  );
}
