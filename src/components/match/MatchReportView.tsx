import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SampleBadge } from "@/components/ui/SampleBadge";
import { LocalTime } from "@/components/ui/LocalTime";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { SoulsLeadChart } from "@/components/charts/SoulsLeadChart";
import { DamageShare } from "@/components/charts/DamageShare";
import { formatCompact, formatDuration, formatInt } from "@/lib/format";
import { KING, MOTHER, TEAMS, type TeamId } from "@/lib/deadlock/teams";
import type { MatchView } from "@/lib/deadlock/match";
import { BuildOrder } from "./BuildOrder";
import { EventHighlightProvider } from "./EventHighlight";
import { ObjectiveList } from "./ObjectiveList";
import { Scoreboard } from "./Scoreboard";
import { InkTitle } from "@/components/ui/InkTitle";

function TeamCell({ view, team }: { view: MatchView; team: TeamId }) {
  const t = TEAMS[team];
  const s = view.teams[team];
  return (
    <div className={cn("flex flex-col gap-1 border-t-[3px] bg-surface p-3 md:gap-1.5 md:px-[18px] md:py-4 xl:px-5 xl:py-[18px]", t.borderClass)}>
      <span className="text-xs text-muted-foreground md:text-[13px]">
        {t.shortName}
        {s.won && (
          <>
            {" · "}
            <span className={t.textClass}>Win</span>
          </>
        )}
      </span>
      <span className="font-serif text-[32px] leading-none md:text-[40px] xl:text-[44px]">
        <AnimatedNumber value={s.souls} format="compact" />
      </span>
      <span className="font-mono text-[11px] text-muted-foreground xl:text-xs">
        souls · {s.kills} kills · {s.objectives} objectives
      </span>
    </div>
  );
}

function MatchHero({ view, sample }: { view: MatchView; sample: boolean }) {
  const winner = TEAMS[view.winner];
  const meta = (dateOnly: boolean) => (
    <>
      {view.ranked ? "Ranked" : "Unranked"} · {formatDuration(view.durationS)} · <LocalTime unix={view.startTime} dateOnly={dateOnly} />
      {view.avgRank && ` · avg ${view.avgRank}`}
    </>
  );
  return (
    <>
      <nav aria-label="Breadcrumb" className="flex items-center justify-between gap-3 pt-[18px] font-mono text-[11px] text-muted-foreground md:pt-1.5 md:text-xs xl:pt-5">
        <span>
          <Link href="/live" className="hover:text-fg">
            Matches
          </Link>{" "}
          / № {formatInt(view.id)}
        </span>
        {sample && <SampleBadge className="md:hidden" />}
      </nav>
      <section className="flex flex-col gap-3 border-b border-line pt-3 pb-4 md:gap-3.5 md:pt-3.5 md:pb-6 xl:flex-row xl:flex-wrap xl:items-end xl:justify-between xl:gap-8 xl:pt-7 xl:pb-9">
        <div className="flex max-w-[860px] flex-col gap-3 md:gap-3.5 xl:gap-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground md:text-[11px] xl:text-xs">
            <span className="md:hidden">{meta(true)}</span>
            <span className="hidden md:inline">{meta(false)}</span>
          </p>
          <InkTitle
            className="font-serif text-[44px] leading-[0.95] tracking-[-0.02em] md:text-[60px] xl:text-[76px]"
            parts={["The ", { text: winner.shortName, className: cn("italic", winner.textClass) }, " takes it."]}
          />
          <p className="text-sm leading-normal text-fg-2 md:text-[15px] xl:text-base">{view.headline}</p>
        </div>
        <div className="grid grid-cols-2 gap-px border border-line bg-line xl:min-w-[360px]">
          <TeamCell view={view} team={KING} />
          <TeamCell view={view} team={MOTHER} />
        </div>
      </section>
    </>
  );
}

export function MatchReportView({ view, sample }: { view: MatchView; sample: boolean }) {
  const legend = (
    <div className="flex flex-wrap gap-4 font-mono text-[11px] text-muted-foreground md:gap-[18px] md:text-xs">
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className={cn("size-3", TEAMS[KING].fillClass)} />
        {TEAMS[KING].shortName} lead
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className={cn("size-3", TEAMS[MOTHER].fillClass)} />
        {TEAMS[MOTHER].shortName} lead
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-[9px] rotate-45 border-[1.5px] border-fg-2" />
        Objective
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-fg" />
        Snapshot
      </span>
    </div>
  );

  return (
    <div className="flex flex-col">
      <MatchHero view={view} sample={sample} />

      <EventHighlightProvider>
        <div className="mt-4 md:mt-5 xl:mt-8">
          <Card index={0} aria-labelledby="lead-title">
            <SectionHeader
              numeral="I."
              title="The souls lead"
              id="lead-title"
              caption={
                <>
                  Team souls difference at each stats snapshot (every 3–5 min)
                  <span className="hidden md:inline"> · above the line = {TEAMS[KING].shortName} ahead</span>
                </>
              }
              action={<div className="hidden xl:block">{legend}</div>}
            />
            <div className="xl:hidden">{legend}</div>
            {view.lead.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">No souls snapshots were recorded for this match.</p>
            ) : (
              <SoulsLeadChart lead={view.lead} events={view.events} durationS={view.durationS} />
            )}
          </Card>
        </div>

        <div className="mt-4 grid gap-4 md:mt-5 md:gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <Card index={1} aria-labelledby="objectives-title">
            <SectionHeader
              numeral="II."
              title="Objectives"
              id="objectives-title"
              caption={<span className="hidden xl:inline">In the order they fell</span>}
            />
            <ObjectiveList events={view.events} />
          </Card>
          <Card index={2} aria-labelledby="scoreboard-title">
            <SectionHeader
              numeral="III."
              title="Scoreboard"
              id="scoreboard-title"
              caption={<span className="md:hidden">Tap a player for full stats</span>}
            />
            <Scoreboard scoreboard={view.scoreboard} />
          </Card>
        </div>
      </EventHighlightProvider>

      <div className="mt-4 grid gap-4 md:mt-5 md:gap-5 xl:grid-cols-2">
        <Card index={3} aria-labelledby="damage-title">
          <SectionHeader
            numeral="IV."
            title="Who did the damage"
            id="damage-title"
            caption={<span className="hidden xl:inline">Share of each team&apos;s hero damage</span>}
          />
          <DamageShare scoreboard={view.scoreboard} />
        </Card>
        <BuildOrder builds={view.builds} defaultBuild={view.defaultBuild} index={4} />
      </div>
      <p className="sr-only">Final souls: {formatCompact(view.teams[KING].souls)} to {formatCompact(view.teams[MOTHER].souls)}.</p>
    </div>
  );
}
