"use client";

import Link from "next/link";
import { HeroTile } from "@/components/ui/HeroTile";
import { TeamSplitBar } from "@/components/ui/TeamSplitBar";
import { formatCompact } from "@/lib/format";
import { KING, MOTHER, TEAMS, type TeamId } from "@/lib/deadlock/teams";
import { regionLabel, type LiveHero, type LiveMatchView } from "@/lib/deadlock/live-view";
import { LeadText, MatchClock } from "./live-client";

type Props = { match: LiveMatchView; heroes: Record<number, LiveHero> };

function Tiles({ match, team, heroes }: Props & { team: TeamId }) {
  const t = TEAMS[team];
  return (
    <ul aria-label={`${t.name} heroes`} className="flex gap-0.5 xl:gap-[3px]">
      {match.heroes[team].map((id) => (
        <li key={id}>
          <HeroTile
            name={heroes[id]?.name ?? `Hero ${id}`}
            iconUrl={heroes[id]?.iconUrl ?? null}
            size={22}
            labelled
            borderClass={t.borderClass}
            className="xl:[--tile:24px]"
          />
        </li>
      ))}
    </ul>
  );
}

/** Tablet/desktop grid card. */
export function LiveMatchCard({ match, heroes }: Props) {
  return (
    <Link
      href={`/matches/${match.id}`}
      className="flex h-full flex-col gap-2.5 border border-line bg-surface p-4 hover:border-line-muted xl:gap-3 xl:px-5 xl:py-[18px]"
    >
      <div className="flex justify-between gap-3 font-mono text-[10px] tracking-[0.06em] text-muted-foreground xl:text-[11px]">
        <span className="truncate">
          {(match.avgRank?.name ?? "—").toUpperCase()} · {regionLabel(match.region).toUpperCase()}
        </span>
        <MatchClock startTime={match.startTime} />
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-serif text-[26px] leading-none xl:text-[30px]">
          {formatCompact(match.souls[KING])} <span className="text-tick">–</span> {formatCompact(match.souls[MOTHER])}{" "}
          <span className="font-mono text-[10px] text-muted-foreground xl:text-[11px]">SOULS</span>
        </span>
        <LeadText match={match} withTeam className="text-xs xl:text-[13px]" />
      </div>
      <TeamSplitBar souls={match.souls} />
      <div className="flex justify-between gap-2">
        <Tiles match={match} team={KING} heroes={heroes} />
        <Tiles match={match} team={MOTHER} heroes={heroes} />
      </div>
      <span className="hidden font-mono text-[11px] text-muted-foreground xl:block">{match.spectators} spectators</span>
    </Link>
  );
}

/** Phone compact row. */
export function LiveMatchRow({ match }: { match: LiveMatchView }) {
  return (
    <Link href={`/matches/${match.id}`} className="grid grid-cols-[minmax(0,1fr)_96px] items-center gap-3 border-t border-rule py-3">
      <div className="flex min-w-0 flex-col gap-[3px]">
        <span className="truncate text-sm">
          {match.avgRank?.name ?? "—"}{" "}
          <span className="font-mono text-[11px] text-muted-foreground">
            · <MatchClock startTime={match.startTime} />
          </span>
        </span>
        <LeadText match={match} withTeam className="text-[11px]" />
      </div>
      <TeamSplitBar souls={match.souls} />
    </Link>
  );
}
