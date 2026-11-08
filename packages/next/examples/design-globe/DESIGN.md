# Design globe: design

How the design-globe page looks, reads and behaves. It applies
[Dyno's design guide](../../bench/suite/DESIGN.md) and StrataKit, and borrows
the frames explorer's conventions ([its DESIGN.md](../frames-explorer/DESIGN.md)):
Checks with colour-coded kinds, honest numbers stated once, designed states.
The mockup is [design-mocks/page.html](design-mocks/page.html) (plan 4b,
Task 0; for the owner's review, 2026-11-07). Screenshots are taken locally
into `design-screenshots/`, which git ignores.

## The story (owner, 2026-11-07)

The page is for a viewer audience first: it shows that placing a long design
rigidly on the globe is wrong, and how reprojection fixes it. "The rigid
placement being wrong is the whole point of the example, and showing how the
geometry warps to the other frame to give accurate visuals and the ability to
do accurate measurements at the same time." A surveyor checking numbers is
the second audience: every number is there and honest, but quieter.

- **The placement switch morphs.** Flipping between rigid and reprojected
  animates every vertex from one placement to the other, "as this is really
  demonstrating the change in coordinate frames". The two corridor tilesets
  share tile ids, trees and vertex order (call 15), so each vertex has a
  partner. Reduced motion switches at once.
- **The other placement stays as a ghost**, a secondary visual for the before
  and after.
- **A short tour you can leave at any point** (owner, 2026-11-07), then free
  exploration. One sentence of narration per step, with Next, Back and
  "Explore on your own" always visible; leaving keeps the current view,
  placement and measurements. The steps:
  1. The corridor at the far end, rigid: the road drawn about 35 m from
     where it is (the self-check measurement and the whiskers).
  2. The morph to reprojected: the gap closes to 0.000 m as the geometry
     moves into the globe's frame.
  3. The survey mark: the design against NGS's own control.
  4. The 10,000 ftUS pair: the design distance is the same in both
     placements; only reprojected also draws it in the right place. Seen
     close in at the ruler's far end, where its bracket reads (UX review).
     The close-in sets the ghost and the ribbon aside; any other step,
     leaving the tour or another site brings them back (rulerView.ts).
  5. Under the hills: a tunnel seen through its hill, with "See underground"
     on. Any other step turns it off again if the step turned it on; leaving
     the tour keeps it, as it keeps the view.
  6. Down the ladder: the single building (rigid is fine), the airport
     (metres), the pole line (tens of metres).
  7. Hand-off: the panel, the flight list and the measure toolbar, yours.

  The tour respects reduced motion: steps cut instead of flying.

- **True scale by default.** The error is never exaggerated unless the viewer
  asks: an "Exaggerate the error" toggle, off by default and labelled with
  its factor while on, because exaggeration "confuses the accuracy story"
  (owner). The opening shot is at true scale, low and oblique near the far
  end of the corridor (about 21 km from the anchor), where the rigid
  placement is about 35 m off and the gap reads; a "Fly along" control runs
  the camera down the corridor to the anchor, where the two placements meet.
- **Measurement proves the second half of the claim.** The same two points
  give the same design distance in both placements; the drawn positions and
  the true distance differ, and reprojected gets both right.
- **The page opens with two measurements already made** (owner, 2026-11-07:
  "really highlights the importance of using the different frames for
  measurement"; "show both so as to demonstrate both use cases"):
  1. **The design against itself:** a ground marker at station 170,000's
     true position (placed through the design CRS by PROJ, and labelled as
     the design's own point, not a survey), measured to the drawn station.
     Rigid: about 35 m apart (the page reads the figure from `answers.json`).
     Reprojected: 0.000 m. The morph shrinks it live.
  2. **The design against a real survey mark:** an NGS mark near the far end,
     placed from NGS's published NAD83(2011) position, independent of the
     design's pipeline, measured to the nearest point on the drawn
     centreline. Reprojected matches the distance from NGS's published zone 3
     coordinates; rigid is off by about 23 m there (HS5109 "GOLD CREEK"). The surveyor's question:
     does the design line up with the control it was surveyed from?
     Reprojected, the drawn offset is 0.000 m by construction, so the
     headline is the independent test (UX review M4): the design's
     horizontal distance to the mark against the same from NGS's own
     zone 3, with its bound in the caption, "within the datasheet's
     precision, ±0.0094 ftUS" (each coordinate's 0.01 ftUS rounding and the
     metric-to-feet double rounding, √2 along the line). The headline and
     Checks' `mark.offset` row use the one tolerance
     (`MARK_OFFSET_TOLERANCE`), so they can't disagree.

  A quieter third pair, two stations 10,000 ft apart, shows the design
  distance identical in both placements.

- **The panel's headline and details** (owner, 2026-11-07). Up front: the
  placement and the morph; each opening measurement's headline number; the
  design distance and the true (ground) distance side by side, labelled.
  Behind "Details": the ellipsoid distance, the combined scale factor in ppm,
  each end's station, offset, elevation and design coordinates in the CRS's
  own units, the snap kind and its tolerance, the accuracy statement, and the
  checks against the generator's exact answers and the NGS datasheet.
- **Visuals in the viewer carry the story** ("the more we can augment that
  with visuals in the viewer the better"). First version:
  1. **Error whiskers:** a leader every 1,000 ft along the corridor from each
     rigid position to its reprojected partner, coloured by length: zero at
     the anchor, about 38 m at the far end, shrinking to nothing as the morph
     completes.
  2. **The anchor ring:** "the placements agree here".
  3. **The measurement lines,** with a label pill giving the design distance,
     and the other placement's line ghosted beside each one.
  4. **A ground-versus-grid ruler** along the 10,000 ft pair: tick marks in
     design feet against true ground feet. The gap the scale factor makes
     is read from the page's own measurement of the pair (0.811 ftUS at
     10,000 ft with today's answers), never written here; it shows when
     zoomed in on the far end, where the two last ticks stand side by side
     with a bracket ("Close in on the ruler").
  5. **The survey mark** as a survey-disk marker with its PID; the datasheet
     values on hover or focus.

  Later, as toggles, off by default: a grid-north-against-true-north compass
  at the cursor (convergence, about 1° across the corridor), and an error
  ribbon tinting the road where it truly is by rigid's error there (the
  paved section, just over its surface: UX review).

- **The portfolio is a scale ladder to fly through** (owner, 2026-11-07),
  ordered by size, from a single building (rigid error 2.6 mm at its
  corners, nearly all of it the 0.99991 scale factor rigid ignores) through a
  block, a port, an airport, a solar farm and a campus, to a 30 km utility
  pole line (18 m, nearly all of it curvature), and the 50 km corridor
  (about 38 m at its far end). Each rung's error at its edge comes in its parts: curvature
  (d²/2R), the scale factor rigid ignores, and the geoid's slope. Each site is "every
  country, done right" (its CRS, units, height system and national geoid,
  credited) and tells the story in one line: its extent, its rigid error at
  the edge, and whether rigid is an acceptable approximation there. All of it
  loads as tilesets, so tile selection is exercised at every size.

## Who it is for

People who work in design coordinates: civil and BIM engineers, surveyors,
GIS. They know their CRS, their units and their height system, and they
have been burned by viewers that place a long model rigidly at one point.
They come to see two things: that a long design lands where it truly is,
and that a measurement on the globe gives the number their CAD gives.

## Principles

1. **The globe shows the placement; the panel answers.** The canvas draws
   the corridor (reprojected, with rigid for comparison), the measure line
   and one legend. Nothing else.
2. **The design number first, the true number beside it.** A distance reads
   in the design CRS's units, as CAD reports it. The ground and ellipsoid
   distances and the combined scale factor sit beside it, labelled; never
   instead of it.
3. **Units and datums always named.** "ftUS", not "ft"; "NAVD88 via
   GEOID18", not "height". The corridor, the site-grid building and the
   Phoenix site (EPSG:6405+8228, NAD83(2011) in international feet, beside
   the corridor's US survey feet) pin GEOID18's operation
   (`CORRIDOR_PIPELINE`, `PHOENIX_PIPELINE`): PROJ ranks GEOID99 ahead of
   it, a superseded NAVD88 model. Each pin is PROJ's own candidate, so it
   keeps PROJ's stated ±2.015 m. Where a height system has no grid,
   the page says what it fell back to and what that costs ("EGM96
   fallback: adds its offset, not stated").
4. **The sag is the story.** The placement section leads with a small
   chart of the rigid placement's error along the corridor, zero at the
   anchor and growing outward, and the HUD reads the error at the cursor.
5. **States are designed** (as the explorer): loading names what it waits
   for, with bytes (PROJ, the grid catalog, each grid, the tiles); missing
   data gives the one command; an error says what failed, with Retry, and
   nothing falls back silently.

## Layout (owner's feedback round F, 2026-11-07)

The owner, after using the page: "overall I find the sidebar UX busy and
poorly organized, you can do better"; "measurement tools being in the
sidebar are confusing, turn that into a small toolbar over the viewer, like
a cad tool. the measurement error explanation can stay in the sidebar."
This section is the structure that answers it, written before it was
built.

### What goes where, and why

The split follows the two audiences. **The viewer** is for doing: looking,
switching what is drawn, measuring, reading the point under the cursor.
**The sidebar** is for understanding: the story of the selected site, its
facts, the ladder to fly through, and, folded away, the surveyor's
details. Anything that changes what the globe draws, or is used with the
pointer on the globe, moves to the viewer; anything that explains a
number stays in the sidebar, next to that number.

```text
┌ the view ──────────────────────────────────────┐ ┌ Controls ─────────────────────┐
│ [inspector line]                 ┌ At cursor ┐ │ │ ✓ All data ready, 38.5 MB  ⧉ │ 1 status, Copy link
│ ┌ toolbar ─────────────────────┐ │ Design    │ │ │                               │
│ │ ⌖ ◇ ⊙ │ ⊕ ✕ ║ ▨ ⇕ ✣ ▤      │ │ E N H     │ │ │ Highway corridor              │ 2 the story
│ └──────────────────────────────┘ │ Globe     │ │ │ Oakland hills to Livermore    │   (the selected
│  Click a first point on a model  │ lat lon h │ │ │ [Rigid at the anchor|Reproj.] │    site's)
│                                  │ error     │ │ │ One transform at the anchor…  │
│            ◌·  snap preview      └───────────┘ │ │ 34.541 m  station 1700+00 … ▸ │   the evidence
│                                                │ │ 22.883 m  HS5109 GOLD CREEK ▸ │   rows (corridor)
│                                                │ │ 10,000.000 ftUS = 3,048.270 m ▸│
│        ┌ tour card ─────────────┐              │ │ sag chart        Fly along    │
│        └────────────────────────┘   └────────┘ │ │ Take the short tour           │
│ credits      [ time controls ]                 │ │ CRS, heights, units ▸ details │ 3 the site's facts
└────────────────────────────────────────────────┘ │ Your measurement (when one)   │ 4
                                                   │ Sites, smallest first         │ 5 the ladder
                                                   │ Checks: 20 within tolerance ▸ │ 6 folded
                                                   └───────────────────────────────┘
```

### The sidebar, top to bottom

1. **Status**: one quiet line once everything is in, with Copy link on
   the same row; while loading, a row per item with its bytes; missing
   data, the one command; an error, what failed and Retry.
2. **The story**, of the selected site, the one area that reads first:
   - the site's name (h2) and where it is, one line;
   - the placement switch, full width, and one sentence under it (what
     the drawn placement is, or the morph under way);
   - **the evidence**: on the corridor, the three opening measurements as
     rows, each a headline number and one caption line, with Show (fly
     there) and a Details disclosure holding the rest (both distances
     labelled, the line as the globe draws it, Close in on the ruler, each
     end's rows, NGS's datasheet). Elsewhere, the site's story: its
     extent, rigid's error at its edge and whether rigid is acceptable
     there;
   - on the corridor, the sag chart and Fly along;
   - Take the short tour (while the tour isn't running).
3. **The site's facts** ("Its frame"): CRS, heights (with the geoid
   model) and units,
   always visible; "Frame details" folded: the operation's stated accuracy,
   the combined factor, rigid's error in its three parts, a site grid,
   the grids' credits, a fallback.
4. **Your measurement**, only once there is one: the design and true
   distances side by side, labelled; the line as drawn; "How exact this
   is" folded: the ellipsoid distance, the combined factor, the accuracy
   with its parts and what it is the accuracy of, each end's station,
   offset and elevation. This is the measurement error explanation the
   owner kept in the sidebar. With none, nothing: the toolbar says how.
5. **Sites, smallest first**: one row per site, the whole row the button
   (Fly to), two lines: the name, then its extent and rigid's error at its
   edge (or its CRS codes until its frame is in), a fallback badge where
   one applies. The selected row has the accent bar. The codes, place and
   grids are the story's and the facts' once it is selected, not every
   row's.
6. **Checks**, folded to their one summary line.

Gone from the sidebar: "On the globe" (its toggles are the toolbar's; its
sag chart and Fly along are the story's) and "Your own models" (the ion
slots, F7: the owner removed them; the frames explorer's "Try your own"
covers bringing a model).

Honesty rules unchanged: every unit named, every number stated once (a
number in a headline row is not repeated in its Details), no e-notation.

**What an accuracy is of** (UX review S3, C1). "How exact this is" never
claims more than its parts support. When both ends are design points on
one grid, it splits two things:

- **The distance**: not stated. The grid's common error cancels, and
  Earth orientation turns both ends together, but PROJ gives no figure for
  how much the grid varies between the ends (nor for a geoid fallback's
  variation), and a part of unknown size makes the total not stated, never
  small (R7). The known part is given beside it: the snaps and picks as a
  1σ figure, "exact (no pick error)" for an exact snap (never "±0 m"), or
  none for design points as given. Against the survey mark, the mark's own
  survey accuracy is named as unknown too: it is in no term.
- **Each end's position**: PROJ's stated ±2.0 m (1σ) for the corridor,
  absolute, where each end is on the globe; the common parts once.

Ends in different frames keep the parts combined as independent, as the
engine's statement gives them (a relative statement belongs in the
engine's `accuracyOf`).

### The viewer

- **The toolbar** (F8), top left under Dyno's inspector line, StrataKit's
  solid `Toolbar` of ghost icon buttons, each with a tooltip, in two groups
  as CAD tools group them:
  - **Measure**: the snap mode as three exclusive buttons (Alignment,
    exact; Geometry; None, a plain pick), Point at the view's centre (the
    keyboard's way), Clear (Escape too). A click on a model always
    measures; under the toolbar a one-line prompt appears while a
    measurement is under way or a click was refused ("Click a second
    point on the same model"). In Alignment mode, a point whose exact snap
    is out of sight from the camera (a barrier's far face, a road under a
    deck) goes on the drawn mesh, as the tooltip says, and the line says so:
    a correct refusal, not a failure, and no warning.
  - **View**: Show the other placement (the ghost), Exaggerate the error
    (its factor beside it while on), the compass at the cursor, the error
    ribbon, See underground; each a toggle (`active`), disabled with why
    where it can't apply.
- **See underground** (owner, 2026-11-08), as civil design tools show
  buried work: the ground within 500 ftUS of the corridor's centreline draws
  at 30% opacity, through a terrain region
  (`Globe.terrain.addRegion`). Its tunnels show in place under their
  hills, drawn as ever, with depth, so what is in front still hides them.
  While it's on, clicks and snaps go through that ground to the road
  (`pickThrough`), so an engineer can measure a tunnel. Heights and clamping
  still see the ground. In the link as `underground=on`.
- **The snap preview** (F5), as CAD's AccuSnap: while the pointer rests on
  the view in a snapping mode, a throttled snap runs (one at a time, the
  last aborted), and a translucent dot marks where a click would land,
  with the snap kind's small glyph (a square on a point, a bar on a line,
  an arc on a curve, a cross on a surface), solid once the exact snap has
  answered, and a faint ring of the snap's reach around the cursor.
- **The cursor card** (F12), top right, compact: the design coordinates
  (E, N, H with units, the CRS's codes and height system) beside the
  globe's (latitude, longitude, ellipsoidal height, WGS 84), then the
  error as one line. Moving the cursor shows the design space being
  reprojected: the design numbers and the globe numbers change together.
  When the pointer is under the rail (the card and the legend), the rail
  steps to the left under the toolbar, and back 300 ms after the pointer
  has left its corner; while the pointer is on the rail itself, it stays
  put, so its controls can be reached.
- **The legend**, under the cursor card in the top right rail: the bottom
  is the tour's card and the time controls'.
- **The tour's card**, bottom centre above the time controls. Its step
  segments are one Tab stop, the arrow keys moving between them.
- **Narrow windows**: at 900 px or less the page stacks, the view over
  the panel, the page scrolling (it opts in with Dyno's `stackNarrow`).
- **Credits**: with the grids', the ground data's, in the viewer's data
  attribution while the site is drawn: the Environment Agency's lidar
  under the Open Government Licence v3.0 with London, USGS 3DEP (public
  domain) with the corridor and the site-grid building
  (dataCredits.ts).
- **Layering** (F2): the inspector is topmost. The viewer's own overlays
  stack canvas, then the page's overlays, then the credits and the time
  controls, then the inspector; Dyno's view isolates them, so its own
  overlays sit above the whole viewer.

## On the globe

- Reprojected: solid, the repro colour (cyan family); rigid: the rigid
  colour (orange family). Neither reuses a status colour. The other
  placement is the ghost: its deck translucent, its creases as lines.
- The ghost never tints the solid placement (F4): where the two placements
  coincide, the ghost isn't drawn, and during a morph the moving surface is
  the only one drawn at either end (see "The ghost" below).
- The anchor: a white ring, labelled.
- The measure line and its points: yellow, with a dark label pill giving
  the design distance.
- **The globe is Cesium World Terrain** (owner, F3), with the ion token
  Dyno's setting supplies. The designs carry their own height systems
  (NAVD88 via GEOID18, and each country's own), so on real ground they sit
  where they are: on the ellipsoid, a NAVD88 design floated by the geoid's
  height (about 32 m in California, 46 m in London). Terrain is clipped
  under each site's footprint and the corridor out to its daylight lines
  (F11), so the ground never pokes through a design surface. Two models
  stand on the real ground instead, unclipped (UX review M1, M5): London's
  poles, each on the Environment Agency's lidar ground (ODN) at its place
  and set 1.8 m into it, so rigid's copy stands in the air over them at the
  line's ends; and the site-grid building, on gentle ground 1,000 ftUS
  south of the corridor's start, its ground floor above the highest 3DEP
  ground under it and a concrete plinth carried down below the lowest.
- **The corridor's profile follows the real ground** (round 2): a design
  vertical alignment fitted to USGS 3DEP ground heights along the
  alignment, grades from 0.3% (so the road drains) to 6% and AASHTO's
  least K for 65 mph (corridor.ts has the PVIs, the K values and the fit's
  cut and fill). The hills are crossed against their grain, so no road
  within 6% can follow them: 18 viaducts and 19 tunnels carry 66% of it,
  and its earthwork stays within 48 ftUS of fill and 80 ftUS of cut at
  the centreline.
- **The corridor meets the ground through side slopes** (round 3). On
  earthwork, a slope runs from each edge of the paved section (±41 ftUS)
  down to the ground in fill or up to it in cut, ending at the daylight
  line: 2H:1V in fill and soil; a cut deeper than 30 ftUS is rock under
  30 ftUS of soil, 1H:1V through the rock (sideSlopes.ts). The ground is
  USGS 3DEP's, sampled in cross-sections every 50 ftUS of station and
  every 10 ftUS across, linear between samples (scripts/corridorDaylight.mjs
  writes corridorDaylight.ts). Across the hills the slopes reach 242 ftUS
  of cut and 166 ftUS of fill above and below their edges, and up to
  332 ftUS out. Slopes in soil are a grassed olive, in rock a weathered
  sandstone, and picks name them "side slope". Each earthwork stretch
  ends at a structure in a cap: a portal's headwall over a dark mouth, or
  an abutment under a viaduct's deck. No slopes on a viaduct (its piers
  reach the ground) or in a tunnel.
- **The terrain clip follows the daylight lines** (round 3): exact, in
  five regions cut in the middle of structures (557, 538, 499, 218 and 960
  vertices; one region of 1,024 can't hold the 2,878 the exact lines need). Each
  edge is moved out by its chord's sag on a curve, so it is never inside
  the slopes and at most 0.36 ftUS outside them. Over each structure it
  narrows to a sliver, so the ground stays under a viaduct (its piers
  stand on it) and over a tunnel (the road is hidden in the hill). It
  leaves no room for the rigid copy: rigid moves 2.3 m sideways at the
  far end but rises 38.1 m, so the ground doesn't come through it.
- **The anchor and the measured sections stand above the ground** (owner,
  2026-11-08: "pick some different spots that are above ground"). The
  alignment's middle, station 92,021, is in a tunnel, and the nearest
  earthwork after it is a sidehill cut where the ground stands over the
  ring. So the anchor is at station 86,170, on fill between a viaduct and a
  portal, 5,851 ftUS before the middle, where the fill's slopes reach past
  the whole ring (108 ftUS on the right, 167 ftUS on the left; the ring is
  106 ftUS at its widest). The ring lies in the road's plane, 1 m over its
  profile, clear of the median barrier: level on the 6% grade, it ran under
  the deck on its uphill side. The far ends are 13.7 km and 22.0 km from it.
  The 10,000 ftUS pair runs from station 162,000 to 172,000 on the last
  tangent, on fill the whole way, on one grade, so its line runs along the
  road; on the first tangent it crossed a crest and two tunnels, and its line
  ran under the road. The marker, station 170,000, is on fill. The
  survey mark stays where NGS set it, so its nearest road is in a cut of 75 to
  82 ftUS: its shot looks down into the cut, where the road shows. The pair
  across the first curve in Checks runs tangent to tangent (29,400 on a
  viaduct, 38,400 on fill), since the curve's first spiral starts in a tunnel.
- **Lines stand just over what they mark.** A measure line is lifted 5 cm
  (measureOverlay.ts `LINE_LIFT`): a 1 px line in the plane of a surface (the
  median barrier's top, a lane between two clicks) fought it for depth.

### The ghost (F4)

Root causes of what the owner saw, and the fixes (placementPair.ts):

- **Coplanar partners.** The ghost deck is the other placement's surface,
  drawn translucent and depth-tested against the opaque pass. Where a
  partner lies in its face's own plane (near the anchor; a horizontal
  shift of a flat deck or of a wall), the two surfaces share depth and the
  ghost passes the test on some pixels and fails on others: z-fighting.
  It used to fade by the 3D distance between partners, which a coplanar
  shift doesn't reduce. Each vertex now carries its partner's stand-off
  along the face's normal, and the ghost fades out below 5 to 50 cm of it:
  it is only drawn where it stands clear of the solid surface. (The
  custom shader stages can't write depth or see the camera, so a depth
  offset wasn't available; the stand-off is exact instead.)
- **The ghost on the active shape.** During a morph both decks were drawn
  with the moving surface; at t = 0 the rigid deck is the moving surface
  and at t = 1 the reprojected deck is, so the translucent colour lay on
  the active shape itself. Each ghost is now drawn as far as the morph has
  moved the surface off it: the rigid ghost by t, the reprojected one by
  1 − t, so neither is ever drawn on the surface it coincides with, and
  the settled states are unchanged.
- **The morph's artifacts.** The ghost's creases are opaque lines on the
  deck's positions: they z-fought the solid surface the same way, and both
  sets were drawn mid-morph. They take the same stand-off and presence,
  cut out by an alpha mask (lines draw opaque).
