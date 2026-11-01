# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Deadlock players. They come to check the current hero and item meta, follow live
matches, read the report of a finished match, and look up their own (or another
searched-for) player profile.

## Product Purpose

Soul Ledger is a free, non-commercial fan stats site for Valve's Deadlock: hero and
item meta, live matches, match reports and player profiles, built on the free
community Deadlock API (deadlock-api.com).

It is a personal project the developer will use as a resume / portfolio piece.
Success means a site that works on real data and is clearly well made: it looks
good and holds up at desktop, tablet and phone sizes.

## Positioning

The differentiator is design quality: a stats site that looks good, rather than
competing on breadth of data. Specific visual direction lives in DESIGN.md and the
approved screens, not here.

## Operating Context

- Routes: Meta `/`, Live `/live`, Match report `/matches/[id]`, Player profile
  `/players/[id]`, Player search `/players`. Navigation is Meta · Live · Players;
  match reports are reached by clicking a match.
- Approved screens for every page at desktop (1440), tablet (834) and phone (390)
  live in `design-reference/` and are the source of truth for layout and copy.
- All data comes from the community Deadlock API, called only from the server,
  cached, and validated before display.

## Capabilities and Constraints

- Next.js (App Router), TypeScript, Tailwind, shadcn/ui, Motion; charts are
  hand-built. Dependency and data rules are in `CLAUDE.md`.
- The API is community-run, rate-limited and can be busy (503) or slow (504);
  every page handles loading, empty, error and busy states.
- Player profiles show only players someone searched for or followed a link to:
  no tracked-player lists or leaderboards of people.
- Deployment: not decided. Currently personal; no ads, accounts or payments.

## Brand Commitments

- Name: Soul Ledger.
- Fan project, not affiliated with or endorsed by Valve. The footer must keep:
  "Fan project. Not affiliated with or endorsed by Valve. Data via deadlock-api.com."
- Hero, item and rank art belongs to Valve and is loaded from the API's asset URLs.

## Evidence on Hand

- Real API responses saved in `src/data/fixtures/` (via `scripts/save-fixtures.mjs`).
- All numbers and player names in `design-reference/` are invented placeholders;
  never present them as real data.
- No users, testimonials, traffic figures or press exist. Don't invent any.

## Product Principles

1. Real data only. Never invent stats, players or claims; show sample sizes and
   stale-data notes when the data is thin or old.
2. Craft is the point. Every page should hold up as portfolio work at all three sizes.
3. Respect privacy. Show a player only when someone asked for them.
4. Respect the API. Cache heavily and fail gracefully; never call it per page view.

## Accessibility & Inclusion

Text contrast at least 4.5:1, touch targets at least 44 px, semantic controls and
tables, charts with `role="img"` and a takeaway sentence, alt text on images, and
reduced-motion support (final values shown instantly).
