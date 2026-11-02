import { AnimatedNumber, type NumberFormat } from "./AnimatedNumber";

export type Stat = {
  label: string;
  value: number;
  format: NumberFormat;
  note?: React.ReactNode;
};

/**
 * The row the cells sit in.
 * Phone and tablet: a 2×2 grid; the `line` background shows through 1 px gaps
 * between ink cells (MetaTablet / MetaMobile).
 * Desktop: equal columns across the full content width, a rule along the
 * bottom (the hero's border is the top rule), dividers only between cells.
 */
export function StatRow({
  label,
  columns,
  busy,
  children,
}: {
  label: string;
  /** Cells in the desktop row. */
  columns: number;
  busy?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={label}
      aria-busy={busy || undefined}
      style={{ "--stat-cols": columns } as React.CSSProperties}
      className="grid grid-cols-2 gap-px border border-line bg-line xl:grid-cols-[repeat(var(--stat-cols),minmax(0,1fr))] xl:gap-0 xl:border-0 xl:border-b xl:bg-transparent"
    >
      {children}
    </section>
  );
}

/** KPI cells (Meta patch totals, player career totals). */
export function StatGrid({ stats, label }: { stats: Stat[]; label: string }) {
  return (
    <StatRow label={label} columns={stats.length}>
      {stats.map((stat) => (
        <StatCell key={stat.label} label={stat.label} note={stat.note}>
          <AnimatedNumber value={stat.value} format={stat.format} />
        </StatCell>
      ))}
    </StatRow>
  );
}

export function StatCell({ label, note, children }: { label: string; note?: React.ReactNode; children: React.ReactNode }) {
  return (
    // Phone/tablet: the ink fill hides the row's `line` background except in the 1 px gaps.
    // Desktop: no fill (as in Main.dc.html); equal padding, a left divider on every
    // cell but the first, and no left padding on the first so its text lines up
    // with the page's left edge. Nothing after the last cell.
    <div className="flex min-w-0 flex-col gap-1 bg-ink p-3.5 md:gap-1.5 md:px-5 md:py-[18px] xl:gap-2 xl:border-l xl:border-line xl:bg-transparent xl:px-6 xl:py-[26px] xl:first:border-l-0 xl:first:pl-0">
      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground md:text-[11px] md:tracking-[0.1em]">
        {label}
      </span>
      <span className="font-serif text-[34px] leading-none md:text-[44px] xl:text-[52px]">{children}</span>
      {note && <span className="text-xs text-muted-foreground md:text-[13px]">{note}</span>}
    </div>
  );
}
