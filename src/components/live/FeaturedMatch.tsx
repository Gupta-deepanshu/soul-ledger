"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { HeroTile } from "@/components/ui/HeroTile";
import { TeamSplitBar } from "@/components/ui/TeamSplitBar";
import { KING, MOTHER, TEAMS, type TeamId } from "@/lib/deadlock/teams";
import { regionLabel, type LiveHero, type LiveMatchView } from "@/lib/deadlock/live-view";
import { LeadText, LiveDot, MatchClock } from "./live-client";
import { StillStandingGrid, StillStandingPips, objectiveSummary } from "./StillStanding";

type FeaturedMatchProps = {
  match: LiveMatchView;
  heroes: Record<number, LiveHero>;
  /** "featured": top card on /live (links to the match). "summary": the in-progress match page. */
  variant: "featured" | "summary";
};

function TeamSouls({ match, team, align }: { match: LiveMatchView; team: TeamId; align: "left" | "right" }) {
  const t = TEAMS[team];
  return (
    <div className={cn("flex flex-col gap-0.5 md:gap-1", align === "right" && "items-end text-right")}>
      <span className={cn("text-xs md:text-[13px] xl:text-sm", t.textClass)}>
        <span className="md:hidden">{t.shortName}</span>
        <span className="hidden md:inline">{t.name}</span>
      </span>
      <span className="font-serif text-[32px] leading-none md:text-[52px] md:leading-[0.9] xl:text-[64px]">
        <AnimatedNumber value={match.souls[team]} format="compact" />
        <span className="sr-only"> souls</span>
      </span>
    </div>
  );
}

function Lineup({ match, team, heroes }: { match: LiveMatchView; team: TeamId; heroes: Record<number, LiveHero> }) {
  const t = TEAMS[team];
  return (
    <ul aria-label={`${t.name} heroes`} className="grid grid-cols-2 gap-2 xl:flex xl:flex-col">
      {match.heroes[team].map((id) => {
        const hero = heroes[id];
        const name = hero?.name ?? `Hero ${id}`;
        return (
          <li key={id} className="flex min-w-0 items-center gap-2 text-[13px] xl:gap-2.5 xl:text-sm">
            <HeroTile name={name} iconUrl={hero?.iconUrl ?? null} size={26} borderClass={t.borderClass} className="xl:[--tile:28px]" />
            <span className="truncate">{name}</span>
          </li>
        );
      })}
    </ul>
  );
}

function TileRow({ match, team, heroes }: { match: LiveMatchView; team: TeamId; heroes: Record<number, LiveHero> }) {
  const t = TEAMS[team];
  return (
    <ul aria-label={`${t.name} heroes`} className="flex gap-[3px]">
      {match.heroes[team].map((id) => (
        <li key={id}>
          <HeroTile name={heroes[id]?.name ?? `Hero ${id}`} iconUrl={heroes[id]?.iconUrl ?? null} size={24} labelled borderClass={t.borderClass} />
        </li>
      ))}
    </ul>
  );
}

/** Big two-team scoreboard for one live match. */
export function FeaturedMatch({ match, heroes, variant }: FeaturedMatchProps) {
  const rank = match.avgRank?.name.toUpperCase() ?? "UNKNOWN RANK";
  const mode = match.ranked ? "RANKED" : "UNRANKED";
  const region = regionLabel(match.region).toUpperCase();
  const featured = variant === "featured";

  const body = (
    <>
      <div className="flex min-w-0 flex-col gap-3 md:gap-4 xl:flex-[2_1_560px] xl:gap-[18px]">
        <div className="flex justify-between gap-3 font-mono text-[11px] tracking-[0.08em] text-muted-foreground xl:text-xs">
          <span>
            <span className="md:hidden">
              {rank} · {mode}
            </span>
            <span className="hidden md:inline xl:hidden">
              {featured && "FEATURED · "}
              {rank} · {region}
            </span>
            <span className="hidden xl:inline">
              {featured && "FEATURED · "}
              {rank} · {mode} · {region}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5 text-brass">
            <LiveDot className="size-1.5 md:size-[7px]" />
            <MatchClock startTime={match.startTime} />
            <span className={featured ? "hidden md:inline xl:hidden" : undefined}>· {match.spectators} watching</span>
          </span>
        </div>

        <div className="flex items-end justify-between gap-4">
          <TeamSouls match={match} team={KING} align="left" />
          <div className="flex flex-col items-center gap-0.5 md:gap-1">
            <span className="font-mono text-[11px] text-muted-foreground">
              <span className="md:hidden">LEAD</span>
              <span className="hidden md:inline">SOULS LEAD</span>
            </span>
            <LeadText match={match} className="text-[15px] md:text-lg xl:text-xl" />
          </div>
          <TeamSouls match={match} team={MOTHER} align="right" />
        </div>

        <TeamSplitBar souls={match.souls} className="h-2 gap-[3px] md:h-2.5" />

        {/* The summary page shows lineups and objectives in their own cards below. */}
        {featured && (
          <>
            {/* Phone: tile rows. Tablet/desktop: named lineups. */}
            <div className="flex justify-between gap-2 md:hidden">
              <TileRow match={match} team={KING} heroes={heroes} />
              <TileRow match={match} team={MOTHER} heroes={heroes} />
            </div>
            <div className="hidden grid-cols-2 gap-5 md:grid xl:gap-6">
              <Lineup match={match} team={KING} heroes={heroes} />
              <Lineup match={match} team={MOTHER} heroes={heroes} />
            </div>
            <StillStandingGrid match={match} className="hidden md:grid xl:hidden" />
            <p className="font-mono text-[11px] text-muted-foreground md:hidden">
              {match.spectators} spectators · {objectiveSummary(match)}
            </p>
          </>
        )}
      </div>

      {featured && (
        <div className="hidden min-w-0 flex-col gap-3.5 border-l border-line pl-7 xl:flex xl:flex-[1_1_280px]">
          <h2 className="font-serif text-[28px] leading-none">Still standing</h2>
          <span className="text-[13px] text-muted-foreground">Objectives each side has left</span>
          <StillStandingPips match={match} />
          <span className="mt-auto font-mono text-xs text-muted-foreground">{match.spectators} spectators</span>
        </div>
      )}
    </>
  );

  const className =
    "flex flex-col gap-3 border border-line-strong bg-surface p-3.5 md:gap-4 md:p-[22px] xl:flex-row xl:flex-wrap xl:gap-8 xl:px-7 xl:py-[26px]";

  return featured ? (
    <Link href={`/matches/${match.id}`} className={cn(className, "hover:border-line-muted")}>
      {body}
    </Link>
  ) : (
    <section aria-label={`Live match ${match.id}`} className={className}>
      {body}
    </section>
  );
}
