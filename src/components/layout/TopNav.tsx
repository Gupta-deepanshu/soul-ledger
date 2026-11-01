import { Suspense } from "react";
import Form from "next/form";
import Link from "next/link";
import { Search } from "lucide-react";
import { SampleBadge } from "@/components/ui/SampleBadge";
import { DoubleRule } from "@/components/ui/DoubleRule";
import { Logo } from "./Logo";
import { NavLinkList, NavLinks } from "./NavLinks";

/**
 * Site header. Desktop: logo · links · search · sample badge.
 * Tablet: logo · links · badge · search button. Phone: logo · search button
 * (the links move to the bottom tab bar).
 */
export function TopNav({ sample }: { sample: boolean }) {
  return (
    <header className="-mx-4 md:mx-0">
      <div className="flex items-center justify-between gap-5 px-4 pt-3.5 pb-2.5 md:justify-start md:px-0 md:py-[18px] xl:gap-7 xl:py-[22px]">
        <Logo />

        <nav aria-label="Primary" className="hidden flex-1 md:block xl:flex-none">
          <Suspense fallback={<NavLinkList active={null} />}>
            <NavLinks />
          </Suspense>
        </nav>

        <div className="flex items-center gap-2.5 xl:flex-1 xl:justify-end">
          <Form action="/players" className="hidden xl:block" role="search">
            <label htmlFor="player-search" className="sr-only">
              Look up a player by Steam name or ID
            </label>
            <input
              id="player-search"
              name="q"
              type="search"
              placeholder="Steam name or ID…"
              autoComplete="off"
              className="h-11 w-60 max-w-full border border-line-strong bg-surface px-3.5 text-sm text-fg placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
            />
          </Form>
          {sample && <SampleBadge className="hidden md:inline-block" />}
          <Link
            href="/players"
            aria-label="Search players"
            className="flex size-11 items-center justify-center border border-line-strong bg-surface text-fg hover:border-line-muted xl:hidden"
          >
            <Search size={18} strokeWidth={1.5} aria-hidden="true" />
          </Link>
        </div>
      </div>
      <DoubleRule />
    </header>
  );
}
