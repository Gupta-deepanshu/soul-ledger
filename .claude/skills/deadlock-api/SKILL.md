---
name: deadlock-api
description: How Soul Ledger gets its data from the community Deadlock API (api.deadlock-api.com) — which endpoint feeds which screen, response fields, caching, images, rate limits and errors. Use whenever fetching, caching, mapping or displaying Deadlock data.
---

# Deadlock API

Base URL: `https://api.deadlock-api.com`. Docs: `https://api.deadlock-api.com/docs`
(OpenAPI spec at `/openapi.json` — check it before using any endpoint; field names
change). Community-run and open source, **not Valve**. Free to use.

## Ground rules

- Call it **only from the server** through `src/lib/deadlock/client.ts`.
- Optional API key: if `DEADLOCK_API_KEY` is set in `.env.local`, send it as the
  `X-API-KEY` header (keys get a larger share of the API's queue). Never expose it
  to the browser; never commit `.env.local`.
- Validate every response with zod; map to our own types in `src/lib/deadlock/mappers.ts`.
- Treat every field as possibly `null` (many are nullable in the spec).
- Before relying on an endpoint, fetch it once, save the response to
  `src/data/fixtures/<name>.json`, and build against that.

## Busy and slow responses

From the API docs:
- **503 + `Retry-After`**: the API is busy. Wait that many seconds before retrying.
  Don't fire many uncached requests in parallel.
- **504 + `Retry-After`**: the query hit its time limit and will keep failing for a
  while. Don't retry it; narrow the filters.
- On either, serve the last cached data if we have it, with a small "data may be
  out of date" note. Otherwise show the page's error state with a retry button.

## Caching (Next.js `fetch` with `next: { revalidate, tags }`)

| Data | Revalidate |
|---|---|
| Assets (heroes, items, ranks), patches | 24 h |
| Analytics (hero, item, counter stats, rank distribution) | 1 h |
| Match metadata (finished matches never change) | 7 days |
| Player match history, rank | 5 min |
| Active matches (Live page) | 30 s |

The Live page polls **our** route `/api/live` with SWR every 30 s; that route
uses the 30 s cache, so many visitors still cost one API call per 30 s.

## Endpoint → screen map

### Assets (names, images, colours)
- `GET /v1/assets/heroes?only_active=true` → `id`, `name`, `images.icon_image_small(_webp)`,
  `images.icon_hero_card(_webp)`, `images.background_image(_webp)`, `images.name_image` (svg).
  Use for every hero name and HeroTile.
- `GET /v1/assets/items` → item id, name, cost, tier, slot type (weapon / vitality / spirit).
  Check exact field names in the spec. Use for item names, ItemChip colour and tier.
- `GET /v1/assets/ranks` → 12 tiers: `tier`, `name`, `color`, `images.large(_webp)`,
  `images.small_subrank1…6(_webp)`. Badge image: `/v1/assets/ranks/{tier}/{subrank}/image`.
- `GET /v1/patches` → patch dates and notes (for "current patch" and the movers comparison).

### Meta page (`/`)
- **Hero standings:** `GET /v1/analytics/hero-stats` with a time window
  (`min_unix_timestamp` = current patch date) and optional `min_average_badge`
  for the rank filter. Fields per hero: `matches`, `wins`, `losses`, `total_kills`,
  `total_deaths`, `total_assists`, `total_net_worth`, `total_last_hits`, …
  - Win rate = `wins / matches`.
  - KDA = `(total_kills + total_assists) / max(total_deaths, 1)`.
  - Pick rate = hero `matches` ÷ total matches in the window (each match has 12
    heroes — confirm how the API counts before dividing).
  - "Souls/min" needs total duration, which hero-stats does not return. Use
    `total_net_worth / matches` (avg souls per match) instead and relabel the
    column, unless the spec shows a duration field. Ask before changing the design.
  - Hide heroes below a minimum match count.
- **Movers:** the same call for the previous patch window; change = this WR − last WR.
- **Patch totals:** `GET /v1/analytics/game-stats` (check its fields) or derive from hero-stats.
- **Rank distribution:** `GET /v1/players/rank/distribution` → `rank`, `subrank`, `badge`, `players`.
  Group by tier; share = players ÷ total.
- **Items that win:** `GET /v1/analytics/item-stats` (filter by window, rank) →
  `item_id`, `wins`, `matches`, `players`, `avg_buy_time_s`. Join with assets for
  name, cost, tier, slot. Category tabs filter by slot.
- **Matchup grid:** `GET /v1/analytics/hero-counter-stats` → per (`hero_id`,
  `enemy_hero_id`): `wins`, `matches_played`. Cell = `wins / matches_played − 0.5`.
  Requires a minimum number of matches per pair.

### Live page (`/live`)
- `GET /v1/matches/active` → per match: `match_id`, `start_time`, `duration_s`,
  `net_worth_team_0`, `net_worth_team_1`, `objectives_mask_team0/1`, `spectators`,
  `region_mode_parsed`, `players[]` (`hero_id`, `team`), `team_stats[]`.
  - Souls and lead from the two net-worth values.
  - Objectives still standing come from the bitmasks — map bits to objective
    names once in `lib/deadlock/objectives.ts` and verify against a real match.
  - Average rank and kills: check what the response includes; if missing, drop
    them from the card and say so.
  - "Picked right now": count `hero_id` across all active matches.

### Match report (`/matches/[id]`)
- `GET /v1/matches/{match_id}/metadata` → `match_info` with:
  - `duration_s`, `winning_team`, `start_time`, `average_badge_team0/1`.
  - `players[]`: `account_id`, `team`, `hero_id`, `kills`, `deaths`, `assists`,
    `net_worth`, `last_hits`, `denies`, `level`, `items[]` (`game_time_s`, `item_id`,
    `sold_time_s`), `stats[]` = snapshots over time with `time_stamp_s`, `net_worth`,
    `player_damage`, `creep_damage`, `boss_damage`, `player_healing`, …
  - `objectives[]`: `destroyed_time_s`, `team`, `team_objective_id`, damage fields.
  - `mid_boss[]`: `{ team_killed, team_claimed, destroyed_time_s }` (empty when no
    Mid-Boss was taken; seen in match 96421548).
- **Souls lead:** for each snapshot time, sum `stats[i].net_worth` per team;
  lead = king − mother. Snapshots are every 3–5 min (e.g. 3, 6, 9, 12, 15, 20, 25 min
  and the end), not every minute. Plot the real snapshots only; don't resample or
  interpolate to whole minutes.
- **Scoreboard:** per player totals; hero damage / healing from the last `stats` snapshot.
- **Objective damage:** check per-player fields (`stats` or `player_tracked_stats`).
- **Build order:** `items[]` sorted by `game_time_s`, joined with item assets
  (shop upgrades only; abilities share the list and are excluded). Keep items that
  were later sold (`sold_time_s > 0`) and mark them as sold with that time — players
  routinely sell early items, so dropping them hides most of the early build.
- **MVP:** check `mvp_rank`.
- **Headline:** generated from the data by a small template (winner, biggest
  deficit overcome, minute the lead changed for good). Never invent details.
- Player names: `GET /v1/players/steam?account_ids=…` (batch).

### Player profile (`/players/[id]`)
- `GET /v1/players/{account_id}/match-history` → per match: `match_id`, `hero_id`,
  `player_kills/deaths/assists`, `net_worth`, `match_duration_s`, `match_result`,
  `player_team`, `start_time`, `ranked_delta`, `ranked_display_badge`.
  - Last 20 and match history straight from this.
  - **Rank climb:** `ranked_display_badge` over the last 60 ranked matches.
    (The `mmr-history` endpoints are deprecated — don't use them.)
  - Win/loss: compare `match_result` with `player_team` — verify the meaning on a known match.
- `GET /v1/players/{account_id}/rank` → current `rank`, `subrank`, `badge`.
- `GET /v1/players/hero-stats?account_ids=…` → per-hero record for the hero pool.
- `GET /v1/players/{account_id}/mate-stats` and `/enemy-stats` → allies and rivals.
- `GET /v1/players/steam-search?search_query=…` → `/players` search box (check param name).
- `GET /v1/players/steam?account_ids=…` → name and avatar.
- Badge numbers: confirm how `badge` encodes tier + subrank (likely `tier × 10 + subrank`)
  against `/v1/assets/ranks` before displaying.

## Teams

Matches use team ids `0` and `1`: **0 = The Hidden King** (`king`, orange) and
**1 = The Archmother** (`mother`, blue), mapped in `lib/deadlock/teams.ts`.
Verified against match 96421548 (see the comment in `teams.ts`). Every component
reads names and colours from that file.

## Images

- Load hero and rank images from the asset URLs the API returns (WebP variants).
- `next.config.ts` → `images.remotePatterns` for `assets-bucket.deadlock-api.com`
  and `api.deadlock-api.com`.
- Every image has alt text; fall back to initials/diamond if it fails.
- The art belongs to Valve. Keep the site non-commercial and keep the footer:
  "Fan project. Not affiliated with or endorsed by Valve. Data via deadlock-api.com."

## Privacy

Show a player only when someone searches for them or follows a link from a match.
No public lists of tracked players, no storing searches server-side.
