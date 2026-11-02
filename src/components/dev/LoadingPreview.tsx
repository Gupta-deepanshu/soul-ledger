"use client";

// TEMPORARY preview for /dev/loading. Delete once the loading states are reviewed.

import { useState } from "react";
import { MotionConfig } from "motion/react";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SectionError } from "@/components/ui/SectionError";
import { LedgerLoader, LOADER_MESSAGES } from "@/components/ui/LedgerLoader";
import { Segmented } from "@/components/ui/buttons";
import { EASE } from "@/lib/motion";

export function LoadingPreview({ skeletons }: { skeletons: React.ReactNode }) {
  const [motionMode, setMotionMode] = useState("user");
  // Bumping the key remounts the busy demo, so its retries start over.
  const [run, setRun] = useState(0);
  const [retries, setRetries] = useState(0);

  return (
    <MotionConfig reducedMotion={motionMode === "always" ? "always" : "user"} transition={{ ease: EASE, duration: 0.4 }}>
      <div className="flex flex-col gap-5 py-8 md:py-10">
        <header className="flex flex-col gap-3.5">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-2">Development only · not linked anywhere</p>
          <h1 className="font-serif text-[44px] leading-[0.95] tracking-[-0.02em] md:text-[60px]">
            Loading, <span className="italic text-brass">every state.</span>
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Motion</span>
            <Segmented
              label="Motion preference"
              layoutId="dev-loading-motion"
              options={[
                { value: "user", label: "Follow system" },
                { value: "always", label: "Reduced" },
              ]}
              value={motionMode}
              onChange={setMotionMode}
            />
          </div>
        </header>

        <Card aria-labelledby="hero-loader">
          <SectionHeader numeral="I." title="Hero loader" id="hero-loader" caption="Appears after 600 ms; page-specific messages" />
          <div aria-busy="true" className="flex flex-col gap-4">
            <LedgerLoader messages={LOADER_MESSAGES.default} size="hero" />
            <LedgerLoader messages={LOADER_MESSAGES.live} size="hero" />
          </div>
        </Card>

        <Card aria-labelledby="busy-demo">
          <SectionHeader
            numeral="II."
            title="API busy"
            id="busy-demo"
            caption={`503 with Retry-After: 5 · automatic retries so far: ${retries} (gives up after 3)`}
          />
          <SectionError
            key={run}
            retryKey={`dev-busy-${run}`}
            failure={{ kind: "busy", status: 503, retryAfter: 5 }}
            onRetry={() => setRetries((n) => n + 1)}
          />
          <button
            type="button"
            className="self-start font-mono text-xs text-brass underline underline-offset-4"
            onClick={() => {
              setRetries(0);
              setRun((n) => n + 1);
            }}
          >
            Restart the demo
          </button>
        </Card>

        {skeletons}
      </div>
    </MotionConfig>
  );
}
