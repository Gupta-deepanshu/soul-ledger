---
name: soul-ledger-charts
description: How to build every chart and data visual in the Soul Ledger Deadlock dashboard — souls lead chart, rank climb, last-20 form bars, rank distribution, tick meters, matchup grid, damage share, build order. Use when building or changing any chart or data visual.
---

# Soul Ledger charts

All charts are hand-built: SVG for line/area charts, flex/grid divs for bars.
No chart library. Colours and motion come from `soul-ledger-design`; data comes
from mappers in `src/lib/deadlock/` (see the `deadlock-api` skill).

## Every chart

- Lives in a Card with a SectionHeader and a caption saying what is measured.
- `role="img"` + `aria-label` stating the takeaway in one sentence, generated from the data.
- Numbers in Geist Mono, `tabular-nums`. Axis labels mono 11 px in `faint`.
- SVG charts use a fixed `viewBox` and `width: 100%; height: auto`. On phones,
  increase stroke widths inside the viewBox (see the mobile designs). Label
  sizes are set from the measured width (`charts/useViewBoxScale`) so labels
  render at 11 px on screen at every width, never shrinking with the SVG.
- Text on a data-driven fill must reach 4.5:1: pick ink or fg with
  `bestText()` from `lib/contrast.ts`, and if neither passes, lighten the fill
  (matchup grid) or put the label on a dark plate (damage share).
- Focusable charts and lists show a visible 2 px brass `focus-visible` outline
  (`outline-hidden focus-visible:outline-solid …`; plain `outline-none` cancels it
  in Tailwind v4). A list of many rows is one tab stop with arrow-key movement.
- Takes typed props only, no fetching inside chart components.

## Hover and tooltips

Every chart shows the detail behind a mark, using `charts/ChartTooltip.tsx`.
Only show what isn't already printed next to the mark (WinRateBar, TickMeter
and TeamSplitBar have their numbers beside them, so they get no tooltip).

- **Tablet and desktop (≥ 768 px): `ChartTooltip`.** Shown on mouse hover and on
  keyboard focus; `hidden md:flex`, `aria-hidden`. It sits above the chart (or
  the hovered cell or bar), leaning left or right near the edges (`x` < 25 or
  > 75). Same look everywhere: `ink` fill, `line-strong` border, mono 11 px; the
  first line names the thing in `fg`, the second gives the value (team or
  result colour), the third is `Muted` context (date, games, change).
- **Phone (< 768 px): no floating tooltips. `ChartReadout`** is a one-line
  detail strip directly under the chart (`md:hidden`, `aria-live="polite"`).
  It shows the most recent item by default (or the most telling one where there
  is no order: the biggest matchup edge, the most common rank, the top damage
  dealer) and changes when a mark is tapped. The selected mark gets a 2 px
  brass outline (bars, cells) or ring (points), on phone only. Long text is cut
  with an ellipsis; a link goes in `action` so it never wraps.
- **Pointer handling.** Hover state comes from `pointerType === "mouse"` only,
  so a tap never leaves a hover stuck on; taps select via `isPhoneViewport()`
  at click time.
- **Keyboard.** The chart is one tab stop (`tabIndex={0}`, `role="group"`, an
  aria-label that ends "Use the arrow keys…"). Left/Right step through points
  or bars (Up/Down too in the grid), Escape clears. A `sr-only` `aria-live`
  line reads the current item, so the tooltip itself stays `aria-hidden`.
- **Links.** Last 20 bars are real `<Link>`s to `/matches/[id]` with an
  aria-label like "Match 12: Warden, win, KDA 3.4, 2 days ago". Desktop: hover
  or focus shows the tooltip, click or Enter opens the match. Phone: the first
  tap selects; "Open match →" in the readout opens it. The climb's readout has
  the same link.
- **Linked highlights.** When a list and a chart show the same things, hovering
  one highlights the other through `ui/RowHighlight.tsx` (keys: match id,
  account id, hero id): match history ↔ Last 20, scoreboard ↔ damage share,
  hero standings ↔ the matchup grid's labels. Objective rows ↔ souls-lead
  diamonds use the older `EventHighlight`. Mouse only; without a provider
  nothing happens, so the charts still work alone.
- Relative dates in labels and tooltips come from `useRelativeTime()` (plain
  date on the server, "2 days ago" after hydration).

What each chart shows:

| Chart | Tooltip / readout |
|---|---|
| Last 20 | Hero, Win/Loss, K/D/A and KDA, souls, length, when |
| Climb | Rank, change from the match before, hero, result, when |
| Matchup grid (Meta, live draft) | "Haze wins 53.1% of 28,382 games vs Viscous"; crosshair on the row and column |
| Rank distribution | Tier, share, ≈ players, "top X% with this rank or higher" |
| Damage share | Player, hero, exact damage and % of team, K/D/A, souls |
| Souls lead (match) | Time, lead, "Archmother gained 759 since 9:00" |
| Lead sparkline (live) | Time, lead, change since the previous update |
| Movers (list) | Last patch → this patch win rate |
| Live card hero tiles | Hero name (CSS `group-hover`, tablet/desktop) |

## SoulsLeadChart (match report)

