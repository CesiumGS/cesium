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
  6. Hand-off: the panel, the flight list and the measure tool, yours.

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

## Layout (side column, 400 px; stacks under the globe below 900 px)

1. Title and one sentence.
2. **Placement:** a segmented switch, Rigid at the anchor or Reprojected,
   and "Show the other" (on by default, drawn thin and dashed); the sag
   chart; one sentence with the worst rigid error and the reprojected
   tolerance.
3. **Measure** (up front, after the placement, as "The story" orders the
   headline: Task 19): the openers first, each with its headline. The
   self-check and the survey mark lead with how far rigid draws the
   design from where it is, shrinking to 0.000 m through the morph; the
   design and true distances come from the page's own `measure` (the
   checks compare them with answers.json), side by side and labelled; the
   10,000 ft pair is quieter. Then your own measurement: snap mode
   (Alignment, exact; Geometry; None), a one-line instruction, the design
   and true distances, and behind "Details" the ellipsoid, scale-factor
   and accuracy rows (the accuracy with its parts, and what it is the
   accuracy of), then each point's station, offset and elevation (with
   its datum).
4. **Sites:** the portfolio as a list. Each row: the name, then CRS,
   units and height system on a second line; "Fly to"; a warning badge
   where a fallback applies. The selected row is tinted.
5. **Checks:** the explorer's rows and kind tags. Every value on the page
   is compared with the generator's exact answer (hand formula), the
   round trips, and published geoid values.
6. **Your own models:** the empty ion slots, each saying what the app must
   supply (CRS, units, site transform, placement mode).

## On the globe

- Reprojected corridor: solid, 5 px, the repro colour (cyan family).
  Rigid: 2 px dashed, the rigid colour (orange family). Neither reuses a
  status colour.
- The anchor: a white ring, labelled.
- The measure line and its points: yellow, with a dark label pill giving
  the design distance.
- HUD top-left: the placement and CRS, and the legend. At the cursor (rigid
  shown): the error at that station. Bottom-left: grid credits from the
  pinned licenses list.
- The globe is the ellipsoid, not terrain, so a NAVD88 design is never
  buried in or floating over a terrain model with its own datum.

## Open for the owner (2026-11-07)

- The two placement colours (cyan for true, orange for rigid).
- Whether "Show the other" defaults on.
- Whether the sag chart earns its place, or the HUD's cursor readout is
  enough.
