"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * viewBox units per rendered CSS pixel for an element `viewBoxWidth` units wide,
 * or null until measured. Multiply a pixel size by it to get a size that stays
 * that many pixels on screen however wide the SVG is drawn (chart labels).
 */
export function useViewBoxScale(ref: RefObject<Element | null>, viewBoxWidth: number): number | null {
  const [scale, setScale] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (width > 0) setScale(viewBoxWidth / width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, viewBoxWidth]);
  return scale;
}
