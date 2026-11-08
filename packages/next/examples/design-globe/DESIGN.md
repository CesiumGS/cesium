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
  1. The corridor at the far end, rigid: the road drawn about 30 m from
     where it is (the self-check measurement and the whiskers).
  2. The morph to reprojected: the gap closes to 0.000 m as the geometry
     moves into the globe's frame.
  3. The survey mark: the design against NGS's own control.
  4. The 10,000 ft pair: the design distance is the same in both
     placements; only reprojected also draws it in the right place.
  5. Down the ladder: the single building (rigid is fine), the airport
     (metres), the pole line (tens of metres).
  6. Hand-off: the panel, the flight list and the measure toolbar, yours.

  The tour respects reduced motion: steps cut instead of flying.

- **True scale by default.** The error is never exaggerated unless the viewer
  asks: an "Exaggerate the error" toggle, off by default and labelled with
  its factor while on, because exaggeration "confuses the accuracy story"
  (owner). The opening shot is at true scale, low and oblique near the far
  end of the corridor (about 20 km from the anchor), where the rigid
  placement is about 31 m off and the gap reads; a "Fly along" control runs
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
     Rigid: about 30 m apart (the page reads the figure from `answers.json`).
     Reprojected: 0.000 m. The morph shrinks it live.
  2. **The design against a real survey mark:** an NGS mark near the far end,
     placed from NGS's published NAD83(2011) position, independent of the
     design's pipeline, measured to the nearest point on the drawn
     centreline. Reprojected matches the distance from NGS's published zone 3
     coordinates; rigid is off by about 19 m there (HS5109 "GOLD CREEK"). The surveyor's question:
     does the design line up with the control it was surveyed from?

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
     the anchor, about 31 m at the far end, shrinking to nothing as the morph
     completes.
  2. **The anchor ring:** "the placements agree here".
  3. **The measurement lines,** with a label pill giving the design distance,
     and the other placement's line ghosted beside each one.
  4. **A ground-versus-grid ruler** along the 10,000 ft pair: tick marks in
     design feet against true ground feet. The gap the scale factor makes
     is read from the page's own measurement of the pair (0.764 ftUS at
     10,000 ft with today's answers), never written here; it shows when
     zoomed in on the far end, where the two last ticks stand side by side
     with a bracket ("Close in on the ruler").
  5. **The survey mark** as a survey-disk marker with its PID; the datasheet
     values on hover or focus.

  Later, as toggles, off by default: a grid-north-against-true-north compass
  at the cursor (convergence, about 1° across the corridor), and an error
  ribbon tinting the ground under the corridor by rigid error.

- **The portfolio is a scale ladder to fly through** (owner, 2026-11-07),
  ordered by size, from a single building (rigid error 2.6 mm at its
  corners, nearly all of it the 0.99991 scale factor rigid ignores) through a
  block, a port, an airport, a solar farm and a campus, to a 30 km utility
  pole line (18 m, nearly all of it curvature), and the 50 km corridor
  (about 31 m). Each rung's error at its edge comes in its parts: curvature
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
│            ◌·  snap preview      └───────────┘ │ │ 30.586 m  station 1700+00 … ▸ │   the evidence
│                                                │ │ 19.278 m  HS5109 GOLD CREEK ▸ │   rows (corridor)
│                                                │ │ 10,000.000 ftUS = 3,048.848 m ▸│
│        ┌ tour card ─────────────┐   ┌ legend ┐ │ │ sag chart        Fly along    │
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
3. **The site's facts**: CRS, heights (with the geoid model) and units,
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

### The viewer

- **The toolbar** (F8), top left under Dyno's inspector line, StrataKit's
  solid `Toolbar` of ghost icon buttons, each with a tooltip, in two groups
  as CAD tools group them:
  - **Measure**: the snap mode as three exclusive buttons (Alignment,
    exact; Geometry; None, a plain pick), Point at the view's centre (the
    keyboard's way), Clear (Escape too). A click on a model always
    measures; under the toolbar a one-line prompt appears while a
    measurement is under way or a click was refused ("Click a second
    point on the same model").
  - **View**: Show the other placement (the ghost), Exaggerate the error
    (its factor beside it while on), the compass at the cursor, the error
    ribbon; each a toggle (`active`), disabled with why where it can't
    apply.
- **The snap preview** (F5), as CAD's AccuSnap: while the pointer rests on
  the view in a snapping mode, a throttled snap runs (one at a time, the
  last aborted), and a translucent dot marks where a click would land,
  with the snap kind's small glyph (a square on a point, a bar on a line,
  an arc on a curve, a cross on a surface), solid once the exact snap has
  answered, and a faint ring of the snap's reach around the cursor.
- **The cursor card** (F12), top right, compact: the design coordinates
  first (E, N, H with units, the CRS's codes and height system), then the
  globe's (latitude, longitude, ellipsoidal height, WGS 84), then the
  error as one line. Moving the cursor shows the design space being
  reprojected: the design numbers and the globe numbers change together.
- **The legend**, bottom right above the time controls.
- **The tour's card**, bottom centre above the time controls.
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
  under each site's footprint and the corridor's strip (F11), so the
  ground never pokes through a flat design surface.

### The ghost (F4)

Root causes of what the owner saw, and the fixes:

- **Coplanar partners.** The ghost deck is the other placement's surface,
  drawn translucent and depth-tested against the opaque pass. Where the two
  placements are within a few centimetres (near the anchor; along a
  surface's own plane, where a horizontal offset keeps them coplanar), the
  ghost's fragments pass the depth test on some pixels and fail on
  others: z-fighting. The ghost is now pushed back in depth by a few
  centimetres at its own distance (a polygon offset in the morph shader),
  and fades out wherever its partner is under one pixel apart, so it
  never competes with the solid surface for the same depth.
- **The ghost on the active shape.** During a morph both decks were drawn
  as well as the moving surface; at t = 0 the rigid deck is exactly the
  moving surface, and at t = 1 the reprojected deck is, so the
  translucent tint lay on the active shape itself. Now, during a morph,
  only the deck of the placement being left is drawn, and it fades with
  the morph's progress; the destination's deck is never drawn under the
  moving surface.
- **The morph's artifacts.** The ghost's crease lines are opaque and drawn
  with the deck's positions: at the anchor end they sat exactly on the
  solid surface (more z-fighting). They take the same depth offset.
