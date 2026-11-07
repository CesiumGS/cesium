# Design globe: design

How the design-globe page looks, reads and behaves. It applies
[Dyno's design guide](../../bench/suite/DESIGN.md) and StrataKit, and borrows
the frames explorer's conventions ([its DESIGN.md](../frames-explorer/DESIGN.md)):
Checks with colour-coded kinds, honest numbers stated once, designed states.
The mockup is [design-mocks/page.html](design-mocks/page.html) (plan 4b,
Task 0; for the owner's review, 2026-11-07). Screenshots are taken locally
into `design-screenshots/`, which git ignores.

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
   Phoenix site pin GEOID18's operation (`CORRIDOR_PIPELINE`,
   `PHOENIX_PIPELINE`): PROJ ranks GEOID99 ahead of it, a superseded
   NAVD88 model. A pinned operation states no accuracy, so their
   projection term reads "not known". Where a height system has no grid,
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
3. **Sites:** the portfolio as a list. Each row: the name, then CRS,
   units and height system on a second line; "Fly to"; a warning badge
   where a fallback applies. The selected row is tinted.
4. **Measure:** snap mode (Alignment, exact; Geometry; None), a one-line
   instruction, the design distance as the headline, then the true,
   ellipsoid, scale-factor and accuracy rows, then each point's station,
   offset and elevation in a well.
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
