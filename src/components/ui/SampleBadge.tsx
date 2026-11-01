import { cn } from "@/lib/utils";

/** Marks pages that are showing saved fixtures instead of live API data. */
export function SampleBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "border border-dashed border-line-muted px-[7px] py-[5px] font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground xl:px-2 xl:py-1.5 xl:text-[11px]",
        className,
      )}
    >
      Sample data
    </span>
  );
}
