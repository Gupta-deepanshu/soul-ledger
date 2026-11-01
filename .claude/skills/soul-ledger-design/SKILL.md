---
name: soul-ledger-design
description: Visual rules for the Soul Ledger Deadlock dashboard — colours, team colours, fonts, layout, components, responsive behaviour and motion. Use whenever building or changing any page, layout or UI component in this project.
---

# Soul Ledger design system

An "occult ledger": warm black ink, parchment text, one brass accent, serif
headlines, double-line rules, Roman-numeral section markers and a faint grain.
The screens in `design-reference/screens/` are the source of truth; this skill
turns them into rules. When the two disagree, follow the screens.

## 1. Colour tokens

Dark only. Define these in `src/app/globals.css` (in `:root` and `.dark`, with
`className="dark"` on `<html>`) and expose them in Tailwind's `@theme`
(`--color-ink`, `--color-surface`, …) so classes like `bg-surface` work.

| Token | Hex | Use |
|---|---|---|
| `ink` | `#0F0D0B` | Page background |
| `rail` | `#0C0A08` | Mobile tab bar |
| `surface` | `#17140F` | Cards, inputs, selects |
| `surface-2` | `#1F1B15` | Hero tiles, empty matrix cells, rank bands |
| `rule` | `#231E18` | Row dividers inside cards; bar tracks |
| `line` | `#2C261E` | Card borders, section dividers, stat-grid gaps |
| `line-strong` | `#3A3227` | Double rules, input borders, secondary buttons |
| `line-muted` | `#4A4032` | Dashed "sample" badge, hero-tile borders, unhighlighted bars |
| `tick` | `#6B604F` | Zero lines, 50% markers, "/" separators |
| `fg` | `#EFE6D4` | Main text |
| `fg-2` | `#CFC4AE` | Secondary text, table cells |
| `muted` | `#9C9180` | Captions, labels, inactive nav |
| `faint` | `#8A7F6E` | Footer, axis labels |
| `brass` | `#D9B26F` | **The** accent: active nav, positive change, section numerals, primary button, wins |
| `king` | `#F0912E` | Team: **The Hidden King** |
| `mother` | `#5E8BFF` | Team: **The Archmother** (fills, bars) |
| `mother-text` | `#8FA9FF` | Archmother text, negative change, losses (lighter for contrast) |
| `weapon` / `weapon-bg` / `weapon-text` | `#E58B3A` / `#2A1C10` / `#F2B27A` | Weapon items |
| `vitality` / `vitality-bg` | `#7DBF6A` / `#18241A` | Vitality items |
| `spirit` / `spirit-bg` | `#A986F2` / `#1F1A2C` | Spirit items |

Rules:
- Name the accent `brass`, never `accent` (shadcn already uses `--accent`).
- Text on a `brass` fill is `ink`.
- Good/bad is **brass vs mother-text**, never green vs red. Always pair colour with
  a sign or symbol (`▲ +1.8`, `▼ −2.0`, "Win"/"Loss").
- Team colours come from `lib/deadlock/teams.ts`, never hard-coded in components.
- No gradients, glows or shadows on cards. Texture comes from the grain and
  the hero background below.

shadcn variables: `--background: ink`, `--card/--popover: surface`,
`--primary: brass`, `--primary-foreground: ink`, `--secondary/--muted/--accent: surface-2`,
`--muted-foreground: muted`, `--border/--input: line-strong`, `--ring: brass`,
`--radius: 0` (see corners below).

### Textures
- **Grain** on the page background (CSS): `radial-gradient(rgba(239,230,212,0.05) 1px, transparent 1px)` at `3px 3px`.
- **Hero background** on Meta, Live, Player and `/players`: React Bits **Shape Waves**
  (WebGPU), always through `components/ui/HeroBackground.tsx` — never use `ShapeWaves`
  directly. Brass shapes on ink at `opacity-30` (the wrapper opacity caps every pixel,
  cursor splash included), no glow; the demo's cursor splash is on (lighter `fg` shapes
  ripple from the pointer; off with reduced motion). Faded with the same masks as the
  halftone (`hero-mask`, `hero-mask-phone`, `hero-mask-radial`). Hero area only, never
  behind cards or tables; `aria-hidden`, `pointer-events: none` (the splash listens on
  `window`). Client-only and code-split (`next/dynamic`, `ssr: false`), so it loads after
  the page content. Phones (< 768 px): bigger cells (fewer shapes) and pixel ratio 1;
  elsewhere pixel ratio ≤ 1.5.
- **Text in heroes:** small labels inside a hero (eyebrows, "Current patch", "top 67%",
  "First match…") use `text-fg-2`, not `text-muted-foreground`, so they keep ≥ 4.5:1
  over the brightest wave frame (measured 5.0–5.8; muted would be ~2.9). Re-measure
  against the brightest frame, with the cursor moving, before raising the opacity.