- Input: `{ timeS: number; lead: number }[]` where `lead = kingNetWorth − motherNetWorth`
  at each **real stats snapshot** (every 3–5 min, not every minute), plus
  `objectives: { timeS: number; team: TeamId; kind: string; key?: boolean }[]` and the
  match duration. Never resample or interpolate between snapshots.
- `viewBox="0 0 800 300"`; plot area x 40–780, zero line at y 120, ±20k souls = ±100 px.
  Pick the scale from the data's max absolute lead, rounded up to 5k/10k/20k.
- Draw: horizontal gridlines (`line`), zero line (`tick`), then the area between the
  line and zero **twice** with clip paths — above zero filled `king` at 28% opacity,
  below zero filled `mother` at 32%. Then the lead line in `fg`, 1.6 px (4 px on phone),
  straight segments between snapshots, with a small dot at each snapshot so the real
  data points are visible.
- Objectives: a dashed vertical `line-strong` guide at each time, and a 9 px
  diamond at the bottom (y ≈ 262), stroked in the team colour; key objectives
  (Mid-Boss, Patron) are filled.
- X labels: 0:00, key moments, and the final time.
- Objectives sit at their exact times (independent of the snapshots).
- Hover: a vertical cursor with a tooltip (time, lead, which team) at the nearest
  snapshot. Keyboard: focusable, arrow keys step through snapshots.
- Motion: line `pathLength` 0 → 1 (0.9 s), areas fade in after, diamonds drop in order.

## RankClimb (player)

- Input: ordered list of `{ badge: number }` for the last 60 ranked matches.
- Step line (`H`/`V` path segments) in brass, 2.5 px; current point a brass dot.
- Background bands alternate `surface-2` / transparent per rank tier with tier names
  in mono labels on the left. Only show tiers the data passes through, plus one above.
- Motion: draws step by step, dot pops in last.

## FormBars (player, last 20)

- Input: 20 × `{ won: boolean; kda: number }`, oldest first.
- A centre line in `tick`. Wins grow **up** in brass, losses grow **down** in
  `mother`; height ∝ KDA (wins scale to the max win KDA, losses to the max loss KDA).
- Header shows the W–L record in serif. Legend: Win / Loss.

## RankDistribution (meta)

- Input: `{ tier: number; name: string; share: number }[]`.
- Vertical bars, 4–5 px gaps; percentage above each bar and 3-letter rank
  abbreviations below, both mono 10 px (11 px on desktop). This overrides the
  8/9 px in MetaMobile. Bars `line-muted`, highlighted tiers (Oracle and above,
  or the user's filter) in brass. May use the rank colours from the API instead —
  ask before switching.
- Caption names the median tier.

## WinRateBar, TickMeter, TeamSplitBar

See `soul-ledger-design` § Components for exact styling. Widths come from data:
- WinRateBar: `(wr − 40) / 20` clamped 0–1.
- TickMeter: ticks filled while `44 + i × 0.5 ≤ wr`.
- Items that win (meta) ranks items by **lift**: win rate minus the purchase-weighted
  average win rate of all items at the same tier (cost). Raw win rate only lists
  late 6,400-soul items. The row number is the lift (`+2.1`), the details line shows
  cost, raw win rate and buy share, and the TickMeter takes `0.5 + lift` so its
  ticks read −6 → +6 points.
- TeamSplitBar: flex weights = each team's souls.

## Matchup grid (meta)

- Input: 6 × 6 heroes; each cell = row hero's win rate vs column hero − 50.
- Diagonal cells show "—" on `surface-2`.
- Cell fill: brass if positive, `mother` if negative; opacity `0.15 + |v| / 4.5`
  capped at 0.85. Text is `ink` or `fg`, whichever contrasts more (`bestText`);
  where neither reaches 4.5:1 (brass ≈ ±1.6–2.2, mother ≈ ±2.4–2.9) the fill is
  eased lighter until `fg` passes.
- Value text: `+2.1` / `−1.4` (use a real minus sign).
- Only show pairs with enough matches (see `deadlock-api`); otherwise "n/a".

## Damage share (match)

- One stacked horizontal bar per team, segments sorted largest first, 2 px gaps.
- Team colour shades from light to dark (king: `#F0912E #C97526 #A35F20 #7E4A1A #5C3614 #40260F`;
  mother: `#5E8BFF #4C72D4 #3D5CAB #2F4784 #22345F #182543`).
- Desktop/tablet: labels inside segments ("Haze 22%"), ink or fg by contrast; the
  mid shades that pass with neither get a dark `ink/70` plate. Phone: no inside
  labels; a 3-column legend underneath.

## Build order (match)

- A grid of purchases in time order: ItemChip (tier, slot colour) + item name + time.
- Items later sold stay in the grid with "sold 19:20" after the buy time (see
  `deadlock-api` § Build order). Only the ItemChip is dimmed (50%); the name turns
  `muted` and stays ≥ 4.5:1.
- Desktop auto-fills columns ≥ 150 px; tablet 3 columns; phone 2 columns.
- A select chooses whose build to show (default: the MVP).

## Live lists

- Live match cards: kills "24 – 19", lead text in the leading team's colour,
  TeamSplitBar, six HeroTiles per side.
- "Picked right now": horizontal bars, width = count ÷ max count, brass fill.
