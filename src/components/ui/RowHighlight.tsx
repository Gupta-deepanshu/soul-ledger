"use client";

import { createContext, useContext, useState } from "react";

type Key = number | string;
type RowHighlight = {
  active: Key | null;
  setActive: (key: Key | null) => void;
};

const Context = createContext<RowHighlight>({ active: null, setActive: () => {} });

/**
 * Links a list and a chart that show the same things (a match history row and
 * its Last 20 bar; a scoreboard row and its damage segment; a hero standings row
 * and the matchup grid): hovering one highlights the other. Keys are the shared
 * id (match id, account id, hero id). Without a provider, `useRowHighlight`
 * does nothing, so the components still work on their own.
 */
export function RowHighlightProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<Key | null>(null);
  return <Context value={{ active, setActive }}>{children}</Context>;
}

export function useRowHighlight() {
  return useContext(Context);
}

/**
 * Pointer handlers for one row or segment: mouse hover only (a touch tap
 * shouldn't leave a highlight stuck on), cleared when the pointer leaves.
 * Call `useRowHighlight()` once per list and pass its `setActive`.
 */
export function highlightHandlers(setActive: RowHighlight["setActive"], key: Key) {
  return {
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse") setActive(key);
    },
    onPointerLeave: () => setActive(null),
  };
}
