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
  increase stroke widths and label sizes inside the viewBox (see the mobile
  designs) rather than shrinking the text to nothing.
- Takes typed props only, no fetching inside chart components.

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
- Vertical bars, 4–5 px gaps; percentage above each bar in mono 10 px, 3-letter
  rank abbreviations below. Bars `line-muted`, highlighted tiers (Oracle and above,
  or the user's filter) in brass. May use the rank colours from the API instead —
  ask before switching.
- Caption names the median tier.

## WinRateBar, TickMeter, TeamSplitBar

See `soul-ledger-design` § Components for exact styling. Widths come from data:
- WinRateBar: `(wr − 40) / 20` clamped 0–1.
- TickMeter: ticks filled while `44 + i × 0.5 ≤ wr`.
- TeamSplitBar: flex weights = each team's souls.

## Matchup grid (meta)

- Input: 6 × 6 heroes; each cell = row hero's win rate vs column hero − 50.
- Diagonal cells show "—" on `surface-2`.
- Cell fill: brass if positive, `mother` if negative; opacity `0.15 + |v| / 4.5`
  capped at 0.85. Text `ink` when `|v| > 2.6`, else `fg`.
- Value text: `+2.1` / `−1.4` (use a real minus sign).
- Only show pairs with enough matches (see `deadlock-api`); otherwise "n/a".

## Damage share (match)

- One stacked horizontal bar per team, segments sorted largest first, 2 px gaps.
- Team colour shades from light to dark (king: `#F0912E #C97526 #A35F20 #7E4A1A #5C3614 #40260F`;
  mother: `#5E8BFF #4C72D4 #3D5CAB #2F4784 #22345F #182543`).
- Desktop/tablet: labels inside segments ("Haze 22%"). Phone: no inside labels;
  a 3-column legend underneath.

## Build order (match)

- A grid of purchases in time order: ItemChip (tier, slot colour) + item name + time.
- Items later sold stay in the grid, dimmed, with "sold 19:20" after the buy time
  (see `deadlock-api` § Build order).
- Desktop auto-fills columns ≥ 150 px; tablet 3 columns; phone 2 columns.
- A select chooses whose build to show (default: the MVP).

## Live lists

- Live match cards: kills "24 – 19", lead text in the leading team's colour,
  TeamSplitBar, six HeroTiles per side.
- "Picked right now": horizontal bars, width = count ÷ max count, brass fill.
