"use client";

// Adapted from Kokonut UI's "AI Text Loading" v2.0.0 (MIT, https://kokonutui.com,
// `npx shadcn@latest add @kokonutui/ai-text-loading`; the original isn't kept in the repo):
// same idea (messages cycling in letter by letter), restyled for Soul Ledger. Changes:
// Instrument Serif italic in brass; letters move with opacity and transform only
// (no blur, no endless brightness wave); appears only after 600 ms; reduced motion
// shows the first message as still text; "Loading" is announced once per page.
// The animation is CSS (globals.css: ledger-loader, ledger-letter), not JS timers,
// because loaders mostly sit in streamed Suspense fallbacks, which are plain HTML
// that React doesn't hydrate until the data arrives.

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Message sets, so every page draws from one list. */
export const LOADER_MESSAGES = {
  default: ["Reading the ledger…", "Counting souls…", "Tallying the Patron’s dead…", "Checking the lanes…"],
  meta: ["Reading the ledger…", "Counting souls…", "Weighing every hero…", "Checking the lanes…"],
  live: ["Watching the lanes…", "Counting souls…", "Finding matches in progress…", "Checking the lanes…"],
  match: ["Reading the ledger…", "Tallying the Patron’s dead…", "Counting souls…", "Checking the lanes…"],
  player: ["Reading the ledger…", "Finding their matches…", "Counting souls…", "Checking the lanes…"],
  search: ["Searching the ledger…", "Checking every name…", "Reading the ledger…", "Counting souls…"],
} as const satisfies Record<string, readonly string[]>;

/** The CSS cycle has 4 slots (1.8 s each); shorter lists repeat to fill them. */
const SLOTS = 4;
/** Several loaders mounting together (one per card) announce "Loading" once. */
const ANNOUNCE_WINDOW_MS = 3000;
let lastAnnounced = 0;

type LedgerLoaderProps = {
  messages?: readonly string[];
  /** "hero": in a page hero while the whole page loads; "card": in a card header. */
  size?: "hero" | "card";
  /** false shows it at once (the busy countdown) instead of after 600 ms. */
  delayed?: boolean;
  /** Announce "Loading" to screen readers (at most once per page load; needs hydration). */
  announce?: boolean;
  className?: string;
};

/**
 * Branded loading text: brass Instrument Serif italic, cycling through short
 * ledger-flavoured messages. Hidden for the first 600 ms (the space is kept, so
 * nothing shifts when it appears) and gone as soon as its loading state is
 * replaced by data. Put it inside an `aria-busy="true"` region.
 */
export function LedgerLoader({
  messages = LOADER_MESSAGES.default,
  size = "card",
  delayed = true,
  announce = true,
  className,
}: LedgerLoaderProps) {
  const [announced, setAnnounced] = useState(false);

  useEffect(() => {
    if (!announce) return;
    const id = window.setTimeout(() => {
      if (Date.now() - lastAnnounced < ANNOUNCE_WINDOW_MS) return;
      lastAnnounced = Date.now();
      setAnnounced(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, [announce]);

  // One message stays still (the busy countdown); more cycle through 4 slots.
  const cycle = messages.length > 1;
  const slots = cycle ? Array.from({ length: SLOTS }, (_, i) => messages[i % messages.length]) : messages.slice(0, 1);

  return (
    <span className={cn("relative block", className)}>
      <span role="status" className="sr-only">
        {announced ? "Loading" : ""}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "inline-grid font-serif whitespace-nowrap text-brass italic",
          size === "hero" ? "text-[26px] leading-[1.15] md:text-[32px] xl:text-[36px]" : "text-[17px] leading-snug md:text-lg",
          delayed && "ledger-loader",
        )}
      >
        {slots.map((text, slot) => (
          // All slots share one grid cell, so the box keeps the widest message's size.
          <span key={slot} className="ledger-slot [grid-area:1/1]">
            {cycle
              ? Array.from(text).map((char, i) => (
                  <span key={i} className="ledger-letter" style={{ "--slot": slot, "--i": i } as React.CSSProperties}>
                    {char}
                  </span>
                ))
              : text}
          </span>
        ))}
      </span>
    </span>
  );
}
