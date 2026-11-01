"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartNoAxesColumn, CircleDot, UserRound, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, activeNavHref, type NavItem } from "./nav-items";

const ICONS: Record<NavItem["href"], LucideIcon> = {
  "/": ChartNoAxesColumn,
  "/live": CircleDot,
  "/players": UserRound,
};

function TabList({ active }: { active: NavItem["href"] | null }) {
  return (
    <ul className="flex">
      {NAV_ITEMS.map((item) => {
        const Icon = ICONS[item.href];
        const isActive = item.href === active;
        return (
          <li key={item.href} className="flex-1">
            <Link
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center gap-1 text-[11px] transition-colors",
                isActive ? "text-brass" : "text-muted-foreground",
              )}
            >
              <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function ActiveTabList() {
  return <TabList active={activeNavHref(usePathname())} />;
}

/** Phone-only bottom navigation, fixed to the bottom of the screen. */
export function MobileTabBar() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-rail px-2 pt-1.5 pb-[max(18px,env(safe-area-inset-bottom))] md:hidden"
    >
      <Suspense fallback={<TabList active={null} />}>
        <ActiveTabList />
      </Suspense>
    </nav>
  );
}
