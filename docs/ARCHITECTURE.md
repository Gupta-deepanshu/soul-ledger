# Soul Ledger — Architecture

A fan-made stats site for Valve's game **Deadlock**: the hero and item meta, live
matches, finished-match reports and player profiles. All data comes from the
free community API at `api.deadlock-api.com`.

This document explains how the site is put together and *why*, so it can be
walked through in an interview.

---

## 1. The 30-second pitch

> Soul Ledger is a Next.js 16 App Router site written in TypeScript. Every call
> to the third-party Deadlock API happens on the server, through one client
> that validates responses with zod and maps them to our own types. Data is
> cached with Next's `"use cache"` and named cache profiles, so a page view
> almost never reaches the upstream API. Pages are server components that
> stream in section by section with Suspense, and each section fails on its
> own. The only page that polls is Live: the browser polls *our* route every
> 30 s with SWR, and that route reads a 30 s server cache, so the upstream cost
> stays the same however many people are watching. Charts are hand-built in SVG,
> and animation uses Motion.

---

## 2. Tech stack and why each piece is there

| Piece | Role | Why this choice |
|---|---|---|
| **Next.js 16 (App Router)** | Routing, server rendering, caching, route handlers, server actions | Server components keep API keys and API traffic off the browser; built-in data cache |
| **React 19** | UI | Server components, Suspense streaming, `use` of promises |
| **TypeScript** (strict, no `any`) | Types end to end | API data is untrusted; types + zod catch shape changes |
| **Tailwind CSS v4** | Styling | Design tokens as CSS variables; no CSS-in-JS runtime |
| **shadcn/ui (Radix)** | Tabs, select, tooltip primitives | Accessible behaviour (focus, keyboard) without writing it by hand |
| **zod** | Validates every API response | The API is community-run and can change; fail loudly at the edge |
| **SWR** | Client polling, **Live page only** | Interval refresh, dedupe, keep previous data, pause in hidden tabs |
| **Motion** (`motion/react`) | All animation | One library, one shared easing curve (`lib/motion.ts`) |
| **GSAP** | Only inside `StrokeText` (the ink-drawn page titles) | Approved single exception; nowhere else |
| **lucide-react** | Icons | |
| **No chart library** | Charts are SVG + divs | Full control over the look, small bundle, exact match to the designs |

Deliberately **not** used: chart libraries, state managers, smooth-scroll
libraries, CSS-in-JS.

---

## 3. High-level picture

```
 Browser                          Our Next.js server                         Upstream
 ───────                          ──────────────────                         ────────
                                  ┌─────────────────────────────┐
  page request  ───────────────▶  │ Server components (pages)    │
                                  │   app/page.tsx, live, ...    │
                                  └──────────────┬──────────────┘
                                                 │ calls
  /api/live (SWR, 30 s)  ───────▶  ┌──────────────▼──────────────┐
  /api/players/search    ───────▶  │ View-model builders          │  pure functions
  server actions         ───────▶  │   lib/deadlock/meta.ts ...   │
                                  └──────────────┬──────────────┘
                                                 │ calls
                                  ┌──────────────▼──────────────┐
                                  │ Cached data functions        │  "use cache"
                                  │   lib/deadlock/api.ts        │  cacheLife / cacheTag
                                  └──────────────┬──────────────┘
                                                 │ on cache miss
                                  ┌──────────────▼──────────────┐       ┌──────────────────┐
                                  │ API client                   │ ────▶ │ api.deadlock-    │
                                  │   lib/deadlock/client.ts     │       │ api.com          │
                                  │   fetch → zod → errors       │ ◀──── │                  │
                                  └──────────────────────────────┘       └──────────────────┘
                                         │ DATA_SOURCE=fixtures
                                         ▼
                                  src/data/fixtures/*.json  (saved real responses)
```

**The browser never talks to the Deadlock API.** It only talks to our server:
page loads, two route handlers, and server actions.

---

## 4. Folder structure

