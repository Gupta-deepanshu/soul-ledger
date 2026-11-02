"use client";

// TEMPORARY preview for /dev/buttons. Delete once the buttons are rolled out.

import { useState, type ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { RotateCw, Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  ArrowLink,
  BracketButton,
  CooldownTicks,
  IconButton,
  Segmented,
  StampButton,
  type PreviewState,
} from "@/components/ui/buttons";
import { EASE } from "@/lib/motion";

type State = "default" | PreviewState | "disabled" | "loading";
const STATES: { key: State; label: string }[] = [
  { key: "default", label: "Default" },
  { key: "hover", label: "Hover" },
  { key: "pressed", label: "Pressed" },
  { key: "focus", label: "Focus" },
  { key: "disabled", label: "Disabled" },
  { key: "loading", label: "Loading" },
];

/** Props that put a button in one of the preview states. */
function stateProps(state: State) {
  return {
    previewState: state === "hover" || state === "pressed" || state === "focus" ? state : undefined,
    disabled: state === "disabled",
    loading: state === "loading",
  };
}

const RANKS = [
  { value: "all", label: "All ranks" },
  { value: "8", label: "Oracle +" },
  { value: "10", label: "Ascendant +" },
];

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-2.5">
      <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
      <div className="flex min-h-14 items-center">{children}</div>
    </div>
  );
}

function TypeCard({
  index,
  title,
  caption,
  render,
  live,
}: {
  index: number;
  title: string;
  caption: string;
  render: (state: State) => ReactNode;
  live: ReactNode;
}) {
  const id = `type-${index}`;
  return (
    <Card index={index} aria-labelledby={id}>
      <SectionHeader numeral={`${["I", "II", "III", "IV", "V"][index]}.`} title={title} id={id} caption={caption} />
      <div className="grid grid-cols-2 gap-x-4 gap-y-5 md:grid-cols-3 xl:grid-cols-7">
        {STATES.map((s) => (
          <Cell key={s.key} label={s.label}>
            {render(s.key)}
          </Cell>
        ))}
        <Cell label="Try it">{live}</Cell>
      </div>
    </Card>
  );
}

const COOLDOWNS = [
  { value: "12", label: "12 s demo" },
  { value: "60", label: "60 s (real)" },
];

function RefreshDemo() {
  const [cooldownS, setCooldownS] = useState("12");
  const [loading, setLoading] = useState(false);
  const [until, setUntil] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const waiting = until != null;

  function refresh() {
    setLoading(true);
    window.setTimeout(() => {
      const ms = Number(cooldownS) * 1000;
      setLoading(false);
      setUntil(Date.now() + ms);
      setStatus("Updated. Refresh available again in about a minute.");
      window.setTimeout(() => {
        setUntil(null);
        setStatus("Ready to refresh.");
      }, ms);
    }, 1200);
  }

  return (
    <div className="flex flex-col gap-5">
      <Segmented
        label="Cooldown length"
        layoutId="dev-cooldown"
        options={COOLDOWNS}
        value={cooldownS}
        onChange={setCooldownS}
        look="underline"
      />
      <div className="flex w-full max-w-60 flex-col gap-2">
        <StampButton onClick={refresh} loading={loading} disabled={waiting}>
          <RotateCw size={16} strokeWidth={1.5} aria-hidden="true" />
          Refresh matches
        </StampButton>
        <CooldownTicks until={until} durationS={Number(cooldownS)} />
        <p role="status" className="sr-only">
          {status}
        </p>
      </div>
    </div>
  );
}

