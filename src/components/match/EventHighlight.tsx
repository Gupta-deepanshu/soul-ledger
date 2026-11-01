"use client";

import { createContext, useContext, useState } from "react";

type EventHighlight = { active: string | null; setActive: (id: string | null) => void };

const Context = createContext<EventHighlight>({ active: null, setActive: () => {} });

/** Links the souls-lead chart's diamonds and the objectives list: hovering one highlights the other. */
export function EventHighlightProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<string | null>(null);
  return <Context value={{ active, setActive }}>{children}</Context>;
}

export function useEventHighlight() {
  return useContext(Context);
}