```
src/
  app/                         Routes (App Router)
    page.tsx                   /            Meta overview
    live/page.tsx              /live        Live matches
    matches/[id]/page.tsx      /matches/:id Match report (or live summary if still running)
    matches/[id]/actions.ts    server action: "is the report ready yet?"
    players/page.tsx           /players     Player search
    players/[id]/page.tsx      /players/:id Player profile
    players/[id]/actions.ts    server action: refresh a player's matches
    api/live/route.ts          GET: live board JSON for polling
    api/players/search/route.ts GET: search JSON
    layout.tsx, globals.css    fonts, design tokens, app shell
  components/
    ui/                        Card, SectionHeader, RankBadge, SectionError, buttons...
    charts/                    SoulsLeadChart, RankClimb, MatchupGrid, FormBars...
    layout/                    TopNav, MobileTabBar, Footer, AppShell
    meta/ live/ match/ player/ players/   page-specific sections
  lib/
    deadlock/                  the whole data layer (see §5)
    format.ts                  number / time / percent formatting
    contrast.ts                WCAG contrast maths for heatmap text colour
    motion.ts                  the one shared easing curve
  data/fixtures/               real API responses saved once for dev/tests
scripts/save-fixtures.mjs      fetches and saves those fixtures
design-reference/              approved designs (desktop, tablet, phone)
```

---

## 5. The data layer (`src/lib/deadlock/`)

This is the most important part to explain. Data passes through four layers,
each with one job:

### 5.1 `client.ts`: the single gateway

- `deadlockFetch(path, schema, options)` is the **only** function that calls
  the API.
- Adds the optional `X-API-KEY` header from an env var, and a **15 s timeout**
  (`AbortSignal.timeout`).
- Converts HTTP failures into a typed `DeadlockApiError` with a `kind`:
  `busy` (503 / 429), `timeout` (504), `not-found` (404), `http`, `network`,
  `invalid` (the response failed zod validation). It also carries `Retry-After`.
- Runs `schema.safeParse(json)`; a shape mismatch throws `invalid` with a
  readable zod error.
- **Fixture mode:** with `DATA_SOURCE=fixtures` it reads JSON from
  `src/data/fixtures/` instead of the network (a regex table maps endpoint →
  file). The UI then shows a "sample data" badge.
- `deadlockFetchTimed` also returns *when the data was produced* (now minus the
  `Age` header), because the API caches too. The Live page uses it to show an
  honest "data from N s ago".

**Interesting detail:** an error thrown inside a `"use cache"` function loses
its message in production; only the `digest` survives. So the error encodes
its details into `digest` (`DEADLOCK_API|busy|503|8`), and `toApiFailure()`
decodes them on the other side.

### 5.2 `schemas.ts`: zod schemas for raw responses

- Written against the API's OpenAPI spec and checked against the saved fixtures.
- Only the fields we use are listed; unknown fields are stripped.
- Raw snake_case field names **never leave this folder**.

### 5.3 `mappers.ts` + `types.ts`: raw → our own types

- e.g. `mapHeroes`, `mapMatchReport`, `decodeBadge` (a badge number encodes
  tier × 10 + subrank).
- Handles API quirks in one place: `in_development` is wrong on some released
  heroes; patch notes published days apart count as one patch; items no longer
  sold are kept so old builds still show a name.
- `teams.ts` is **the only place** that knows team 0 = The Hidden King and
  team 1 = The Archmother (names, colours, Tailwind classes). This was verified
  against a real match and is documented in the file.

### 5.4 `api.ts`: cached data functions

Every page and route gets data through functions like `getHeroStats(window,
minBadge)` or `getMatchReport(id)`. Each one is:

```ts
export async function getMatchReport(matchId: number) {
  "use cache";
  cacheLife("match");                       // named profile from next.config.ts
  cacheTag("match", `match-${matchId}`);    // so it can be invalidated precisely
  return mapMatchReport(await deadlockFetch(`/v1/matches/${matchId}/metadata`, matchMetadataSchema));
}
```

### 5.5 View-model builders (`meta.ts`, `match.ts`, `player.ts`, `live-view.ts`, `live-log.ts`)

- **Pure functions** that turn mapped data into exactly what a page shows
  (`buildHeroRows`, `buildMovers`, `buildMatchView`, `buildHeadline`,
  `buildPlayerView`...).
- No fetching, no React: easy to reason about and test against fixtures.
- Their output is plain serialisable data, so it can go from a server component
  to a client component as props.
- Business rules live here as named constants, e.g. heroes need ≥ 10,000
  matches to appear; matchup cells need ≥ 1,000 games or they show "n/a".
- `buildHeadline` writes the match report's one-line summary from fixed
  patterns (comeback, wire-to-wire, one-sided...) using only facts in the data.

---

## 6. Caching strategy

Cache lifetimes are named profiles in `next.config.ts` (with
`cacheComponents: true`):

| Profile | Revalidate | Used for | Reasoning |
|---|---|---|---|
| `assets` | 24 h | heroes, items, ranks, patches, Steam names | Change only on game patches |
| `analytics` | 1 h | hero/item/matchup stats, rank distribution | Aggregates over millions of games move slowly |
| `match` | 7 days | finished match metadata | A finished match never changes |
| `player` | 5 min | match history, rank, hero pool, mates | Players finish games often |
| `live` | 30 s | active matches | The upstream list only updates about every 2 min anyway |
| `liveRank` | 1 h | average rank of a live match's players | The players in a match don't change |

