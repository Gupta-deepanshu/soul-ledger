"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { FilterSelect } from "@/components/ui/FilterSelect";
import type { RankFilterOption } from "@/lib/deadlock/meta";

/** Minimum-rank filter. Stored in the URL (`?rank=8`) so filtered views can be shared. */
export function RankFilter({ options, value }: { options: RankFilterOption[]; value: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onChange(next: string) {
    startTransition(() => router.replace(next === "all" ? "/" : `/?rank=${next}`, { scroll: false }));
  }

  return <FilterSelect id="rank-filter" label="Rank range" options={options} value={value} onChange={onChange} pending={pending} />;
}
