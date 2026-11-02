// WCAG contrast helpers for picking readable text on data-driven fills.
// Hex values here mirror tokens in globals.css (charts need the numbers).

export const INK = "#0f0d0b";
export const FG = "#efe6d4";
export const SURFACE = "#17140f";

type Rgb = [number, number, number];

function rgb(hex: string): Rgb {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
}

function luminance([r, g, b]: Rgb): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function ratio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** `colour` laid over `base` at `alpha` (0–1), like `color-mix(in srgb, colour alpha%, base)`. */
function mix(colour: string, base: string, alpha: number): Rgb {
  const c = rgb(colour);
  const b = rgb(base);
  return c.map((v, i) => Math.round(v * alpha + b[i] * (1 - alpha))) as Rgb;
}

/** Contrast ratio between two hex colours. */
export function contrast(a: string, b: string): number {
  return ratio(rgb(a), rgb(b));
}

/** Ink or fg text on `colour` over `base` at `alpha`: whichever contrasts more, with its ratio. */
export function bestText(colour: string, alpha = 1, base = SURFACE): { text: "ink" | "fg"; ratio: number } {
  const bg = mix(colour, base, alpha);
  const onInk = ratio(bg, rgb(INK));
  const onFg = ratio(bg, rgb(FG));
  return onInk >= onFg ? { text: "ink", ratio: onInk } : { text: "fg", ratio: onFg };
}