Key properties:

- **Stale-while-revalidate:** if a refresh fails (503, timeout), the error is
  *not* cached and the previous entry keeps being served until it expires. An
  upstream outage turns into slightly old data, not a broken page.
- **Tags** allow precise invalidation: the "Refresh" button on a player profile
  calls `updateTag(\`player-${id}\`)` to clear only that player's entries.
- **Request batching** (`rank-batcher.ts`): the player-rank endpoint allows
  only 20 requests a minute. Lookups made in the same tick are merged into one
  request (chunks of 200 ids, sent one after another). Nothing is held between
  requests, so it's safe on serverless.

---

## 7. Rendering model

- **Server components by default.** `"use client"` is used only where Motion,
  SWR, hover/keyboard interactivity or browser APIs are needed.
- **Streaming with Suspense.** The Meta page has six independent sections
  (patch totals, hero standings, movers, rank distribution, items, matchups).
  Each sits in its own `<Suspense>` with a skeleton that matches its final
  shape, so fast sections appear first and nothing shifts when data arrives.
- **One promise, shared.** The page reads `searchParams` once into a promise
  (`minTier`) and passes it to every section, which awaits it inside its own
  boundary.
- **Filters live in the URL** (`/?rank=8`), so they can be shared and bookmarked
  and need no client state.
- **Cross-component highlighting** (`RowHighlight.tsx`): a small React context
  links a list and a chart that show the same thing. Hovering a hero in *Hero
  standings* highlights them in *Who beats whom*, and the reverse. Without the
  provider the hook does nothing, so components still work alone.

---

## 8. Error handling ("every section fails on its own")

`settle(promise)` (`settle.ts`) turns a thrown error into
`{ ok: false, failure }` instead of throwing:

```ts
const result = await settle(getMatchupStats(window, minBadge));
if (!result.ok) return <ErrorCard title="Who beats whom" failure={result.failure} />;
```

So a single failing endpoint shows an error card in *that section only*, and
the rest of the page still renders. It re-throws Next's own control-flow
errors (`notFound`, prerender bail-outs) with `unstable_rethrow`.

`SectionError` handles the states differently:

- **API busy (503):** shows a countdown using `Retry-After`, then retries by
  itself, up to 3 times, before showing a normal "Try again" button.
- **Not found:** a proper "match not found" / "player not found" message.
- **Empty:** e.g. "not enough games at this rank" instead of an empty chart.
- **Optional data degrades:** missing Steam names show "Anonymous"; a failed
  rank lookup shows "—" in that column only.

---

## 9. Page-by-page data flow

### Meta (`/`)
Server component. Works out the current and previous patch windows from
`/v1/patches`, then each section fetches its analytics (1 h cache) for the
chosen rank filter and builds its view model. "Movers" compares this patch
with the previous one.

### Live (`/live`): the only polling page
```
first paint:  server renders getLiveBoard()  ──▶ HTML
then:         SWR in the browser ── every 30 s ──▶ GET /api/live ──▶ getLiveBoard() (30 s cache)
```
- Because `/api/live` reads the 30 s server cache, **100 viewers still cost
  one upstream call per 30 s**.
- SWR is set with `fallbackData` (the server render), `keepPreviousData`,
  dedupe, and pauses while the tab is hidden.
- One shared 1-second "now" ticker (`NowProvider`) drives every match clock, so
  there aren't dozens of timers. It starts from the server's timestamp so the
  server and client render the same text (no hydration mismatch).
- The in-match **live log** (`live-log.ts`) is built *in the browser* by
  comparing successive polls: identical snapshots are skipped, and points are
  placed at the time the data was *produced*, not polled, so stale responses
  don't distort the chart. Nothing is stored server-side.

### Match (`/matches/[id]`)
1. Check the live board first (30 s cache). If the match is still running,
   show the live summary, with lineups and the draft streaming in after.
2. Otherwise fetch the finished report (7-day cache). The API needs a few
   minutes to process a match; until then it returns 404. A server action
   (`reportStatus`) lets the page check when the report is ready.
3. Names are optional; the report still renders without them.

### Player (`/players/[id]`) and search (`/players`)
- Profile: history, rank, hero pool, enemy heroes and teammates, each 5-min
  cached and tagged `player-<id>`.
