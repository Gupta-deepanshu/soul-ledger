"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * A date (and time) in the viewer's own timezone. The server doesn't know the
 * viewer's timezone, so it renders UTC and the browser switches to local time
 * right after hydration (no mismatch warning).
 */
export function LocalTime({ unix, dateOnly = false }: { unix: number; dateOnly?: boolean }) {
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);
  const date = new Date(unix * 1000);
  const text = date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    ...(dateOnly ? {} : { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZoneName: "short" }),
    timeZone: isClient ? undefined : "UTC",
  });
  return <time dateTime={date.toISOString()}>{text}</time>;
}
