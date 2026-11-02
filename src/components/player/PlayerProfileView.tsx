import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SampleBadge } from "@/components/ui/SampleBadge";
import { ArrowLink } from "@/components/ui/buttons";
import { StatGrid, type Stat } from "@/components/ui/StatGrid";
import { WinRateBar } from "@/components/ui/WinRateBar";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { RankClimb } from "@/components/charts/RankClimb";
import { FormBars } from "@/components/charts/FormBars";
import { formatInt, formatKda, formatPercent, formatSigned } from "@/lib/format";
import { MIN_GAMES, type PlayerView } from "@/lib/deadlock/player";
import { MatchHistory } from "./MatchHistory";
import { RefreshButton } from "./RefreshButton";
import { HeroBackground } from "@/components/ui/HeroBackground";
import { InkTitle } from "@/components/ui/InkTitle";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { RowHighlightProvider } from "@/components/ui/RowHighlight";
import { canInkName } from "@/lib/ink";

const monthYear = (unix: number) => new Date(unix * 1000).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

function PlayerHero({ view, sample }: { view: PlayerView; sample: boolean }) {
  const eyebrow = (
    <>
      {view.firstMatch && <>First match on record {monthYear(view.firstMatch)}</>}
      {view.lastMatch && (
        <>
          {" · last match "}
          <RelativeTime unix={view.lastMatch} />
        </>
      )}
    </>
  );
  return (
    <section className="relative flex flex-col gap-3.5 border-b border-line pt-[22px] pb-5 md:gap-[18px] md:pt-4 md:pb-6 xl:flex-row xl:flex-wrap xl:items-end xl:justify-between xl:gap-8 xl:pt-11 xl:pb-9">
      <HeroBackground variant="radial" className="absolute top-0 -right-2.5 h-full w-60 md:right-0 md:w-[420px] xl:w-[620px]" />
      <div className="relative flex items-center gap-3.5 md:items-end md:gap-[22px] xl:gap-7">
        <PlayerAvatar
          avatarUrl={view.avatarUrl}
          initials={view.initials}
          sizes="120px"
          className="size-[72px] bg-surface text-[34px] md:size-[100px] md:text-5xl xl:size-[120px] xl:text-[56px]"
        />
        <div className="flex min-w-0 flex-col gap-1.5 md:gap-2.5 xl:gap-3">
          <p className="hidden font-mono text-[11px] uppercase tracking-[0.1em] text-fg-2 md:block xl:text-xs">{eyebrow}</p>
          <InkTitle
            className="truncate font-serif text-[46px] leading-[0.9] tracking-[-0.02em] md:text-[68px] xl:text-[84px]"
            parts={[view.name ?? "Anonymous player"]}
            enabled={canInkName(view.name ?? "Anonymous player")}
          />
          <div className="flex items-center gap-2.5">
            {view.rank ? (
              <span className="text-[15px] xl:text-base">
                {view.rank.name} <span className="font-serif text-[19px] xl:text-xl">{view.rank.numeral}</span>
              </span>
            ) : (
              <span className="text-[15px] text-fg-2">Unranked</span>
            )}
            {view.topPercent != null && (
              <span className="font-mono text-xs text-fg-2">
                top {view.topPercent}%<span className="hidden xl:inline"> of ranked players</span>
              </span>
            )}
          </div>
        </div>
      </div>
      <p className="relative font-mono text-[10px] uppercase tracking-[0.1em] text-fg-2 md:hidden">
        {eyebrow}
        {sample && <SampleBadge className="ml-2" />}
      </p>
      <RefreshButton accountId={view.accountId} className="relative" />
    </section>
  );
}

function Totals({ view }: { view: PlayerView }) {
  const t = view.totals;
  if (!t) return null;
  const vsTier = t.tierSoulsPerMin != null && view.rank ? t.soulsPerMin - t.tierSoulsPerMin : null;
  const stats: Stat[] = [
    { label: "Matches", value: t.matches, format: "int", note: `${formatInt(t.ranked)} ranked` },
    { label: "Win rate", value: t.winRate, format: "percent", note: `${formatInt(t.wins)} wins · ${formatInt(t.losses)} losses` },
    {
      label: "KDA",
      value: t.kda,
      format: "decimal",
      note: `${formatKda(t.perMatch.kills)} / ${formatKda(t.perMatch.deaths)} / ${formatKda(t.perMatch.assists)} per match`,
    },
    {
      label: "Souls per minute",
      value: t.soulsPerMin,
      format: "int",
      note: vsTier != null ? `${formatSigned(vsTier, 0)} vs ${view.rank!.name} average` : "across all matches",
    },
  ];
  return (
    <div className="mt-4 flex flex-col gap-2 md:mt-5 xl:mt-0 xl:gap-0">
      <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground md:text-[11px] xl:pt-5">
        All normal matches (ranked + unranked)
      </p>
      <StatGrid stats={stats} label="All normal matches (ranked + unranked)" />
    </div>
  );
}

