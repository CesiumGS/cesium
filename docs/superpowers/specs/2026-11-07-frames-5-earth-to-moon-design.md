# Frames 5: Earth to Moon, and the engine work it needs: design

Date: 2026-11-07. For `packages/next` (the CesiumJS 2.0 WebGPU engine).

This is plan 5 of the frames work. It builds on the frames design
(`docs/superpowers/specs/2026-11-05-frames-bodies-measurement-design.md`,
called "the frames spec" below), whose §8.2 example, "Earth to Moon: Artemis
II", is plan 5's showcase. Since the frames spec was written, the owner has
made many design decisions about plan 5. They are recorded in
`CESIUM2_WEBGPU_PLAN.md` §13.14 as paragraphs starting "_Plan 5 design input_",
"_Upstream proposals_", "_Terms_" and "_Design input after plan 5_", and in
the "Carried forward" lists. This document turns them into a buildable design.

**How to read it.** Everything stated plainly was decided by the owner, in the
frames spec or in §13.14. The owner's words are quoted where they settle a
point. Calls marked **(author's call)** were made by the author of this
document; each is cheap to undo unless it says otherwise. Section 17 lists the
questions only the owner can answer.

## 1. Intent

Plans 1 to 4b gave the engine a frame tree, time, ephemerides, measurement,
engineering frames, placement modes and design picking. The rendering is still
drawn Earth-fixed (plans 2 and 3, R6: "the world is not re-rooted"). Every
camera controller assumes the Earth. The sky shows the Earth's sunrise colours
in orbit. A globe-only Viewer bundle carries the ERFA tables.

Plan 5 makes the engine work the way the frames spec described, across bodies,
in design space, and for applications that want none of it:

- **One flat render space in the core, and frames above it.** The owner: "The
  default frame tree that's needed for a scene is application dependent and we
  don't need to load up a bunch of frame tree stuff for an app that's never
  going to go into space." The core draws in a Cartesian space with no meaning
  attached. An optional frames module resolves frames into it.
- **Modules with interfaces.** The owner: "We should generally be thinking
  about how to make 2.0 more modular so pieces of it can be reused and composed
  in interesting ways and we can easily plug different module implementations
  in for places where that makes sense." The engine is also meant to be an
  embeddable rendering core whose host application supplies its own services:
  its own frame manager, coordinate conversion, snapping or measurement tools.
- **Cameras that belong to frames.** A camera rig is a pose in a frame of the
  tree, controllers are policies over it, and gestures are data.
- **A sky that is physical on every body,** evaluated from the camera's true
  place relative to each body.
- **Animation as a small, general core,** first used by camera transitions and
  the design-space morph.
- **The Artemis II example,** which exercises all of it: the Earth's and the
  Moon's tilesets together, cameras that follow Orion or fly freely, readouts
  in several frames, and a communications overlay that shows measurement
  accuracy.

## 2. Where things stand

What plan 5 builds on, as of 2026-11-07:

- **Plan 1** (r61): `Instant`, leap seconds, TDB−TT, EOP, IAU 2006/2000A Earth
  orientation, SPICE DAF readers, `Ephemeris` from DE440 and the lunar PCK.
- **Plan 2** (r62): the frame tree (`createFrames`: ICRF, HCRS, GCRF,
  EME2000, ITRF, MOON_ICRF, MOON_ME, MOON_PA), `Frame`, `frameTransform`,
  `FramePoint`, trajectories from SPK and OEM, and the sky from DE440
  (`skyState`).
- **Plan 3** (r63): measurement (`src/measure/`): light time, Shapiro delay,
  apparent directions, Doppler, geodesics, occultation, line of sight and
  accuracy statements.
- **Plan 4a** (r64): engineering frames over PROJ (`src/engineering/`),
  factors, alignments, the site transform.
- **The frames explorer** (r65 and the scenarios plan): eleven scenarios, the
  stated accuracy of app-defined frames (`Frame.accuracy`, `pointAccuracy`),
  terrain line of sight (`castTerrainRay`, `terrainLineOfSight`).
- **Plan 4b** (nearly done): lazy grids against a pinned PROJ-data catalog,
  tileset placement modes (`TilesetPlacement`: rigid and reprojected), the
  tileset declaration `BENTLEY_engineering_frame` (composed with `ESRI_crs`,
  `EXT_geospatial_crs_source` and `3DTILES_ellipsoid`), `pickDesign`, the
  snapping split (`SnapService`, a CPU `ClientSnapService` over retained tile
  geometry), and the design-globe example with a placement morph built in the
  example from paired tilesets.

**Plan 5 starts when 4b's last task has landed** (author's call). Sub-plan 5a
changes how `Tileset3D` places content and moves the design-globe example's
morph onto the core, so it should not race 4b's Tasks 18 to 22.

## 3. Goals, non-goals and anti-goals

### Goals

1. **A core that knows nothing about frames.** It draws in one flat render
   space, in metres, with a transform per draw and a camera pose in it.
   Precision stays camera-relative, so one core serves a site, the Earth and
   the Moon.
2. **An optional frames module above it,** which resolves the frames in use
   into each view's render space at the tick's time. An application can
   include it, leave it out, or replace it.
3. **Pay for what you use.** Frame providers (Earth orientation, ephemerides,
   PROJ, trajectories) load when a frame that needs them is first asked for. A
   globe-only Viewer loads none of them.
4. **Content on any body,** drawn together: the Earth's terrain and imagery,
   Cesium Moon, models on either, a spacecraft between them. Two views of one
   world may be on different bodies.
5. **Camera rigs in frames,** with controllers that own their constraints,
   underground as a first-class case, a CAD-style controller for design space,
   and gestures as bindings with presets.
6. **A general animation core,** with camera transitions as blends between
   live rigs.
7. **A physical sky on every body,** composited physically wherever the camera
   is.
8. **Design space and the global view, with a morph between them,** as two
   render roots.
9. **Design CRSs routed to the tree's root** (ITRF2020), with defaults as
   data and every choice configurable.
10. **GPU snapping** on the client side, keeping the client/server split.
11. **Frame revisions,** so consumers and the renderer redo work only when
    something moved.
12. **The Artemis II example** (frames spec §8.2), with its effects.
13. **A public API review:** a map of the surface and proposed moves.

### Non-goals

- **A GPU tessellation engine.** The owner wants one engine, later, for both
  reprojected models and B-reps (trimmed NURBS from CAD): patches and the
  draw's placement evaluated together in compute, subdivided by screen-space
  error, with trim curves and indirect draws. Plan 5 builds none of it. It
  keeps the seam open (section 8.4).
- **The architecture of ray queries** (§13.16: where a query runs, when
  acceleration structures are built, which level of detail a ray sees). §13.16
  is open, for its own brainstorm. Plan 5 makes rays frame-aware on the CPU
  paths that exist (section 9.3). Section 17, question 1, asks whether the owner wants more.
- **TEME and SGP4.** Listed as "Plan 5 or a frames add-on". The Artemis
  example needs neither (LRO comes from JPL Horizons). They become the first
  add-on provider once 5a's provider interface exists **(author's call)**.
- **The drawing layer's portability** (WebGPU compatibility mode, WebGL 2).
  The owner: later, after prototyping, with "no design compromises in the
  WebGPU approach while the prototype is built".
- **glTF animation playback** (skins, morph targets, animated nodes from the
  file). The animation core is shaped to drive it later. Plan 5 adds only
  per-node transforms that an application sets (section 11.6) **(author's
  call)**.
- **Inherited from the frames spec:** mission planning, link analysis as a
  product, a globe (terrain and imagery tiling) on bodies other than the
  Earth, reading alignments from real iModels or IFC files, and drawing
  apparent positions.
- **Taking the upstream proposals to 3D Tiles and glTF.** That is the owner's
  (section 15.3 lists them).

### Anti-goals

- **A measured value that disagrees with the CAD data** (the frames spec's main
  anti-goal, unchanged).
- **A result that claims more accuracy than its inputs have,** including a
  stand-in model that doesn't say it is one.
- **A globe-only application that pays for frames it never uses:** in bytes
  downloaded, in data fetched, or in work per frame.
- **A constraint where a controller can't turn it off.** "Underground
  visualization is a first-class case, so no constraint lives anywhere a
  controller can't turn it off."
- **Naive blending of skies.** The owner: "physically correct as the camera
  transitions between frames in the same way that zooming out of earth right
  now shows the atmosphere accurately … a general system there rather than
  naive blending."
- **Effects that look like a game's while claiming to be physical** (frames
  spec, unchanged).

## 4. Constraints

