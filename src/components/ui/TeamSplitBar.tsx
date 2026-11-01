"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { formatCompact } from "@/lib/format";
import { KING, MOTHER, TEAMS, type TeamId } from "@/lib/deadlock/teams";

/** Hidden King then Archmother, widths proportional to souls. Resizes smoothly on each update. */
export function TeamSplitBar({ souls, className }: { souls: Record<TeamId, number>; className?: string }) {
  const king = souls[KING];
  const mother = souls[MOTHER];
  const even = king + mother === 0;
  return (
    <div
      role="img"
      aria-label={`${TEAMS[KING].name} ${formatCompact(king)} souls, ${TEAMS[MOTHER].name} ${formatCompact(mother)} souls`}
      className={cn("flex h-1.5 gap-0.5", className)}
    >
      <motion.div layout className={TEAMS[KING].fillClass} style={{ flexGrow: even ? 1 : king, flexBasis: 0 }} />
      <motion.div layout className={TEAMS[MOTHER].fillClass} style={{ flexGrow: even ? 1 : mother, flexBasis: 0 }} />
    </div>
  );
}
