"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type HeroTileProps = {
  name: string;
  iconUrl: string | null;
  /** Edge length in px. Override per breakpoint with a class, e.g. `xl:[--tile:34px]`. */
  size: number;
  /** Set when the hero's name is not shown next to the tile, so the image needs alt text. */
  labelled?: boolean;
  /** Border colour class; defaults to `border-line-muted` (use a team colour in team contexts). */
  borderClass?: string;
  className?: string;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2);
}

// The API's hero icons are already ~10 KB WebPs: served as is (`unoptimized`) to save Vercel's free image transformations.
/** Square hero portrait from the API; serif initials in brass if the image is missing or fails. */
export function HeroTile({ name, iconUrl, size, labelled = false, borderClass = "border-line-muted", className }: HeroTileProps) {
  const [failed, setFailed] = useState(false);
  const showImage = iconUrl && !failed;
  return (
    <span
      className={cn(
        "relative flex size-[var(--tile,var(--tile-base))] shrink-0 items-center justify-center overflow-hidden border bg-surface-2",
        borderClass,
        className,
      )}
      style={{ "--tile-base": `${size}px` } as React.CSSProperties}
    >
      {showImage ? (
        <Image
          src={iconUrl}
          alt={labelled ? name : ""}
          fill
          sizes="48px"
          unoptimized
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          aria-label={labelled ? name : undefined}
          aria-hidden={labelled ? undefined : true}
          role={labelled ? "img" : undefined}
          className="font-serif text-[calc(var(--tile,var(--tile-base))*0.52)] leading-none text-brass"
        >
          {initials(name)}
        </span>
      )}
    </span>
  );
}
