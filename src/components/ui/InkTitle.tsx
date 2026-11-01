"use client";

import { Fragment, useCallback, useLayoutEffect, useRef, useState } from "react";
import { cubicBezier } from "motion/react";
import StrokeText, { type StrokeTextBox } from "@/components/ui/StrokeText";
import { inkStore } from "@/lib/ink";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** A run of the title: plain text, or text with its own classes (e.g. "italic text-brass"). */
export type InkPart = string | { text: string; className?: string };

type State = "pending" | "drawing" | "done" | "off";

/** One drawn piece: a run of words from one part, on one line. */
type Piece = {
  key: string;
  text: string;
  left: number;
  /** x of every character of `text` in the real heading, relative to `left`. */
  xs: number[];
  /** Width of the real words, for the shared fill sweep. */
  width: number;
  /** When this piece's fill starts and how long it runs (one sweep per line). */
  fill: { delay: number; duration: number };
  baseline: number;
  font: { family: string; size: number; weight: string; style: string; letterSpacing: number };
  color: string;
};

const ease = cubicBezier(...EASE);
// ~1.3 s for a full title: outline 0.5 s (+12 ms per letter), then an unhurried
// 0.8 s left-to-right fill that starts as the first letters close their outline,
// so the ink flows on from the drawing instead of snapping in.
const DRAW_S = 0.5;
const STAGGER_S = 0.012;
const FILL_S = 0.8;

/**
 * Page title drawn in ink: the outline draws, then fills, once per page visit
 * (React Bits StrokeText, laid over the real heading line by line).
 *
 * The real <h1> always holds the full text for screen readers and SEO and keeps
 * its natural wrapping, so nothing shifts; its letters are only hidden while the
 * aria-hidden drawn copy plays, then it takes over again. Reduced motion,
 * a hidden heading or a truncated one (e.g. a long player name) show the
 * plain heading straight away. `enabled={false}` turns the effect off.
 */
export function InkTitle({
  parts,
  className,
  enabled = true,
}: {
  parts: InkPart[];
  className?: string;
  enabled?: boolean;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [state, setState] = useState<State>(enabled ? "pending" : "off");
  const [pieces, setPieces] = useState<Piece[]>([]);
  const remaining = useRef(0);
  const registered = useRef(false);

  const finish = useCallback(() => {
    if (registered.current) {
      registered.current = false;
      inkStore.end();
    }
    setState((s) => (s === "drawing" || s === "pending" ? "done" : s));
  }, []);

  useLayoutEffect(() => {
    if (state !== "pending") return;
    const h1 = ref.current;
    if (!h1) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !h1.getClientRects().length) {
      setState("off");
      return;
    }
    registered.current = true;
    inkStore.begin();

    let cancelled = false;
    void document.fonts.ready.then(() => {
      if (cancelled) return;
      // Truncated (ellipsis) headings can't be traced faithfully.
      if (h1.scrollWidth > h1.clientWidth + 1) return finish();
      const next = measure(h1);
      if (!next.length) return finish();
      remaining.current = next.length;
      setPieces(planFill(next));
      setState("drawing");
    });
    // A resize mid-draw would misplace the pieces: just show the real text.
    const onResize = () => finish();
    window.addEventListener("resize", onResize);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
    };
  }, [state, finish]);

  // Leaving the page mid-draw must not keep the hero background waiting.
  useLayoutEffect(
    () => () => {
      if (registered.current) {
        registered.current = false;
        inkStore.end();
      }
    },
    [],
  );

  const onPieceDone = useCallback(() => {
    remaining.current -= 1;
    if (remaining.current <= 0) finish();
  }, [finish]);

  return (
    <h1 ref={ref} data-ink-state={state} className={cn("relative", className)}>
      {parts.map((part, i) => {
        const { text, className: partClass } = typeof part === "string" ? { text: part, className: undefined } : part;
        return (
          // While drawing, the real letters are hidden inline (not only via CSS), so a
          // stale or missing stylesheet can never show both copies at once.
          <span key={i} data-ink-part={i} className={partClass} style={state === "drawing" ? { opacity: 0 } : undefined}>
            {text.split(/(\s+)/).map((token, j) =>
              /^\s+$/.test(token) || token === "" ? (
                <Fragment key={j}>{token}</Fragment>
              ) : (
                <span key={j} data-ink-word="">
                  {token}
                </span>
              ),
            )}
          </span>
        );
      })}
      {state === "drawing" && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-visible">
          {pieces.map((piece) => (
            <InkPiece key={piece.key} piece={piece} onDone={onPieceDone} />
          ))}
        </span>
      )}
    </h1>
  );
}