- **Precision.** Float64 on the CPU throughout. The GPU sees only
  camera-relative values (hi/lo and camera-relative, §13.15). Hi/lo is valid to
  ±2³¹ m (about 2.1 million km), which covers Earth to Moon. Any per-vertex
  placement keeps its large offsets in hi/lo and evaluates only small
  tile-local terms in float32.
- **Earth-only scenes are unchanged.** The parity pages, the bench gate and
  every test keep passing. A globe-only scene renders the same pixels before
  and after 5a, within the gate's existing tolerances.
- **Browser only.** No server-side computation. Data the engine needs is
  self-hosted.
- **Data lives outside the repo,** in the setup store (`~/.cesium-bench/…`,
  `FRAMES_DATA_DIR`), fetched by `npm run setup` and served by the dev server.
  Nothing new is committed or shipped in the package.
- **Size.** Heavy dependencies load only when needed, as Slang and PROJ
  already do.
- **Licenses** as the frames spec §9 says, plus the new sources in section 14.
- **No ion tokens in the repo.** Examples take a token from `.env.local`, the
  Viewer's UI or ion's default evaluation token. (How the built gallery gets a
  token in production is still the owner's call, carried from the scenarios
  plan.)
- **Examples are documentation.** They use only the public API. Where an
  example has to reach past it, that is a finding for the API review (5i).
- **UI quality.** The owner wants polished UI and UX: no cramped quick mockups,
  and a design pass for every example page.
- **Repository practice.** Commit locally, never push (the owner hands work off
  with a git bundle). Snyk scans on new code. Slang for engine shaders, WGSL or
  Slang for custom shaders. Never rewrite compiler output. Node 24
  (`engines`).
- **House style** for docs, comments and UI text: plain, short sentences, units
  and datums named, no e-notation in prose.

## 5. Terms

The owner's terms (2026-11-07), used throughout:

- **Render space:** the core's one flat Cartesian space, in metres, with no
  meaning attached.
- **Render root:** the frame the frames module chooses as a view's render
  space: ITRF for the globe view, an engineering frame for design view,
  MOON_ME on the Moon.
- **A draw's placement:** how its content coordinates reach the render space.
  It is **affine** (a matrix) or **per vertex**.
- **Coordinate operation:** what the frames module computes a placement from
  (PROJ's and ISO 19111's term). Applying one is **reprojection**.
- "Warp" and "deformation" are not used for this ("deformation" means crustal
  motion in geodesy, as in PROJ's `defmodel`), and neither is "projection",
  which is the camera's. A map projection is called that in full.

And this document's own:

- **A tileset's placement mode** is 4b's declared `rigid` or `reprojected`
  (how its producer placed it). It is input to the draw's placement, not the
  same thing.
- **Anchor:** a node of the core's transform table that the frames module (or
  the application) places per view. Bodies, engineering frames and
  trajectories each get one (section 7.3).
- **Rig:** a camera pose in a frame (section 11).

## 6. The decomposition

Plan 5 is nine sub-plans. Each leaves the engine working and ends with
something testable on its own.

| Sub-plan | What it builds | Testable result | Needs |
| --- | --- | --- | --- |
| **5a** The core and the frames module | Render space, anchors and render roots per view, a draw's placement, the frames module as its own entry point, providers on demand, frame revisions, frame-tagged picking and the coordinate service as interfaces | Earth-only parity unchanged; a globe-only bundle without the frames data path; the explorer and design globe on the new seam; an import-boundary test | 4b done |
| **5b** The frames library | Two-vector dynamic frames, accuracy beyond first order, frame-aware rays on the CPU, bulk work with `AbortSignal` and progress | SPICE fixtures for two-vector frames; accuracy tests; explorer numbers move only where bounds tighten | 5a's module move |
| **5c** Bodies in one world | Content on any body, per-body culling, volumes and clamping, the Moon as a tileset at every distance, two views on two bodies | A view on MOON_ME drawing Cesium Moon and the Earth; Earth parity unchanged | 5a |
| **5d** Cameras, controllers, bindings and animation | The animation core, rigs, controllers that own constraints, free-fly and CAD-style controllers, an orthographic camera, gestures as bindings, transitions between live rigs | Controllers driven by synthetic input; transitions tracked against a moving target; deterministic animation tests | 5a; 5b for two-vector frames; 5c for per-body globe controls |
| **5e** The physical sky and light per body | An atmosphere per body, evaluated from the camera's true place, composited physically; light, shadows and earthshine per body; the Moon's surface reflectance | Sky radiance against the reference model at many altitudes; black space in orbit; the Moon through the Earth's air | 5c |
| **5f** Design space | Routing a design CRS to ITRF2020, design view as a render root, the morph as a blend of two render roots, the GPU snap pass, the rule for reprojected models | The design globe in design view and morphing; GPU snaps agree with the CPU stand-in; routes match NGS's published values | Routing: 4b only. The rest: 5a, 5d |
| **5g** Earth to Moon: Artemis II | The §8.2 example, without its effects | The published occultation against SPICE; DSN Now as a sanity check; browser checks | 5b, 5c, 5d, 5e |
| **5h** Plumes, plasma and the phases outside the data | The effects and the illustrative phases (frames spec §8.2) | Visual review against the physical facts; labels and exclusions | 5g |
| **5i** The public API review | A map of the surface, stability tiers, the measurement module's seam, proposed moves | The surface map checked in CI; moves the owner approves | Last; its map tool lands in 5a |

