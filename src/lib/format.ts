// Number, time and percentage formatting. Uses a real minus sign (U+2212).

const MINUS = "−";

/** 1840000 → "1.84M", 12400 → "12.4k", 950 → "950". */
export function formatCompact(value: number, digits = 3): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? MINUS : "";
  const units: [number, string][] = [
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "k"],
  ];
  for (const [size, suffix] of units) {
    if (abs >= size) return sign + trimNumber(abs / size, digits) + suffix;
  }
  return sign + Math.round(abs).toString();
}

function trimNumber(value: number, digits: number): string {
  return Number(value.toPrecision(digits)).toString();
}

/** 12345 → "12,345". */
export function formatInt(value: number): string {
  return Math.round(value).toLocaleString("en-US").replace("-", MINUS);
}

/** 0.5234 → "52.3%". Takes a 0–1 ratio. */
export function formatPercent(ratio: number, decimals = 1): string {
  return (ratio * 100).toFixed(decimals).replace("-", MINUS) + "%";
}

/** 1.8 → "+1.8", −2 → "−2.0", 0 → "0.0". */
export function formatSigned(value: number, decimals = 1): string {
  const fixed = Math.abs(value).toFixed(decimals);
  if (Number(fixed) === 0) return fixed;
  return (value > 0 ? "+" : MINUS) + fixed;
}

/** Seconds → "27:55", or "1:02:05" past an hour. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = String(s % 60).padStart(2, "0");
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}

/** Unix seconds → "Oct 15, 2026" (or "Oct 15" without the year). UTC. */
export function formatDate(unixSeconds: number, withYear = true): string {
  return new Date(unixSeconds * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: withYear ? "numeric" : undefined,
    timeZone: "UTC",
  });
}

/** KDA to one decimal: 3.456 → "3.5". */
export function formatKda(value: number): string {
  return value.toFixed(1);
}
