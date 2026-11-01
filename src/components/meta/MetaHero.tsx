import { Suspense } from "react";
import { SampleBadge } from "@/components/ui/SampleBadge";
import { ArrowLink } from "@/components/ui/buttons";
import { getPatchWindows, getRanks } from "@/lib/deadlock/api";
import { isSampleData } from "@/lib/deadlock/client";
import { describeFilters, rankFilterOptions } from "@/lib/deadlock/meta";
import { settle } from "@/lib/deadlock/settle";
import { formatDate } from "@/lib/format";
import { RankFilter } from "./RankFilter";
import { HeroBackground } from "@/components/ui/HeroBackground";
import { InkTitle } from "@/components/ui/InkTitle";

/** Page hero: title and blurb render at once; the eyebrow and controls depend on the patch and filter. */
export function MetaHero({ minTier }: { minTier: Promise<number | null> }) {
  return (
    <section className="relative flex flex-col gap-3 border-b border-line pt-[22px] pb-5 md:gap-4 md:pt-6 md:pb-7 xl:flex-row xl:flex-wrap xl:items-end xl:justify-between xl:gap-8 xl:pt-14 xl:pb-10">
      <HeroBackground className="absolute top-0 -right-5 h-full w-60 md:-right-[60px] md:w-[460px] xl:-right-10 xl:w-[640px]" />
      <div className="relative flex max-w-[760px] flex-col gap-3 md:gap-4 xl:gap-[18px]">
        <Suspense fallback={<Eyebrow text="Patch · Ranked + unranked · All regions" />}>
          <FilterEyebrow minTier={minTier} />
        </Suspense>
        <InkTitle
          className="font-serif text-[46px] leading-[0.95] tracking-[-0.02em] md:text-[64px] xl:text-[84px]"
          parts={["The meta, kept ", { text: "in ink.", className: "italic text-brass" }]}
        />
        <p className="max-w-[560px] text-[15px] leading-normal text-fg-2 md:text-base xl:text-[17px] xl:leading-[1.55]">
          <span className="md:hidden">Win rates, builds and matchups for every hero, updated hourly.</span>
          <span className="hidden md:inline">
            Win rates, builds and matchups for every hero this patch — read from public match data and updated hourly.
          </span>
        </p>
      </div>
      <div className="relative flex flex-wrap items-center gap-2 md:gap-2.5 xl:min-w-60 xl:flex-col xl:items-start xl:gap-2">
        <Suspense fallback={<div className="h-11 w-36 rounded-[4px] border border-line-strong bg-surface" />}>
          <HeroControls minTier={minTier} />
        </Suspense>
        {isSampleData() && <SampleBadge className="md:hidden" />}
      </div>
    </section>
  );
}

function Eyebrow({ text }: { text: string }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-2 md:text-[11px] xl:text-xs">{text}</p>
  );
}

async function FilterEyebrow({ minTier }: { minTier: Promise<number | null> }) {
  const tier = await minTier;
  const result = await settle(Promise.all([getPatchWindows(), getRanks()]));
  if (!result.ok || !result.data[0]) return <Eyebrow text="Ranked + unranked · All regions" />;
  const [windows, ranks] = result.data;
  return <Eyebrow text={describeFilters(windows, tier, ranks)} />;
}

async function HeroControls({ minTier }: { minTier: Promise<number | null> }) {
  const tier = await minTier;
  const result = await settle(Promise.all([getPatchWindows(), getRanks()]));
  const windows = result.ok ? result.data[0] : null;
  const ranks = result.ok ? result.data[1] : [];
  const patch = windows?.patch;
  const patchDate = windows ? formatDate(windows.current.since) : null;
  const notesLink = (label: string) =>
    patch ? (
      <ArrowLink href={patch.url} target="_blank" rel="noreferrer" className="-my-3 align-middle">
        {label}
      </ArrowLink>
    ) : null;

  return (
    <>
      {patchDate && (
        <div className="hidden xl:contents">
          <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-fg-2">Current patch</span>
          <span className="font-serif text-[40px] leading-none">{patchDate}</span>
          <span className="text-sm">{notesLink("Read the patch notes")}</span>
        </div>
      )}
      <RankFilter options={rankFilterOptions(ranks)} value={tier == null ? "all" : String(tier)} />
      {patchDate && (
        <span className="hidden text-sm text-fg-2 md:inline xl:hidden">
          Patch <span className="text-fg">{patchDate}</span> · {notesLink("notes")}
        </span>
      )}
    </>
  );
}
