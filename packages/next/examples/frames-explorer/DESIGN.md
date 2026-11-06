# Frames explorer: design

How the frames explorer's page looks, reads and behaves. It applies
[Dyno's design guide](../../bench/suite/DESIGN.md) and StrataKit; it adds
no visual language of its own beyond the 3D viewport's HUD, which Dyno's
guide exempts. The plan's R14 fixes the structure, R16 the quality bar,
R17 the frame it sits in. Screenshots of the prototype (stub data, part 6a)
are in [design-screenshots/](design-screenshots/); the globe's mocks in
[design-mocks/](design-mocks/).

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
selected frame's chain of edges as its accuracy statement composes them,
each with its math, its data, its own accuracy and what it adds, summing
in a budget bar to the composed accuracy.
It is where the demo and the proof meet.

## Principles

1. **The globe is the hero; the panel answers.** Nothing on the canvas
   but what the user turned on, its legend and, on the tour, a caption.
   How it all looks is in "On the globe".
2. **Glance, then proof.** Four levels (R14): the status strip, question
   cards, result rows, the inspector; in Explore, the tree and the walk.
   Each level is one click from the next, and the first view is calm:
   cards closed, ready data a single quiet line, the tree collapsed below
   its third level.
3. **Hierarchy from type and space, not boxes.** Sections are headings
   and `space-600` gaps. The only filled surfaces in the panel are the
   "Try your own" well, the walk's note and code blocks (`bg-page-depth`,
   `bg-mono-muted`): places where the content is a different kind of
   thing.
4. **Color means something.** Status colors only for status (R14's
   vocabulary), and badges only for states that need attention. One
   categorical palette for frame families, the same in the tree, the walk,
   the budget bar, the legend and the drawn triads and lines. Axis colors
   stay red, green, blue.