- **Refresh button** → server action `refreshPlayer`: limited to one per player
  per minute, and uses the API's expensive `force_refetch` (1 per hour per IP)
  only when allowed; otherwise it re-reads the stored history. Then it
  invalidates that player's cache tag.
- Search: `steam-id.ts` parses whatever was typed (a Steam name, account id,
  SteamID64, SteamID3 or profile URL). The browser calls our
  `/api/players/search`, which calls the API on the server.
- Privacy rule: only the searched-for player is shown; there are no "tracked
  players" lists.

---

## 10. Design system and charts

- **Tokens** are CSS variables in `globals.css` (surface, ink, brass, team
  colours `--king` / `--mother`), exposed to Tailwind. Dark theme.
- **Fonts** via `next/font`: Geist (UI), Geist Mono (numbers, tabular),
  Instrument Serif (titles). Self-hosted with no layout shift.
- **Responsive:** every page is built to three designs: desktop, tablet
  (834 px) and phone (390 px).
- **Charts are hand-built SVG/div components** (`components/charts/`): souls
  lead over time, rank climb, last-20 form bars, rank distribution, matchup
  heatmap, damage share. They share one `ChartTooltip` (hover on tablet and
  desktop) and a `ChartReadout` (a tap-to-select line under the chart on
  phones, since hover doesn't exist on touch).
- **Accessibility in charts:** each chart has an `aria-label` summary (e.g.
  "Biggest edge: Haze wins +3.1 points above 50% against Viscous"), arrow-key
  navigation where it makes sense, an `aria-live` region for the focused value,
  and heatmap cell text that picks dark or light ink to pass **WCAG 4.5:1**
  (`contrast.ts`).
- **Motion:** one easing curve site-wide; `prefers-reduced-motion` respected;
  page titles "draw in ink" (GSAP inside StrokeText) once per visit, while the
  real `<h1>` stays in the DOM for screen readers and SEO.

---

## 11. Development workflow

- `DATA_SOURCE=fixtures` → the whole site runs on saved real API responses
  (`scripts/save-fixtures.mjs` fetches them once; data is never invented).
  This allows offline development, deterministic screens and no rate-limit
  worries.
- Pages were built one at a time: tokens/shell → API client and fixtures →
  Meta → Live → Match → Player → Search. Each was checked against the designs
  at all three widths, and `npm run lint` and `npm run build` had to pass.

---

## 12. Trade-offs and things I'd say if asked "what would you improve?"

| Decision | Trade-off | Possible next step |
|---|---|---|
| Polling every 30 s instead of WebSockets | Simple and cache-friendly; up to ~30 s behind (the upstream only updates every ~2 min, so WebSockets would gain little) | Server-Sent Events if the upstream ever pushes |
| In-memory rate limits in server actions | Per server instance, not global | Redis/KV-backed limiter when deployed on several instances |
| Hand-built charts | More code to maintain | Worth it for exact designs and bundle size; shared primitives keep it manageable |
| Live log built in the browser | Lost on reload, nothing stored | Store snapshots server-side to show full match history |
| Fixtures for development | Can drift from the live API | zod catches drift at runtime; re-run the save script |
| Pure view-model functions | Not yet covered by a test runner | Add Vitest tests against the fixtures |

---

## 13. Likely interview questions, with short answers

**Why call the API only from the server?**
Hides the API key, lets one cached response serve every visitor, protects the
upstream's rate limits, and lets us validate and reshape data before any
client sees it.

**How do you avoid hammering a free community API?**
Layered caching with lifetimes matched to how often each kind of data changes;
stale-while-revalidate; route handlers that read the same cache; batching of
rate-limited lookups; and throttled server actions for the one "refresh now"
feature.

**What happens if the API is down?**
Cached data keeps being served. If there's no cache, only the affected section
shows an error; on a 503 it counts down `Retry-After` and retries by itself.

**Why zod if you already have TypeScript?**
TypeScript types disappear at runtime. The API is external and can change, so
zod checks the real response at the boundary and turns a silent wrong value
into a clear `invalid` error.

**Why separate schemas, mappers and view models?**
Each layer has one job: *is the data valid?* / *what does it mean in our
domain?* / *what does this screen show?*. Components never see raw API field
names, so an API rename touches one file.

**How does streaming help here?**
Different endpoints have very different speeds. Suspense per section means the
page appears immediately with skeletons, and each part fills in when its data
is ready, instead of the whole page waiting for the slowest call.

**How do you keep server and client renders consistent on the Live page?**
The clock starts from the server's snapshot time, and the first client render
uses the server's data as SWR `fallbackData`.
