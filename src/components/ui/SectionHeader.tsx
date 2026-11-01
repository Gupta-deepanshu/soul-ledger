import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  /** Roman numeral, e.g. "I." Omit for a section without one. */
  numeral?: string;
  title: string;
  /** id for the h2, so the card can be labelled by it. */
  id?: string;
  caption?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

export function SectionHeader({ numeral, title, id, caption, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="flex flex-col gap-[3px] md:gap-1">
        {numeral && <span className="font-mono text-[11px] tracking-[0.1em] text-brass">{numeral}</span>}
        <h2 id={id} className="font-serif text-[28px] leading-none md:text-[30px] xl:text-[32px]">
          {title}
        </h2>
        {caption && <p className="text-xs text-muted-foreground md:text-[13px]">{caption}</p>}
      </div>
      {action}
    </div>
  );
}
