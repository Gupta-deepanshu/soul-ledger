"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FOCUS_RING, SegmentIndicator } from "@/components/ui/buttons";
import { NAV_ITEMS, activeNavHref, type NavItem } from "./nav-items";

/** Top-nav links with a brass underline that slides to the active page. */
export function NavLinkList({ active }: { active: NavItem["href"] | null }) {
  return (
    <ul className="flex gap-0.5 text-sm xl:gap-1">
      {NAV_ITEMS.map((item) => {
        const isActive = item.href === active;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex min-h-11 items-center px-2.5 py-3 transition-colors hover:text-fg xl:px-3 xl:py-2.5",
                FOCUS_RING,
                isActive ? "text-fg" : "text-muted-foreground",
              )}
            >
              {item.label}
              {isActive && <SegmentIndicator layoutId="nav-underline" look="underline" className="bottom-0" />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Reads the current path. Render inside <Suspense> (the path can be unknown while prerendering). */
export function NavLinks() {
  return <NavLinkList active={activeNavHref(usePathname())} />;
}
