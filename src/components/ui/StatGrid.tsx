import { AnimatedNumber, type NumberFormat } from "./AnimatedNumber";

export type Stat = {
  label: string;
  value: number;
  format: NumberFormat;
  note?: React.ReactNode;
};

/**
 * KPI cells. Phone and tablet: a 2×2 grid with 1 px `line` gaps.
 * Desktop: one row of cells divided by vertical rules.
 */
export function StatGrid({ stats, label }: { stats: Stat[]; label: string }) {
  return (
    <section
      aria-label={label}
      className="grid grid-cols-2 gap-px border border-line bg-line xl:grid-cols-[repeat(auto-fit,minmax(240px,1fr))] xl:gap-0 xl:border-0 xl:border-b xl:bg-transparent"
    >
      {stats.map((stat) => (
        <StatCell key={stat.label} label={stat.label} note={stat.note}>
          <AnimatedNumber value={stat.value} format={stat.format} />
        </StatCell>
      ))}
    </section>
  );
}

export function StatCell({ label, note, children }: { label: string; note?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 bg-ink p-3.5 md:gap-1.5 md:px-5 md:py-[18px] xl:mr-6 xl:gap-2 xl:border-r xl:border-line xl:py-[26px] xl:pr-6 xl:pl-0">
      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground md:text-[11px] md:tracking-[0.1em]">
        {label}
      </span>
      <span className="font-serif text-[34px] leading-none md:text-[44px] xl:text-[52px]">{children}</span>
      {note && <span className="text-xs text-muted-foreground md:text-[13px]">{note}</span>}
    </div>
  );
}
