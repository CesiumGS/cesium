# Frames explorer: design

How the frames explorer's page looks, reads and behaves. It applies
[Dyno's design guide](../../bench/suite/DESIGN.md) and StrataKit; it adds
no visual language of its own beyond the 3D viewport's HUD, which Dyno's
guide exempts. The plan's R14 fixes the structure, R16 the quality bar,
R17 the frame it sits in. Screenshots of the prototype (stub data, part 6a)
are in [design-screenshots/](design-screenshots/).

## Who it is for

Two audiences, one page (R16):

- **Graphics engineers** exploring the proof of concept. They come for the
  globe: frames as triads, overlays drawn exactly, Orion's figure-eight,
  the camera moving with purpose. They should never have to read a table
  to be impressed.
- **Geodesists, surveyors, GIS and space people.** They come to find out
  whether they can trust it. Every question they'd ask has visible
  evidence, every number has its unit and its accuracy, and every limit
  ("not bounded", "ballpark", "predicted") is said plainly.

The design spends its boldness in one place, the globe and what's drawn
on it. The panel is quiet, dense and exact: StrataKit's type, its tokens,
almost no boxes. The one memorable thing in the panel is the **walk**: the
selected frame's chain of edges from the root, each with its math, its
data and its accuracy, adding up in a budget bar to the composed accuracy.
It is where the demo and the proof meet.

## Principles

1. **The globe is the hero; the panel answers.** Nothing on the canvas
   but what the user turned on, its legend and, on the tour, a caption.
2. **Glance, then proof.** Four levels (R14): the status strip, question
   cards, result rows, the inspector. Each level is one click from the
   next, and the first view is calm: cards closed, ready data muted.
3. **Hierarchy from type and space, not boxes.** Sections are headings
   and `space-600` gaps. The only filled surfaces in the panel are the
   walk, the "Try your own" well and code blocks (`bg-page-depth`,
   `bg-mono-muted`): places where the content is a different kind of
   thing.
4. **Color means something.** Status colors only for status (R14's
   vocabulary). One categorical palette for frame families, the same in
   the tree, the walk, the budget bar, the legend and the drawn triads and
   lines. Axis colors stay red, green, blue.
5. **Honest numbers.** Units always, significant figures no finer than
   the comparison, powers of ten written out ("3.4 × 10⁻⁹", never
   "3.4e-9"). An unknown accuracy says "not bounded" and names the term;
   a check that makes no claim about position says "no position", never
   a blank.
6. **States are designed.** Not loaded, fetching (with bytes), ready,
   missing (with the one command to run), error (what failed and how to
   retry), waiting (naming the item), running, not run.

## Layout

### Where it sits (R17)

Dyno owns the page: title, switcher, "Show source", the "Starting…"
overlay, the error alert, the side layout's columns, the Controls header
and its collapse, the theme and the URL. On the canvas, Dyno's inspector
is top left and the credits bottom left; the viewer's time controls are
bottom centre. The example adds:

- **The panel**, in Dyno's Controls body: the status strip, then the
  Explore / Verify / Report tabs directly under the Controls header. No
  second title or description.
- **The HUD**: the legend bottom right, above the time controls (it
  measures them and keeps clear, one or two rows as the width allows);
  the tour caption top right.

### Desktop

Measured in Dyno at 1440 × 900: the side column is **579 × 680 px**, the
view 728 × 680. Dyno's grid is `minmax(0, 1fr) minmax(380px, 44%)`.

```text
┌ view 728 ──────────────────────────────┐ ┌ Controls ───────────────────────── ˄ ┐
│ [inspector]           ┌ Stop 3 of 6  ✕┐│ │ ◉ Frame data ready ◉ PROJ ready ◉ … ⓘ│ status strip
│                       │ The California││ │ ✓ 67 passed  ⓧ 0 failed  in 4.2 s    │ (always on top)
│                       │ design grid   ││ │ ─────────────────────────────────────│
│                       │ caption…      ││ │ Explore   Verify   Report            │ tabs
│          ( globe )    │ ⧉   Back Next ││ │                                      │
│                       └───────────────┘│ │ New to frames? Six stops…  [Tour]    │
│                                        │ │ Frames        ● Celestial ● Earth-…  │
│                      ┌ On the globe  ˅┐│ │ ˅ ● ICRF                             │
│                      │ ▬ Design grid  ││ │     (root) defines the frame         │
│                      │   ±2.0 m …     ││ │   ˅ ● EARTH_ICRF                     │ tree: each row's
│                      │ ▬ Orion's path ││ │       (translation) ±10 mm           │ edge and accuracy
│                      │   not bounded… ││ │   …                                  │
│                      └────────────────┘│ │ ┌ ICRF to MOON_PA     [Show on globe]┐│ the walk
│      [ ▶  Fri, Nov 6   6:29 AM  ⚙ ]    │ │ │ ● ICRF → MOON_ICRF (translation) ±10│
│ [credits]                              │ │ │ ● … → MOON_ME (rotation) not stated ││
└────────────────────────────────────────┘ │ │ Composed accuracy           ±1.0 m ││
                                           │ │ ████████████████████████████▌▌      ││ budget bar
                                           │ └────────────────────────────────────┘│
                                           │ On the globe (switches, accuracy line)│
                                           │ Clock                                 │
                                           └───────────────────────────────────────┘
```

Verify, with a result selected:

```text
┌ Controls ─────────────────────────────────── ˄ ┐
│ status strip                                    │
│ Explore   Verify   Report                       │
│ [All][Civil][BIM][GIS][Space][Timing][Off.][AV] │ lens, one at a time
│ 67 passed, 0 failed, … in 4.2 s   [Run all again]│
│ ˅ Do design coordinates survive…   ✓ 5 of 5 pass│ question card (closed):
│   Worst 3.7 nm against a tolerance of 100 µm    │ question, answer, verdict
│ ˄ Do design measurements agree…    ✓ 3 of 3 pass│ (open)
│   Measurement, 3 checks  [Show on globe][Run]   │
│   Check            Value/tol   Accuracy Status  │ result rows
│   A 10,000 ftUS …  ▬▬▬──|      ±2.8 m   ✓ Pass  │ (selected row highlighted)
│ ═══════════════════════════════════════════════ │ ← the inspector, a sheet
│ ✓ Pass  Measurement                      ˄  ✕   │   under the list (≤ 58%),
│ A 10,000 ftUS design line … within 0.01 m       │   or the whole tab (˄)
│ [Show on globe] [Highlight frames] [Copy link]  │
│ Measured against expected  ▬▬▬▬▬▬──────|──      │
│ Computation trace  ① input ② × S ③ … = expected │
│ Accuracy  (budget bar and terms)                │
│ Source / Fingerprint                            │
└─────────────────────────────────────────────────┘
```

Each tab scrolls on its own under the strip; Verify's list and inspector
scroll separately so the selected row stays in view (it scrolls to it as
the inspector opens).

### Narrow

Dyno's side column never goes below 380 px, and Dyno has no breakpoint
for the side layout: at 1024 px the column is 396 px and the view 496 px;
at 900 px the column is at its 380 px floor and the view 388 px; on a
phone the two columns still sit side by side, the view a sliver
(`design-screenshots/*-narrow.png`, `*-phone.png`). The panel itself
works down to 380 px: rows wrap, card verdicts stay in their column,
toolbars stack (`@container fx-panel (max-width: 420px)`), and the
inspector fills the tab when there's no room for both.

**The column is wide enough for the panel at desktop sizes** (579 px holds
the tree, a five-column result table and the inspector), but it takes 44%
of the stage, which works against "the globe is the hero". Proposed as a
separate Dyno change (R16, R17), not built here:

1. **A resizable side column.** A splitter between the view and the panel
   (StrataKit has none: STRATAKIT_FEEDBACK.md item 37), its width
   remembered like the collapse, default 40%, between 360 px and 60%.
2. **Stack the side layout below about 900 px wide**: the view full width
   at about 55% of the height, the panel under it, so phones and narrow
   windows get a usable globe.

## Type

StrataKit's sans (Inter) for everything; its mono only for code (PROJ
pipelines, WKT, SHA-256, expected-error patterns), never as a label face.
Sizes are StrataKit's semantic tokens; weights are hard-coded where
StrataKit has none (feedback item 6).

