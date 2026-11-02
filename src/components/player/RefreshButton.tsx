"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { BracketButton, CooldownTicks } from "@/components/ui/buttons";
import { refreshPlayer } from "@/app/players/[id]/actions";

/** Matches the server's one-refresh-per-player-per-minute limit in `refreshPlayer`. */
const COOLDOWN_S = 60;

/**
 * Refreshes this player's matches (see `refreshPlayer`) and shows a short status.
 * After a refresh (or a "wait" answer) the button is disabled and 25 ticks empty
 * until another refresh is allowed.
 */
export function RefreshButton({ accountId, className }: { accountId: number; className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [until, setUntil] = useState<number | null>(null);

  useEffect(() => {
    if (until == null) return;
    const id = window.setTimeout(() => setUntil(null), Math.max(0, until - Date.now()));
    return () => window.clearTimeout(id);
  }, [until]);

  function onClick() {
    startTransition(async () => {
      const result = await refreshPlayer(accountId);
      if (result.status === "wait") {
        setMessage(`Try again in ${result.retryInS} s`);
        setUntil(Date.now() + result.retryInS * 1000);
      } else if (result.status === "updated") {
        setMessage(result.source === "live" ? "Updated" : "Updated from stored history");
        setUntil(Date.now() + COOLDOWN_S * 1000);
        router.refresh();
      } else setMessage("Couldn't refresh this player");
    });
  }

  return (
    // Tablet/desktop: the status line hangs below the button (absolute) so an
    // empty one doesn't push the button out of line with the player's name.
    <div className={cn("flex flex-col items-stretch gap-1.5 md:relative md:items-end", className)}>
      <div className="flex flex-col gap-1.5">
        {/* Same outlined style as the site's other buttons; the surface fill keeps it
            readable over the hero's wave background. */}
        <BracketButton onClick={onClick} loading={pending} disabled={until != null} className="bg-surface">
          <RotateCw size={16} strokeWidth={1.5} aria-hidden="true" />
          <span className="md:hidden">Refresh</span>
          <span className="hidden md:inline">Refresh matches</span>
        </BracketButton>
        {until != null && <CooldownTicks until={until} durationS={COOLDOWN_S} />}
      </div>
      <p
        role="status"
        className="min-h-4 font-mono text-[11px] text-muted-foreground md:absolute md:top-full md:right-0 md:mt-1.5 md:whitespace-nowrap"
      >
        {pending ? "Refreshing…" : message}
      </p>
    </div>
  );
}
