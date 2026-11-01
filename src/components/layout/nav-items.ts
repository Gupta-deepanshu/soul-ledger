export type NavItem = {
  href: "/" | "/live" | "/players";
  label: string;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Meta" },
  { href: "/live", label: "Live" },
  { href: "/players", label: "Players" },
];

/** The nav item a pathname belongs to. Match reports belong to none. */
export function activeNavHref(pathname: string | null): NavItem["href"] | null {
  if (!pathname) return null;
  if (pathname === "/") return "/";
  if (pathname.startsWith("/live")) return "/live";
  if (pathname.startsWith("/players")) return "/players";
  return null;
}
