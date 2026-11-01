# Soul Ledger — design reference

The approved design for every page at three sizes. Reference only: build to
match it, never ship or edit these files.

## Screens

| Page | Desktop (1440) | Tablet (834) | Phone (390) |
|---|---|---|---|
| Meta `/` | `screens/Main.dc.html` | `screens/MetaTablet.dc.html` | `screens/MetaMobile.dc.html` |
| Live `/live` | `screens/Live.dc.html` | `screens/LiveTablet.dc.html` | `screens/Mobile.dc.html` |
| Match report `/matches/[id]` | `screens/Match.dc.html` | `screens/MatchTablet.dc.html` | `screens/MatchMobile.dc.html` |
| Player profile `/players/[id]` | `screens/Player.dc.html` | `screens/PlayerTablet.dc.html` | `screens/PlayerMobile.dc.html` |

`images/` — PNG exports of the screens (add them from the design canvas: Share › Export).

The tablet and phone files show the **whole scrolling page** in one tall frame.
On a real phone the bottom tab bar is fixed to the bottom of the screen.

## How to read the `.dc.html` files

They use a design-canvas format, not plain HTML. Read them for exact colours,
sizes, spacing, copy and structure — don't run them or copy their syntax:

- `{{name}}` is a value from the `renderVals()` function at the bottom of the file.
- `{{accent}}` is the brass accent, `#D9B26F`.
- `<sc-for list="{{items}}" as="x">` repeats its contents per item (a `.map()`).
- `<sc-if value="{{cond}}">` renders its contents only when true.
- `data-props` at the bottom declares design tweaks; ignore it.
- Links between `.dc.html` files are prototype links; use the real routes instead.

Translate inline styles into Tailwind classes using the tokens in the
`soul-ledger-design` skill.

## Sample data

Every number and every player name in these screens is invented. Hero, item,
rank and team names are real. Hero portraits and rank badges are drawn as
placeholders (initials, a diamond); the real site uses the API's images.
The real data comes from the Deadlock API — see the `deadlock-api` skill.