export function ButtonsPreview() {
  const [motionMode, setMotionMode] = useState("user");
  const [rank, setRank] = useState("all");
  const [rankUnderline, setRankUnderline] = useState("all");
  const [rankBorder, setRankBorder] = useState("all");
  const [clicks, setClicks] = useState(0);

  return (
    <MotionConfig reducedMotion={motionMode === "always" ? "always" : "user"} transition={{ ease: EASE, duration: 0.4 }}>
      <div className="flex flex-col gap-5 py-8 md:py-10">
        <header className="flex flex-col gap-3.5">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-2">Development only · not linked anywhere</p>
          <h1 className="font-serif text-[44px] leading-[0.95] tracking-[-0.02em] md:text-[60px]">
            Buttons, <span className="italic text-brass">every state.</span>
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Hover, pressed and focus are pinned so they sit side by side; use “Try it” for the real thing. Tab through
            the page to see the keyboard focus ring. Clicked {clicks} times.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Motion</span>
            <Segmented
              label="Motion preference"
              layoutId="dev-motion"
              options={[
                { value: "user", label: "Follow system" },
                { value: "always", label: "Reduced" },
              ]}
              value={motionMode}
              onChange={setMotionMode}
            />
          </div>
        </header>

        <TypeCard
          index={0}
          title="Stamp"
          caption="Primary · brass fill · hover wipes darker brass from the left · press 0.97"
          render={(s) => <StampButton {...stateProps(s)}>Refresh matches</StampButton>}
          live={<StampButton onClick={() => setClicks((c) => c + 1)}>Search</StampButton>}
        />
        <TypeCard
          index={1}
          title="Bracket"
          caption="Secondary · line-strong outline · hover slides brass corner brackets in"
          render={(s) => <BracketButton {...stateProps(s)}>Show more matches</BracketButton>}
          live={<BracketButton onClick={() => setClicks((c) => c + 1)}>Show all 44 heroes</BracketButton>}
        />
        <TypeCard
          index={2}
          title="Icon"
          caption="Square outline · icon nudges 2 px · desktop magnet pull, max 4 px"
          render={(s) => (
            <IconButton {...stateProps(s)} aria-label="Search players" icon={<Search size={18} strokeWidth={1.5} />} />
          )}
          live={
            <IconButton
              aria-label="Search players"
              icon={<Search size={18} strokeWidth={1.5} />}
              onClick={() => setClicks((c) => c + 1)}
            />
          }
        />
        <TypeCard
          index={3}
          title="Arrow link"
          caption="Brass text · arrow slides 3 px right"
          render={(s) => (
            <ArrowLink {...stateProps(s)} href="/dev/buttons">
              Read the patch notes
            </ArrowLink>
          )}
          live={<ArrowLink href="/">Open the meta</ArrowLink>}
        />
        <TypeCard
          index={4}
          title="Segmented"
          caption="Shared layoutId highlight · hover and press are colour-only · no loading state"
          render={(s) =>
            s === "loading" ? (
              <span className="font-mono text-xs text-tick">n/a</span>
            ) : (
              <Segmented
                label={`Rank filter (${s})`}
                layoutId={`dev-seg-${s}`}
                options={RANKS.map((o) => ({ ...o, disabled: s === "disabled" && o.value === "10" }))}
                value="all"
                onChange={() => {}}
                preview={s === "hover" || s === "pressed" || s === "focus" ? { value: "8", state: s } : undefined}
                optionClassName="px-2.5"
              />
            )
          }
          live={<Segmented label="Rank filter" layoutId="dev-seg-live" options={RANKS} value={rank} onChange={setRank} />}
        />

        <Card index={5} aria-labelledby="looks-title">
          <SectionHeader title="Segmented looks" id="looks-title" caption="Fill (Live rank chips) · border (item slots) · underline (nav)" />
          <div className="flex flex-col gap-5">
            <Segmented label="Fill" layoutId="dev-look-fill" options={RANKS} value={rank} onChange={setRank} look="fill" />
            <Segmented label="Border" layoutId="dev-look-border" options={RANKS} value={rankBorder} onChange={setRankBorder} look="border" />
            <Segmented
              label="Underline"
              layoutId="dev-look-underline"
              options={RANKS}
              value={rankUnderline}
              onChange={setRankUnderline}
              look="underline"
            />
          </div>
        </Card>

        <Card index={6} aria-labelledby="cooldown-title">
          <SectionHeader
            title="Refresh cooldown"
            id="cooldown-title"
            caption="After a refresh the stamp is disabled and 25 ticks empty over the cooldown"
          />
          <RefreshDemo />
        </Card>
      </div>
    </MotionConfig>
  );
}