5. **Honest numbers, stated once.** Units always (dimensionless values as
   %, ppm or "ratio"), significant figures no finer than the comparison,
   powers of ten written out ("3.4 × 10⁻⁹", never "3.4e-9"). Each thing
   has one accuracy, the same wherever it appears (see "One accuracy per
   thing").
6. **States are designed.** Not loaded, fetching (with bytes), ready,
   missing (with the one command to run), error (what failed, with Retry),
   waiting (naming the item), running, not run, skipped.

## One accuracy per thing (C3)

An expert who finds one thing stated two ways stops trusting the rest. So:

- **A tree edge shows the edge's own figure**: the accuracy of that
  transform alone ("±10 mm" for DE440's Moon position; "±280 mm" for
  Orion's OEM covariance). The Frames section says so once: "Each row is a
  frame and its edge to the parent: the edge's kind and its own accuracy."
- **Everything else shows the composed statement**: the walk's total, the
  overlay's line in Explore and the legend's line on the globe are the
  same `accuracyOf` statement for the thing drawn, against ITRF at the
  clock's instant, with the same text. Orion: "±10 m (1σ), mostly the
  unstated time scale, taken as TDB", in the warning color because it
  rests on an assumption, and never "not bounded" beside a number.
- **"Not bounded"** only when a term really has no size, naming it.
- **Exact by definition** for conventions: the IAU 2006 frame bias is a
  set of adopted constants, so the EME2000 edge reads "exact by
  definition", not a made-up 10⁻¹⁵ rad (tree.ts now says so,
  `byDefinition`), and the glossary defines the phrase. TT − TAI and GPS
  time are the same kind.
- **A result's accuracy** is its position statement's total when it
  measures positions; otherwise the case's accuracy note (F27: "exact
  arithmetic: a round trip", "published value ± half its last digit (0.5
  mm)", "hand formula √(2Rε), within 10%"). Never a blank, never "no
  position". With neither, "accuracy not stated" in the warning color.
- **Relative checks beside an absolute placement** say so: the row reads
  "±2.8 m placement", and the inspector adds "The site's absolute placement
  is ±2.8 m (1σ); this check measures a distance, which that placement
  doesn't affect."

## On the globe (C1)

The hero, specified so 6b can build it and a second review can check real
screenshots against it. Three mocks, drawn to scale over the 728 × 680
view (open the SVGs; they're annotated):

- [design-mocks/globe-opening.svg](design-mocks/globe-opening.svg): the
  opening shot, the chrome around it and the legend.
- [design-mocks/globe-drawing.svg](design-mocks/globe-drawing.svg): triads,
  line strengths at 1 px, the dimmed ground, labels, selection, the
  legend.
- [design-mocks/globe-tour.svg](design-mocks/globe-tour.svg): the six tour
  stops, each with its camera, overlays and caption.
- [design-mocks/globe-stop3-target.svg](design-mocks/globe-stop3-target.svg):
  stop 3 at full size, at 1 device pixel with the imagery dimmed: the
  acceptance target for 6b's lines.

### The opening shot

- **Camera**: above 135°W 25°N, 3.0 Earth radii from the geocentre, north
  up, so the Earth fills about 70% of the view's height. No flight at load;
  the first camera move is the user's (a tour stop, "Show on globe", a
  result).
- **Clock**: opens at the Artemis II flyby, 2026-04-06 23:00 UTC, paused.
  The sun is then over about 165°W, so the framed hemisphere is in
  daylight; the panel and the time controls show this same instant.
- **On at load**: triads for ITRF, GCRF and the Sacramento ENU site (R4's
  startup set). The legend appears with them.

### Light and the night side

The viewer lights the globe from the clock's sun. For legibility:

- cameras for the opening and each tour stop are chosen on the day side at
  their instants;
- the night side keeps about 15% fill (ambient), so coastlines and terrain
  still read under overlays;
- overlays, triads and labels are **unlit** (emissive): their color is the
  same on both sides of the terminator.

### Triads

- **Axes** red, green, blue for x, y, z, drawn as **meshes, not lines**
  (F30 leaves lines at 1 px; the triads are the most-seen element): each
  shaft a box (`createBox`, src/scene/meshes.ts) stretched along its axis,
  its width 1.5% of its length (about 2 px at the usual framing, since the
  length follows the camera), and an 8-sided cone at the tip, 10% of the
  length long and three shafts wide (a small hand-built `MeshData`); both
  unlit. Axis letters at the tips (caption 11 px, 500).
- **Length** 6% of the camera's distance to the origin, clamped to 2 m to
  2,000 km (R4), stated in the legend's unfolded note.
- **Origin**: an 8 px dot in the family's on-dark tone with a 1 px dark
  ring.
- **Geocentric frames** (ITRF, GCRF, EME2000) draw at 1.5 Earth radii so
  they leave the globe; inside it they draw through as 40% dashes (x-ray),
  outside at full strength. Every other triad is depth-tested against the
  globe and terrain.
- **The frame bias** (R4): EME2000's triad against GCRF's, exaggerated
  ×10⁰ to ×10⁷ by the slider, its label carrying the factor
  ("EME2000 (bias ×10⁶)").

### Lines (1 device pixel, ruling F30)

6b draws overlays as WebGPU `line-list`: one device pixel, no width, no
halo, no glow. Hierarchy comes from color strength and alpha, and from a
darker ground under the overlay that is the subject.

| Line                                                           | At 1 px (what 6b builds)                                      | Style                                                                       | When the engine gains wide lines |
| -------------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------- |
| Primary: a grid's major lines, the exact line, Orion's path    | full on-dark family tone, alpha 1                             | solid                                                                       | 2 px                             |
| The rigid line (against the exact one)                         | full tone, alpha 1                                            | dashed: 400 m on, 250 m off, as world-space segments                        | 2 px                             |
| Secondary: minor grid lines, true-north lines, Tissot outlines | the family tone at alpha 0.6                                  | true north dashed (world-space segments), site grid dotted (short segments) | 1 px                             |
| Selected (the selected result's overlay)                       | a lighter tint: the family tone mixed 50% with white, alpha 1 | as its kind                                                                 | 3 px                             |
| Everything else while something is selected                    | alpha 0.35                                                    | as its kind                                                                 | the same                         |

- **Dashes are geometry.** `line-list` can't dash in screen space, so a
  dashed line is emitted as separate segments in world space (fixed metres
  per dash, chosen per overlay so a dash spans about 10 to 20 px at the
  tour's framing).
- **No halos: a darker ground instead.** While an engineering overlay is
  the subject (tour stops 3 and 4, a selected engineering result), the
  imagery is dimmed so 1 px lines read over bright terrain. The globe has
  no imagery brightness or saturation control (checked: `GlobeImagery`,
  `ImageryProvider`), but the view's exposure is one: overlays are unlit,
  and unlit content is display-referred, added after exposure (View.ts,
  `HdrImage`), so lowering `viewer.view.exposure`'s `compensation` dims
  the globe and leaves the lines at full strength. Use `{ eye: true,
compensation: -0.6 }` (about 0.66× brightness) for those stops, eased
  over the flight, and restore it after. Desaturation isn't available; the
  eye exposure greys dim scenes a little on its own. A per-layer imagery
  brightness and saturation control is carried forward as engine work.
- **Selection by contrast, not width** (see "A selection on the globe").
- Lines are depth-tested, never always-on-top (the geocentric triads
  aside).

The target for this is
[design-mocks/globe-stop3-target.svg](design-mocks/globe-stop3-target.svg)
(and its PNG): tour stop 3 at 1 px, the imagery dimmed.

### Labels

HTML labels in the HUD host (as the translucency example's), placed by
projecting each origin: body-sm 12 px, 600, in the family's on-dark tone,
with a 1.5 px dark text halo (CSS `paint-order: stroke`: labels are HTML,
so they keep their halo where lines can't), 12 px right of and below the
origin. They never overlap: by priority (selected, on the selected
path, sites, the rest), a label that would collide is hidden, and labels
fade out when origins are under 24 px apart on screen. Overlay labels (the
sag, the convergence, contour values) use the same style, white, with a
1 px leader where they point at something.

### A selection on the globe (R14)

The globe never shows a selection the panel doesn't.

- **A frame**: its triad's shafts at the lighter tint (the axis color mixed
  50% with white) and its label in white; the triads on its walk's path at
  full strength, their origins joined by a dotted 1 px line (world-space
  segments) that draws root first with the walk's 90 ms stagger; every
  other triad at alpha 0.35, labels hidden. Selecting a frame doesn't move the camera (I6): flying is the
  tree row's action and "Show on globe".
- **A result**: its group's overlay turns on; its lines at the lighter
  tint, every other overlay and triad at alpha 0.35, and for an
  engineering result the imagery dimmed as under "Lines"; the camera flies to the result's site; its
  frames' triads show as on a path, matching the tree's highlight.

### The legend

Bottom right, above the viewer's time controls (it measures them), 240 px
wide, always dark like the viewer's own widgets (I16). It lists **only the
overlays that are drawn**, not ones waiting for data (those show in the
panel); it appears when the first overlay draws and is gone when none is.
Compact by default: one line each (line key, short name, accuracy
ellipsized, in full on hover and focus); unfolded, the full names and
lines and the triads' note. Line keys match the globe: solid, dashed for
the rigid line, dotted for the site grid and round trips (M8). While the
tour shows on a narrow view the caption takes the bottom and the legend
steps aside until the tour ends.

### Flights

Ease in and out (cubic), duration 1.2 s plus 0.35 s per decade of distance
ratio, 1.2 to 3.5 s; target framing by kind: a site at 8 km range and 45°
tilt; a grid or line so it fills about 70% of the view; the Moon at 20,000
km; a lunar site at 100 m. Under reduced motion, flights cut.

### The tour

| Stop                         | Camera                                                                                                                                                    | On                                                                                                                                                                                        | Caption                                                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1 Earth's frames             | over the North Atlantic, 30°W 42°N, 4 Earth radii, lit from the camera (6c-1 fix round 2)                                                                 | triads (ITRF with cones, GCRF with square heads, each axis named, pinned)                                                                                                                 | ITRF turns with the Earth; GCRF doesn't. Each triad is a frame's axes at the clock's time                            |
| 2 GCRF to ITRF over a day    | straight down the north pole, 5.5 Earth radii, lit from the camera (6c-1 fix round 3); imagery dimmed (exposure −0.6, 6c-2)                               | ITRF and GCRF triads only (the site triads hidden: Sacramento's crossed GCRF's x), each axis named, pinned                                                                                | GCRF's x and y turn once round against ITRF's, like clock hands, in a sidereal day (the clock plays at 3,600×: 24 s) |
| 3 The California design grid | over the grid's centre, 180 km range, 55° tilt, heading 0°                                                                                                | design grid (10 km lines; 2 km lines only under 60 km range), true-north lines; imagery dimmed (exposure −0.6); target: `globe-stop3-target`                                              | grid north and true north part ways away from the central meridian: the convergence angle                            |
| 4 Rigid against exact        | from the side: south of the line, looking north, 10° down, 22 km, the whole line across the view (6c-1 fix round: looking back along it foreshortened it) | rigid (dashed) and exact (solid) 20 km line, the separation drawn ×50 with a "Show true scale" switch, a white leader between the far ends labelled with the true sag; imagery not dimmed | a 20 km design line placed rigidly parts from the exact one by about 31 m at its far end (drawn ×50 so it shows)     |
| 5 Orion's figure-eight       | down the Moon's orbit normal at the flyby, the Earth–Moon line across the view, the Earth, the Moon and the path framed (6c-1); 3.0 s flight              | Orion in GCRF, then after 4 s in MOON_ME                                                                                                                                                  | in GCRF a figure-eight round the Moon; in MOON_ME the far-side swing                                                 |
| 6 The Moon's south pole      | 100 m from the site's triad, 20° above the horizon, sun low behind; 3.5 s flight                                                                          | the site's triad (MOON_ME) at 15% of the camera's distance, and a callout "lunar clock +56.02 µs/day against Earth's (Ashby & Patla 2024)"                                                | a clock here gains about 56 µs a day; the triad holds still as the camera orbits                                     |

The caption sits top right (bottom, above the time controls, on views
under 560 px), takes focus at each stop, and steps with the arrow keys;
Escape ends the tour (I18). Each stop's link opens it (R15). On a narrow
view it starts folded to one row: the stop's number and title (ellipsized,
in full on hover), Back and Next, a chevron that unfolds the caption and
the stop's link, and the close button (F42). The choice holds across stops.

### The convergence exaggeration (stop 3, ruling F32)

At stop 3's framing the real convergence, −0° 39′ at the grid's west edge,
leans a true-north line about one pixel over the view's height: the caption
would describe something nobody can see. So the design grid's true-north
lines are drawn with their convergence **×20** by default, as R4 draws the
frame bias: each line is leaned from the grid line through the same E by 20
times its true offset (display only; the geometry builder's
`exaggeration`). It is never silent: the globe labels the line "true north,
convergence ×20", the legend's and the overlay's accuracy line says "true
north with its convergence drawn ×20", and the caption keeps the real angle
(−0° 39′). The design grid's options hold a **Show true scale** switch that
redraws the lines at ×1 (the label then reads "true north"). The grid lines
themselves are never exaggerated.

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
- **The HUD**: the legend bottom right, above the time controls; the tour
  caption top right.

### Desktop

Measured in Dyno at 1440 × 900: the side column is **579 × 680 px**, the
view 728 × 680. Dyno's grid is `minmax(0, 1fr) minmax(380px, 44%)`.

Both Explore and Verify are **a list and a sheet** (level 4): the list
scrolls; selecting something opens a sheet under it (the walk in Explore,
the inspector in Verify). On a tab shorter than 640 px (every desktop
window up to about 1,000 px tall) the sheet fills the tab by default, with
"Show the list too" (window-collapse) to split it; on a taller tab both
show, the sheet up to 45%.

```text
┌ Controls ────────────────────────────────── ˄ ┐
│ ✓ All data ready                            ⓘ │ status strip: one quiet line
│ ✓ 67 passed  ⓧ 0 failed  in 4.2 s             │ when everything is ready
│ Explore   Verify   Report                     │
│ New to frames? Six stops, about two minutes. [Tour]
│ On the globe                                  │ overlays first (I7)
│  (●) Triads                                   │
│      axes: GCRF against ITRF ±2.6 × 10⁻⁹ rad  │ the composed line, as the legend's
│  (●) California design grid …   fetching PROJ…│
│ Frames            ● Celestial ● Earth-fixed … │
│  ˅ ● ICRF      root   defines the frame       │ edge kind and the edge's own
│    ● HCRS      translation   not stated       │ accuracy, plain text
│    ˃ ● EARTH_ICRF  translation  ±10 mm        │ collapsed below level 3
│ Clock                                         │
├───────────────────────────────────────────────┤ the walk, a sheet
│ [Against ITRF ▾] to MOON_PA  [Show on globe] ⧉ ✕│
│ Composed at MOON_PA's origin   ±1.0 m (1σ)   │
│ □ ITRF, the reference                         │
│ ● ITRF → GCRF  rotation, inverse  ±2.6e-9 rad │
│   Adds Earth orientation, 1.0 m: ≈ 100%       │ each edge's term
│ □ ICRF, the common ancestor                   │
│ ● ICRF → MOON_ICRF  translation  ±10 mm       │
│   Adds ephemeris, 10 mm (one term with GCRF)  │
│ ● MOON_ICRF → MOON_ME  rotation  not stated   │
│   Adds nothing at the origin: a rotation …    │ why it adds nothing
│ budget bar, terms with "from", the note       │
└───────────────────────────────────────────────┘
```

```text
┌ Controls ────────────────────────────────── ˄ ┐
│ status strip                                  │
│ Explore   Verify   Report                     │
│ [All][Civil][BIM][GIS][Space][Timing][Off.][AV]│ lens, one at a time
│ 66 passed, 1 failed, …        [Run all again] │ one run line, no live region
│ Try your own CRS                              │
│ ˅ Are axis order and the 180° … [1 of 3 fail] │ failing cards first, the
│   Browser ≠ Node, UTM 1N at ±179.999°: …      │ failure as the answer (red)
│ ˅ Do design coordinates survive…   ✓ 5 of 5   │ passing: plain text, no badge
│   Worst 3.7 nm against a tolerance of 100 µm  │
├───────────────────────────────────────────────┤ the inspector (filled on a
│ ‹ Measurement, 1 of 3 ›  ✓ Pass          ⧉ ✕ │ short tab): Previous / Next,
│ 10,000 ftUS line, grid to ground              │ the label, then the title
│ A 10,000 ftUS design line on California …     │
│ [Show on globe] [Show frames in the tree] [Copy link]
│ Measured against expected  (log bar, decades) │
│ Compared against  Hand formula: …             │ always there (I15)
│ Computation trace / Accuracy / Fingerprint    │
└───────────────────────────────────────────────┘
```

### Narrow (380 px panel)

Dyno's side column never goes below 380 px, and Dyno has no breakpoint
for the side layout: at 1024 px the column is 396 px and the view 496 px;
at 900 px the column is at its 380 px floor and the view 388 px; on a
phone the page itself doesn't fit (`design-screenshots/*-narrow.png`,
`verify-light-phone.png`). The panel works down to 380 px:

- **Result rows stack below 480 px of panel** (C4, a container query):
  each row is two lines, the name and the verdict, then the bar with its
  numbers, the effect and the accuracy (labelled); the header row hides;
  explicit `role` attributes keep it a table to assistive tech.
- Toolbars and the tree's tools stack under 420 px; the sheet fills the
  tab; the HUD goes compact under a 560 px view (the legend in its compact
  one-line rows, the tour
  caption at the bottom).

**The column is wide enough for the panel at desktop sizes**, but it takes
44% of the stage, which works against "the globe is the hero". Proposed as
a separate Dyno change (R16, R17), not built here:

1. **A resizable side column.** A splitter between the view and the panel
   (StrataKit has none: STRATAKIT_FEEDBACK.md item 37), its width
   remembered like the collapse, default 40%, between 360 px and 60%.
2. **Stack the side layout below about 900 px wide**: the view full width
   at about 55% of the height, the panel under it, so phones and narrow
   windows get a usable globe.

## Type

StrataKit's sans (Inter) for everything; its mono only for code (PROJ
pipelines, WKT, SHA-256, expected-error patterns, formulas), never as a
label face. Sizes are StrataKit's semantic tokens; weights are hard-coded
where StrataKit has none (feedback item 6).

| Role                                              | Token                                   | Weight |
| ------------------------------------------------- | --------------------------------------- | ------ |
| Panel base, rows, captions under switches         | `body-sm` 12 px                         | 400    |
| Section heading (h2): On the globe, Frames, Clock | `subtitle-md` 14 px                     | 600    |
| Question (card title, h3)                         | `body-md` 14 px                         | 500    |
| Card answer, edge detail, trace labels            | `body-sm` 12 px, secondary              | 400    |
| Overlay label                                     | `body-md` 14 px                         | 400    |
| Composed accuracy (the walk's figure)             | `headline-sm` 18 px                     | 600    |
| Clock time                                        | `body-lg` 16 px                         | 600    |
| Inspector title (the result's label)              | `body-md` 14 px                         | 600    |
| Inspector part heading (h4)                       | `subtitle-sm` 12 px, secondary          | 600    |
| Edge kinds, tolerance numbers, scale labels       | `caption-md` 11 px / `caption-lg` 12 px | 400    |
| Code                                              | `mono-sm` 12 px                         | 400    |
| Globe labels (HUD)                                | `body-sm` 12 px                         | 600    |

Numbers are tabular everywhere (`font-variant-numeric: tabular-nums`).

## Color

### Surfaces and ink

StrataKit tokens only: `bg-page-base` (the column), `bg-page-depth` (the
"Try your own" well, the walk's note, the frame filter), `bg-mono-muted`
(code), `text-neutral-*` (ink), `border-neutral-muted` (row rules). Light
and dark come from Dyno's Root; nothing in the panel is scheme-specific
except the family palette below (`light-dark()`).

**The HUD is always dark** (I16), as Dyno's inspector, the credits and the
viewer's time controls are over the scene in either scheme: `.fx-hud-host`
sets `color-scheme: dark` and points the StrataKit tokens it uses at the
viewer's HUD theme (`--cesium-ui-surface`, `--cesium-ui-text`,
`--cesium-ui-text-muted`, …), whose defaults are StrataKit's dark values.

### Status (R14's vocabulary)

| State                                     | Look                                                                   | Icon                               | Word                                      | Text token               |
| ----------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------- | ------------------------ |
| Pass                                      | plain text and a small positive icon ("✓ 5 of 5"); a row's badge muted | status-success                     | Pass                                      | `text-positive-base`     |
| Fail                                      | `error` badge, strong                                                  | status-error                       | Fail, "1 of 3 fail", "Browser ≠ Node"     | `text-critical-base`     |
| Fetching or waiting                       | `info` badge (muted on cards)                                          | spinner (`CircularProgress` 10 px) | "PROJ 6.8 of 16.0 MB", "Waiting for PROJ" | `text-info-base`         |
| Missing data, skipped                     | `secondary` badge                                                      | status-pending                     | Missing data, "18 skipped (missing data)" | `text-neutral-secondary` |
| Not bounded, ballpark, predicted, assumed | `warning`                                                              | status-warning                     | Not bounded, naming the term              | `text-attention-base`    |
| Shown, not judged (R11)                   | `secondary`, outlined                                                  | info                               | Shown                                     |                          |
| Your input (R18)                          | `info`, outlined                                                       | info                               | Your input                                |                          |
| Not loaded                                | dashed outline, no fill                                                | none                               | "GEOID18 not loaded"                      |                          |
| All ready                                 | one quiet line, neutral icon                                           | status-success                     | "All data ready"                          | `text-neutral-secondary` |

Never color alone: every state has an icon and a word. Badges are kept
for what needs attention (fail, fetching, waiting, missing); a page where
everything passes reads calm (I10). StrataKit's accent (teal, hue 170)
sits close to positive green (hue 140), so a selected row is a neutral
surface with a 2 px accent bar, not a tinted wash (feedback item 46).

### Frame families (the HUD exception)

One categorical palette (R16), used identically in the tree's swatches and
path bar, the walk's dots, the budget bar's segments (each term colored by
where its error comes from; a term on no edge, the Moon's relativity, in
neutral gray), the legend, and the drawn triads' origins, labels and
lines. Each family has a tone for light surfaces and one for dark surfaces
and the globe (`panel/families.ts`, `panel/panel.css`); the 3D geometry
and the HUD always take the on-dark tone.

Contrast against StrataKit's surfaces (WCAG relative luminance, computed
from the tokens' OKLCH values), all at least 4.5:1, so the colors pass as
text, not only as 3:1 graphics:

| Family      | Holds                                            | On dark   | page / elevation / space / depth | On light  | page / elevation / depth |
| ----------- | ------------------------------------------------ | --------- | -------------------------------- | --------- | ------------------------ |
| Celestial   | ICRF, HCRS, GCRF, EME2000, EARTH_ICRF, MOON_ICRF | `#b298f9` | 6.8 / 6.3 / 8.7 / 7.1            | `#6e44bc` | 6.4 / 6.5 / 6.1          |
| Earth-fixed | ITRF and Earth sites                             | `#3bcddc` | 8.5 / 7.9 / 11.0 / 8.9           | `#02717a` | 5.6 / 5.8 / 5.4          |
| Moon-fixed  | MOON_ME, MOON_PA, lunar sites                    | `#bfc8d4` | 9.7 / 9.0 / 12.5 / 10.1          | `#525f6f` | 6.4 / 6.5 / 6.1          |
| Engineering | PROJ-placed design frames and their overlays     | `#f07ec2` | 6.6 / 6.1 / 8.4 / 6.9            | `#ae2881` | 6.0 / 6.1 / 5.8          |
| Trajectory  | Orion's path                                     | `#fc9252` | 7.2 / 6.7 / 9.3 / 7.6            | `#ae5517` | 5.0 / 5.1 / 4.8          |

Moon-fixed is a cool neutral (I9): the sand it was sat 5° of hue from the
warning amber, and a family color must never read as a status. Hues sit
apart from the axis colors (violet 295°, cyan 205°, rose 345°, orange 50°,
Moon a low-chroma 255° against red 25°, green 145°, blue 260°). Violet and
rose are close for some color-vision deficiencies: the family is always
named too (the swatch's label, the legend, the walk's text).

Axes: x `#fc5855`, y `#5ad664`, z `#5d97f7` on the globe (5.2, 8.7, 5.6
on dark page; 6.7, 11.2, 7.2 on space).

## Spacing

StrataKit's 4 px scale: `space-50` (2 px) inside badges, `space-100`
between an icon and its word, `space-150` to `space-200` inside a row,
`space-300` between a row's parts and inside the well, `space-500`
between inspector parts, `space-600` between a tab's sections. Rows are
separated by 1 px `border-neutral-muted` rules, not cards; StrataKit's
compact sizes (`size="small"`) throughout.

## Components and their states

StrataKit components, as the plan's table names them, with two
substitutions where StrataKit has deprecated the named one (see
"Deviations").

### Status strip (always on top)

- **All ready**: one quiet line, "✓ All data ready", and the details
  button (I10). Otherwise pills, one per data item, in R14's vocabulary:
  not loaded (dashed, quiet), fetching (info, spinner, "PROJ 6.8 of 16.0
  MB"), ready (muted), missing (gray), error (red, "GEOID18 failed").
- **Counts**: "✓ 67 passed", "ⓧ 0 failed", "18 skipped (missing data)"
  when any are (I2), "12 groups waiting", "running, 96 of 225", "in 4.2 s".
  **"N failed" is a button** (I1): it opens Verify on the first failure,
  selected, with the lens and frame filter cleared.
- **One live region** (I19), visually hidden, that announces changes of
  state, not results: "Run started", "Run 25% done" … "Run done: 66
  passed, 1 failed", "Run stopped".
- **ⓘ Data details**: a popover with each item's state, size, load time
  and what it is (keyboard reachable: feedback item 11's gap, solved with
  a button rather than a tooltip on a badge).
- **Fetching**: a row per fetch, "Fetching PROJ's WebAssembly and
  proj.db: 6.8 of 16.0 MB", with a determinate `LinearProgress` from the
  response's `Content-Length`, indeterminate when the total isn't known.
- **Missing**: one info `Alert`: "PROJ, GEOID18 and Orion OEM aren't in
  the frames store. Run `npm run setup` in packages/next, then reload.
  Everything that doesn't need them still works." (R5.)
- **Error**: an error `Alert` per item saying what failed ("The response
  for us_noaa_g2018u0.tif ended at 7.9 of 16.7 MB: a network error."),
  with **Retry GEOID18** in its action slot (I3).

### Tree row (Explore)

`Tree.Root` / `Tree.Item` from `@stratakit/structures`, a flat list with
`aria-level`, `aria-posinset`, `aria-setsize`. Each row: the family
swatch (with its family as the accessible name), the frame's name, and a
second line with the **edge's kind** in plain secondary text
("translation", "rotation", "IERS affine", "fixed", "trajectory", "PROJ
operation"; no pill, M12) and the **edge's own accuracy** (R8, C3): "±10
mm", "±2.6 × 10⁻⁹ rad", "exact by definition", or "not stated" /
"ballpark" in the warning color. The root reads "defines the frame". An
inline action (on hover or focus) flies to the frame. "Expand all" /
"Collapse" sit above it; it starts collapsed below level 3 (I7), and the
highlighted path's ancestors always open.

States: default; selected (StrataKit's selected row); **on a path** (I8):
a 3 px bar at the row's inline start in its family color, growing root
first with the walk's 90 ms stagger, and a ring on the swatch (not the
hover color); a result's frames ("Frames used by _label_, Back to the
result", I5); collapsed and expanded; loading ("The frame tree draws once
frame data is in", with a spinner); missing (the same line, saying why).

### The walk (selected frame, C2)

A sheet under the list. Its head: **Against** (a `Select`: ITRF, GCRF,
ICRF) "to MOON_PA", "Show on globe", fill and close. The walk follows **the
path the statement uses**: from the reference up to the common ancestor,
then down to the frame (ITRF → GCRF → ICRF → MOON_ICRF → MOON_ME →
MOON_PA), with the reference and the common ancestor marked as nodes. Each
edge: "ITRF → GCRF", its kind ("rotation, inverse" when walked
child-to-parent), its own accuracy on the right, its math in one line, its
data and note, and **what it adds** at the frame's origin:

- a term, tied to the edge: "Adds Earth orientation, 1.0 m: ≈ 100% of the
  total"; a term two edges share says so ("ephemeris, 10 mm, one term with
  MOON_ICRF": DE440's Earth–Moon vector);
- or nothing, and why: "Adds nothing at the origin: a rotation about the
  Moon's centre, which is this origin"; "exact by definition".

**The rule** (as `accuracyOf` composes it): a rotation on the reference's
side turns the whole vector to the point, so its error is σθ times the
point's distance (Earth orientation at the Moon: 2.6 × 10⁻⁹ rad × 384,400
km ≈ 1 m); a rotation on the frame's side with no translation after it
turns about the frame's own origin and moves it not at all; DE440 origins
on both sides of the ancestor enter once, as the vector between them; the
Moon's relativistic terms sit on no edge, listed "from no edge". Under the
total, one line names the counterpoint: "A point away from the Moon's
centre isn't bounded: MOON_ME's orientation has no stated accuracy (see
the lunar south-pole site)."

The composed total sits at the walk's top, "Composed at MOON_PA's origin
±1.0 m (1σ)", the walk's one big number; the budget bar and its terms follow.
Selecting a frame doesn't fly the camera (I6).

### Accuracy budget bar

A 10 px bar of segments, one per term, each **as wide as its share of the
variance** (σᵢ²/σ²: what sums in a root sum square, so the widths always
add up to the stated total), each in the family color of where its error
comes from (ephemeris: celestial; Earth orientation: Earth-fixed; PROJ
operation: engineering; trajectory and time scale: trajectory; a term on
no edge: neutral). A term with no stated size is an amber hatched
segment, and the total reads "Not bounded" with the term named. Below it,
a table: term, the edges it comes from ("from ITRF"), its note, 1σ,
share. "Composed accuracy (1σ)"; the caption: "Widths are each term's
share of the variance (σᵢ²/σ²); the total is σ = √Σσᵢ²." An origin
nothing moves reads "exact at the origin".

### Overlays (Explore, "On the globe")

First in Explore (I7). A `Switch` per overlay, its label, and under it,
always, its **composed accuracy line**, the same text as the legend's
(C3): "±2.0 m (1σ): the WGS 84 ensemble; round trip ≤ 3.4 nm", "sag 31.2
m at 20 km (geometry, exact)", "the frame bias, 23 mas: exact by
definition (IAU 2006 adopted constants)". An overlay's own controls appear
only once it is on: Orion's draw-in frame (an exclusive
`ToggleButtonGroup`: GCRF, ITRF, MOON_ME), distortion's CRS (`Select` with
a visible label) and height (`TextField`), the bias exaggeration
(`Slider`, 10⁰ to 10⁷, its factor in its label), and the design grid's
"Show true scale" switch (F32, above).

States: off; waiting ("fetching PROJ…" with a spinner on the row until it
draws, R9); drawn; missing (switch disabled, the line says what to run);
error (the line says what failed); not bounded or assumed (the line in
the warning color).

### Clock

The instant in UTC, large, with "The same instant as the time controls
over the globe, which show the place's local time" under it (I13; the stub
sets the viewer's clock to it, and 6b tests they stay equal); the
Earth-orientation state ("measured (IERS)", or "predicted, 38.5 days past
the last measured row" in the warning color, or "outside the table");
"Jump to the Artemis II flyby".

### Question card (Verify)

MUI `Accordion` (StrataKit's theme; see "Deviations"), heading `h3`. The
summary holds no actions (feedback item 7): the **question** in plain
language, the **answer** under it, and the **verdict** in a column on the
right.

- **The answer** (I1): a failure first, in the critical color, saying what
  failed ("Browser ≠ Node, UTM 1N at ±179.999°: coordinates differ by 2.4 ×
  10⁻⁸ m"; "threw a different error"; "3.4× the tolerance"); else the
  effect size ("2.00 ppm: reading US survey feet as international feet");
  else "Worst 3.7 nm against a tolerance of 100 µm", or "Every value exact,
  against …"; "The expected error, with its message" (M3).
- **The verdict**: "✓ 5 of 5" as plain text (I10); "1 of 3 fail" as a
  strong red badge; "Waiting for PROJ"; "Missing data"; "Not run".
- **Order**: failing cards first, in any lens (I1).
- The body starts with the group's name and count and its actions ("Show
  on globe", "Run this group"), then the rows (rendered only while open).

States: closed (the first view: every card closed); open; failing;
waiting ("Runs once PROJ is in."); missing ("Needs PROJ, which isn't in
the frames store."); not run; filtered by the lens or the tree's selected
frame ("Groups that use MOON_PA", with "Show all groups"; an empty result
names its cause and offers "Choose All" or "Show all groups", M5).

### Result row

MUI `Table`, `size="small"`. Columns: **Check** (the case's short label,
I14, as a button that selects the row, with "browser = Node" or "browser ≠
Node" under it when fingerprinted; the full title is the inspector's),
**Value / tolerance** (the bar), **Effect** (only in cards that have one,
"—" where a row has none, M4), **Accuracy** (C3: the statement's total,
"±2.8 m placement" beside a relative check, "Not bounded", or the accuracy
note), **Status**. A failing row's name is red; your-input rows have an
info-tinted background; the selected row is a neutral surface with a 2 px
accent bar.

**Below 480 px** each row stacks into two lines (C4; see "Narrow").

**Value-to-tolerance bar**: a log scale from 10⁻⁶ of the tolerance to 10×
it, a 1 px `border-neutral-base` track (3.4:1 on the page, I11), the
tolerance a tick at 6/7 of the width, the measured |value| a green fill
(red past the tick), and the numbers always beside it ("3.3 µm / 10 mm",
"0.054% / 2.0%" for a relative difference, I12). The inspector's large bar
adds decade ticks and "10⁻⁶ × tolerance", "tolerance", "10×" (M2).
Expected throws read "threw as expected"; a case with no value reads
"judged by the case".

### Inspector

The Verify sheet (filled on a short tab). It shows only a result the lens
shows (R14).

1. **Head**: ‹ Previous, "Measurement, 1 of 3", Next › (the arrow keys
   step while focus is inside, I4), the status, fill ("Fill the tab" /
   "Show the list too", window-expand and window-collapse, M16) and close.
   Focus moves to the title on open and back to the row on close (M17).
2. The result's label, then its full title; actions "Show on globe",
   "Show frames in the tree" (switches to Explore and keeps the result
   selected, I5), "Copy link".
3. **Measured against expected**: the large bar, deviation (or "relative
   difference") with its share of the tolerance, tolerance, effect; or the
   expected error's pattern against what was thrown; a failure's reason in
   the critical color; then the case's detail.
4. **Compared against** (always, I15): "Published value: …", "Hand
   formula: …", "Round trip: the input itself, after forward and inverse:
   this proves the library agrees with itself, not that it's right",
   "Expected error: …", or "Independent computation: …"; then the
   citation (document, publisher, table or PID, retrieval date and link)
   and the formula written out.
5. **Computation trace**: numbered steps from input to output, the
   expected value set against the output (a dashed "=" step), each value at
   full precision with a copy button; PROJ pipelines in the mono face.
6. **Accuracy**: the relative-check sentence when it applies, then the
   budget bar; or the accuracy note and that it's what applies.
7. **Fingerprint**: "Browser = Node" or the difference, the pipeline, the
   grids with their SHA-256 (copyable), the coordinate count.

### "Try your own" (R18)

A well at the top of the Bound CRSs card's body, reached from "Try your
own CRS" under the run line (which clears the lens, opens the card and
scrolls to it, M19):

- **Paste WKT2**, always there and first: a multiline mono field (small,
  as the asset field), helper text "Paste a WKT2 to run its checks", "Run
  the checks", "Use an example (Tokyo, JPRCS IX)".
- **Or read it from Cesium ion**: "ion asset ID" and "Fetch", and a
  generic line (F28): "Uses the gallery's ion token. To read your own
  assets, set your token in Dyno's settings or .env.local." With no token,
  how to set one. The token itself is never shown.
- An iModel GUID is recognized and answered at once, without a request:
  ion can't look an iModel up by its ID.
- After a fetch: "ion has no CRS for asset N: its tileset is already
  placed in Earth-fixed coordinates, …" with the pointer back to the paste
  box (the expected answer today, see below); or "found" when a tileset
  carries `EXT_geospatial_crs`; or an error.
- Results join the card's rows marked "Your input", outside the counts.

### Globe legend and tour caption (HUD)

See "On the globe": the legend's contents, size and placement, and the
tour's focus, keys and narrow placement.

### Report tab

"This run" (what the report holds, and that the token is never in it),
the counts (judged, passed, failed, skipped; shown; fingerprints matched;
your input), "Copy report", "Save Markdown", "Save JSON" (a `Snackbar`
says "Report copied" or "Download started: …"), disabled until a run ends,
with "Run all" beside the reason (M15). "Failures" lists each failure by
its label and why it failed (I1), selectable (it opens Verify on it).
"Environment": PROJ, proj.db and grid SHA-256 ("not loaded: the fetch
failed" when one didn't load), the frame data's versions, the package,
the browser, the run's time in UTC and duration.

## Motion

One orchestrated moment and responses to the user's actions; nothing
moves on its own.

- **Camera flights**: see "On the globe", "Flights".
- **The walk**: on selecting a frame, the edges appear in path order, 90
  ms apart (320 ms each, fade and 4 px rise), the tree's path bar grows
  root first with the same stagger, then the budget bar's segments grow
  from the left. It shows the chain being composed.
- **Sheets** rise 12 px as they open (240 ms); the tour caption fades in.
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
- **Results' names**: rows show the case's short label (60 characters or
  fewer, a noun phrase: "GU2195 northing and easting"); the inspector shows
  the label, then the catalog's full title.
- **Dimensionless values** carry a unit: a percent from 10⁻⁴ up, ppm from
  10⁻⁷, else a power of ten marked "ratio" (I12).
- **The same figure, the same text** in every place it appears (C3): "±"
  on every accuracy, one unit per magnitude ("10 mm" everywhere, not "1.0
  cm" in one place), thousands separators in prose ("10,000 ftUS"), full
  precision only in the trace.

## Accessibility

WCAG 2.2 AA. Status by icon and word, never color; the family palette at
4.5:1 on every surface; full keyboard use (tabs, tree, cards, row
buttons, inspector actions and its arrow keys, the tour's Escape and
arrow keys, popovers); visible focus (StrataKit's, and
`border-accent-strong` rings on the panel's own buttons); focus moves to a
sheet's title when it opens and back to what opened it when it closes,
and to the tour caption's heading at each stop; one polite live region,
the strip's, announcing changes of state only (I19); every HUD text is
checked at 4.5:1 or more in both schemes (its colors come from token
classes, never MUI's `color` prop, whose palette follows the page: N2); stacked rows keep
explicit table roles; the walk's bars and the tolerance bars are images
with their numbers as accessible names; `Tabs` from
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
| Exact by definition     | A convention, not a measurement (the IAU 2006 frame bias, TT − TAI): no error to state, nothing added to an accuracy.                                                                          |
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

## Built in 6b, and where it differs

- **Group metadata** is `stress/groupInfo.ts` (F28), with each group's
  accuracy note, what it is compared against and its needs. Results carry
  `accuracyNote`, `trace` and `source` from the catalog (F27, F28); short
  row labels are `content.ts`, the tour too.
- **Composed statements come from the library** (`composed.ts`, through
  `measure`): the accuracy of the separation of the frame's origin from the
  reference's. That differs from the 6a stub's rule engine: a rotation
  doesn't change a separation, so Earth orientation adds nothing for
  MOON_PA against ITRF, and the walk's total there is DE440's 10 mm with the
  Moon's 30 mm relativity term (±32 mm), not the stub's ±1.0 m. The library
  wins, as 6a's report said it would; the walk says why each edge adds
  nothing.
- **Dimming at 1 px.** Lines are opaque in the engine (a blended pass is
  for triangles only), so "alpha 0.35" is a 0.35 tint (darker, on a dark
  ground) and "alpha 0.6" a 0.6 tint. The selected overlay keeps full
  strength; the lighter tint (50% white) for it is not built.
- **Not built in 6b** (built in 6c-1 unless noted below): the geocentric
  triads' x-ray dashes inside the globe, the 2 km minor grid lines under
  60 km range, the walk's animated dotted path between triad origins on the
  globe, the label fade under 24 px, and Orion and engineering nodes for the
  frames the worker alone holds.

## Built in 6c-1

- **Orion in the tree and the legend.** When Orion's OEM is in (its overlay
  or its tests loaded it), one worker reply (`trajectoryInfo`) carries
  Orion's node (the trajectory edge, its position sigma at the clock's
  instant) and its walk statements against ITRF, GCRF and ICRF. The tree
  shows Orion under EME2000, its reference; the walk and the budget bar use
  the worker's statements. The legend line is computed from the statement
  against ITRF (`orion.ts`, `orionLegend`): the total at its instant, its
  largest term, the frame drawn in and how the path was sampled, for
  example "±10 m (1σ) at 2026-04-06 23:00 UTC against the Earth's centre,
  mostly the unstated time scale (TDB or TT; taken as TDB); drawn in GCRF,
  878 samples, finest 14 s". It is asked for again after a minute of clock
  time, at most once a second of real time, one request in flight.
- **Orion's path, adaptive.** Sampled every hour, then the interval whose
  midpoint departs most from its chord is halved, again and again, until
  each departs by at most 0.05% of its distance from the drawing frame's
  origin (500 m at 1,000 km, 100 m at the least), no interval under 5 s,
  within 8,000 samples and **2 s of worker time** (measured: GCRF 878
  samples in about 0.1–0.5 s, ITRF about 2,100 in 0.35 s, MOON_ME about 580
  in 0.07 s). A capped path says so in the legend. Chunks may span 1e7 m
  (half-metre float32 steps against the path's ±10 m), so the ITRF path,
  which winds about 2e10 m, is about 1,600 draws, not hundreds of
  thousands (that was the 6b ITRF stall, on the main thread).
- **Orion keeps up with the clock.** A path drawn in GCRF or MOON_ME hangs
  under one transform that each frame sets to the drawing frame's placement
  now times its inverse at the build's instant (exact: both rigid), so it
  follows any clock rate without a rebuild; in ITRF it doesn't depend on
  the clock at all. Rebuilds (a frame switch) keep one request in flight
  and only the latest waiting: stale ones are dropped, never queued
  (`latestOnly`).
- **Tour stop 5's camera** looks along the normal of the Moon's orbit at
  the flyby (the plane Orion's free return lies in), with the Earth–Moon
  line across the screen, and a range that frames the Earth, the Moon and
  the drawn path with a 20% margin for the view's aspect (`planeFraming`).
- **The selected overlay at the lighter tint.** A per-channel draw tint
  above 1 turns a layer's family tone into its 50% mix with white (lines
  are one color per layer, and unlit color clamps at white); secondary
  layers keep their 0.6 strength under it. The selected frame's triad
  takes a lighter mesh (each axis color mixed 50% with white), and its
  label turns white.
- **Label fade.** A label whose origin is under 24 px from a
  higher-priority label's on screen fades out (160 ms; a cut under reduced
  motion) instead of being hidden by its box.
- **The 2 km minor grid lines** are their own worker build (`designGrid`'s
  `skipEvery`, so they never overlap the 10 km lines), at the secondary
  strength, shown only while the camera is under 60 km above the ground
  over the grid.
- **The walk's path on the globe.** Selecting a frame joins its path's
  origins (root first; the barycentre and the Sun left out, coincident
  origins merged) with a dotted 1 px line in the frame's family tone,
  revealed one edge per 90 ms (at once under reduced motion), redrawn as
  the clock moves them.
- **Copy link** builds its URL through `context.link` (examples/types.ts),
  Dyno's router; the example no longer reads `location.href`.
- **Partial runs and deep links.** A link to a result whose group hasn't
  run (after another group's own run) starts that group's run instead of
  clearing the selection.

### 6c-1 fix round 1 (second UX review)

- **Triads (S-I1, S-I2, S-I8).** Geocentric shafts start at the Earth's
  surface (equatorial radius for x and y, polar for z) with no origin cube,
  so nothing draws over the globe from inside it; the x-ray dashes stay
  carried forward. GCRF draws at the secondary strength beside ITRF's full
  one. Geocentric labels outrank sites in the declutter and sit on an axis
  just outside the surface: x's, or the first axis in front of the Earth.
  A camera-scaled triad's shaft is at least 2.5 px wide on the view (its
  share of the length from the view's size), with cones at least two
  shafts long; stop 6's site triad is 15% of the camera's distance.
- **Labels (S-I3).** A label whose point is behind the Earth, or farther
  than 20 times the camera's height, is hidden; every label is kept inside
  the view. Callouts (the sag, the lunar clock, "Orion now") sit 48 px right
  of their point with a 1 px leader.
- **Stop 4 (S-C1).** As in the tour table: the separation drawn ×50 by
  default (`rigidVsExact`'s `exaggeration`, display only, like F32's
  convergence), labelled on the globe and in the legend, with a "Show true
  scale" switch in the overlay's options; the leader carries the true sag.
- **Stop 2 (S-I6).** The globe is lit from the camera (the sun direction set
  after the viewer's own on each clock change), so the framed side never
  turns to night; the caption says so.
- **The walk (S-I4, S-I5).** `measure` codes its warnings
  (`AccuracyStatement.warningCodes`); the walk keeps only those about the
  separation, so ±32 mm no longer turns amber over a note about the signal.
  The attention color is kept for stated assumptions (Orion's time scale)
  and separation warnings. "Against" is in the shared selection and the URL
  (`against=`), and the globe's dotted path follows it; an off-scene origin
  (the barycentre, the Sun) is a stub toward it labelled with its name and
  distance ("→ ICRF origin, 1.0 au").
- **Overlay rows (S-I7).** One line each: the figure, its 1σ and one
  qualifier ("±2.6 × 10⁻⁹ rad (1σ), measured Earth orientation"; "±10 m
  (1σ), taken as TDB"). What it means is behind "About this figure"; how
  Orion was sampled is a muted line under "Drawn in". The legend shows the
  one line.
- **Colors within 0 to 1.** A colored overlay layer is white in its
  vertices and takes its color from the draw's tint, so dimming and the
  selected 50% white mix are tints within 0 to 1.
- **Orion.** A failed statement request (the clock outside the OEM's data)
  shows as "not bounded" in the legend and on the tree's node, with the
  error, and is asked again when the clock moves. A callout marks Orion at
  the clock's instant ("Orion now, ±10 m").

### 6c-1 fix round 2

- **Stops 1 and 2 show their subject (S-I1).** Each geocentric axis is
  named at its tip ("x ITRF", "y GCRF"): GCRF's names to the left of the
  point and ITRF's to the right, the two z names stacked on the left. During
  stops 1 and 2 they are pinned: exempt from the declutter, and a tip just
  past the view's edge keeps its name at the edge. GCRF's axes end in square
  heads, ITRF's in cones, so the two differ without the labels. Stop 1 looks
  from over the North Atlantic (30°W 42°N, 4 Earth radii), where axes of
  both triads stand in front of the Earth; stops 1 and 2 are lit from the
  camera.
- **Geocentric axes behind the Earth.** Each geocentric axis is its own
  draw, hidden while its tip is behind the Earth: the engine draws them
  through the globe otherwise (there is no depth-test switch to dash them),
  which read as a shaft on the near side.
- **A not-bounded walk total (S-I9)** says only "Not bounded" in the
  headline, with its reason on its own line below at body size.
- **Warning codes everywhere a statement is rebuilt:** an engineering
  frame's composed statement and the catalog's `plainAccuracy` keep
  `warningCodes`.

### 6c-1 fix round 3

- **Stop 2 from above the north pole (S-I10).** Straight down the pole at
  5.5 Earth radii: both triads' x and y lie outside the disc and GCRF's turn
  against ITRF's like clock hands; the z axes point at the camera. A pinned
  label never hides: it steps down past a label it would cover, so two axis
  tips passing each other stay readable. Checked in motion across a
  simulated day at 3,600× (56 samples, one per half hour of clock): every
  axis name shown, none overlapping, none under the caption or the legend
  at desktop width. Five frames are `wired-tour-2-motion-*`. At the 380 px
  panel the caption takes the bottom of the view and covers the tips that
  point down (ITRF's x always); collapsing the caption on narrow views
  (minor 5 of the second review) is still open.
- **The opening and stop 1 differ on purpose.** The opening frames North
  America (the Sacramento site, the California grid, the first view a
  visitor sees). Stop 1 flies from it to the North Atlantic, where axes of
  both geocentric triads stand in front of the Earth; that flight is the
  stop's first move, and stop 2 then turns to the pole.

### 6c-2

- **The narrow caption folds (F42).** Under a 560 px view the caption
  starts as one row (see "The tour"). Checked in motion at the 380 px
  panel (900 × 1000), stop 2 across a simulated day at 3,600× (56
  samples): every axis name shown, none overlapping, none under the
  caption; before, ITRF's x name was under it in every sample.
- **Stop 2 dims the imagery and draws the geocentric pair alone.** Lit from
  the camera, the polar globe washed out behind the axes; exposure −0.6
  (the engineering stops' dimming) during the stop. At desktop width the
  eye's auto-exposure still brightens the small globe on black (mean globe
  pixel 190 → 173 of 255 at −0.6; −1.5 gives 141); a stronger setting is
  open. The Sacramento triad, which crossed GCRF's turning x axis, is
  hidden during the stop (`TourStopSpec.geocentricOnly`).
- **The distortion overlay states its placement.** Its line was "contours
  from PROJ's scale factors" alone; it now leads with the recorded
  operation ("placed ±2.00 m (1σ), the recorded operation; contours from
  PROJ's scale factors"), as the grids' lines do (R8).
- **The HUD's focus ring is the dark theme's in either scheme.** StrataKit
  resolves its ring where the page's theme is set, so in light mode the
  HUD's buttons had the light ring (oklch 47%), about 2.4:1 on the dark
  HUD; the HUD restates it with the dark ring (11.6:1).
- **Every result's "Compared against" is its own.** The Measurement card's
  clothoid and design-against-ITRF checks, Orion's two non-error results
  and the Bound CRSs card's checks other than the hand Helmert showed the
  group's text; they now say what each compares (`content.ts`
  `comparedFor`).
- **Every group that places something names its frames** (`focus.frames`),
  so selecting any such result highlights its frames in the tree and
  selecting a frame filters Verify to the groups that use it (R14). The
  vertical-profile and time-scale groups place nothing.

### Carried forward (engine work)

- **X-ray dashes for the geocentric triads inside the globe.** (Meanwhile
  the shafts start at the surface.) Line-list and mesh draws are always
  depth-tested (`DrawOptions` has no depth-test
  switch; only billboards have `depthTestDistance`), so the part of the
  ITRF, GCRF and EME2000 triads inside the Earth can't draw through it.
  Needs a draw flag for depth-test off (or a second pass with an inverted
  depth test) in the renderer.
- **Ray artifacts in the lunar terrain's shadows** at stop 6 (streaks from
  the shadowed crater rims, upper left of the view): the engine's shadows
  on the Moon's terrain, not the example's geometry; to be filed as an
  engine issue.
