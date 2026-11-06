# Frames explorer: design

How the frames explorer's page looks, reads and behaves. It applies
[Dyno's design guide](../../bench/suite/DESIGN.md) and StrataKit; it adds
no visual language of its own beyond the 3D viewport's HUD, which Dyno's
guide exempts. The plan's R14 fixes the structure, R16 the quality bar,
R17 the frame it sits in. Design-review screenshots are taken locally into
`design-screenshots/`, which git ignores (they are large and retaken often);
the globe's mocks are in [design-mocks/](design-mocks/).

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
   but what the scenario draws, its legend and the scenario's answer.
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

| Line                                                           | At 1 px (what 6b builds)                                      | Style                                                                                                                    | When the engine gains wide lines |
| -------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| Primary: a grid's major lines, the exact line, Orion's path    | full on-dark family tone, alpha 1                             | solid                                                                                                                    | 2 px                             |
| The rigid line (against the exact one, stop 4)                 | white, alpha 1                                                | dashed: the 400 km chord in 49 pieces of 8.2 km, every other drawn from the first, so both ends are drawn (`dashedLine`) | 2 px                             |
| The rigid line's gap ticks (every 50 km, exact up to rigid)    | white at alpha 0.6                                            | solid                                                                                                                    | 1 px                             |
| Secondary: minor grid lines, true-north lines, Tissot outlines | the family tone at alpha 0.6                                  | true north dashed (world-space segments), site grid dotted (short segments)                                              | 1 px                             |
| Selected (the selected result's overlay)                       | a lighter tint: the family tone mixed 50% with white, alpha 1 | as its kind                                                                                                              | 3 px                             |
| Everything else while something is selected                    | alpha 0.35                                                    | as its kind                                                                                                              | the same                         |

- **Dashes are geometry.** `line-list` can't dash in screen space, so a
  dashed line is emitted as separate segments in world space (fixed metres
  per dash, chosen per overlay so a dash spans about 10 to 20 px at the
  tour's framing).
- **No halos: a darker ground instead.** While an engineering overlay is
  the subject (tour stop 3, a selected engineering result; stop 4 keeps the imagery, its inset needs the sky and ground), the
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

Stop 4's lines are each labelled (owner's rework, 2026-11-06): "Rigid:
straight, tangent at the start" above the rigid line near its start (white),
"Exact: follows the ellipsoid" under the exact line at 60% of its length (the
engineering tone), and the true sag ("12.5 km apart at 400 km") above and left
of the far-end leader, a row above the rigid line's label so the two sit side
by side on the narrow view. The globe's labels follow the main camera only;
the gap inset's labels ("rigid", "exact", and "31.4 m" on its leader) are HTML
in the inset's frame, projected with the inset's own camera (`projectInto`).

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
the rigid line, dotted for the site grid and round trips (M8). An overlay
whose lines are keyed apart has one entry per line (`OverlayView.parts`,
`legendRows`): the rigid and exact lines are two, "Rigid" (white, dashed:
"straight; 12.5 km above the exact at 400 km") and "Exact" (engineering,
solid: "follows the Earth; 31.4 m below the rigid at 20 km"). While the
tour shows on a narrow view the caption takes the bottom and the legend
steps aside until the tour ends.

### Flights

Ease in and out (cubic), duration 1.2 s plus 0.35 s per decade of distance
ratio, 1.2 to 3.5 s; target framing by kind: a site at 8 km range and 45°
tilt; a grid or line so it fills about 70% of the view; the Moon at 20,000
km from its Earth side, 20° above its equator; the lunar site straight down
its vertical, the whole disk in view (see "Camera controls in space"). A
flight off the Earth's surface hands over to its orbit when it arrives. Under
reduced motion, flights cut.

### Camera controls in space (owner, 2026-11-06)

The owner got "stuck out in space": the globe controls only start a turn
from a press on the Earth, and nothing showed where the centre of rotation
was. A view framed on the Moon or Orion now **orbits its subject** with
the viewer's orbit controls (`viewer.setControls("orbit", …)`): a drag
anywhere turns about the subject, the wheel zooms within limits, and a
right- or shift-drag pans. So does stop 2, the polar view whose clock plays
at 3,600×, about the Earth's axis. The Earth's views (stops 1, 3 and 4, the
opening shot, the Earth's frames and sites, a fetched asset) keep the globe
controls (`setControls("globe")`), so the ground is a zoom away (the
controller's ruling, fix round 1). Each orbit is a **rig**: its focus, its up (heading
turns about it, pitch is measured from the plane square to it) and its
heading 0, held in a frame of the subject's own (`orbit.ts`, unit-tested):

| View                                 | Focus                                                 | Up                                                    | Heading 0                    | Wheel range                                            |
| ------------------------------------ | ----------------------------------------------------- | ----------------------------------------------------- | ---------------------------- | ------------------------------------------------------ |
| Stop 2                               | the Earth's centre                                    | the Earth's axis (ITRF z)                             | 0° longitude (ITRF x)        | 1.02 to 40 Earth radii (about 130 km above the ground) |
| Stop 5; Orion selected               | between the Earth and the Moon (the framing's centre) | the Moon's orbit normal at the flyby (DE440, ±30 min) | the Moon at the flyby        | 0.15 to 4 Earth–Moon distances                         |
| MOON_ICRF, MOON_ME, MOON_PA selected | the Moon's centre                                     | its pole (MOON_ME z)                                  | the Earth's side (MOON_ME x) | 1.3 Moon radii to a quarter of the Earth–Moon distance |
| Stop 6; the lunar site selected      | the site                                              | its vertical (the site's up in MOON_ME)               | its north                    | 5 km to 25,000 km                                      |

ICRF and HCRS show the opening shot (their origins, the barycentre and the
Sun, aren't on the scene) and keep the globe controls, as the Earth's frames
do.

- **Following the clock.** The rigs are fixed in ITRF, GCRF (stop 5, as
  Orion's path is), MOON_ME or the site's frame, so the Moon's and the site's
  rigs move in the Earth-fixed world as time runs (the Moon at about
  28 km/s). Once a frame at most, when the clock has moved, never during a
  flight but during a drag too, the orbit is carried rigidly with its
  subject (`followRig`): the camera keeps its heading, pitch and range, and
  a panned pivot moves with the subject. Those are the controller's own
  values, read back from the camera it placed, so a drag goes on by its own
  increments, unfought, and nothing snaps when it ends.
- **The hand-over.** A flight ends where its framing put the camera; the
  orbit then reads pitch and range from there and the heading from the view
  (`viewHeading`: looking straight down the rig's up, as at stop 5, the
  heading is the screen's up, so the view doesn't turn a quarter).
- **An interrupted flight lands in its destination's controls**
  (`CameraFlow`, fix round 1). A flight to a surface view takes the globe
  controls at its start, so a grab of the globe ends it there. A flight to
  an orbit view takes an interim orbit at its start, about the point
  straight ahead at the destination's distance, up the camera's own up
  (taking it moves nothing); the user's first drag or wheel ends the flight
  and lands at once in the destination's orbit, with its following, and the
  drag goes on about the subject. A fetched asset frames itself on arrival
  only if no flight has started since it was asked for and none is under
  way.
- **Landing outside the destination's range** (fix rounds 2 and 3). An
  interrupted flight lands where the camera is, which can be far outside the
  destination's wheel limits (a wheel about 140,000 km out on the way to
  stop 6, whose orbit zooms 5 km to 25,000 km). The limits then widen once
  to take the landing range, and hold until the camera is inside the
  destination's own limits, which apply from then on (`landedLimits`): the
  first wheel tick moves one notch, and the user can zoom back out to where
  the flight landed, not past it. A drag interrupt lands with the same
  widened limits, so its first wheel tick is a notch too.
- **The pivot marker.** While the orbit is dragged, a 20 px white ring with
  a centre dot and crosshair ticks, outlined dark so it reads on sky and
  ground alike, sits at `viewer.orbitPivot` (`pivot.ts`; HUD, never taking
  the pointer); it fades over 0.5 s after the drag ends (a cut under reduced
  motion).
- **Frame content.** A HUD button with StrataKit's re-center icon (as Dyno's
  Viewer page uses), and the F key anywhere on the page but in a text field:
  it re-flies the current framing, the tour stop, else the selected frame or
  result, else the opening view (`frameTarget`). It sits top left, 48 px
  down, under Dyno's inspector: clear of the credits (bottom left), the tour
  caption (top right, or the bottom on a narrow view), the legend (bottom
  right) and the stop-4 inset (bottom left, or top right on a narrow view).
- **Not this example's to solve.** Camera rigs attached to frames, as a
  general engine feature (a camera that rides any frame, with its own up and
  limits), are plan 5's (CESIUM2_WEBGPU_PLAN.md §13.14); this is the example's
  use of the orbit controls plan 4 gave.

### Scenarios (spec 2026-11-06; replaced the tour)

The page opens on **scenarios**: each a real problem solved by the frame
tree it builds (docs/superpowers/specs/2026-11-06-frames-explorer-scenarios-design.md).
The tour's stops 2, 5 and 6 live on as earth-turns, one-path and
stand-on-moon (`scenarios/scenes.ts`); stops 3 and 4 return with the BIM
site. Each scene names its camera and the rig it lands in:

| Scenario      | Camera and rig                                                             | On the globe                                                                              | Clock                            |
| ------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------- |
| one-path      | down the Moon's orbit normal (stop 5's), 3.0 s; `earthMoon`                | Orion drawn in the knob's frame; ITRF and GCRF triads, and MOON_ME's when it is the frame | paused at the flyby              |
| earth-turns   | straight down the north pole (stop 2's); `geocentric`; lit from the camera | ITRF and GCRF only, axes named and pinned; exposure −1.5, −0.6 under 560 px (F43)         | the rate knob; paused until Play |
| stand-on-moon | straight down the site's vertical (stop 6's), 3.5 s; `lunarSite`           | the site's triad at 15% of the camera's distance, and the lunar clock's gain as a callout | paused at 2026-01-01             |

**The panel, top to bottom, one scroll** (`panel/Scenarios.tsx`): the
strip; the question as the tab's heading (`headline-sm`); the frame tree;
the answer; the knobs; the proof. Nothing opens in a sheet.

- **The strip**: one bordered entry per scenario (title, and its question
  in a quieter, clamped line); the one showing has the selected row's 2 px
  accent bar. Only scenarios with a scene and an evaluator are listed
  (`READY`); a link to another falls back to the first.
- **The frame tree** is the panel's one bold thing (the owner's choice of a
  top-down branching diagram over ruling S6's outline): pills sized to their
  labels, a constant 14 px between neighbours (`layoutTree` with
  `nodeWidths`), elbows between rows. A built-in frame is a family-edged pill
  with a dot; a frame the scenario added is a diamond on a pill tinted and
  edged in its family. Docked, it draws the scenario's frames, the base
  frames its answer names (`SceneSpec.focus`, the answer's path) and the
  selection, with their ancestors; each unused subtree folds into a dashed
  "+N" chip that unfolds on a click (`focusTree`). Too wide for the column,
  it pans (a soft edge says so) and scrolls the lit path and the selection
  into view; labels never shrink. **Expand** (a labelled button on the
  section's heading) opens the whole tree in a dialog over the globe, which
  Escape or its Close button dismisses, focus going back to Expand.
- **The answer's path** (`branchPath`) lights edge by edge, 90 ms apart,
  from its start up to the common ancestor and down; its ends carry "from",
  "meet" and "to" tags, and its edges say their kind and accuracy inline (up
  to the next pill's line). Any other edge says them on hover or focus.
- **Rebuilding**: on a switch, shared pills glide to their new places
  (460 ms) and added ones grow out of their parent (`@starting-style`).
  Reduced motion cuts straight to the new shape and lights the path at once.
- **Selecting** a pill opens its detail in place under the diagram: its
  family, its edge from its parent (kind, accuracy, detail, note), "Show on
  globe", and the walk against a reference. An elbow selects its edge. One
  labelled Close.
- **The answer**: its figure (`headline-sm`, tabular), its sentence, its
  accuracy ("±17 mm (1σ): measured Earth orientation …", or the reason it
  isn't bounded, in the warning colour), and the scenario's limit under a
  warning rule. While new knobs are evaluated the last answer stays, dimmed,
  with "Updating for your setting…" (R9); behind a catalog run it says so.
  The same answer is the **globe's callout**, top right at 48 px (level
  with Frame content, clear of Dyno's inspector strip, the credits and the
  legend); under 560 px it folds to its figure with a chevron (F42).
- **Knobs**: the marker first, "At the checked setup. The published
  references apply here." or "Off the checked setup: “Site latitude” and the
  time differ from it.", with **Back to the checked setup**; then each knob
  (a range's checked value marked on its track; a rate over three decades on
  a log track; a choice as a segmented control naming its full label below);
  then the time, with Play or Pause.
- **Proof** (the owner, 2026-11-06: no sheet): each row one full-width
  button, 44 px or taller, with a chevron and `aria-expanded`, that unfolds in
  place into its difference against its tolerance, what it is compared
  against, its reference and source, and its accuracy. Its status is in
  words beside its colour: Checked against a reference (or Checked by the
  catalog, for a round trip that cites nothing), Live re-run, Reference
  applies at the checked setup (with how far your setting moves the answer),
  or Loading. A catalog row offers one labelled "Open in Verification".

**Fix round 1 (the owner's reports, 2026-11-06)** changed these, and
binds over the bullets above where they differ:

- **The picker** is StrataKit's select, "Scenario", full width and sticky
  with the question as the lead line and a "Checked setup" / "Off checked ·
  Back" chip; its list gives each title with its question under it.
- **The tree holds only frames.** Data (Orion's) is a dashed card pinned
  below the frame its numbers are in ("Orion's data, in EME2000 (OEM)"). The
  frame you draw in takes StrataKit's accent with a "Drawing in" tag, and
  one-path's GCRF, ITRF and MOON_ME are the control (dashed until chosen).
  The route `branchPath(data's frame, drawn-in frame)` lights in the accent
  and a dot travels it (static at the end under reduced motion). The docked
  tree is at most 280 px tall and pans; it has no edge labels: the route is
  spelled out under it, a numbered step per edge with what it does and its
  accuracy. Tips (fixed to the viewport) and the Expand dialog carry the
  full labels. Moon frames never enter earth-turns: a result's frames
  belong to Verification.
- **Earth-turns** adds Sacramento's east-north-up frame under ITRF; its
  triad rides the turning Earth while GCRF's holds still.
- **The headline answers the question on its own**: "1.40 km/s relative to
  the Moon (MOON_ME)", "357.70° east of GCRF's x axis", "55.99 µs/day fast,
  against a clock on the Earth", the same on the globe's callout. Where it
  has a published counterpart (stand-on-moon), the value and its citation
  sit under it, with ours, the difference and the verdict at the checked
  setup, or the delta and no verdict off it.
- **Stale is said**: while the shown evaluation is another setup's, the
  answer dims and the proof reads "Updating" with no verdict; while the
  clock plays they read "Following the clock" in one steady state.
- **Orion's marker** is a dot with a halo on the path at the clock's time,
  "Orion, HH:MM UTC" beside it, an arrow at the view's edge when it is off
  screen; the globe's callout names the drawn-in frame and carries the same
  GCRF / ITRF / MOON_ME choice.
- **More below**: a fade and a "Knobs and proof ↓" pill at the scroller's
  foot until the end is reached.

**Verification** is the second tab: the catalog's Checks, its Overlays and
the Report, one segmented control apart. Its inspector's sheet keeps one
labelled Close and no separate fill toggle.

### The convergence exaggeration (stop 3, ruling F32)

At stop 3's framing the real convergence, −0° 39′ at the grid's west edge,
leans a true-north line about one pixel over the view's height: the caption
would describe something nobody can see. So the design grid's true-north
lines are drawn with their convergence **×20** by default, as R4 draws the
frame bias: each line is leaned from the grid line through the same E by 20
times its true offset (display only; the geometry builder's
`exaggeration`). It is never silent, and it always names what is multiplied:
the angle. The globe labels the line "true north, angle ×20", the legend's and
the overlay's accuracy line says "true north with its convergence angle drawn
20 times larger", and the caption keeps the real angle (−0° 39′) (owner's
note, 2026-11-06: "×20" alone read as a distance). Stops 3 and 4 set the
clock to 13:00 PDT on the flyby day, so California is in daylight. The design grid's options hold a **Show true scale** switch that
redraws the lines at ×1 (the label then reads "true north"). The grid lines
themselves are never exaggerated.

### The rigid line at true scale (stop 4, owner's rework 2026-11-06)

The ×50 separation (S-C1) bent the straight tangent into an upward curve
(the exaggerated gap grows as distance squared), and one legend entry covered
both lines, so the owner read the dashed line as a picture of the gap. This
replaces F32-style exaggeration for stop 4: nothing is multiplied, and the
"Show true scale" switch is gone from the overlay's options and the stop's
caption (stop 3's ×20 convergence and its switch stay).

- **A longer line.** 400 km east along grid east from the catalog's
  California site origin (6,000,000, 2,100,000 ftUS, near 122.44° W
  37.75° N) in EPSG:6420 (`rigidLine.ts`). The gap there is 12.53 km
  (d²/2R with the Gaussian radius: 12.55 km), about 13 px from the stop's
  camera, so the straight line reads against the curved one; the 50 km
  ticks show it growing. The far end is at 117.90° W, inside the CRS's area
  of use (to 117.83° W); 500 km would end in Nevada. PROJ's operation is the
  same conversion plus the 2 m NAD83(2011) to WGS 84 step anywhere in the
  zone, and `RigidPlacement` is an affine map, valid at any distance (the
  rigid polyline is straight to 1e-6 m: `test/data`).
- **Sampling.** The exact line every kilometre (400 segments; each chord
  within 2 cm of the ellipsoid, so the inset's close view sees it on the
  ground); the rigid one as 49 dashes of its chord.
- **The camera.** South of the line looking north, 5° down, 400 km range
  (divided by the aspect on a portrait view, where the field of view is the
  height's), centred 53% along: the whole line across the view, between the
  caption (top right), the legend (bottom right) and the inset (bottom left),
  under the limb. The Sacramento triad stood over the line's start, so the
  stop draws only the geocentric triads, as stop 2 does.
- **The gap inset.** A picture-in-picture view of the gap at 20 km, at true
  scale: 31.4 m, the catalog's rigid placement figure (`rigidVsExact`'s
  mark; within its 10%). A second engine view on the viewer's target and
  world (`engine.addView`, `gapInset.ts`), its camera level and side-on,
  about 100 m south of the mark, the gap 45% of the picture's height
  (`insetCamera`). A 1 px white leader joins the lines at the mark, labelled
  "31.4 m"; "rigid" and "exact" name the lines at the picture's left. A 1 px
  white border (with a dark outer ring) and a caption strip, "At 20 km:
  31.4 m apart (true scale)". The triads are kept out of its view (a view
  mask): sized for the main camera, they are kilometres long there.
- **The gap's two parts** (owner: why does the leader lean?). The 31.4 m is
  mostly the curvature's drop, and partly along the line: rigid placement
  lays 20 km of grid as 20 km, the exact one as 20 km over the grid scale
  factor (about 0.99993 between the zone's standard parallels), so the rigid
  point falls 1.48 m short. Both are computed from the two placements, split
  along the inset's own axes (`gapParts`: the ellipsoid's normal at the mark,
  the line levelled there), not estimated. They are at right angles, so they
  combine in quadrature, √(31.32² + 1.48²) = 31.36, not by addition; shown
  to the centimetre, a digit finer than the whole, they give the whole as
  shown (to the decimetre, 31.3 and 1.5 would make 31.3): "31.32 m down"
  left of the leader, "1.48 m along (grid scale)" at its top by the rigid
  line, and the stop's caption says "31.32 m down and 1.48 m along the line,
  at right angles" and why the leader leans. `test/data` checks the part along the
  line against the integrated grid scale (1.4 m, plus about 0.1 m from the
  normal's turn over 20 km and the arc against its chord).
- **Where it sits.** Wide views: bottom left, 240 × 140 px plus its 24 px
  caption, above the time controls (`--fx-hud-bottom`) and the credits under
  them; clear of Dyno's inspector (top left), the tour caption (top right)
  and the legend (bottom right), which keep their places, and of the line
  across the middle. Narrow views (under 560 px): at the top right under
  Dyno's inspector, which spans nearly the whole width there, at most
  212 px wide (its caption's width) and 56% of the view; the caption is at
  the bottom then and the legend steps aside during the tour. Between about
  560 and 620 px wide, on a short view, the 340 px tour caption reaches over
  the inset's corner: the inset reads the caption's box and narrows in place
  (to 140 px at least) to end a gutter short of it (checked at 600 and 680
  px). It watches only the caption element shown: each stop mounts its own.
- **When it shows.** While the rigid and exact lines are drawn, outside the
  tour or at stop 4. Another stop, the overlay off, or leaving the example
  removes the view (its frame, observers and view-mask bit with it); the
  example's scope disposes it before the globe and the viewer.

## Layout

### Where it sits (R17)

Dyno owns the page: title, switcher, "Show source", the "Starting…"
overlay, the error alert, the side layout's columns, the Controls header
and its collapse, the theme and the URL. On the canvas, Dyno's inspector
is top left and the credits bottom left; the viewer's time controls are
bottom centre. The example adds:

- **The panel**, in Dyno's Controls body: the status strip, then the
  Scenarios / Verification tabs directly under the Controls header. No
  second title or description.
- **The HUD**: the legend bottom right, above the time controls; the
  scenario's answer top right; while the rigid and exact lines are drawn, their gap
  inset bottom left, above the time controls (top right, under Dyno's
  inspector, on a narrow view; see "The rigid line at true scale"); Frame
  content top left under Dyno's inspector, and the orbit's pivot marker while
  it is dragged (see "Camera controls in space").

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
and the globe (`panel/families.ts`, `panel/tokens.css`); the 3D geometry
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
(C3): "±2.0 m (1σ): the WGS 84 ensemble; round trip ≤ 3.4 nm", "parts as
distance squared: 31.4 m at 20 km, 12.5 km at 400 km (true scale)", "the frame bias, 23 mas: exact by
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

## Files (Task 4b, 2026-11-06)

`main.ts` keeps `run`. It builds the page's parts and wires them, in the
order they set up their listeners and teardown (the scope undoes them in
reverse). Each part exports a `create…(deps)` that returns its API and a
`dispose`. A part reads another's state only through the functions it is
given; shared state is passed as an explicit object (`PageCore`, the label
board, an overlay's `OverlayState`).

| File                 | What it does                                                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `main.ts`            | `run`: the HUD host, the globe, the worker client, the scenario host, the clock's opening; builds and wires the parts below |
| `page.ts`            | `PageCore` (what every part is given), the panel model's source (`invalidate`), shared constants and helpers                |
| `frameData.ts`       | The frame data and the frames store's manifest, loaded on the main thread                                                   |
| `treeState.ts`       | The frame tree at the clock's instant, its composed accuracy, the engineering node                                          |
| `triadLayer.ts`      | The triads and the label board every part's labels go through                                                               |
| `walkPath.ts`        | The selected frame's dotted walk on the globe                                                                               |
| `overlayConfig.ts`   | The overlays' names, needs, the California grid and site, default lines (pure)                                              |
| `overlayControl.ts`  | The overlays' state, worker requests, the 2 km lines, the inset, the legend's view                                          |
| `rigidOverlay.ts`    | Stop 4's lines: layers and labels from the worker's geometry                                                                |
| `orionLayer.ts`      | Orion's path, placed with its frame as the clock runs, and its statements                                                   |
| `cameraViews.ts`     | Where each scenario, frame and stop frames the globe, and the orbit it lands in                                             |
| `cameraRig.ts`       | Flights, globe and orbit controls, the hand-over, the widened limits, the pivot marker                                      |
| `scenarios/stage.ts` | Each scenario's scene: enter, knobs, leave (clock, light, exposure, its frames)                                             |
| `callouts.ts`        | The lunar clock's callout, Orion's marker and path label                                                                    |
| `catalogRuns.ts`     | The stress catalog's runs and results                                                                                       |
| `userCrs.ts`         | "Try your own": the ion asset and the bound-CRS checks                                                                      |
| `pageReport.ts`      | The report's environment and the Report tab's lines                                                                         |
| `panelModel.ts`      | The panel's model, built from every part                                                                                    |
| `scenarioModel.ts`   | The scenario's part of the model (pure: freshness, published value, proof, route)                                           |
| `globeSelection.ts`  | The selection on the globe (R14), Frame content (F), the links' known ids                                                   |
| `deepLinks.ts`       | Back, forward and edited links (R15)                                                                                        |
| `frameLoop.ts`       | The per-frame work                                                                                                          |
| `panelActions.ts`    | What the panel asks of the page                                                                                             |

The stylesheet is `panel/panel.css`, an index that imports one file per
part in cascade order: `tokens.css` (the family palette and axis colors),
`PanelFrame.css`, `shared.css`, then each component's (`StatusStrip.css`,
`Explore.css`, `Verify.css`, `Inspector.css`, `TryYourOwn.css`,
`Report.css`, `Hud.css`, `Scenarios.css`, `RouteSteps.css`,
`TreeDiagram.css`, `ScenarioAnswer.css`, `Knobs.css`, `Proof.css`,
`VerificationHead.css`), then `motion.css`, `narrow.css` and
`GlobeLabels.css`. Keep the order: rules of equal specificity resolve by
it. A new scenario's styles go in its component's file, or a new file
imported where its rules belong in the cascade.

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
- **Stop 4 (S-C1).** The separation drawn ×50 by default (`rigidVsExact`'s
  `exaggeration`, display only, like F32's convergence), with a "Show true
  scale" switch; the leader carried the true sag. Replaced by the true-scale
  400 km line and its gap inset (owner's rework, 2026-11-06: see "The rigid
  line at true scale").
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
  the camera, the polar globe washed out behind the axes. At desktop width
  the eye's auto-exposure brightens the small globe on black, so the stop
  takes exposure −1.5 there and −0.6 under 560 px, where the globe fills the
  view (F43; `stopExposure`, followed as the view resizes). The Sacramento
  triad, which crossed GCRF's turning x axis, is hidden during the stop
  (`TourStopSpec.geocentricOnly`).
- **The distortion overlay states its placement.** Its line was "contours
  from PROJ's scale factors" alone; it now leads with the recorded
  operation of the CRS it's drawn in: "placed ±2.00 m (1σ), the recorded
  operation" on California zone 3 (NAD83(2011)), "placed exact, a
  conversion" on Web Mercator and UTM 10N (WGS 84), then "contours from
  PROJ's scale factors" (R8; `legend.ts`).
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

### 6c-2 fix round 1

- **Missing frame data (R5, F44).** The worker loads the frame data only
  when a check, overlay or Orion needs it, and a check names the "frames"
  need when it reads the tree; one that needs it is skipped as missing, the
  rest run. With an empty store the vertical profiles, the clothoid and the
  hand Helmerts still run (9 passed, 73 skipped). The Verify line names
  what a partial run skipped for ("73 skipped (PROJ, GEOID18, Frame data
  and Orion OEM missing)") and a stopped run says why ("Stopped after 19 of
  225 checks: …").
- **A row with no bar** says "shown, not judged" for a shown-only result
  (the bound CRS's accuracy) and "skipped: missing data" for a skipped one.
- **The caption's fold** is plain functions (`panel/fold.ts`): what shows,
  the toggle's `aria-expanded` and label, and focus (the stop's heading at
  each stop; the toggle keeps it as the caption folds).

### Camera and lunar fixes (owner, 2026-11-06)

- **Orbit controls off the surface**, the pivot marker and Frame content:
  see "Camera controls in space".
- **The sky's Moon is DE440's.** The examples host builds its Viewer without
  frame data, so the sky placed the Moon with the analytic model (Simon
  1994), about 400 km from DE440's: the imagery's pole sat about 404 km from
  the site's triad (lunar-pole-investigation.md). Once its frame data loads,
  the example hands it to the sky (`viewer.setFrameData`). It isn't undone on
  leave: the sky's data is the Viewer's, the Viewer is destroyed with the
  example, and the next Viewer sets the shared engine's Moon from its own.
- **Stop 6 tells the truth about the backdrop.** The site is deliberately at
  89.5° S, 0° E, height 0 in MOON_ME (15.2 km from the pole; east-north-up
  is defined there), and the caption says "near the south pole, at
  89.5° S". The Moon drawn is the sky's disk, a backdrop with no parallax,
  right only along the line from its centre: from 100 m it put a piece of
  surface hundreds of kilometres off behind the triad. The stop now looks
  straight down the site's vertical from about 3,000 km, the disk's limb in
  view, where the backdrop behind the triad is 15.8 km from the drawn pole
  (checked in the page; it was about 404 km), and the caption adds that the
  imagery is a distant backdrop until plan 5 draws the Moon as a tileset.

### Carried forward (engine work)

- **X-ray dashes for the geocentric triads inside the globe.** (Meanwhile
  the shafts start at the surface.) Line-list and mesh draws are always
  depth-tested (`DrawOptions` has no depth-test
  switch; only billboards have `depthTestDistance`), so the part of the
  ITRF, GCRF and EME2000 triads inside the Earth can't draw through it.
  Needs a draw flag for depth-test off (or a second pass with an inverted
  depth test) in the renderer.
- **The lunar caps' streaks** at stop 6, once read as ray artifacts in
  shadows: the sky's Moon map stretched its 85° S row over the cap
  (lunar-pole-investigation.md). The map's cap tilesets are engine work in
  progress (src/io/moonMap.ts).
