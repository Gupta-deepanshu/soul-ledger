import { cn } from "@/lib/utils";
import { formatSigned } from "@/lib/format";

/** A change in percentage points: "▲ +1.8" in brass, "▼ −2.0" in mother-text, "new" when there's nothing to compare. */
export function Delta({ value, arrow = true, className }: { value: number | null; arrow?: boolean; className?: string }) {
  if (value == null) return <span className={cn("font-mono text-muted-foreground", className)}>new</span>;
  const text = formatSigned(value);
  const rounded = Number(Math.abs(value).toFixed(1));
  if (rounded === 0) return <span className={cn("font-mono text-muted-foreground", className)}>{text}</span>;
  const up = value > 0;
  return (
    <span className={cn("font-mono", up ? "text-brass" : "text-mother-text", className)}>
      {arrow && <span aria-hidden="true">{up ? "▲ " : "▼ "}</span>}
      <span className="sr-only">{up ? "up " : "down "}</span>
      {text}
    </span>
  );
}
