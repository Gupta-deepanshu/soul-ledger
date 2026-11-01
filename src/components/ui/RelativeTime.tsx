"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

function relative(unix: number, now: number): string {
  const s = Math.max(0, now - unix);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)} h ago`;
  const days = Math.floor(s / 86_400);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(unix * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * "2 h ago". The server renders the plain date (it can't know when the page
 * will be read); the browser switches to relative time after hydration.
 */
/** Current minute (stable between renders within a minute); 0 on the server. */
const currentMinute = () => Math.floor(Date.now() / 60_000);

export function RelativeTime({ unix }: { unix: number }) {
  const minute = useSyncExternalStore(subscribe, currentMinute, () => 0);
  const date = new Date(unix * 1000);
  const text =
    minute > 0
      ? relative(unix, minute * 60)
      : date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return (
    <time dateTime={date.toISOString()} title={date.toLocaleString("en-US")}>
      {text}
    </time>
  );
}
