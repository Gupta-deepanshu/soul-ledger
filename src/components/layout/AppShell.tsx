"use client";

import { MotionConfig } from "motion/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EASE } from "@/lib/motion";

/** Site-wide motion and tooltip defaults, and the centred 1360 px content column. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ ease: EASE, duration: 0.4 }}>
      <TooltipProvider delayDuration={200}>
        <div className="mx-auto flex min-h-dvh w-full max-w-[1360px] flex-col px-4 pb-28 md:px-7 md:pb-16 xl:px-10">
          {children}
        </div>
      </TooltipProvider>
    </MotionConfig>
  );
}
