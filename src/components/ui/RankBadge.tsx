"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type RankBadgeProps = {
  /** null = unranked. */
  rank: { name: string; numeral: string; imageUrl: string | null } | null;
  className?: string;
};

/** The API's rank badge image with the rank name; a brass diamond if the image is missing. */
export function RankBadge({ rank, className }: RankBadgeProps) {
  const [failed, setFailed] = useState(false);
  if (!rank) return <span className={cn("font-mono text-xs text-muted-foreground", className)}>Unranked</span>;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[13px]", className)}>
      {rank.imageUrl && !failed ? (
        // Kept optimised on purpose: the API's rank files are 15–200 KB (drawn for large sizes) and
        // shown at 20 px, while there are only ~80 of them, so they cost few transformations.
        <Image src={rank.imageUrl} alt="" width={20} height={20} className="size-5" onError={() => setFailed(true)} />
      ) : (
        <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3">
          <rect x="2.5" y="2.5" width="7" height="7" transform="rotate(45 6 6)" fill="var(--brass)" />
        </svg>
      )}
      <span>
        {rank.name} <span className="font-serif text-[15px]">{rank.numeral}</span>
      </span>
    </span>
  );
}