- **Halftone** (CSS) is the fallback when WebGPU is unavailable or the GPU errors:
  `radial-gradient(circle, rgba(217,178,111,0.55) 1.3px, transparent 1.6px)` at `7px 7px`,
  masked with a linear (Meta, Live) or radial (Player) gradient so it fades out.
  Decorative: `aria-hidden`.

## 2. Typography

`next/font/google`: **Instrument Serif** (400, normal + italic), **Geist**
(400/500/600), **Geist Mono** (400/500).

| Role | Desktop | Tablet | Phone | Font |
|---|---|---|---|---|
| Page title (h1) | 84 / 0.95 (Match 76) | 64–68 | 44–46 | Instrument Serif, −0.02em |
| Card title (h2) | 32 / 1 | 30 | 26–28 | Instrument Serif |
| Big numbers (KPIs, souls) | 48–64 | 40–52 | 32–34 | Instrument Serif |
| Body | 15–17 | 15–16 | 14–15 | Geist |
| Table cells, captions | 13–14 | 13–14 | 12–13 | Geist / Geist Mono |
| Eyebrows, labels, table headers | 11–12, uppercase, 0.08–0.12em | same | 10–11 | Geist Mono |
| All numbers in tables | — | — | — | Geist Mono, `tabular-nums` |

- One word of each h1 is **italic serif in brass or a team colour**
  ("The meta, kept *in ink.*", "Matches *in progress.*", "The *Hidden King* takes it.").
- Each card has a Roman numeral (I., II., III. …) in brass mono above its title.
- The logo is "*Soul* Ledger": "Soul" italic in brass, "Ledger" in fg.

## 3. Layout

- Content max-width **1360 px**, centred. Side padding: 40 px desktop, 28 px tablet, 16 px phone.
- Header ends with a **3 px double rule** (`border-bottom: 3px double line-strong`); the footer starts with one.
- Cards: `surface` fill, 1 px `line` border, **square corners**, padding 24–26 px desktop, 20–22 tablet, 16 phone. Gap between cards 20 px desktop/tablet, 16 phone.
- Only inputs and selects get a 4 px radius. Buttons, tiles, chips and cards are square.
- Breakpoints: phone < 768, tablet 768–1279, desktop ≥ 1280.

### Responsive rules (see the three design files per page)
- **Desktop:** top nav (logo · Meta Live Players · search · rank filter · sample badge). Rows of cards at `2fr/1fr` or `1fr/1fr`.
- **Tablet:** compact top bar (logo · links · badge · search icon button). KPIs as a 2×2 stat grid. Charts full width; small cards paired in 2 columns.
- **Phone:** top bar with logo + search button; **bottom tab bar** (Meta, Live, Players), fixed, `rail` background, active item in brass. Everything single column. Wide tables become stacked rows (see the mobile designs: hero standings, scoreboard, match history). The page never scrolls sideways.

## 4. Components (`src/components/ui/`)

- **SectionHeader** — numeral (mono 11, brass) + h2 + optional 13 px muted caption + optional right-side action.
- **StatGrid** — cells separated by 1 px gaps on a `line` background; label mono uppercase, value serif.
- **HeroTile** — square, 1 px border (`line-muted`, or the team colour in team contexts), `surface-2` fill. Shows the hero's small icon from the API (`next/image`, alt = hero name); falls back to serif initials in brass if the image fails.
- **RankBadge** — the API's rank image for tier + subrank, with the rank name; falls back to the brass diamond SVG used in the design.
- **WinRateBar** — 6 px track in `rule`, fill brass, with a 1 px `tick` marker at 50%. Scale 40–60%.
- **TickMeter** — 25 ticks from 44% to 56% in 0.5 steps; filled ticks below 50% `#7A5634`, from 50% `weapon`, empty `line`.
- **TeamSplitBar** — two flex segments with a 2–3 px gap, `king` then `mother`, widths = souls.
- **ItemChip** — square with tier (I–IV) in mono, coloured by item slot (weapon / vitality / spirit).
- **Delta** — `▲ +1.8` in brass or `▼ −2.0` in mother-text, mono.
- **SampleBadge** — mono uppercase in a dashed `line-muted` border. Only shown while data is not live.
- **Footer** — "Fan project. Not affiliated with or endorsed by Valve. Data via deadlock-api.com." on every page.

Icons: lucide-react, 18–20 px, 1.5 stroke. No emoji.

## 5. Motion (`import { motion } from "motion/react"`)

One easing everywhere: `[0.22, 1, 0.36, 1]`. Durations 200–500 ms. Phones use
~70% of desktop durations and smaller distances.