function InkPiece({ piece, onDone }: { piece: Piece; onDone: () => void }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [box, setBox] = useState<StrokeTextBox | null>(null);
  const { font } = piece;

  // StrokeText sets each letter in its own <tspan>, which drops the font's
  // kerning, so letters drift a few px from the real heading. Pin every letter
  // (outline, fill and mask copies) to its measured x in the real text.
  useLayoutEffect(() => {
    if (!box) return;
    const x = piece.xs.map((v) => v.toFixed(2)).join(" ");
    ref.current?.querySelectorAll("svg text").forEach((t) => t.setAttribute("x", x));
  }, [box, piece.xs]);

  return (
    <span
      ref={ref}
      className="absolute block"
      style={
        box
          ? {
              left: piece.left + box.x,
              top: piece.baseline + box.y,
              width: box.width,
            }
          : { left: piece.left, top: piece.baseline - font.size, width: font.size * piece.text.length }
      }
    >
      <StrokeText
        text={piece.text}
        fontFamily={font.family}
        fontSize={font.size}
        fontWeight={font.weight}
        letterSpacing={font.letterSpacing}
        style={{ fontStyle: font.style }}
        strokeColor={piece.color}
        fillColor={piece.color}
        strokeWidth={Math.max(1, font.size / 56)}
        drawDuration={DRAW_S}
        stagger={STAGGER_S}
        fillDelay={piece.fill.delay}
        fillDuration={piece.fill.duration}
        fillEase="none"
        ease={ease}
        trigger="mount"
        fillMode="wipe"
        onLayout={setBox}
        onComplete={onDone}
      />
    </span>
  );
}

/** Inverse of sine.inOut: the time (0–1) at which the sweep reaches progress p. */
const sineInOutInverse = (p: number) => Math.acos(1 - 2 * Math.min(1, Math.max(0, p))) / Math.PI;

/**
 * One fill sweep per line: pieces sharing a baseline (e.g. "The meta, kept " and the
 * brass "in ink.") hand the wipe on to each other, so it crosses the line as a
 * single sine.inOut stroke instead of several side-by-side wipes. Each piece runs
 * its slice of that curve linearly; the slices are short, so the joins don't show.
 */
function planFill(pieces: Piece[]): Piece[] {
  const lines = new Map<number, Piece[]>();
  for (const p of pieces) {
    const key = Math.round(p.baseline);
    lines.set(key, [...(lines.get(key) ?? []), p]);
  }
  return pieces.map((p) => {
    const line = lines.get(Math.round(p.baseline)) ?? [p];
    const start = Math.min(...line.map((q) => q.left));
    const end = Math.max(...line.map((q) => q.left + q.width));
    const span = Math.max(1, end - start);
    const t0 = sineInOutInverse((p.left - start) / span);
    const t1 = sineInOutInverse((p.left + p.width - start) / span);
    return { ...p, fill: { delay: t0 * FILL_S, duration: Math.max(0.05, (t1 - t0) * FILL_S) } };
  });
}
/** Left edge of every character in a word, from the real layout. */
function charLefts(word: HTMLElement): number[] {
  const node = word.firstChild;
  if (!node || node.nodeType !== Node.TEXT_NODE) return [];
  const text = node.textContent ?? "";
  const range = document.createRange();
  const xs: number[] = [];
  // Step by code point so surrogate pairs stay one character, like Array.from in StrokeText.
  let i = 0;
  for (const ch of text) {
    range.setStart(node, i);
    range.setEnd(node, i + ch.length);
    xs.push(range.getBoundingClientRect().left);
    i += ch.length;
  }
  return xs;
}

/** Splits the laid-out heading into one piece per (part, line), in h1 coordinates. */
function measure(h1: HTMLElement): Piece[] {
  const origin = h1.getBoundingClientRect();
  const ctx = document.createElement("canvas").getContext("2d");
  const pieces: Piece[] = [];

  for (const part of h1.querySelectorAll<HTMLElement>("[data-ink-part]")) {
    const cs = getComputedStyle(part);
    const size = parseFloat(cs.fontSize);
    const font = {
      family: cs.fontFamily,
      size,
      weight: cs.fontWeight,
      style: cs.fontStyle,
      letterSpacing: cs.letterSpacing === "normal" ? 0 : parseFloat(cs.letterSpacing),
    };
    // Inline boxes span the font's ascent + descent; the baseline sits `descent` above the bottom.
    let descent = size * 0.25;
    if (ctx) {
      ctx.font = `${font.style} ${font.weight} ${size}px ${font.family}`;
      const m = ctx.measureText("Hg");
      if (m.fontBoundingBoxDescent) descent = m.fontBoundingBoxDescent;
    }

    // Group this part's words by the line they landed on.
    const lines: { top: number; left: number; bottom: number; prevRight: number; words: string[]; xs: number[] }[] = [];
    for (const word of part.querySelectorAll<HTMLElement>("[data-ink-word]")) {
      const r = word.getClientRects()[0];
      if (!r) continue;
      const chars = charLefts(word);
      const last = lines.at(-1);
      if (last && Math.abs(r.top - last.top) <= 1) {
        // The joining space sits where the previous word ends.
        last.xs.push(last.prevRight - last.left, ...chars.map((x) => x - last.left));
        last.words.push(word.textContent ?? "");
        last.prevRight = r.right;
      } else {
        lines.push({ top: r.top, left: r.left, bottom: r.bottom, words: [word.textContent ?? ""], xs: chars.map((x) => x - r.left), prevRight: r.right });
      }
    }
    for (const l of lines) {
      pieces.push({
        key: `${part.dataset.inkPart}-${pieces.length}`,
        text: l.words.join(" "),
        left: l.left - origin.left,
        xs: l.xs,
        width: l.prevRight - l.left,
        fill: { delay: 0, duration: FILL_S },
        baseline: l.bottom - descent - origin.top,
        font,
        color: cs.color,
      });
    }
  }
  return pieces;
}
