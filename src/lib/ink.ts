/**
 * Page-title "ink" coordination. InkTitle reports while its outline/fill is
 * playing; HeroBackground waits for it to finish before fading the Shape
 * Waves in. One hero per page, so a simple counter is enough.
 */

let drawing = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const inkStore = {
  begin() {
    drawing += 1;
    emit();
  },
  end() {
    drawing = Math.max(0, drawing - 1);
    emit();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  isDrawing: () => drawing > 0,
};

/** Longest player name that still gets the effect (longer names show as plain text). */
export const INK_MAX_NAME = 20;

/**
 * Code points covered by the Instrument Serif "latin" subset we load
 * (next/font unicode-range). Anything else would render in a fallback font.
 */
const LATIN_SUBSET: [number, number][] = [
  [0x0000, 0x00ff],
  [0x0131, 0x0131],
  [0x0152, 0x0153],
  [0x02bb, 0x02bc],
  [0x02c6, 0x02c6],
  [0x02da, 0x02da],
  [0x02dc, 0x02dc],
  [0x0304, 0x0304],
  [0x0308, 0x0308],
  [0x0329, 0x0329],
  [0x2000, 0x206f],
  [0x20ac, 0x20ac],
  [0x2122, 0x2122],
  [0x2191, 0x2191],
  [0x2193, 0x2193],
  [0x2212, 0x2212],
  [0x2215, 0x2215],
  [0xfeff, 0xfeff],
  [0xfffd, 0xfffd],
];

export function instrumentSerifCanRender(text: string) {
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    if (!LATIN_SUBSET.some(([lo, hi]) => cp >= lo && cp <= hi)) return false;
  }
  return true;
}

/** Player names: the effect only for short names Instrument Serif can draw. */
export function canInkName(name: string) {
  return [...name].length <= INK_MAX_NAME && instrumentSerifCanRender(name);
}