**Everywhere**
- Cards fade up 8 px on first load, staggered 40 ms.
- Double rules draw left → right (`scaleX` 0 → 1) when their section enters view.
- Big numbers count up once on first view; on data change they tween from old to new value (never from zero).
- Bars grow from zero on first view; resize smoothly on data change.
- Active nav item, tabs and the Weapon/Vitality/Spirit switch slide their highlight with a shared `layoutId`.
- Switching a filter or tab: rows cross-fade with `AnimatePresence mode="popLayout"`.

**Page titles — `InkTitle`** (`components/ui/InkTitle.tsx`; React Bits StrokeText + GSAP,
the only GSAP use on the site)
- Used for: "The meta, kept *in ink.*", "Matches *in progress.*" / phone "Live *now*",
  the player name, the match report "The *[team]* takes it." and "Find a *player.*".
  Pass `parts`: plain strings and `{ text, className }` runs for the italic brass or
  team-colour word (`cn("italic", team.textClass)`). Never hand-write these `<h1>`s.
- The real `<h1>` always holds the full text (screen readers, SEO) and keeps its natural
  wrapping, so there is no layout shift; its letters are hidden only while the
  `aria-hidden` drawn copy plays — one StrokeText per line per styled run, measured
  from the laid-out heading — then the real text takes over. While drawing, InkTitle
  hides the real letters with an inline style (never rely on the stylesheet alone, or
  a stale CSS build shows both copies), and pins every drawn letter to its measured x
  in the real heading (StrokeText's per-letter `<tspan>`s lose kerning otherwise).
- Motion: outline draws (0.5 s, our easing `cubicBezier(...EASE)`, 12 ms per letter),
  then one unhurried left → right fill sweep per line (0.8 s, sine in-out) that starts
  as the first letters close and runs across all of the line's pieces (plain and
  italic) as a single stroke — ~1.3 s in all, once per page visit. No replay on scroll, hover or tab
  switches; a window resize mid-draw just shows the real text.
- The hero background (Shape Waves, or its halftone fallback) stays hidden while the
  title draws and fades in (0.6 s) as the fill completes — coordinated by `lib/ink.ts`.
- Reduced motion, a hidden heading (the other breakpoint's `<h1>`) or a truncated one:
  the plain heading immediately. No JS: `<noscript>` shows it; a 4 s CSS failsafe
  shows it if the script never runs.
- Player names get the effect only if `canInkName(name)`: ≤ 20 characters and every
  character in the Instrument Serif Latin subset we load; otherwise `enabled={false}`.

**Per page**
- Meta: TickMeters fill tick by tick (~15 ms each); matchup cells fade in on a diagonal sweep; mover arrows nudge 2 px once.
- Match: the souls-lead line draws (`pathLength` 0 → 1), then the team areas fade in, then objective diamonds drop in time order with the objective list rows. Hovering an objective row highlights its diamond and vice versa.
- Live: values tween on each poll; cards re-sort with the `layout` prop; new matches fade/scale in and ended ones fade out (`AnimatePresence`). The live dot pulses softly (one of only two loops — see Rules).
- Player: rank-climb line draws step by step and the end dot pops in; last-20 bars rise oldest → newest (wins up, losses down); after "Refresh", new history rows slide in at the top.
- Mobile scoreboard rows expand to full stats with `layout` + `AnimatePresence`.

**Rules**
- Only two things loop: the **hero background (Shape Waves only)** and the **live dot**.
  Everything else is one-shot. The hero background pauses when the hero is off screen
  or the tab is hidden, and shows a still frame with reduced motion; its CSS halftone
  fallback is static and only fades in when it mounts.
- Entrance animations run once per page visit, not on every tab switch.
- Wrap the app in `<MotionConfig reducedMotion="user">`; with reduced motion, show final values and fully drawn charts instantly.
- Animate only `transform`, `opacity` and SVG `pathLength` (the hero background draws on its own canvas, and InkTitle animates SVG stroke dashes and a clip rect through GSAP; both are exempt).
- No smooth-scroll libraries, parallax or scroll-jacking.

## 6. Accessibility checklist

- Contrast ≥ 4.5:1 for text (the tokens above pass on `ink` and `surface`; don't add lighter greys).
- Touch targets ≥ 44 px.
- Real `<button>`, `<a>`, `<label>` + `<input>`/`<select>`; `aria-label` on icon-only buttons.
- Every chart: `role="img"` and an `aria-label` sentence stating the takeaway.
- Tables keep `<table>` semantics on desktop/tablet; stacked mobile rows keep a logical reading order.
- Images have alt text (hero or rank name); decorative textures are `aria-hidden`.
