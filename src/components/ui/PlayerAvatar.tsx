"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type PlayerAvatarProps = {
  /** Steam avatar URL, or null when the player has none (shows the initials). */
  avatarUrl: string | null;
  initials: string;
  /** Alt text for the image; leave empty when the name is shown right next to it. */
  alt?: string;
  /** `sizes` hint for next/image, e.g. "120px". */
  sizes: string;
  /** Size, border, fill and initials type size (the initials inherit the font size). */
  className?: string;
};

// Steam avatars are ~15 KB JPEGs, one per player (unbounded), so optimising them would use up
// Vercel's 5,000 free image transformations: they are served as is (`unoptimized`).
/** Square Steam avatar; brass serif initials if there is none or it fails to load. */
export function PlayerAvatar({ avatarUrl, initials, alt = "", sizes, className }: PlayerAvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = avatarUrl && !failed;
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden border border-line-muted font-serif italic text-brass",
        className,
      )}
    >
      {showImage ? (
        <Image src={avatarUrl} alt={alt} fill sizes={sizes} unoptimized className="object-cover" onError={() => setFailed(true)} />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </span>
  );
}
