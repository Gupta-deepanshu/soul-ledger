"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type FilterSelectProps = {
  id: string;
  /** Visually hidden label. */
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  pending?: boolean;
};

/** The 44 px filter select used in page heroes. */
export function FilterSelect({ id, label, options, value, onChange, pending }: FilterSelectProps) {
  return (
    <>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          id={id}
          aria-busy={pending}
          className="h-11 min-w-36 rounded-[4px] border-line-strong bg-surface px-3 text-sm text-fg data-[size=default]:h-11 dark:bg-surface dark:hover:bg-surface-2"
        >
          {/* Explicit label so the server-rendered HTML isn't blank before hydration. */}
          <SelectValue>{options.find((o) => o.value === value)?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent position="popper" className="rounded-[4px] border border-line-strong bg-surface shadow-none ring-0">
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} className="min-h-11 text-sm">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
