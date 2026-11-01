import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { PlayerSearch } from "@/components/players/PlayerSearch";
import { HeroBackground } from "@/components/ui/HeroBackground";
import { searchPlayers } from "@/lib/deadlock/search";
import { settle } from "@/lib/deadlock/settle";
import { InkTitle } from "@/components/ui/InkTitle";

export const metadata: Metadata = {
  title: "Players",
  description: "Look up a Deadlock player by Steam name, ID or profile link.",
};

export default function PlayersPage({ searchParams }: PageProps<"/players">) {
  return (
    <section className="relative flex flex-col gap-3 pt-[22px] pb-6 md:gap-4 md:pt-6 md:pb-8 xl:pt-14 xl:pb-10">
      <HeroBackground className="absolute top-0 -right-5 h-48 w-60 md:-right-[60px] md:h-56 md:w-[460px] xl:-right-10 xl:h-80 xl:w-[640px]" />
      <p className="relative font-mono text-[10px] uppercase tracking-[0.12em] text-fg-2 md:text-[11px] xl:text-xs">
        Player lookup<span className="hidden md:inline"> · public match data</span>
      </p>
      <InkTitle
        className="font-serif text-[44px] leading-[0.95] tracking-[-0.02em] md:text-[64px] xl:text-[84px]"
        parts={["Find a ", { text: "player.", className: "italic text-brass" }]}
      />
      <p className="relative text-[15px] text-fg-2 md:text-base xl:text-[17px]">
        <span className="md:hidden">Steam name, ID or profile link.</span>
        <span className="hidden md:inline">Search by Steam name, numeric ID or Steam profile link.</span>
      </p>
      <div className="relative mt-2">
        <Suspense fallback={<PlayerSearch initialQuery="" initialResult={null} />}>
          <SearchWithQuery searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  );
}

/** `?q=` (e.g. from the header search box) is searched on the server, so results show without JavaScript. */
async function SearchWithQuery({ searchParams }: { searchParams: PageProps<"/players">["searchParams"] }) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw ?? "").slice(0, 200);
  if (!q.trim()) return <PlayerSearch initialQuery="" initialResult={null} />;
  await connection();
  const result = await settle(searchPlayers(q));
  return <PlayerSearch key={q} initialQuery={q} initialResult={result.ok ? result.data : null} />;
}
