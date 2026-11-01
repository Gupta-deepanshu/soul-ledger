"use client";

import { useEffect, useState, type PointerEvent } from "react";
import { useMotionValue, useSpring } from "motion/react";

/** Desktop with a real mouse: the only place the magnet runs. */
const DESKTOP_POINTER = "(hover: hover) and (pointer: fine) and (min-width: 1280px)";

/**
 * A subtle pull toward the cursor while it is over the element, up to `max` px,
 * eased back with a spring when it leaves. Our own take on the "magnet button"
 * idea, built on Motion values. Off on touch, tablet and phone widths, and when
 * `enabled` is false (reduced motion, disabled).
 */
export function useMagnet(max = 4, enabled = true) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const spring = { stiffness: 320, damping: 22, mass: 0.4 };
  const sx = useSpring(x, spring);
  const sy = useSpring(y, spring);
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_POINTER);
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const active = enabled && desktop;

  useEffect(() => {
    if (!active) {
      x.set(0);
      y.set(0);
    }
  }, [active, x, y]);

  const clamp = (v: number) => Math.max(-1, Math.min(1, v));
  return {
    style: { x: sx, y: sy },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      if (!active || e.pointerType !== "mouse") return;
      const r = e.currentTarget.getBoundingClientRect();
      // Measure from the untranslated centre so the pull doesn't feed back on itself.
      const cx = r.left + r.width / 2 - x.get();
      const cy = r.top + r.height / 2 - y.get();
      x.set(clamp((e.clientX - cx) / (r.width / 2)) * max);
      y.set(clamp((e.clientY - cy) / (r.height / 2)) * max);
    },
    onPointerLeave: () => {
      x.set(0);
      y.set(0);
    },
  };
}