| Role                                              | Token                                   | Weight |
| ------------------------------------------------- | --------------------------------------- | ------ |
| Panel base, rows, captions under switches         | `body-sm` 12 px                         | 400    |
| Section heading (h2): Frames, On the globe, Clock | `subtitle-md` 14 px                     | 600    |
| Question (card title, h3)                         | `body-md` 14 px                         | 500    |
| Card answer, edge detail, trace labels            | `body-sm` 12 px, secondary              | 400    |
| Overlay label                                     | `body-md` 14 px                         | 400    |
| Composed accuracy (the walk's figure)             | `headline-sm` 18 px                     | 600    |
| Clock time                                        | `body-lg` 16 px                         | 600    |
| Inspector title                                   | `body-md` 14 px                         | 600    |
| Inspector part heading (h4)                       | `subtitle-sm` 12 px, secondary          | 600    |
| Chips, edge kinds, tolerance numbers              | `caption-md` 11 px / `caption-lg` 12 px | 400    |
| Code                                              | `mono-sm` 12 px                         | 400    |

Numbers are tabular everywhere (`font-variant-numeric: tabular-nums`).

## Color

### Surfaces and ink

StrataKit tokens only: `bg-page-base` (the column), `bg-page-depth` (the
walk, the "Try your own" well, the frame filter), `bg-mono-muted` (code),
`bg-elevation-base` at 92% with a 6 px blur (the HUD), `text-neutral-*`
(ink), `border-neutral-muted` (row rules). Light and dark come from
Dyno's Root; nothing in the panel is scheme-specific except the HUD
palette below, which uses `light-dark()`.

### Status (R14's vocabulary)

| State                                | Badge (`variant="inline"`, small)                                                | Icon                               | Word                                      | Text token               |
| ------------------------------------ | -------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------- | ------------------------ |
| Pass                                 | `success`; muted when it needs no attention (ready data, a card's "5 of 5 pass") | status-success                     | Pass                                      | `text-positive-base`     |
| Fail                                 | `error`, strong                                                                  | status-error                       | Fail, "1 of 3 fail", "Browser ≠ Node"     | `text-critical-base`     |
| Fetching or waiting                  | `info`                                                                           | spinner (`CircularProgress` 10 px) | "PROJ 6.8 of 16.0 MB", "Waiting for PROJ" | `text-info-base`         |
| Missing data                         | `secondary`                                                                      | status-pending                     | Missing data, "Orion OEM missing"         | `text-neutral-secondary` |
| Not bounded, ballpark, predicted     | `warning`                                                                        | status-warning                     | Not bounded, naming the term              | `text-attention-base`    |
| Shown, not judged (R11 display-only) | `secondary`, outlined                                                            | info                               | Shown                                     |                          |
| Your input (R18)                     | `info`, outlined                                                                 | info                               | Your input                                |                          |
| Not loaded                           | dashed outline, no fill                                                          | none                               | "GEOID18 not loaded"                      |                          |

Never color alone: every state has an icon and a word. Strong badges are
kept for what needs attention (fail, fetching); a page where everything
passes reads calm.

### Frame families (the HUD exception)

One categorical palette (R16), used identically in the tree's swatches,
the walk's dots, the budget bar's segments (each term colored by where
its error comes from), the legend, and the drawn triads' origin labels
and lines. Each family has a tone for light surfaces and one for dark
surfaces and the globe (`panel/families.ts`, `panel/panel.css`); the 3D
geometry always takes the on-dark tone, because the globe and space
behind it are dark in either scheme.

Contrast against StrataKit's surfaces (WCAG relative luminance, computed
from the tokens' OKLCH values), all at least 4.5:1, so the colors pass as
text, not only as 3:1 graphics:

| Family      | Holds                                            | On dark   | page / elevation / space | On light  | page / elevation |
| ----------- | ------------------------------------------------ | --------- | ------------------------ | --------- | ---------------- |
| Celestial   | ICRF, HCRS, GCRF, EME2000, EARTH_ICRF, MOON_ICRF | `#b298f9` | 6.8 / 6.3 / 8.7          | `#6e44bc` | 6.4 / 6.5        |
| Earth-fixed | ITRF and Earth sites                             | `#3bcddc` | 8.5 / 7.9 / 11.0         | `#02717a` | 5.6 / 5.8        |
| Moon-fixed  | MOON_ME, MOON_PA, lunar sites                    | `#eec469` | 9.9 / 9.2 / 12.8         | `#836412` | 5.4 / 5.6        |
| Engineering | PROJ-placed design frames and their overlays     | `#f07ec2` | 6.6 / 6.1 / 8.4          | `#ae2881` | 6.0 / 6.1        |
| Trajectory  | Orion's path                                     | `#fc9252` | 7.2 / 6.7 / 9.3          | `#ae5517` | 5.0 / 5.1        |

Surfaces: dark page `oklch(24.37% .006 268)`, dark elevation
`oklch(26.92% .008 268)`, space `#000`; light page `oklch(99.06% .002
248)`, light elevation `#fff`. Hues sit apart from the axis colors (violet
295°, cyan 205°, sand 85°, rose 345°, orange 50° against red 25°, green
145°, blue 260°) so a family never reads as an axis. Sand and orange, and
violet and rose, are close for some color-vision deficiencies: the family
is always named too (the swatch's label, the legend, the walk's text).

Axes: x `#fc5855`, y `#5ad664`, z `#5d97f7` on the globe (5.2, 8.7, 5.6
on dark page; 6.7, 11.2, 7.2 on space), with on-light tones for the
legend's key (`#cc272e`, `#1b7e2a`, `#0559d2`: 5.2, 5.0, 6.1).

## Spacing

StrataKit's 4 px scale: `space-50` (2 px) inside badges, `space-100`
between an icon and its word, `space-150` to `space-200` inside a row,
`space-300` between a row's parts and inside the walk and the well,
`space-500` between inspector parts, `space-600` between a tab's
sections. Rows are separated by 1 px `border-neutral-muted` rules, not
cards; StrataKit's compact sizes (`size="small"`) throughout.

## Components and their states

StrataKit components, as the plan's table names them, with two
substitutions where StrataKit has deprecated the named one (see
"Deviations").

### Status strip (always on top)

- **Pills**, one per data item (frame data, PROJ, GEOID18, Orion OEM), in
  R14's vocabulary: not loaded (dashed, quiet), fetching (info, spinner,
  "PROJ 6.8 of 16.0 MB"), ready (muted green), missing (gray), error
  (red, "GEOID18 failed").
- **Counts**: "✓ 67 passed ⓧ 0 failed", "12 groups waiting", "running, 96
  of 225", "in 4.2 s". A failure count turns red and bold; zero stays
  gray.
- **ⓘ Data details**: a popover with each item's state, size, load time
  and what it is (keyboard reachable: feedback item 11's gap, solved with
  a button rather than a tooltip on a badge).
- **Fetching**: a row per fetch, "Fetching PROJ's WebAssembly and
  proj.db: 6.8 of 16.0 MB", with a determinate `LinearProgress` from the
  response's `Content-Length`, indeterminate when the total isn't known.
- **Missing**: one info `Alert`: "PROJ, GEOID18 and Orion OEM aren't in
  the frames store. Run `npm run setup` in packages/next, then reload.
  Everything that doesn't need them still works." (R5.)
- **Error**: an error `Alert` per item: what failed, and that turning the
  feature on again retries.

### Tree row (Explore)

`Tree.Root` / `Tree.Item` from `@stratakit/structures`, a flat list with
`aria-level`, `aria-posinset`, `aria-setsize`. Each row: the family
swatch (with its family as the accessible name), the frame's name, and a
second line with the **edge-kind chip** ("translation", "rotation", "IERS
affine", "fixed", "trajectory", "PROJ operation") and the **edge's
accuracy** in the row (R8): "±10 mm", "±2.6 × 10⁻⁹ rad", or "not stated"
/ "ballpark" in the warning color. The root reads "defines the frame".
An inline action (on hover or focus) flies to the frame.

States: default; selected (StrataKit's selected row); **on the path**
from the root to the selected frame (a quiet `glow-on-surface-neutral`
band and a ring on the swatch); collapsed and expanded; loading ("The
frame tree draws once frame data is in", with a spinner); missing (the
same line, saying why).

### The walk (selected frame)

Under the tree, in a `bg-page-depth` well: "ICRF to MOON_PA" and "Show on
globe", then each edge from the root in order, on a line of family-colored
dots: "MOON_ICRF → MOON_ME", its kind chip, its accuracy on the right, its
math in one line ("lunar PCK libration (DE440)", "IERS Conventions 2010 eq.
11.19"), and its data and accuracy note ("measured Earth orientation (UT1
35 µs, polar motion 0.1 mas)", "predicted, 38.5 days past …").

Then the **composed accuracy** of a point at the frame's origin against
ITRF at the clock's instant (from `accuracyOf`, so the Moon's relativity
term, which sits on no edge, is in it), as the walk's one big number, and
the **budget bar**.

### Accuracy budget bar

A 10 px bar of segments, one per term, each **as wide as its share of the
variance** (σᵢ²/σ²: what sums to the total in a root sum square, so the
widths always add up to the stated total), each in the family color of
where its error comes from (ephemeris: celestial; Earth orientation:
Earth-fixed; relativity: Moon-fixed; PROJ operation: engineering;
trajectory and time scale: trajectory). A term with no stated size is an
amber hatched segment, and the total reads "Not bounded" with the term
named. Below it, a table: term, its note, 1σ, share. A caption says what
the widths are. At MOON_PA it shows the expert's surprise: Earth
orientation at the Moon's distance (about 1 m) is nearly all of it, not
DE440's 1 cm.

### Overlays (Explore, "On the globe")

A `Switch` per overlay, its label, and under it, always, its **legend
line with its accuracy** (R8): "PROJ operation ±2.0 m (NAD83(2011) to WGS
84); round trip ≤ 3.4 nm", "sag 31.2 m at 20 km (geometry, exact)". An
overlay's own controls appear only once it is on: Orion's draw-in frame
(an exclusive `ToggleButtonGroup`: GCRF, ITRF, MOON_ME), distortion's CRS
(`Select` with a visible label) and height (`TextField`, "Height above the
ellipsoid, m"), the bias exaggeration (`Slider`, 10⁰ to 10⁷, its factor in
its label).

States: off; waiting ("fetching PROJ…" with a spinner on the row until it
draws, R9); drawn; missing (switch disabled, the line says what to run);
error (the line says what failed); not bounded (the line in the warning
color).

### Clock

The instant in UTC, large; under it the Earth-orientation state
("measured (IERS)", or "predicted, 38.5 days past the last measured row"
in the warning color, or "outside the table"); "Jump to the Artemis II
flyby". The viewer's own time controls stay on the canvas.

### Question card (Verify)

MUI `Accordion` (StrataKit's theme; see "Deviations"), heading `h3`. The
summary holds no actions (feedback item 7): the **question** in plain
language, the **answer** under it (the effect size, "2.00 ppm: reading US
survey feet as international feet", else "Worst 3.7 nm against a tolerance
of 100 µm", or "Every value exact, against …"), and the **verdict** in a
column on the right ("5 of 5 pass" muted, "1 of 3 fail" strong red,
"Waiting for PROJ", "Missing data", "Not run"). The body starts with the
group's name and count and its actions ("Show on globe", "Run this
group"), then the rows.

States: closed (the first view: every card closed); open; waiting (the
answer reads "Runs once PROJ is in."); missing; not run; filtered out by
the lens or by the tree's selected frame ("Groups that use MOON_PA", with "Show all groups").

### Result row

MUI `Table`, `size="small"`. Columns: **Check** (the title as a button
that selects the row, clamped to two lines, with "browser = Node" or
"browser ≠ Node" under it when fingerprinted), **Value / tolerance** (the
bar), **Effect** (only in cards that have one: R11's own column),
**Accuracy** (the statement's total, "Not bounded", or "no position"),
**Status**. Your-input rows have an info-tinted background.

**Value-to-tolerance bar**: a log scale from 10⁻⁶ of the tolerance to 10×
it, the tolerance a tick at 6/7 of the width, the measured |value| a
green fill (red past the tick), and the numbers always beside it ("3.3 µm
/ 10 mm"). Expected throws read "threw as expected"; a case with no value
reads "judged by the case".

### Inspector

A sheet under the card list (up to 58% of the tab; "˄" fills the tab,
"✕" closes it). It shows only a result the lens shows (R14: changing the
lens never leaves it on a hidden result).

1. Status, group, the full title; actions "Show on globe", "Highlight
   frames", "Copy link" (a `Snackbar` says "Link copied").
2. **Measured against expected**: the large bar with its scale labels,
   deviation (with its share of the tolerance), tolerance, effect; or
   the expected error's pattern against what was thrown; then the
   case's detail.
3. **Computation trace**: numbered steps from input to output, with the
   expected value set against the output (a dashed "=" step), each value
   at full precision with a copy button; PROJ pipelines in the mono face.
4. **Accuracy**: the budget bar, or "No position claimed: this check
   compares numbers", saying it's judged by its tolerance instead.
5. **Source**: the citation (document, publisher, table or PID, retrieval
   date and a link) or the hand formula written out.
6. **Fingerprint**: "Browser = Node" or the difference, the pipeline, the
   grids with their SHA-256 (copyable), the coordinate count.

### "Try your own" (R18)

A well at the top of the Bound CRSs card's body:

- **Paste WKT2**, always there and first: a multiline mono field, "Run
  the checks", "Use an example (Tokyo, JPRCS IX)".
- **Or read it from Cesium ion**: "ion asset ID" and "Fetch", with where
  the token came from ("Uses the gallery's ion token from .env.local";
  the evaluation token, which reads only Cesium's assets; or, with none,
  how to set one). The token itself is never shown.
- An iModel GUID is recognized and answered at once, without a request:
  ion can't look an iModel up by its ID.
- After a fetch: "ion has no CRS for asset N: its tileset is already
  placed in Earth-fixed coordinates, …" with the pointer back to the paste
  box (the expected answer today, see below); or "found" when a tileset
  carries `EXT_geospatial_crs`; or an error.
- Results join the card's rows marked "Your input", outside the counts.

### Globe legend (HUD, bottom right)

"On the globe", foldable, every active overlay with its swatch (the
triads with a small x/y/z key), its name, "(fetching)" while it waits,
and its accuracy line, the same text as the panel's (R8: accuracy never
only in the panel). A note under it: "Axes x red, y green, z blue; triads
drawn at 6% of the camera's distance, 2 m to 2,000 km" (R4's scale,
stated), and for distortion, that Tissot ellipses are drawn in true-north
axes (convergence not applied: the progress note from Task 3). Hidden
when nothing is on.

### Tour caption (HUD, top right)

"Stop 3 of 6", the stop's title and a two-line caption, a link button
(copies the stop's deep link), "Back", "Next" (or "Finish") and "✕". It
is clear of Dyno's inspector (top left). "Take the tour" sits at the top
of Explore as one quiet line: "New to frames? Six stops, about two
minutes."

### Report tab

"This run" (what the report holds, and that the token is never in it),
the counts (judged, passed, failed, skipped; shown; fingerprints matched;
your input), "Copy report", "Save Markdown", "Save JSON" (a `Snackbar`
confirms), disabled with a reason until a run ends. "Failures first"
lists failures, each selectable (it opens Verify on it). "Environment":
PROJ, proj.db and grid SHA-256, the frame data's versions, the package,
the browser, the run's time and duration.

## Motion

One orchestrated moment and responses to the user's actions; nothing
moves on its own.

- **Camera flights**: eased (the viewer's flight, ease-in-out), length
  scaled to distance; a site at kilometres, the Moon at 20,000 km.
- **The walk**: on selecting a frame, the edges appear root first, 90 ms
  apart (320 ms each, fade and 4 px rise), then the budget bar's segments
  grow from the left in the same order. It shows the chain being
  composed.
- **The inspector** rises 12 px as it opens (240 ms); the tour caption
  fades in.
- Easing `cubic-bezier(0.2, 0, 0, 1)`.
- **Reduced motion** (`prefers-reduced-motion: reduce`): no animation in
  the panel or HUD, and flights cut instead of animate (6b).

## Copy and numbers

Dyno's copy rules: sentence case, buttons say what they do ("Run all",
"Run this group", "Copy report", "Show on globe"), no "please", errors say
what failed and what to try. Plus:

- **Lengths** in the unit that reads best: km, m, mm, µm, nm, then meters
  with a power of ten; **times** likewise (s, ms, µs, ns); 2 significant
  figures in rows, 3 to 4 in the inspector, full precision in the trace
  (what is copied).
- **Accuracy** is a 1σ with "±"; the inspector says "(1σ)".
- **Instants** in UTC, "2026-04-06 23:00:00 UTC".
- **Results' titles** are the catalog's own, long and exact: rows clamp
  them to two lines; the inspector shows them in full.

## Accessibility

WCAG 2.2 AA. Status by icon and word, never color; the family palette at
4.5:1 on every surface; full keyboard use (tabs, tree, cards, row
buttons, inspector actions, popovers); visible focus (StrataKit's, and
`border-accent-strong` rings on the panel's own buttons); the strip's
counts in a polite live region; the walk's bars and the tolerance bars
are images with their numbers as accessible names; `Tabs` from
`@stratakit/structures` wire `aria-controls` themselves (Ariakit), so
feedback item 22's hand wiring isn't needed.

## Cesium ion and an iModel's CRS (R18 research)

**Answer: ion doesn't expose an asset's CRS.** The "Paste WKT2" box is the
always-available path, and the ion fetch is a secondary check that says
so plainly.

What each place ion offers carries, read from ion's REST API definition
(`https://ion.cesium.com/openapi.yaml`, the source of
[cesium.com/learn/ion/rest-api](https://cesium.com/learn/ion/rest-api/),
retrieved 2026-11-06):

- **`GET /v1/assets/{assetId}`** returns `AssetMetadata`: `id`, `name`,
  `description`, `attribution`, `type` (`3DTILES`, `GLTF`, `IMAGERY`,
  `TERRAIN`, `KML`, `CZML`, `GEOJSON`), `bytes`, `dateAdded`, `status`,
  `percentComplete`, `archivable`, `exportable`, `labels`, `creatorId`,
  `creatorUsername`. Its `options` (which hold an upload's `inputCrs`) and
  `from` are declared **`writeOnly`**: sent when creating an asset, never
  returned. No CRS field.
- **`GET /v1/assets/{assetId}/endpoint`** returns `type`, `url` (for
  3D Tiles, the `tileset.json`), a short-lived `accessToken` and
  `attributions`. No CRS field.
- **`POST /v1/assets/imodel`** imports an iModel from Bentley
  Infrastructure Cloud with `IModelImportOptions`: `iModelId`, `name`,
  `changesetIndex`. No CRS option, and no endpoint looks an asset up by
  iModel ID. Its result is "a standard 3D Tiles asset"
  ([Importing iModels from Bentley iTwin](https://cesium.com/learn/ion/importing-imodels-from-bentley-itwin/)).
  The dashboard's import "reads the iModel's coordinate reference system
  and places the tileset automatically"
  ([Importing from Bentley Infrastructure Cloud](https://cesium.com/learn/bim-cad/importing-from-bentley-infrastructure-cloud/)):
  the CRS is consumed by the tiler, not kept.
- **Upload options** for BIM/CAD (`BIM_CAD`, `BIM_CAD_DB`), 3D capture and
  point clouds take an `inputCrs` (WKT, PROJ string or EPSG; EPSG only for
  `BIM_CAD_DB`) that "overrides any CRS embedded in the data", and
  `GET /v1/coordinate-reference-system` (added 2026-08-18) searches valid
  `inputCrs` values. Both are inputs to tiling; neither is readable back
  for an asset.
- **The tileset JSON** (3D Tiles 1.1, what ion produces today) has no CRS:
  tiles are in Earth-centred, Earth-fixed coordinates (EPSG:4978) through
  their `transform`. A CRS declaration exists only in the **3D Tiles 2.0
  draft**: `EXT_geospatial_crs` (with `EXT_geospatial_crs_wkid` and
  `EXT_geospatial_crs_wkt2`), a glTF 2.1 extension at the glTF root
  ([CesiumGS/glTF, 3d-tiles-2.0 branch](https://raw.githubusercontent.com/CesiumGS/glTF/3d-tiles-2.0/extensions/2.1/Vendor/EXT_geospatial_crs/README.md);
  the 3d-tiles `next/2.0` README lists it; this library's `CrsRef` already
  has its shapes, plan 4a R3). It is a draft, and ion's iModel output
  isn't documented to carry it.
- **The iModel's own CRS** (its geographic coordinate system, with any
  additional transform) lives in Bentley's iTwin Platform, read with an
  iTwin (Bentley IMS) token, not an ion token. ion doesn't pass it
  through, and the example has only `context.accessToken`.

So the fetch (6b) does: `GET /v1/assets/{id}` for the name, type and
status (to label "your input"), then the endpoint and its `tileset.json`,
looking for `EXT_geospatial_crs` on the tileset and the root content's
glTF. Absent (today's answer), it says: "ion has no CRS for asset N: its
tileset is already placed in Earth-fixed coordinates, and neither the
asset's metadata nor its tileset names the CRS it came from. Paste its
WKT2 above to check it." With the evaluation token, `GET /v1/assets/{id}`
reads only Cesium's own assets, which the area says before the user
tries. An iModel GUID is answered without a request.

## Glossary

Every term below has a popover wherever it appears (`panel/glossary.ts`,
`Term`): a dotted underline, a button, its definition on click or Enter.

| Term                    | Definition                                                                                                                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ITRF                    | The International Terrestrial Reference Frame: Earth-centred axes that turn with the Earth. GPS positions and survey coordinates live here (WGS 84 today agrees with it to a few centimetres). |
| GCRF                    | The Geocentric Celestial Reference Frame: Earth-centred axes that don't turn with the Earth, aligned with distant quasars. Satellites and the Moon are computed here, then turned into ITRF.   |
| ICRF                    | The International Celestial Reference Frame: the solar system's barycentre, with axes fixed on distant quasars. The root of the frame tree.                                                    |
| EME2000                 | Earth Mean Equator and Equinox of J2000: the inertial frame most spacecraft files use. It differs from GCRF by the frame bias, about 23 milliarcseconds.                                       |
| MOON_ME                 | The Moon's mean Earth / polar axis frame: axes fixed to the Moon, the x axis toward the Earth on average.                                                                                      |
| MOON_PA                 | The Moon's principal-axes frame, from the DE440 libration model; a fixed rotation of under a degree from MOON_ME.                                                                              |
| Earth orientation (EOP) | The measured wobble and spin of the Earth (polar motion and UT1) that turn GCRF into ITRF; predictions grow less accurate with age.                                                            |
| Convergence             | The angle between grid north and true north at a point; zero on the central meridian.                                                                                                          |
| Combined factor         | Grid scale factor × elevation factor: turns a ground distance into a grid distance.                                                                                                            |
| Epoch                   | The date a coordinate is valid at; the plates move centimetres a year.                                                                                                                         |
| Ballpark                | PROJ's fallback operation that ignores the datum difference: metres to hundreds of metres off.                                                                                                 |
| Bound CRS               | A CRS carrying its own transformation to WGS 84 (TOWGS84), as CAD and BIM exports often do.                                                                                                    |
| Helmert transformation  | Three shifts, three small rotations and a scale between datums; its sign convention matters.                                                                                                   |
| Tolerance               | How far a result may be from its expected value and still pass; the plan's own, never loosened.                                                                                                |
| Accuracy (1σ)           | What a computation can claim about where something really is: the root sum square of its terms.                                                                                                |
| Not bounded             | A term has no stated size, so the total can't be given; the page names the term.                                                                                                               |
| Effect size             | How big a real effect is (2 ppm, 56 µs a day), shown apart from pass or fail.                                                                                                                  |
| Fingerprint             | A recorded operation's pipeline, grid SHA-256 and coordinates; browser and Node must match.                                                                                                    |
| TDB                     | Barycentric Dynamical Time, the ephemeris time scale; within 2 ms of TT.                                                                                                                       |
| Tissot ellipse          | The shape a small ground circle takes on the map; size is scale, stretch is angular distortion.                                                                                                |
| ppm                     | Parts per million: 1 ppm is 1 mm per km.                                                                                                                                                       |

## Deviations from the plan's component table

- **Question cards use MUI `Accordion`**, not `AccordionItem` from
  `@stratakit/structures`: `AccordionItem` is deprecated in
  `@stratakit/structures` 0.6.2 ("Use MUI Accordion"), and Dyno's Viewer
  already uses MUI's `Accordion` themed by StrataKit. Feedback item 7
  (no actions in the header) holds the same way.
- **Result rows use MUI `Table`**, not `Table` from
  `@stratakit/structures`: that one is deprecated there ("moved to
  `@stratakit/bricks`", which is legacy: feedback item 1); Dyno's tables
  are MUI's.
- **The lens chips are an exclusive `ToggleButtonGroup`**: R14 filters to
  one audience, so radio semantics ("All" or one lens) say what it does;
  the plan's table named Dyno's non-exclusive `Chips`.
- **Missing data uses MUI `Alert`**, the table's first choice; `Banner`
  is deprecated in favor of it.

## Open for 6b

- **Group metadata on the main thread.** `STRESS_GROUPS` lives with the
  runner (stress/stressGroups.ts imports runner.ts, which imports PROJ's
  wrappers), so the panel can't import it without bundling the catalog.
  Move the groups' plain data (id, name, question, lenses, focus) into a
  dependency-free module, or have the worker post it. The stub copies it.
- **Traces, citations and measured/expected values.** `StressResult` has
  no trace, source id or raw measured and expected values; they're in
  `detail` as text. The inspector's trace and source sections need an
  optional `trace` (plain data, as `panel/model.ts`'s `TraceStep`) and a
  `source` reference id on results, filled by the cases.
- **Accuracy on rows.** Only 10 of the catalog's 225 results carry an
  `accuracy`; the rest are arithmetic checks, shown "no position".
  Whether every row should carry one (R8 says every row shows one) is a
  question for the UX review.
- **The token's source.** `context.accessToken` doesn't say where it came
  from; "Try your own" wants to say so (and warn about the evaluation
  token). A `accessTokenSource` on the context, or the example comparing
  against nothing and saying less.
- **Links.** `linkTo` builds from `location.href` in the stub; a link
  builder on the context (Dyno knows its router) would keep the example
  from reading the URL itself.