**Order** **(author's call)**:

```text
4b ─► 5a ─┬─► 5b ──────────────┐
          ├─► 5c ─┬─► 5e ──────┼─► 5g ─► 5h
          │       └─► 5d ◄─────┘    ▲
          │           (5d needs 5b) │
          └─► 5f (morph after 5d) ──┘ (5f and 5g may run side by side)
5f's routing may start as soon as 4b is done.
5i runs last; its surface map is built in 5a's first task.
```

The critical path is 4b, 5a, 5c, 5e, 5g, 5h. 5d runs beside 5e. The
animation core inside 5d needs only 5a and can start first. Section 16 places
every carried-forward item in a sub-plan.

## 7. Sub-plan 5a: the core and the frames module

### 7.1 Why

Everything else in plan 5 hangs on this seam. Without it, a Moon view, design
view and per-body cameras would each be special cases inside an Earth-fixed
core.

### 7.2 What the owner decided

- "The rendering core knows one flat space and nothing about frames: a
  Cartesian render space in metres with no meaning attached, a transform per
  draw, and a camera pose in it." The core's only frame-adjacent feature is
  that a draw has a placement, affine or per vertex. Without the frames module,
  a draw's transform is a matrix the application sets.
- The frames module is optional and above the core. At each tick's time it
  resolves every frame in use into the render space and hands the core each
  draw's placement. The render space is the view's render root. "Design view
  is not a special mode, and the design-space morph blends two render roots."
- **Render roots are per view** (approved by the owner with the split,
  2026-11-07). Two views of one world can be on different bodies (frames spec
  §6.4).
- Frames are built on demand. Providers load when a frame that needs them is
  first asked for. "Whoever asks chooses the precision."
- The Viewer picks defaults: for a globe app, ITRF as the render root, the
  ellipsoid Earth, nothing else. Lower-level applications choose for
  themselves, or leave the module out.
- Frame management is its own module, behind interfaces to the drawing code, so
  an application can include it, leave it out or replace it (for example with
  a frame manager not built on PROJ). Coordinate conversion is a service the
  module supplies, and PROJ is one implementation. Picking reports frame-tagged
  positions through an interface the module fills in.
- Placement takes a third mode beside rigid and reprojected: content that
  arrives already reprojected by its producer or host.
- The catalog and the tree in use are separate. The catalog is every frame the
  library knows by name and costs nothing until used. The tree in use is the
  frames a scene touches plus their ancestors. "The renderer's own use counts
  as use": the sky's GCRF and the Moon disk's MOON_ICRF and MOON_ME are shown
  as "used by the sky". The root stays ICRF.
- A stand-in model declares its accuracy. A frame may work on an analytic
  stand-in before its data arrives, but the edge then states the stand-in's
  wider accuracy and visibly changes when the data loads. Otherwise the frame
  is unavailable until its data loads. "Choose per frame, never silently."
- Change tracking: "Each frame carries a revision, which goes up when its
  placement's inputs change." The tree and single queries stay synchronous.
  Time-dependent values (an accuracy that drifts with time) publish only when
  they change by a visible amount.

### 7.3 Anchors and render roots

The core keeps its transform table (`World.addTransform`, parent × local in
float64), with one addition: a top-level transform can be an **anchor**. An
anchor's placement in render space is set per view. Bodies, engineering frames
and trajectories each get an anchor, and content hangs under them. A draw that
hangs under no anchor is in render space directly, as every draw is today.

**How a view uses anchors** **(author's call; the builder may choose another
mechanism that keeps the precision rule and the cost rule below).** The core
places the camera in each anchor, rather than each anchor in the render space.
Per view and per anchor, it computes in float64 the eye's position in the
anchor's coordinates and the rotation from the anchor's axes to the eye's.
Draws under an anchor keep their anchor-relative transforms, uploaded once.
The vertex stage subtracts the per-anchor eye position (hi/lo) and applies the
per-anchor rotation to the small camera-relative vector. This is today's
scheme, with an eye per anchor instead of one per view.

- **Precision rule:** nothing large is ever rotated in float32.
- **Cost rule:** per-view work grows with the number of anchors (a handful),
  not the number of draws or tiles.
- **Without the frames module,** every anchor's placement is the identity, so
  render space is whatever the application uses (Earth-fixed in practice), and
  today's behaviour is unchanged.

A view's render root is a choice of frame, made by whoever drives the view
(the frames module, or the application). Changing it between frames is
re-rooting: the camera pose is re-expressed in the new root, and nothing on
screen moves, because the root is rigid and the scheme is camera-relative. Only
a per-vertex placement (design view, section 13) depends on which root is
chosen.

### 7.4 A draw's placement

A placement is one of:

- **Affine:** a float64 4×4, as today's transforms.
- **Per vertex:** an affine part, plus a per-vertex term from a closed set the
  engine implements in Slang:
  - **dual position:** a second position attribute, blended by a parameter
    `t`. The core takes the attribute as given. It does not pair tilesets
    or read glTF morph targets in plan 5 **(author's call)**. 4b's paired
    tilesets are paired by the design globe itself, which supplies the
    partner positions as the attribute, as it does today; a declared
    pairing is a candidate upstream proposal, not plan 5's. `t` may be any
    finite number, so values past 1 extrapolate, which keeps the design
    globe's "exaggerate the error" control. Only at `t = 0` or `t = 1` does a
    pick give content coordinates;
  - **fitted operation:** a coordinate operation fitted over one tile, as an
    affine map plus a low-order polynomial in tile-local coordinates, with a
    stated error bound in metres. 5f uses it to lay the globe's tiles flat in
    a design CRS.
- **A blend of two placements** by `t`, for morphs (5f), driven by the
  animation core (5d).

Every per-vertex kind has three parts: a Slang function with a fixed signature
(tile-local position and parameters in, a position relative to the tile's
origin in render space out), its float64 CPU twin (for picking, bounds and
culling), and its error bound. **The core never bakes a placement into vertex
buffers** (author's call). That keeps the GPU tessellation engine's seam open
(section 8.4).

Bounds and culling use the placement. A per-vertex placement states how far it
can move a vertex from the affine part's result, and the tile's bounding volume
grows by that amount.

### 7.5 The frames module

**Packaging** **(author's call; section 17, question 2, asks whether the owner wants
separate packages instead):** entry points of the one package, not separate
packages:

- `@cesium/next`: the core (World, View, Camera, Engine, tilesets, globe,
  vector, controllers, animation);
- `@cesium/next/frames`: the tree, the catalog, providers, trajectories, rigs'
  frame resolution;
- `@cesium/next/proj`: the PROJ coordinate service (lazy, as today);
- `@cesium/next/measure`: measurement (5i settles its tool seam).

**The dependency rule:** the core imports nothing from `frames`, `proj` or
`measure`. `frames` imports core types only (`Body`, `Ellipsoid`, the math
module). `measure` imports `frames`. An import-graph test enforces it, and
`src/frames/frames.ts`'s import of `src/measure/constants.ts` moves to a
neutral module (carried forward from plan 3).

**The resolver.** The core exposes one hook, run per view before it renders,
with the tick's time. The frames module registers there. For each anchor bound
to a frame, it sets the anchor's placement into the view's render root at the
tick's `Instant`. It also hands the core the sky inputs the core used to get
from the Viewer (the sun's direction, the celestial rotation, the Moon's
placement), so they come through the same seam. An application without the
module sets anchors and sky inputs itself, or leaves them at their defaults.

**Providers on demand.** Each catalog frame names its provider:

| Frame | Provider | Loads |
| --- | --- | --- |
| ITRF (ellipsoid only) | built in | nothing |
| GCRF, EME2000, EARTH_ICRF | Earth orientation | the ERFA series; EOP for precision |
| HCRS, MOON_ICRF, the Sun | ephemeris | DE440 packs; the analytic series as a declared stand-in |
| MOON_ME, MOON_PA | lunar orientation | the lunar PCK pack |
| an engineering frame | coordinate service | PROJ and its grids |
| a trajectory | trajectory | its OEM or SPK |

Asking for a frame states the precision wanted: `"analytic"` or `"precise"`
**(the names are the builder's)**. A frame runs at the highest precision anyone
has asked for. While its precise data loads, it runs on its declared stand-in
if it has one, stating the stand-in's accuracy, and its revision goes up when
the data arrives. Without a stand-in, a query on it throws a named error until
the data loads (plan 2 R3: frames throw, rendering falls back). Loading is
async and cancellable (`AbortSignal`); queries stay synchronous.

**The sky in a globe-only app** asks for GCRF and the Sun at `"analytic"`. That
means today's analytic sky, unchanged: `icrfToFixed`'s IAU 1976 precession
with sidereal time and no nutation (`src/time/celestial.ts`), and the Meeus
sun and Moon. It loads no series tables and no data. It is GCRF's declared
stand-in, stating its accuracy: 0.0023° (about 8″) from the IAU 2006/2000A
model, as plan 1 measured. The IAU 2006/2000A series (about 100 KB) load only
when someone asks for `"precise"`. So a globe-only Viewer downloads nothing new,
its stars and sun are unchanged against the parity pages, and R10's default
(the Viewer keeps the analytic sky unless `frameData` is given) holds.
(Answered from the code after the builder check.)

**The catalog and the tree in use.** The catalog answers "what frames exist"
without loading anything. The tree in use answers "what does this scene touch",
with each frame marked by who uses it (the application, the renderer's sky,
measurement). The explorer's tree diagram draws from it.

### 7.6 Frame revisions

- Each frame has a `revision` that goes up when its placement's inputs change:
  a joint angle, a newly loaded kernel, a new EOP table, a revised accuracy.
  Time alone is not a revision. Time-dependent frames are keyed by the
  instant.
- A frame whose matrix depends on state calls `invalidate()` when the state
  changes. It can then stay cached, keyed by (instant, revision). `cache:
  false` stays for compatibility **(author's call)**.
- A route's revision combines the revisions along it, so a consumer (a label,
  an overlay, a statement, a diagram) keys its work on the route and skips it
  when nothing moved.
- **The renderer counts as a consumer.** On-demand rendering redraws when a
  revision on a route an anchor uses goes up.
- An edge whose accuracy drifts with time publishes a new value only when it
  changes by more than a stated fraction (author's call: 1% of the figure, or
  1 mm, whichever is larger).

### 7.7 Frame-tagged picking and the coordinate service

- **Picking.** The core's pick returns a render-space position, the view, the
  anchor, the draw and the feature. A **pick interpreter**, an interface the
  frames module implements, turns that into a frame-tagged point: the body, the
  body-fixed position, the design coordinates where the content has an
  engineering frame, and the composed accuracy. This closes plan 3 R8.
  `pickDesign` and `pickInFrame` (4b) are rebuilt on it.
- **The coordinate service** is an interface: forward and inverse between a
  design CRS and the body's geodetic coordinates, grid factors, the recorded
  operation, and its accuracy. `EngineeringFrame` is built on it, and PROJ is
  the one implementation shipped. A host can supply its own.
- **The third placement mode** **(name: author's call)**, `hosted`: the
  producer or host reprojected the content, and the engine does not reproduce
  the operation. The content is placed as delivered. Design coordinates come
  only from the host's coordinate service, and a pick on such content without
  one reports true values only. This follows the frames spec's rule: the
  engine never guesses a placement mode.

### 7.8 Carried-forward items 5a closes

- The Viewer imports `skyState` and `loadFrameData` with a dynamic `import()`,
  so the ERFA tables (about 100 KB) and the pack readers leave the main
  bundle. A build test checks they're absent from the main chunk.
- `FrameData.warnings` (an expired leap-second table, an EOP table that ends
  before now) show in the Viewer and the bench Explorer.
- A unit test for the Viewer's `frameData` option: a URL or an object, data
  arriving late, a failed load with one warning.
- `skyState`'s IAU 2006/2000A series (X, Y, s) are cached over a short
  interval (author's call: 60 s of TT, where the series change by far less than
  their stated accuracy).
- `loadFrameData` takes an `AbortSignal`.
- `readWithProgress` caps its preallocation (author's call: it trusts a
  `Content-Length` up to 64 MB, and grows its buffer beyond that).
- **One ENU convention:** up at the foot, along the ellipsoid's geodetic
  normal, as body frames already do. `eastNorthUpFrame` changes to match
  (about 0.13 µrad at 250 m), with a note in its doc comment **(author's
  call)**.
- The stress context's `frames` getter becomes enumerable.

### 7.9 Done when

- Every parity page and gate passes, and a globe-only scene's pixels are
  unchanged.
- The import-boundary test passes, and a globe-only Viewer bundle measures
  smaller by the ERFA tables.
- The frames explorer, the design globe and the realtime-tracks example run on
  the new seam. The design globe's morph uses the core's dual-position
  placement, and its custom morph shader is gone. Its pairing of the two
  tilesets stays in the example.
- A test application with the frames module left out draws a scene.
- The surface-map tool for 5i is in place (section 15.2), and every later
  sub-plan shows its surface diff.

## 8. Sub-plan 5a, continued: the seam for later tessellation

### 8.1 The owner's input

"Rendering B-reps (trimmed NURBS and other analytic surfaces from CAD) needs
view-dependent tessellation too." One GPU engine should, later, serve
reprojected models and B-reps: evaluate patches and the draw's placement
together in compute, subdivide by screen-space error, handle trim curves, and
draw indirectly. "Plan 5 only keeps the seam open."

### 8.2 What 5a must not preclude

- A placement is **data plus a Slang function**, not code inside one shader.
  A compute pass can evaluate it at sample points the content never had.
- Each per-vertex kind states an **error bound** and enough about its local
  behaviour (author's call: a bound on its second derivative over the tile) for
  a subdivider to choose a sampling rate by screen-space error.
- The frames module answers, **per draw and per view, which placement applies
  and why** (the coordinate operation and its accuracy), as a query, not only
  as something it pushes into the core.
- Draw records can point at **indirect draw arguments,** so a later compute
  pass can write the counts.

### 8.3 What 5a does not do

No subdivision of any kind. Section 13.4 says how plan 5 treats reprojected
models it didn't generate.

### 8.4 The seam, in one sentence

Per-vertex placement and the frames module's per-draw placement query are
what the tessellation engine will consume.

## 9. Sub-plan 5b: the frames library

### 9.1 Two-vector dynamic frames

The owner: every orientation choice for a rig is a frame in the tree, "built
with SPICE's two-vector dynamic frames (a primary axis along one vector, a
secondary toward another, re-evaluated over time)", and "two-vector frames are
a frame-tree feature in their own right (antenna pointing, sun-relative
frames), not just a camera one".

- **Vector definitions,** after SPICE's: the position of a target from an
  observer, the velocity of a target from an observer in a stated frame, a
  constant vector in a stated frame, and the near point on a body's ellipsoid.
- **Axis assignments:** the primary along ±X, ±Y or ±Z, the secondary in the
  plane of the primary and that axis.
- **Freezing:** a frame evaluated once at a stated instant and kept constant
  (SPICE's freeze epoch). A stars-fixed camera is GCRF-frozen at the moment the
  rig attaches.
- **Velocities** come from central differences, as plan 3 R3.
- **Degenerate cases** (the two vectors nearly parallel) throw a named error
  below a stated angle **(author's call: 1 mrad, SPICE's default)**.
- **Validation:** against SPICE (spiceypy, run offline, as the other fixtures),
  for an orbital frame on Orion and an Earth–Moon rotating frame.

### 9.2 Accuracy beyond first order

The owner: "Seems easy for a user to screw up." The app declares each edge's
error in its own terms, and the library composes it. 5b builds the rest of
§13.14's list:

- **Confidence is declared, and never mixed silently.** Each edge says whether
  it gives 1σ, a 95% bound or a hard maximum. The composer converts where a
  distribution is stated, and refuses otherwise, saying why.
- **Correlated terms.** An edge declares a shared error source (author's call:
  a source id string). Terms with the same id add linearly. Others add
  root-sum-square.
- **Per-direction error.** Full covariance through each edge's Jacobian gives
  an error ellipsoid at the point.
- **A stated rotation axis** on an angular term, so its lever is the distance
  to that axis (UT1's is the distance from the spin axis), not from the origin.
- **Time-varying accuracy.** The query takes the instant, and the breakdown
  says when a term is a prediction.
- **Terms on no edge** (light time, relativity) get a home on the route.
- **A trajectory's covariance** becomes its frame's accuracy (Orion's).
- **MOON_ME states an orientation accuracy.** Until a published figure is
  found, it is the explorer's estimate, 3 × 10⁻⁷ rad, labelled "estimated".
- **`accuracyOf` is rebuilt on `pointAccuracy`.** The explorer's catalog
  numbers may move only where a bound tightens, and a test lists each move.

### 9.3 Rays through the frame tree

From §13.14 "Ray queries through the frame tree", on the CPU paths that exist:

- A ray is given in any frame at an instant, and is carried to each target's
  frame. A query states whether it is geometric or light-time corrected.
- **Targets in plan 5:** body ellipsoids, the globe's terrain (`castTerrainRay`),
  and a tileset's retained geometry (needed for the Moon's terrain, which is a
  tileset, not a globe).
- Hits are float64, reported in the frame the caller asks for, with the
  composed accuracy of the route plus the target's own.
- Unknown stays unknown. §13.16's question 4 (clip to the body's terrain band
  before counting unloaded spans as unknown) is applied here, for the Earth and
  the Moon, because ground-to-space rays need it **(author's call)**.

### 9.4 Bulk work

The owner: "Plan 5 decides only whether the library offers them as
cancellable (`AbortSignal`), progress-reporting operations that run in a
worker or under the engine's per-frame budget." **Decided here (author's call):
yes.** One shape for every bulk operation: options with `signal` and
`onProgress`, and a promise of the result. An operation runs in a worker when
its inputs can be transferred, and otherwise in slices under the per-frame
budget. Plan 5's bulk operations:

- sampling a trajectory into a path (5g's flight path);
- accuracy statements over many samples;
- `measureSpan`, which also caches `gridFactors` by design point (carried
  forward from 4a);
- PROJ batches.

### 9.5 Carried-forward items 5b closes

- `measure` solves the downlink light time once, not twice.
- Explicit timeouts on the slow data tests (`test/data/trajectory.test.ts:147`
  and `:197`, `test/data/sky.test.ts:86`).

## 10. Sub-plan 5c: bodies in one world

### 10.1 Why

The Artemis example needs the Earth's and the Moon's tilesets drawn together,
from the Earth, from the Moon and from anywhere between. Plans 2 and 3 left
the world Earth-fixed on purpose (R6). This sub-plan re-roots it.

### 10.2 What was decided

From the frames spec §6.4 and §13.14:

- Bodies are the existing `Body` class (a name, an ellipsoid, an optional
  atmosphere). The Moon is a `Body` with no atmosphere.
- Content belongs to a body. A tileset's `3DTILES_ellipsoid` names its body,
  and its region volumes are read on that ellipsoid.
- One tile cache and one budget across bodies.
- Picks name the body.
- The globe's tiling stays Earth-only. The Moon is Cesium Moon (ion 2684829), a
  tileset.
- "When the Moon tileset is in the world, the disk is off and the tileset draws
  at every distance (its root tile far away)."
- In free flight, the view's body follows the nearest body (frames spec §6.4,
  its author's call, kept).

### 10.3 Design

- **A body is a core concept; its frame is the module's.** A body gets an
  anchor (section 7.3). The globe hangs under the Earth's anchor, and a
  tileset under its body's. Without the frames module, the Earth's anchor is
  the identity and render space is Earth-fixed, as today.
- **Earth-only code converted** (the frames spec counted about 20 places; 24
  files name `Ellipsoid.WGS84` today). Each takes its body from the content it
  serves:
  - horizon culling (`math/horizon.ts`, `Budgeted`, `Stepwise`) per body,
    with the camera expressed in that body's anchor;
  - tile volumes (`streaming/volumes.ts`) on the content's ellipsoid;
  - height clamping per body;
  - view links (`ViewLink`) and the Viewer widget;
  - picking results.
  The globe controller per body is 5d's.
- **The Moon at every distance.** Cesium Moon's root tile must be selected from
  the Earth's surface, about 384,000 km away. Its screen-space error decides
  how deep it refines, and that is enough (frames spec). The sky's Moon disk
  turns off while a Moon tileset is in the world, and the disk's texture stays
  for applications without one.
- **Cesium Moon's frame is assumed MOON_ME,** and its heights are taken as
  published, both stated in the example and each a single setting (frames spec
  §11, unchanged).
- **`View.body`** keeps working through 5c. In 5e the sky stops needing it, and
  in 5d controllers name their own body. 5i decides whether it stays as a
  convenience **(author's call)**.
- **Depth across bodies.** The engine already uses reverse-Z with an infinite
  far plane and a 32-bit float depth buffer, so the Earth and the Moon share
  one depth range. 5c tests z-fighting at the Moon's limb seen from the Earth,
  and at the Earth's limb seen from the Moon.

### 10.4 Done when

- A view with MOON_ME as its render root draws Cesium Moon near the camera and
  the Earth with terrain and imagery behind it, in the right place at the
  clock's time (checked against `frameTransform` to 1 m at the screen).
- Two views of one world, one on each body, render side by side.
- Earth-only parity is unchanged.
- A pick on the Moon reports MOON_ME coordinates, and on the Earth ITRF.

## 11. Sub-plan 5d: cameras, controllers, bindings and animation

### 11.1 Why

"Today every camera controller quietly assumes the Earth." `GlobeController`
needs a pick under the cursor, so in space the only way to start a rotation is
to grab the Earth. `InspectController` takes "up" from the ellipsoid. The
explorer's camera rig is "a stepping stone, not the design".

### 11.2 The animation core

Decided by the owner (§13.14, "animation, starting with camera
transitions"):

- **Not camera-specific.** An animation animates a value over a timeline, with
  timing (duration, delay, easing) and playback controls (play, pause, reverse,
  playback rate, a `finished` promise), after the Web Animations API.
- **Easing** is a named preset, a cubic Bézier, a spring (which keeps its
  velocity when interrupted) or a function.
- **Keyframed values** use glTF's samplers: step, linear and cubic spline.
- **Every animation chooses its clock:** "configurable between wall clock and
  scene clock for all animations".

Design **(author's calls)**:

- A wall-clock animation advances with real time. A scene-clock animation's
  time is the scene clock's: it pauses with the clock, follows its rate, and
  evaluates at the clock's time when the clock is scrubbed, backwards
  included.
- One timeline per engine, advanced in the tick before the resolver runs, so a
  frame never shows an animation one tick behind its frames.
- A running animation keeps on-demand rendering awake. A settled one doesn't.
- Values are written through a setter the animation is given. The core ships
  setters for a camera rig's parts, a placement's blend `t`, and a model
  node's transform (section 11.6).

### 11.3 The rig

Decided by the owner:

- "The rig is only a pose in a frame." It holds no rules about where the camera
  may go.
- It splits position from orientation, after Cinemachine's Body and Aim:
  - **position:** an anchor (a frame's origin, such as Orion's), an offset, and
    the frame the offset is expressed in;
  - **orientation:** a frame whose axes the camera's up and forward follow,
    or an aim (look at a target, with an up vector taken from a frame);
  - **damping,** optional, per part.
- Every orientation choice is a frame (two-vector frames, 5b). A cockpit view
  is the target's body frame. An orbital view is primary up from the central
  body, secondary along the velocity. A stars-fixed view is a constant frame
  captured in GCRF when the rig attaches. A level-horizon follow is primary the
  target's forward axis, secondary up from the central body.
- Named presets (`"cockpit"`, `"orbital"`, `"inertial"`) sit on top of the
  generic form.
- The rig's frame decides what holds still: on MOON_ME the Moon stays put; on
  GCRF the Earth turns underneath; on a trajectory the camera rides along.
- Inputs are expressed in the rig's frame: the pivot is a point in it, "up" is
  one of its axes, and heading is measured from a reference axis in it.

Design **(author's calls)**:

- **The rig lives in the core, with frames resolved through an interface.** The
  core knows one frame, render space. The frames module supplies a resolver for
  every other frame (the same seam as anchors). Without the module, a rig is a
  pose in render space, and today's controllers work unchanged.
- **Damping** is a critically damped spring per part, with a time constant in
  seconds. It runs on the wall clock, so a paused scene still settles.
- **A view's render root follows its rig:** the body frame nearest the rig's
  anchor, or the engineering frame in design view. The root is invisible
  (section 7.3), so this is about cost and per-vertex placement only.
- **Picks in the rig's frame.** The pick interpreter (section 7.7) can report a
  point in the rig's frame, so a readout of "where I clicked" can be in the
  frame the camera thinks in.

### 11.4 Controllers

Decided by the owner:

- **Controllers own the constraints.** A globe controller may keep the camera
  above a body's surface (that body's ellipsoid or terrain, so the Moon's on
  the Moon) or let it go under. Free-fly has only a range limit. Seeing
  underground (translucent terrain) is the renderer's.
- **Controllers are policies over the rig.** The globe controls are a rig on
  ITRF with the Earth's ellipsoid and grab-the-surface input. Orbit is a pivot
  plus an up axis. Free-fly joins them.
- **Free flight** (frames spec §8.2): intuitive six-axis flight, speed scaled
  by the distance to the nearest body's surface, handing over to that body's
  controls near it.
- **A CAD-style controller for design space:** orbit about the point under the
  cursor, pan, zoom to the cursor, and animated standard views (top, front,
  side, isometric). The camera API offers `fitBounds(bounds)`. What to fit is
  the application's. "Orthographic or perspective is the camera's projection,
  not the controller's." Section and clip planes are the renderer's and the
  application's.
- **Full replacement** stays possible, because a controller is an interface.

Design:

- **Every controller works on any body.** The globe controller takes a body.
  Orbit needs no pick to start: it rotates about its pivot in the rig's frame,
  so a camera in space can orbit Orion or the Moon without grabbing a surface.
- **Every constraint has an off switch,** including the minimum height, the
  collision test and pitch limits. A test turns each one off and drives the
  camera through the surface.
- **Rolled frames** **(author's call):** a controller takes "up" from the
  orientation frame's chosen axis. Free-fly has no up, with an optional
  "level" assist toward the nearest body's up.
- **The hand-over near a body** **(author's call):** below a stated height (a
  fraction of the body's radius, the builder's number), free-fly offers the
  body's globe controls through a transition, never a jump.
- **The orthographic camera** is new in the core (reverse-Z, as the
  perspective one). Picking, culling, horizon culling and screen-space error
  get orthographic forms. Tile selection's screen-space error uses the
  orthographic pixel size, which doesn't vary with distance.

### 11.5 Gestures as bindings

Decided by the owner: "Gestures are bindings, not subclasses." One gesture set
works the same on the globe and in design space by default, and a host can
change it without writing a controller:

- **actions:** a controller's named operations (orbit, pan, zoom, look, tilt,
  roll, fly forward, frame selection, the standard views), each done once by
  the controller;
- **bindings:** a plain, serializable map from input to action, such as
  `{ "drag:left": "orbit", "drag:middle": "pan", "wheel": "zoom" }`, covering
  mouse, touch and keys. A host passes a whole map or merges overrides into a
  preset;
- **presets,** after Blender's "Blender" and "Industry Compatible" keymaps:
  2.0's default, and CAD-style sets;
- **custom actions:** a host registers a function over the rig and binds it
  like any other.

Design **(author's calls)**:

- **The input grammar:** `device:gesture`, with modifiers joined by `+`:
  `drag:left`, `shift+drag:left`, `wheel`, `touch1:drag`, `touch2:pinch`,
  `touch2:drag`, `touch2:rotate`, `key:w`, `dblclick:left`. Unknown inputs
  and actions are refused at bind time, with the name.
- **An action an active controller doesn't have is skipped,** so one map can
  serve every controller. A test binds the default map to each.
- **Presets shipped:** `default` (2.0's, close to 1.x's globe controls), and
  `cad` (orbit on middle drag, pan on shift and middle drag, zoom on the wheel
  to the cursor), after the common CAD convention. More are data.

### 11.6 Transitions between rigs

Decided by the owner:

- Flights need to be configurable: "an instant jump vs a linear movement vs
  something eased in and out".
- "A camera transition is a blend between two live rigs," after Cinemachine:
  each frame evaluates the source and target rigs at the current time (so a
  moving target such as Orion is tracked throughout) and blends them by the
  eased weight in a common frame of the tree. A cut is duration 0.
- Path and timing are separate. The path is straight in the blend frame, an
  arc over the surface (1.x's `flyTo` with its maximum height), or a spline.
  The easing maps time onto it.
- **Interruption is configurable per transition,** with a default for user
  input: `stop` (the camera stays where it is, on the rig it was nearer to),
  `handover` (the transition's velocity carries into the user's drag,
  spring-style), or `finish` (input waits until the transition completes).
  Programmatic interruptions use the same policies.
- Configurable at three levels: per call, per pair of rig kinds (a table of
  defaults, such as "globe → ride-along: 3 s ease-in-out"), and app-wide.
- Flights between rigs need a defined hand-off: "interpolate in a common frame,
  then re-attach".

Design **(author's calls)**:

- **The blend frame** is the deepest common ancestor of the two rigs' position
  frames, unless the transition names one. Earth to a lunar site blends in
  ICRF; two rigs on ITRF blend in ITRF.
- **Orientation** blends by slerp in the blend frame. Field of view blends
  linearly. A switch between perspective and orthographic happens at the end
  that has it, through a field-of-view dolly (the "dolly zoom" trick), so the
  image doesn't jump.
- **The default interruption for user input is `stop`,** as 1.x's `flyTo` does.
- **At the end** the target rig becomes the camera's rig, and its controller
  takes over.
- **Per-node transforms on a placed model,** set by the application (for the
  DSN dishes' azimuth and elevation in 5g), are added to `ModelPlacement`,
  because the engine has no per-node control today. The animation core can
  drive them.

### 11.7 Done when

- Animation tests run on injected clocks, with no wall-clock flake.
- Each controller is driven by synthetic pointer, wheel, touch and key events,
  on the Earth, on the Moon and in render space without the frames module.
- A transition to a rig following Orion ends on Orion while the clock plays at
  3600×, within a pixel at the target.
- The explorer's camera rig is rebuilt on 5d's rig and controllers, and its own
  `cameraRig.ts` and `orbit.ts` shrink to configuration.

## 12. Sub-plan 5e: the physical sky and light per body

### 12.1 What the owner decided

- "The sky follows what the rig is attached to." Inside or near a body's
  atmosphere, that body's sky scattering; in orbit, black space, with the
  atmosphere drawn only as a shell on the body's limb; on the Moon, no
  atmosphere at all.
- Physically, not by blending. Every body declares its atmosphere, or none.
  Each atmosphere is evaluated from the camera's true position relative to that
  body, in the body's own frame, whatever frame the rig is attached to. What is
  seen through each is composited physically: the Moon seen through the
  Earth's air from the ground; the Earth's limb shell against a black sky from
  the Moon.
- The explorer's orbit scenes showing the Earth's sunrise colours in space are
  "a bug in how the camera's position reaches the atmosphere, not a missing
  blend".
- From §13.14 "Other bodies": the Moon lit by the sun with a regolith BRDF
  (Lommel-Seeliger or Hapke: the full Moon's flat look and its opposition
  surge, which Lambert gets wrong), plus earthshine, and seen through the
  atmosphere. "Its phase, libration and eclipses come out right with no
  special case."

### 12.2 Design

- **An atmosphere per body that has one.** The engine builds each body's
  tables (today it builds the Earth's and refuses a view of another body with
  an atmosphere). Bodies without one cost nothing.
- **The camera's place, per body.** Each frame, each atmosphere gets the
  camera's position in its body's anchor (section 7.3), not a height along the
  ellipsoid normal under a render-space camera. This is the bug's likely fix;
  the builder confirms the cause first.
- **Compositing.** Along each view ray, the atmospheres the ray crosses are
  applied in depth order: what lies behind (a surface, another body, the stars,
  the sun's disk) is attenuated by each atmosphere's transmittance, and each
  adds its in-scattered light.
- **Aerial perspective** **(author's call):** one aerial-perspective volume
  per view, for the atmosphere the camera is in or nearest. Atmospheres seen
  from outside use their sky-from-space path, as zooming out of the Earth does
  today.
- **Light per draw, from its own body.** Earth content is lit by sunlight
  through the Earth's air at its place. Moon content is lit by the unfiltered
  sun (132.5 klx at 1 au). Per-pixel sunlight takes the draw's body's radii,
  not the view's.
- **Body shadows.** The sun's disk partly or wholly hidden by a body's
  ellipsoid, analytically per pixel, so eclipses fall out.
- **Earthshine** on the Moon, from the Earth's phase and albedo
  (`atmosphere/albedo.ts`), and the Moon's light on the Earth at night, as
  today.
- **The Moon's surface reflectance** **(author's call: Hapke's model with its
  opposition surge, as a material on Cesium Moon, with Lommel-Seeliger as the
  fallback if Hapke's parameters can't be sourced)**.
- **Stars and the sun's disk** turn with the render root's rotation from ICRF,
  from any body.
- **Exposure** from day on the Earth to black space is automatic exposure's
  job, as today.

### 12.3 Done when

- Sky radiance agrees with `AtmosphereReference` at altitudes from the ground
  to 1,000 km, and from the Moon's distance, at the gate's tolerances.
- Above the atmosphere, the sky away from the Earth is black but for the stars
  and the sun. The explorer's orbit scenes no longer show sunrise colours.
- The Moon seen from the Earth's ground is attenuated by the air's
  transmittance at its elevation.
- An Earth-only globe scene's pixels are unchanged.

## 13. Sub-plan 5f: design space

### 13.1 Routing a design CRS to the tree's root

Decided by the owner (§13.14, "routing a design CRS into the frame tree"):

- **Route to the frame tree's own root, not to WGS 84.** Relate a design CRS
  to ITRF2020 at the frame's epoch, through the published transformation for
  its datum (for NAD83(2011), NGS's 14-parameter Helmert to ITRF2020; check
  that `proj.db` carries it).
- **Reasonable defaults, decided by the engine.** Per height system, prefer the
  current geoid model (GEOID18 for NAVD88). Per horizontal datum, prefer the
  published, time-dependent route to ITRF. Rank by stated accuracy only among
  candidates that agree on those. "The defaults should be data (a small table
  the engine ships, with sources), not code paths."
- **Explicitly configurable through the API.** An application can name the
  geoid model, the datum route or a whole pinned pipeline per frame, and read
  back which route was taken and why (`RecordedOperation`, and the skipped
  candidates with their reasons).

Design:

- **The tree's ITRF is ITRF2020** **(author's call).** The frames spec treated
  ITRF as WGS84 (they agree to centimetres). Naming the realization lets a route
  end there. WGS84 (G2296) stays an alias, stated as agreeing to a few
  centimetres.
- **Epochs.** A design point is related at the frame's coordinate epoch.
  Plate motion between that epoch and the scene's instant (a few centimetres a
  year) is stated as an accuracy term when it exceeds 1 cm, never ignored
  silently **(author's call)**.
- **4b's pins** (`CORRIDOR_PIPELINE`, `PHOENIX_PIPELINE`) become unnecessary
  when the defaults pick GEOID18. They stay as tests that the defaults choose
  the same operation. The explorer's `fingerprints.json` changes where routes
  change, and a test lists each change.
- **Validation:** NGS's published NAD83(2011) ↔ ITRF2020 values for CCV6
  (PID DI3564), which the explorer already uses, and the NGS data sheets the
  explorer's catalog cites.

### 13.2 Design view and the morph

Decided by the owner (§13.14, "design space and the global view, with a morph
between them"):

- In isolation, in its native design space, the render root is the engineering
  frame: design E, N and up as straight axes, in design units. Straight design
  lines draw straight. Nothing is reprojected, and picking reports design
  coordinates.
- In the global view, the same model is drawn Earth-fixed through its recorded
  operation (4b's reprojected placement).
- "A camera transition between the two morphs the content." The model goes
  from flat to fitted as the camera pulls out, and the terrain and imagery
  tiles under it start laid flat in the design CRS and curve down onto the
  globe.
- Per-vertex dual positions, or reprojection on the GPU. Terrain and imagery
  tiles need design-space positions too. PROJ per vertex is too slow, so the
  operation is fitted per tile (affine or low-order polynomial) with a stated
  error bound. The accuracy display says what the fit costs.
- The rig's frame changes from the engineering frame to the Earth-fixed one
  across the morph. Heading follows grid north at one end and true north at the
  other.

Design **(author's calls)**:

- **The blend space** is the rigid tangent frame at the design frame's anchor
  (4b's `RigidPlacement`). At `t = 0`, a draw's position is its design
  position, in metres. At `t = 1`, it is its Earth-fixed position, carried into
  that tangent frame rigidly. Both ends are in one Cartesian space, so the
  blend is a per-vertex mix. When the morph completes, the view re-roots to
  ITRF, which is invisible.
- **Per draw:**
  - design content placed rigidly: the identity at one end and the fitted
    operation at the other;
  - paired reprojected content (4b's tilesets): dual positions;
  - globe tiles: the fitted operation at the design end, the identity at the
    other.
- **Outside the CRS's area of use,** globe tiles are not drawn in design view,
  and they fade in across the morph. A State Plane zone laid over the whole
  globe means nothing.
- **During the morph a pick gives no design coordinates,** as in 4b, and the
  HUD says so. In design view, a pick on a fitted tile carries the fit's error
  bound as a term.
- **The morph is a transition:** one animation drives the rig blend and the
  placement blend `t`, with the CAD-style controller at the design end and the
  globe controller at the other.
- **The design globe gains design view and the morph,** as 5f's testable
  result. Its placement morph (rigid against reprojected) stays.

### 13.3 The GPU snap pass

Decided by the owner: mirror 1.x. `Scene#snap` is a client-side GPU snapping
pass: an offscreen pick render into an RGBA32F target whose pixels carry the
pick ID, an edge flag and eye-space depth (`Snapping.js`,
`SnapFramebuffer.js`). The server side (`SnapService`, `IonSnapService`)
refines against the source design data. Plan 5 replaces 4b's CPU stand-in with
the GPU pass, "which handles occlusion and cost by construction", and keeps
the split: the client side is the core's, the server side a service any host
can supply.

Design:

- Within the snap aperture (CSS pixels), the pass finds vertices, then edges,
  then surface, with occlusion from the depth it renders.
- **No retained CPU geometry is needed** for client snapping
  (`retainGeometry` stays for other uses). The pass writes enough to place
  the snapped point camera-relative in float32 (author's call: the snapped
  position itself, camera-relative, about 0.06 mm at 1 km), and the CPU adds
  the eye in float64.
- Results keep 4b's shape (`SnapResult`, with `shownPoint`), and each states
  its tolerance.
- **Validation:** on the corridor, GPU snaps agree with the CPU stand-in
  within the stated tolerance, over a grid of cursor positions.

### 13.4 Reprojected models the engine didn't generate

The owner's options (§13.14, "tessellating reprojected models"): compute
subdivision with indirect draws; per-vertex placement in the vertex shader
carrying design coordinates; refinement by screen-space error in tile
selection; or requiring producers to subdivide, with the rule stated in
`BENTLEY_engineering_frame`. The first is now the later tessellation engine
(section 8). A flat face of edge d sags below the curved Earth by about
d²/8R at its middle: 2 cm for 1 km, 2 m for 10 km.

**Plan 5's treatment (author's call; section 17, question 4):**

- **State the rule.** `BENTLEY_engineering_frame` gains a declared chord
  tolerance: the largest sag the producer allowed, in metres. 4b's generator
  writes it (it already subdivides to the tile's geometric error).
- **Measure what wasn't declared.** For a reprojected tile that declares
  nothing, the decoder computes its largest face's sag in the worker and
  states it as the tile's display error. Picks and snaps on it carry it as an
  accuracy term.
- **No engine subdivision in plan 5.**

### 13.5 Done when

- The design globe opens a site in design view, morphs to the global view and
  back, and its picks agree with 4b's at both ends.
- Routes for 4b's portfolio match their published references, and the explorer
  changes are listed.
- GPU snaps agree with the CPU stand-in.

## 14. Sub-plan 5g: Earth to Moon: Artemis II

### 14.1 What the frames spec decided

The frames spec §8.2 stands: the data, the timeline from 2026-04-02 01:58 UTC
(after the upper stage separated) to 2026-04-10 23:53 UTC (entry interface),
the follow and free-flight cameras and their presets, the flight path in a
chosen frame, readouts in four frames, the communications overlay with every
quantity marked published, computed or assumed, and the models. 5g builds all
of it except the effects and the phases outside the data, which are 5h's.

### 14.2 Design

- **A new gallery example,** `examples/earth-to-moon/`, on the public API only
  **(author's call)**. It opens with a story and a short tour that can be left
  at any point for free exploration, as the design globe does. Its story is
  the owner's (section 17, question 3).
- **Data, from setup into the store:** the Artemis II OEM (primary, plan 2 R9)
  and SPK; DE440 and the lunar PCK; EOP; NAIF's DSN station SPK; the DSN
  810-005 figures and masks; LRO (NAIF id −85) from JPL Horizons, fetched by
  setup and self-hosted as an excerpt; the archived DSN Now readings (plan 3's
  22 rows). Cesium World Terrain, imagery and Cesium Moon stream from ion with
  the user's token.
- **The hypothetical lunar south-pole antenna** in its own site grid (IAU 2015
  south polar stereographic, as 4a's Moon case), labelled hypothetical. A
  hypothetical relay may be added, labelled the same way.
- **Cameras:** the presets from §8.2 (departure after the TLI burn, the far-side
  flyby, Earthset over the lunar horizon, the loss of signal behind the Moon,
  closest approach, a DSN dish slewing to track Orion near a handover, and
  entry), each a rig and a transition. "Follow" is an orbit rig on Orion.
  Free flight is 5d's free-fly.
- **The flight path,** sampled as a bulk operation (5b), drawn in a chosen
  frame. **The "figure-eight" needs the Earth–Moon rotating frame** **(author's
  call):** the frames spec says "the Earth's: the figure-eight", but in GCRF
  the path is a loop, not a figure-eight. The figure-eight shows in an
  Earth-centred frame with x toward the Moon and the Moon's orbit in the xy
  plane, which is a two-vector frame (5b). The path offers GCRF, ITRF, MOON_ME
  and that rotating frame.
- **Readouts** for Orion and a picked point in ITRF, MOON_ME, GCRF and a
  Sun-centred frame (ICRF axes at the Sun), each with its accuracy.
- **The communications overlay,** as §8.2 lists it, on `measure`: the DSN
  links while they exist, range, light time, range rate, Doppler at 2216.5 MHz,
  free-space path loss, and received power, G/T, C/N0, Eb/N0 and margin from
  DSN 810-005's ground figures and assumed Orion figures (EIRP about 15 dBW,
  labelled assumed). Visibility windows and handovers against each station's
  masks. The data rate as observed, and the O2O laser demo as an annotation.
- **The Moon's occultation,** checked two ways: against the published
  22:44–23:25 UTC on April 6 (plan 3 R10's ±2 min), and against a SPICE
  `gfoclt` fixture for DSS-43, generated offline, to under a second (carried
  forward from plan 3).
- **DSN Now** readings are plotted as observed points and called a sanity
  check (about 30%), not a validation (plan 3's finding).
- **The lunar antenna's view of the Earth.** At the south pole the Earth sits
  near the horizon, so the Moon's terrain decides the line of sight. 5g traces
  it with 5b's CPU rays against Cesium Moon's retained geometry, and says
  "can't tell" inside the terrain's error, as the explorer does for the Earth.
  Section 17, question 1, asks whether the owner wants more.
- **Dish models** (NASA's DSN 34 m and 70 m GLBs) track Orion in azimuth and
  elevation from the apparent directions, through 5d's per-node transforms. If
  a model has no separate azimuth and elevation nodes, setup splits it
  **(author's call)**.
- **Orion** from the CC-BY Sketchfab model, which the owner downloads (it needs
  a login) and which is credited; NASA's crew-module mesh is the fallback. The
  ICPS is modelled simply.
- **Lines and labels** use what the engine has when 5g is built. The wide-line
  material and GPU labels are carried forward as renderer work, not 5g's.
- **A design pass:** a UX review on the most capable model against the story,
  then the owner's review in context (the design globe's process).

### 14.3 Done when

- The occultation agrees with `gfoclt` to under a second, and with the
  published minutes to ±2 min.
- Every quantity in the overlay shows whether it is published, computed or
  assumed, and an accuracy where one applies.
- The browser checks pass: both themes, 1440 px and 380 px, keyboard-only use,
  reduced motion, the console, and the token search.

## 15. Sub-plans 5h and 5i

### 15.1 5h: plumes, plasma and the phases outside the data

The frames spec §8.2 stands:

- The builder first searches for published data: an ICPS trajectory, a descent
  or splashdown trajectory, and NASA's airborne entry imagery. Where none
  exists, the phases outside the data (the RL10 burns before separation, the
  service module's break-up, the descent and its re-entry plasma) are modelled
  simply from published milestones and labelled illustrative. They are kept
  apart from the exact data and excluded from measurements' accuracy claims.
- Effects are physical by default, with a stated exaggeration control for the
  presets: plumes on proxy geometry with a vacuum expansion density model
  (checked against Simons 1972); the RL10 nearly invisible, its nozzle
  extension glowing dull red to orange; the OMS-E during TLI (5 min 49 s at
  7:49 pm EDT, April 2) a faint warm haze with puffs at ignition and shutdown;
  attitude-thruster puffs of 20 to 200 ms; re-entry plasma with a shock layer
  about 0.3 m over the heat shield, the heat shield glowing at 1,900 to
  3,000 K, the service module breaking up separately, and the six-minute
  blackout.
- Custom shaders in Slang, drawn in the existing translucency pipeline.
- The timeline gains the illustrative spans, marked as such.

5h is separate so that 5g ships without it, and so that a slip in the effects
never holds up the engine work.

### 15.2 5i: the public API review

Decided by the owner (§13.14, "A public API review", and "modules with
interfaces"):

- Two outputs: a map of today's surface, and proposed moves.
- **Promote** what examples had to build that every app will need: the accuracy
  types and their composition, `branchPath` and the tree model, app-defined
  frames with their accuracy, point placement for labels and markers, camera
  rigs and orbit controls, the stale-answer and generation patterns around
  async work.
- **Demote** what is exported only because an example reaches into it, or
  exposes internals.
- **Shape:** sync against async, `AbortSignal` wherever work can be cancelled,
  `dispose` lifetimes, events or subscriptions against polling, units and
  frames named in types, and errors that say what to do.
- **Stability tiers:** which parts are stable and which experimental, how that
  is marked, and what examples may import. Bundle size and tree-shaking follow
  from the split.
- **Measurement and tools as their own module,** open source in this
  repository: "the core provides picks, design coordinates, accuracy terms and
  the frame tree; the module provides the tools and their UI. A host
  application can use it or bring its own."
- **Snapping** keeps its client/server split.

Candidates already recorded: `LEVEL_ZERO_ERROR`; `castTerrainRay` and five
terrain tile types; production modules exporting test-only helpers;
`Trajectory.velocitySigma`; the stress context's getters; widgets exposing
their occluders instead of examples matching class names; `View.body`.

Design **(author's calls)**:

- **The map is generated, not written.** A script reads every entry point's
  exports with the TypeScript compiler API and writes a checked-in surface
  file: each export, its kind, its entry point and its tier. A test fails when
  the surface changes and the file doesn't. The script lands in 5a, so every
  sub-plan's surface diff is visible in review.
- **Tiers are TSDoc tags** (`@stable`, `@experimental`, `@internal`), with
  `@internal` stripped from the published types. Examples may import
  `@stable` and `@experimental`, never `@internal`.
- **5i proposes, the owner approves, and then 5i moves.** Each move lists what
  it breaks among the examples and the bench. The measurement tool module's
  seam is designed and its entry point made in 5i. Its tools and their UI are
  built after plan 5, unless the owner says otherwise.

### 15.3 Upstream proposals

For the owner to take to the right people (§13.14): a placement mode on the
source CRS for the 3D Tiles 2.0 draft (CesiumGS/glTF#131); alignments after IFC
4.3's `IfcAlignment`; a declared coordinate operation as WKT2; a site
transform mapped to `IfcMapConversionScaled`. Deliberately not proposed: the
geoid fallback. 5f's declared chord tolerance (section 13.4) and 5a's `hosted`
mode are candidates to add to that list **(author's call)**.

## 16. Carried-forward items, by sub-plan

Every "Plan 5" item in §13.14's carried-forward lists and results notes:

| Item | Sub-plan |
| --- | --- |
| `gfoclt` fixture for the Moon's occultation of Orion | 5g |
| Cache `skyState`'s IAU series | 5a |
| The Viewer's static `skyState` import (bundle size) | 5a |
| Surface `FrameData.warnings` | 5a |
| Unit test for the Viewer's `frameData` | 5a |
| `measureSpan` runs `gridFactors` twice per sample | 5b |
| `measure` solves the downlink light time twice (plan 4 or later) | 5b |
| `frames.ts` imports constants from `measure` (plan 4 or later) | 5a |
| `loadFrameData` takes no `AbortSignal` | 5a |
| `readWithProgress` trusts a huge `Content-Length` | 5a |
| The stress context's `frames` getter is non-enumerable | 5a |
| Explicit timeouts for slow data tests | 5b |
| A frame's revision (change) signal | 5a |
| Composed accuracy beyond 1σ, independent terms | 5b |
| `accuracyOf` on `pointAccuracy` (both entries) | 5b |
| TEME and SGP4 ("Plan 5 or a frames add-on") | Add-on after 5a (section 3) |
| A GPU viewshed | Not plan 5 unless the owner says so (section 17, question 1) |
| The Moon as a tileset | 5c |
| A near-field bounded terrain trace (§13.16) | As the GPU viewshed |
| A per-tile terrain error over open water (§13.16) | As the GPU viewshed |
| One ENU convention | 5a |
| The API review of the scenarios plan's additions | 5i |

## 17. Questions for the owner

A builder check (a fresh reader planning from this document) raised these.
Only the owner can answer them, and each changes what gets built. Each has
the default plan 5 follows if the owner says nothing.

1. **Does plan 5 take on any of §13.16's ray-query design?** Plan 5 has
   frame-aware CPU rays only (section 9.3). At the lunar south pole the Earth
   sits near the horizon, so the antenna's line of sight runs far over the
   Moon's terrain, mostly across tiles no view loaded, and will mostly read
   "can't tell". A real answer needs a bounded terrain load along the ray (the
   carried "near-field bounded terrain trace"), which is part of §13.16's open
   design. The GPU viewshed and the per-tile water error wait on the same
   design. _Why it matters:_ yes adds a sub-plan (the §13.16 brainstorm, then
   its build) before 5g's line-of-sight readouts. _Default:_ no; 5g says
   "can't tell" honestly.
2. **One package with entry points, or separate packages?** Section 7.5
   chose entry points of `@cesium/next` (`/frames`, `/proj`, `/measure`).
   _Why it matters:_ it sets 5a's first tasks (the build, the import
   boundary, where the Viewer sits) and what 5i's surface map treats as a
   unit; moving to packages after 5a redoes that work. _Default:_ entry
   points.
3. **What is the Artemis example's story?** Who it is for first (a viewer
   audience, or space and comms engineers), what the opening shot is, and
   which of §8.2's presets the tour visits. _Why it matters:_ the tour, the
   presets' transitions, the design pass and 5g's done checks hang on it, as
   the design globe's did. _Default:_ none; 5g's UI tasks wait for it, and its
   engine tasks go ahead.
4. **Reprojected models the engine didn't generate: is "state the rule and
   measure the sag" enough for plan 5?** Section 13.4 adds a declared chord
   tolerance to `BENTLEY_engineering_frame`, measures the sag of tiles that
   declare none, and does no engine subdivision until the tessellation
   engine. _Why it matters:_ the field commits the extension's shape (and
   joins the upstream proposals), and a no means either dropping the field or
   building a stopgap subdivider that the later engine replaces. _Default:_
   as section 13.4.
5. **How does the built gallery get an ion token in production?** Carried
   from the scenarios plan (`npm run build` inlines `VITE_ION_TOKEN`). The
   Artemis example can't draw without Cesium World Terrain and Cesium Moon.
   _Why it matters:_ it decides whether 5g ships in the built gallery or
   runs locally only, and whether 5g needs a token entry task. _Default:_
   local only, with the Viewer's token UI.

## 18. Assumptions and open items

- **Cesium Moon's frame is MOON_ME,** and its heights are taken as published
  (frames spec §11).
- **Orion's comms parameters** are assumed and labelled.
- **ion's terms** for an open-source demo with a user-supplied token are the
  normal Sandcastle pattern, not confirmed with Cesium.
- **The Sketchfab Orion** needs the owner to download it.
- **Published data before separation and after entry interface** is still to
  be searched for (5h).
- **The lunar reference systems** (§13.14 "Watch"): LunaNet's LRS standard,
  ILuRF2026 and a lunar height system are to be checked before 5g builds the
  lunar antenna's site grid. When one is adopted, it is added beside MOON_ME
  and MOON_PA.
- **`proj.db` carries NGS's NAD83(2011) to ITRF2020 Helmert** is to be checked
  first in 5f. If it doesn't, the route is added to the defaults table with its
  source.

## 19. Left to the builder

- Exact API names and type shapes throughout, including the anchor, placement,
  resolver, pick interpreter and coordinate service interfaces.
- How anchors are implemented, within section 7.3's precision and cost rules.
- The polynomial order and tile fit for the fitted operation, within a stated
  error bound.
- The animation core's internals, and the spring's parameterization.
- The free-fly mapping, speeds and hand-over height.
- The CAD preset's details beyond section 11.5.
- The sky's compositing shader structure, within the physical rule.
- The Artemis example's layout, timeline design and preset framing, after the
  owner's story and a design pass.
- Shader techniques for plumes and plasma, within the physical facts.
- The order of tasks inside each sub-plan, provided each leaves the engine
  working.