function HeroPool({ view, index }: { view: PlayerView; index: number }) {
  return (
    <Card index={index} aria-labelledby="pool-title">
      <SectionHeader numeral="IV." title="Hero pool" id="pool-title" caption="Most played · win rate" />
      {view.pool.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">No hero records yet.</p>
      ) : (
        <ul className="flex flex-col">
          {view.pool.map((p) => (
            <li key={p.heroId} className="flex flex-col gap-1.5 border-t border-rule pt-2.5 pb-1">
              <div className="flex justify-between gap-3 text-sm">
                <span>
                  {p.name} <span className="font-mono text-[11px] text-muted-foreground">{formatInt(p.matches)} matches</span>
                </span>
                <span className="font-mono">{formatPercent(p.winRate)}</span>
              </div>
              <WinRateBar winRate={p.winRate} fillClass={p.winRate >= 0.5 ? "bg-brass" : "bg-mother"} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function PairList({
  title,
  rows,
  tone,
  empty,
}: {
  title: string;
  rows: { key: string; name: string; winRate: number; matches: number }[];
  tone: string;
  empty: string;
}) {
  return (
    <div className="flex flex-col">
      <span className="pb-1.5 font-mono text-[10px] tracking-[0.08em] text-muted-foreground md:text-[11px]">{title}</span>
      {rows.length === 0 ? (
        <span className="border-t border-rule py-2 text-[13px] text-muted-foreground">{empty}</span>
      ) : (
        <ul>
          {rows.map((r) => (
            <li key={r.key} className="flex justify-between gap-2 border-t border-rule py-2 text-[13px] xl:py-[9px]">
              <span className="truncate">{r.name}</span>
              <span className={cn("shrink-0 font-mono", tone)}>
                {Math.round(r.winRate * 100)}% · {formatInt(r.matches)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AlliesRivals({ view, index }: { view: PlayerView; index: number }) {
  return (
    <Card index={index} aria-labelledby="allies-title">
      <SectionHeader
        numeral="V."
        title="Allies & rivals"
        id="allies-title"
        caption={`Win rate · games (${MIN_GAMES}+ games)`}
      />
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-1 md:gap-2.5 xl:grid-cols-2 xl:gap-[18px]">
        <PairList
          title="BEST WITH"
          rows={view.bestWith.map((m) => ({ key: m.name, ...m }))}
          tone="text-brass"
          empty="No regular teammates yet"
        />
        <PairList
          title="TOUGHEST HEROES"
          rows={view.toughestHeroes.map((h) => ({ key: String(h.heroId), ...h }))}
          tone="text-mother-text"
          empty="Not enough games against any hero yet"
        />
      </div>
    </Card>
  );
}

export function PlayerProfileView({ view, sample }: { view: PlayerView; sample: boolean }) {
  const wins = view.form.filter((f) => f.won).length;
  const avgKda = view.form.reduce((s, f) => s + f.kda, 0) / Math.max(view.form.length, 1);

  return (
    // Links Last 20 and Match history (hover a row or a bar to highlight the other).
    <RowHighlightProvider>
      <div className="flex flex-col">
        <PlayerHero view={view} sample={sample} />
        <Totals view={view} />

        <div className="mt-4 grid gap-4 md:mt-5 md:grid-cols-2 md:gap-5 xl:mt-8">
          <Card index={0} aria-labelledby="climb-title">
            <SectionHeader
              numeral="I."
              title="The climb"
              id="climb-title"
              caption={`Rank badge across the last ${view.climb.length} ranked matches`}
            />
            {view.climb.length < 2 ? (
              <p className="py-2 text-sm text-muted-foreground">Not enough ranked matches with a rank yet.</p>
            ) : (
              <RankClimb climb={view.climb} tierNames={view.tierNames} />
            )}
          </Card>
          <Card index={1} aria-labelledby="form-title">
            <SectionHeader
              numeral="II."
              title={`Last ${view.form.length} matches`}
              id="form-title"
              caption={<span className="hidden md:inline">Bar height = KDA · wins up, losses down</span>}
              action={
                <span className="font-serif text-[30px] leading-none xl:text-4xl">
                  {wins}
                  <span className="text-muted-foreground">–</span>
                  {view.form.length - wins}
                </span>
              }
            />
            {view.form.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">No matches on record.</p>
            ) : (
              <>
                <FormBars form={view.form} />
                <div className="flex flex-wrap gap-3.5 font-mono text-[11px] text-muted-foreground md:gap-[18px] xl:text-xs">
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden="true" className="size-2.5 bg-brass xl:size-3" />
                    Win
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden="true" className="size-2.5 bg-mother xl:size-3" />
                    Loss
                  </span>
                  <span>Avg KDA {formatKda(avgKda)}</span>
                </div>
              </>
            )}
          </Card>
        </div>

        <div className="mt-4 grid gap-4 md:mt-5 md:gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card index={2} aria-labelledby="history-title">
            <SectionHeader
              numeral="III."
              title="Match history"
              id="history-title"
              action={
                view.history[0] && (
                  <ArrowLink href={`/matches/${view.history[0].matchId}`} className="-my-3 hidden xl:inline-flex">
                    Open latest match
                  </ArrowLink>
                )
              }
            />
            {view.history.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">No public matches on record for this player.</p>
            ) : (
              <MatchHistory rows={view.history} />
            )}
          </Card>
          <div className="grid gap-4 md:grid-cols-2 md:gap-5 xl:flex xl:flex-col">
            <HeroPool view={view} index={3} />
            <AlliesRivals view={view} index={4} />
          </div>
        </div>
      </div>
    </RowHighlightProvider>
  );
}
