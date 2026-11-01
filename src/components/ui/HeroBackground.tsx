"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "motion/react";
import { inkStore } from "@/lib/ink";
import { cn } from "@/lib/utils";

// Client-only and code-split: vgpu and the shaders load after the page content,
// and never on browsers without WebGPU (they get the CSS halftone instead).
const ShapeWaves = dynamic(() => import("./ShapeWaves"), { ssr: false });

type Variant = "linear" | "radial";

/** Fallback halftone and the fade-out mask for the waves, per hero shape. */
const STYLES: Record<Variant, { halftone: string; mask: string }> = {
  linear: { halftone: "halftone-phone md:halftone", mask: "hero-mask-phone md:hero-mask" },
  radial: { halftone: "halftone-radial", mask: "hero-mask-radial" },
};

/** Phones: bigger cells (fewer shapes) and 1× pixels, still animated. */
const DESKTOP = { cellSize: 10, maxDpr: 1.5 };
const PHONE = { cellSize: 14, maxDpr: 1 };

const PHONE_QUERY = "(max-width: 767px)";

/** Caps every pixel (splash included) so hero labels in fg-2 keep >= 4.5:1. */
const WAVES_OPACITY = 0.3;

function subscribePhone(onChange: () => void) {
  const q = window.matchMedia(PHONE_QUERY);
  q.addEventListener("change", onChange);
  return () => q.removeEventListener("change", onChange);
}

type GpuNavigator = Navigator & { gpu?: { requestAdapter(): Promise<unknown> } };

let adapterCheck: Promise<boolean> | null = null;
/** True when the browser can give us a WebGPU adapter. Checked once per visit. */
function hasWebGpu() {
  adapterCheck ??= (async () => {
    try {
      const gpu = (navigator as GpuNavigator).gpu;
      return !!gpu && !!(await gpu.requestAdapter());
    } catch {
      return false;
    }
  })();
  return adapterCheck;
}

/** Reads a hex colour token from :root (ShapeWaves only parses hex). */
function token(name: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return /^#[\da-f]{3}([\da-f]{3})?$/i.test(value) ? value : fallback;
}

type Mode = "pending" | "waves" | "halftone";

/**
 * Fills the hero (which must be `relative`) and clips the background to it.
 * The clipping lives here, not on the hero, so the hero's own controls (search
 * box, filters, buttons) can draw their focus outlines past its edges.
 */
function ClipLayer({ children }: { children: React.ReactNode }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {children}
    </div>
  );
}

/**
 * Animated hero background: React Bits Shape Waves, brass shapes on ink at
 * low contrast, looping, with the demo's cursor splash (lighter shapes ripple
 * out from the pointer). Decorative only — aria-hidden and pointer-events: none
 * (the splash listens on window, so links and inputs above it still work);
 * sized and placed by `className` inside the hero (never behind cards).
 * The hero must be `relative` but not `overflow-hidden`: this clips itself.
 * The wrapper opacity caps every pixel, splash included, so the small muted
 * labels over it keep >= 4.5:1. Reduced motion: still frame, no splash.
 * Falls back to the CSS halftone without WebGPU or if the GPU errors.
 * `desktopOnly`: render nothing below 768 px (heroes with no phone background).
 */
export function HeroBackground({
  className,
  variant = "linear",
  desktopOnly = false,
}: {
  className?: string;
  variant?: Variant;
  desktopOnly?: boolean;
}) {
  const [mode, setMode] = useState<Mode>("pending");
  const reduceMotion = useReducedMotion();
  // Wait for the page title's ink to finish filling, then fade in.
  const titleDrawing = useSyncExternalStore(inkStore.subscribe, inkStore.isDrawing, () => true);
  const phone = useSyncExternalStore(
    subscribePhone,
    () => window.matchMedia(PHONE_QUERY).matches,
    () => false,
  );

  useEffect(() => {
    let live = true;
    void hasWebGpu().then((ok) => live && setMode(ok ? "waves" : "halftone"));
    return () => {
      live = false;
    };
  }, []);

  const style = STYLES[variant];
  const box = cn("pointer-events-none", className);

  // Decorative: draw nothing on the server rather than guess the browser.
  if (mode === "pending" || (desktopOnly && phone)) return null;

  if (mode === "halftone") {
    return (
      <ClipLayer>
        <motion.div
          className={cn(box, style.halftone)}
          initial={{ opacity: 0 }}
          animate={{ opacity: titleDrawing ? 0 : 1 }}
          transition={{ duration: 0.4 }}
        />
      </ClipLayer>
    );
  }

  const ink = token("--ink", "#0f0d0b");
  const brass = token("--brass", "#d9b26f");
  const fg = token("--fg", "#efe6d4");
  const tier = phone ? PHONE : DESKTOP;
  return (
    <ClipLayer>
      <motion.div
        className={cn(box, style.mask)}
        initial={{ opacity: 0 }}
        animate={{ opacity: titleDrawing ? 0 : WAVES_OPACITY }}
        transition={{ duration: 0.6 }}
      >
        <ShapeWaves
          // Remount when crossing the phone breakpoint so the pixel cap applies.
          key={phone ? "phone" : "desktop"}
          shapes="mixed"
          cellSize={tier.cellSize}
          maxDpr={tier.maxDpr}
          dotSize={0.75}
          color={brass}
          hoverColor={fg}
          backgroundColor={ink}
          speed={1}
          scale={1}
          contrast={0.8}
          brightness={0.2}
          fade={0.25}
          glow={0}
          interactive={!reduceMotion}
          splashRadius={40}
          splashStrength={0.4}
          intro
          introDuration={1.6}
          onError={(error) => {
            if (process.env.NODE_ENV !== "production") console.warn("[HeroBackground] WebGPU failed, using the halftone:", error);
            setMode("halftone");
          }}
        />
      </motion.div>
    </ClipLayer>
  );
}
