@AGENTS.md

# Soul Ledger — Deadlock stats dashboard

A fan-made stats site for Valve's Deadlock: the hero and item meta, live matches,
match reports and player profiles, built on the free community Deadlock API
(deadlock-api.com). Non-commercial. Not affiliated with or endorsed by Valve.

## Source of truth

- `design-reference/` — the approved screens (desktop, tablet, mobile for every
  page) and a README explaining them. Match them closely. Never edit this folder.
- `.claude/skills/soul-ledger-design` — colours, type, layout, components, motion.
- `.claude/skills/soul-ledger-charts` — how every chart and data visual is built.
- `.claude/skills/deadlock-api` — endpoints, data shapes, caching, images, limits.
Load the relevant skills before building anything.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS, code in `src/`, alias `@/*`.
- shadcn/ui (Radix) for primitives: tabs, select, dialog, sheet, tooltip.
- **Motion** (`motion/react`) for all animation. One approved exception: **GSAP**,
  used only inside React Bits `StrokeText` (behind `InkTitle`) for page titles.
  Don't use GSAP anywhere else.
- **SWR** for client-side polling on the Live page only.
- **zod** to validate every API response at the boundary.
- lucide-react for icons.
- Charts are hand-built (SVG and divs), not a chart library.
- **Do not add:** Lenis or any smooth-scroll library, chart libraries, other
  animation libraries, CSS-in-JS, state managers. Ask before adding any dependency.

## Routes

| Route | Page | Design files |
|---|---|---|
| `/` | Meta overview | `Main`, `MetaTablet`, `MetaMobile` |
| `/live` | Live matches | `Live`, `LiveTablet`, `Mobile` |
| `/matches/[id]` | Match report | `Match`, `MatchTablet`, `MatchMobile` |
| `/players/[id]` | Player profile | `Player`, `PlayerTablet`, `PlayerMobile` |
| `/players` | Player search | Not designed — a simple page using the hero-section style with the search box. Propose a layout before building. |

Navigation everywhere is **Meta · Live · Players**. Match reports are reached by
clicking a match, not from the nav.

## Project structure

```
src/
  app/                      routes above, plus app/api/* route handlers
  components/
    ui/                     Card, SectionHeader, StatGrid, HeroTile, RankBadge…
    charts/                 SoulsLeadChart, RankClimb, FormBars, TickMeter…
    layout/                 TopNav, MobileTabBar, Footer, AppShell
  lib/
    deadlock/               API client, zod schemas, mappers, cache helpers
    format.ts               number, time and percentage formatting
  data/
    fixtures/               saved real API responses for development and tests
```

## Data rules

- **All API calls happen on the server** (server components or `app/api/*` route
  handlers), never directly from the browser. The browser only calls our own routes.
- Every endpoint goes through one client in `src/lib/deadlock/` with caching
  (`fetch` with `next: { revalidate }` and tags). Cache lengths are in the
  `deadlock-api` skill. Never call the API on every page view.
- Raw API data is validated with zod and mapped to our own types before any
  component sees it. Components never use raw API field names.
- Team ids map to names and colours in **one place** (`lib/deadlock/teams.ts`).
- Handle loading, empty, error and "API busy" (503) states on every page.
- Player pages show only what was searched for. No "tracked players" lists.

## How to work

1. Build **one page at a time**: tokens + fonts + layout shell → API client and
   fixtures → Meta → Live → Match report → Player profile → `/players` search.
2. Before writing code for a page, give a short plan (components, files, endpoints,
   anything to install) and wait for approval.
3. Develop against saved fixtures in `src/data/fixtures/` first, then switch to
   live calls. Save fixtures by fetching once, not by inventing data.
4. Each page must work at desktop, tablet (834 px) and phone (390 px), matching
   the three design files for it.
5. After each page: `npm run lint` and `npm run build` must pass. Then compare
   against the design files at all three widths and list any differences.
6. Server components by default; `"use client"` only where Motion, SWR or
   interactivity needs it. No `any`.

## Commands

- `npm run dev` — local server at http://localhost:3000
- `npm run lint` — lint
- `npm run build` — production build (must pass before a page is done)
- `npm test` — Jest: `*.test.ts` logic tests run in Node against the saved fixtures;
  `*.test.tsx` component tests run in jsdom with Testing Library (setup in `jest.setup.ts`)

The developer uses Windows PowerShell: give PowerShell syntax for any shell
commands you ask them to run (comma-separated paths, `\` separators, no `mkdir -p`).
