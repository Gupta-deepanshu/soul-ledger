"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * A React `key` that changes each time the page is shown again after being kept in the background.
 *
 * With Cache Components, Next.js doesn't unmount a page when you navigate away: it
 * hides it with React's <Activity> and shows it again when you come back. Hiding
 * runs effect cleanups, and Motion's cleanup cancels any animation in flight, so a
 * bar that was still growing stays frozen (often empty). Its target hasn't changed
 * when the page returns, so Motion never animates it again.
 *
 * Put this key on the animated element (not on the element `useInView` watches):
 * when the page returns, the element is re-created and plays its animation to the
 * current value.
 */
export function useRestoreKey(): number {
  const [key, setKey] = useState(0);
  const wasHidden = useRef(false);
  useLayoutEffect(() => {
    if (wasHidden.current) {
      wasHidden.current = false;
      // Shown again after <Activity> hid the page: re-create the animated element.
      setKey((k) => k + 1);
    }
    return () => {
      wasHidden.current = true;
    };
  }, []);
  return key;
}
