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
frames spec, in §13.14, or in the review of this document's first draft. The
owner's words are quoted where they settle a point. Calls marked **(author's
call)** were made by the author of this document; each is cheap to undo unless
it says otherwise. Section 17 lists the questions only the owner can answer.

## 1. Intent

Plans 1 to 4b gave the engine a frame tree, time, ephemerides, measurement,
engineering frames, placement modes and design picking. They did not touch
how the engine draws. **Today the engine draws everything Earth-fixed:** plans
2 and 3 decided "the world is not re-rooted" (R6), so that the frames work
could land without changing the renderer. Every camera controller assumes the
Earth. The sky shows the Earth's sunrise colours in orbit. A globe-only Viewer
bundle carries the ERFA tables.

**Plan 5 drops R6.** A view renders in its camera rig's position reference
frame: on the Earth's surface that is ITRF, as today; following Orion it is
Orion's own reference frame; on the Moon it is MOON_ME; in design view it is
the engineering frame. Moving the camera between reference frames is a change
of render root, which the application never has to manage.

Plan 5 makes the engine work the way the frames spec described, across bodies,
in design space, and for applications that want none of it:

- **One flat render space in the core, and reference frames above it.** The
  owner: "The default frame tree that's needed for a scene is application
  dependent and we don't need to load up a bunch of frame tree stuff for an
  app that's never going to go into space." The core draws in a Cartesian
  space with no meaning attached. An optional frames module resolves
  reference frames into it.
- **A camera chain in layers.** The renderer knows render space; a camera
  layer holds rigs, controllers and transitions; the frames module answers
  where one reference frame is in another; the application chooses rigs and
  never sees render space (section 7.2).
- **Modules with interfaces.** The owner: "We should generally be thinking
  about how to make 2.0 more modular so pieces of it can be reused and composed
  in interesting ways and we can easily plug different module implementations
  in for places where that makes sense." The engine is also meant to be an
  embeddable rendering core whose host application supplies its own services:
  its own frame manager, coordinate conversion, snapping or measurement tools.
- **Cameras that belong to reference frames.** A camera rig is a pose in a
  reference frame, controllers are policies over it, and gestures are data.
- **A sky that is physical on every body,** evaluated from the camera's true
  place relative to each body.
- **Animation as a small, general core,** first used by camera transitions and
  the design-space morph.
- **The Artemis II example,** which exercises all of it: a replay of the
  mission from the launch pad to splashdown, with every stage on its own
  trajectory, the Earth's and the Moon's tilesets together, cameras that
  follow any stage or fly freely, a live frame-tree diagram that moves the
  camera between reference frames, readouts in several reference frames, and
  a communications overlay that shows measurement accuracy.

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
  stated accuracy of app-defined reference frames (`Frame.accuracy`,
  `pointAccuracy`), terrain line of sight (`castTerrainRay`,
  `terrainLineOfSight`).
- **Plan 4b** (done; its final review closed with `dfb12be069`): lazy grids
  against a pinned PROJ-data catalog, tileset placement modes
  (`TilesetPlacement`: rigid and reprojected), the tileset declaration
  `BENTLEY_engineering_frame` (composed with `ESRI_crs`,
  `EXT_geospatial_crs_source` and `3DTILES_ellipsoid`), `pickDesign`, the
  snapping split (`SnapService`, a CPU `ClientSnapService` over retained tile
  geometry), the design-globe example with a placement morph built in the
  example from paired tilesets, and one engine loop that sleeps when settled.
- **The design globe's feedback round** (in progress beside plan 5's start):
  Cesium World Terrain under the design globe, and a quick terrain clipping
  API (geodetic rectangles and simple polygons). Plan 5 treats the clipping
  API as existing Earth content (sections 3 and 7.4).

## 3. Goals, non-goals and anti-goals

### Goals

1. **A core that knows nothing about reference frames.** It draws in one flat
   render space, in metres, with a transform per draw and a camera pose in it.
   Precision stays camera-relative, so one core serves a site, the Earth and
   the Moon.
2. **A camera chain in layers,** each with one job and an interface to the
   next (section 7.2). A view's render space is its rig's position reference
   frame.
3. **An optional frames module,** which resolves the reference frames in use
   into each view's render space at the tick's time. An application can
   include it, leave it out, or replace it.
4. **Pay for what you use.** Providers (Earth orientation, ephemerides, PROJ,
   trajectories) load when a reference frame that needs them is first asked
   for. A globe-only Viewer loads none of them, and fetches no Moon content.
5. **Content on any body,** drawn together: the Earth's terrain and imagery,
   Cesium Moon, models on either, a spacecraft between them. Two views of one
   world may be on different bodies.
6. **Camera rigs in reference frames,** with controllers that own their
   constraints, underground as a first-class case, a CAD-style controller for
   design space, and gestures as bindings with presets.
7. **A general animation core,** with camera transitions as blends between
   live rigs.
8. **A physical sky on every body,** composited physically wherever the camera
   is.
9. **Design space and the global view, with a morph between them,** as two
   render roots.
10. **Design CRSs routed to the tree's root** (ITRF2020), with defaults as
    data and every choice configurable.
11. **GPU snapping** on the client side, keeping the client/server split.
12. **Revisions of reference frames,** so consumers and the renderer redo work
    only when something moved.
13. **Seams for later WebGPU features,** as for bindless, where they cost
    nothing today (section 7.10).
14. **The Artemis II example** (frames spec §8.2), a mission replay from the
    pad to splashdown, with its effects.
15. **A public API review:** a map of the surface and proposed moves.

### Non-goals

- **A GPU tessellation engine.** The owner wants one engine, later, for both
  reprojected models and B-reps (trimmed NURBS from CAD): patches and the
  draw's placement evaluated together in compute, subdivided by screen-space
  error, with trim curves and indirect draws. Plan 5 builds none of it. It
  keeps the seam open (section 8.4).
- **The architecture of ray queries** (§13.16: where a query runs, when
  acceleration structures are built, which level of detail a ray sees). §13.16
  is open, for its own brainstorm. Plan 5 puts every ray and spatial query
  through one query seam (section 7.10) and makes rays go through the frame
  tree on the CPU paths that exist (section 9.5). The owner, 2026-11-07:
  deferred, "since that's a whole project unto itself"; for now many ray
  queries may answer "can't tell", and a later GPU ray-query engine must pass
  up to the examples "without a ton of rewriting". Section 7.10 says how.
- **Terrain clipping's later design.** The quick API from the design globe's
  feedback round stays as it is, apart from moving under the Earth's anchor
  (section 7.4). The owner's later design (boundaries from vector tiles,
  polygons with holes, inverse clipping that keeps only the inside, and
  clipping tilesets as well as terrain) is its own brainstorm after plan 5
  **(author's call)**. Plan 5 keeps it possible: clip regions are geodetic on
  their body, evaluated in that body's anchor, so they work under any render
  root and on any body.
- **TEME and SGP4.** Listed as "Plan 5 or a frames add-on". The Artemis
  example needs neither (LRO comes from JPL Horizons). They become the first
  add-on provider once 5a's provider interface exists **(author's call)**.
- **The drawing layer's portability** (WebGPU compatibility mode, WebGL 2).
  The owner: later, after prototyping, with "no design compromises in the
  WebGPU approach while the prototype is built".
- **Adopting post-V1 WebGPU features.** Plan 5 only lays their seams (section
  7.10).
- **glTF animation playback** (skins, morph targets, animated nodes from the
  file). The animation core is shaped to drive it later. Plan 5 adds only
  per-node transforms that an application sets (section 11.5) **(author's
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
- **A globe-only application that pays for reference frames it never uses:**
  in bytes downloaded, in data fetched, in ion traffic, or in work per tick.
- **A constraint where a controller can't turn it off.** "Underground
  visualization is a first-class case, so no constraint lives anywhere a
  controller can't turn it off."
- **Naive blending of skies.** The owner: "physically correct as the camera
  transitions between frames in the same way that zooming out of earth right
  now shows the atmosphere accurately … a general system there rather than
  naive blending."
- **Effects that look like a game's while claiming to be physical** (frames
  spec, unchanged).
- **An application that has to manage render roots.** It chooses rigs; the
  root follows.

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
- **No ion tokens in the repo or in builds.** Examples get their token
  through Dyno's one token setting (`ionToken()`): a token pasted in Dyno's
  shell, then `.env.local` in development only, then ion's default
  evaluation token. Production builds never embed `.env.local`'s token
  (merged 2026-11-07, `d2cca2f34a`), so the built gallery asks the viewer to
  paste one where ion content is needed.
- **The library never adds ion content on its own.** Only the application or
  the Viewer, on the application's say-so, declares ion assets (section 10.4).
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
- **Render root:** the reference frame a view's render space is, at a tick.
  It is the view's rig's position reference frame (section 7.5): ITRF for the
  globe view, an engineering frame for design view, MOON_ME on the Moon.
- **A draw's placement:** how its content coordinates reach the render space.
  It is **affine** (a matrix) or **per vertex**.
- **Coordinate operation:** what the frames module computes a placement from
  (PROJ's and ISO 19111's term). Applying one is **reprojection**.
- "Warp" and "deformation" are not used for this ("deformation" means crustal
  motion in geodesy, as in PROJ's `defmodel`), and neither is "projection",
  which is the camera's. A map projection is called that in full.

**"Frame" is never used alone** (the owner, 2026-11-07: it gets ambiguous
between a render frame and a reference frame):

- **Reference frame:** a node of the frame tree (ITRF, GCRF, MOON_ME, an
  engineering frame, a trajectory's frame, a two-vector frame).
- **Tick:** one pass of the engine loop, which renders one image. "Per tick",
  never "per frame".
- **The rig's position reference frame** and **orientation reference frame**,
  and a transition's **blend reference frame**, are the reference frames those
  parts of a rig or transition name.
- Compounds that can't be misread keep their names: the frame tree, the frames
  module, the frames spec, the frames explorer, a two-vector frame, an
  engineering frame, a body-fixed frame, a keyframe, and code names such as
  `Frame` and `FrameData`.
- Quotations keep their own words.

And this document's own:

- **A tileset's placement mode** is 4b's declared `rigid` or `reprojected`
  (how its producer placed it). It is input to the draw's placement, not the
  same thing.
- **Anchor:** a node of the core's transform table that the camera layer
  places per view. Bodies, engineering frames and trajectories each get one
  (section 7.4).
- **Rig:** a camera pose in a reference frame (section 7.5).
- **Frame resolver:** the interface that answers where one reference frame is
  in another at a scene time (section 7.2).
- **Impostor:** a body's cheap visual stand-in for its content, drawn when
  the body is far (section 10.4). "Stand-in" alone keeps its accuracy meaning:
  an analytic model used in place of data, which states its wider accuracy.

## 6. The decomposition

Plan 5 is nine sub-plans. Each leaves the engine working and ends with
something testable on its own.

| Sub-plan | What it builds | Testable result | Needs |
| --- | --- | --- | --- |
| **5a** The core, the camera chain and the frames module | Render space; anchors; the frame resolver; rigs and the render root per view; the Earth's content under its anchor; a draw's placement; the frames module as its own entry point; providers on demand; revisions; picks tagged with their reference frame; the coordinate service; seams for later WebGPU features | Earth-only parity unchanged; a rig on GCRF draws the Earth turning; re-rooting changes no pixel; a globe-only bundle without the frames data path; the explorer and design globe on the new seam; an import-boundary test | 4b done |
| **5b** The frames library | Two-vector frames, rig presets on them, reference frames that change at an instant, accuracy beyond first order, rays through the frame tree on the CPU, bulk work with `AbortSignal` and progress, a time-display formatter | SPICE fixtures for two-vector frames; presets checked against them; continuity at each change; accuracy tests; explorer numbers move only where bounds tighten | 5a |
| **5c** Bodies in one world | A second body: content on any body, per-body culling, volumes and clamping, each body's impostor and its handover to the body's tileset, two views on two bodies | A rig on MOON_ME drawing Cesium Moon and the Earth; the Moon an impostor from the Earth's ground with no ion request; Earth parity unchanged | 5a |
| **5d** Controllers, bindings, transitions and the animation core | The animation core, controllers that own constraints, free-fly and CAD-style controllers, an orthographic camera, gestures as bindings, damping, transitions between live rigs | Controllers driven by synthetic input; transitions tracked against a moving target; deterministic animation tests | 5a; 5b for presets; 5c for per-body globe controls |
| **5e** The physical sky and light per body | An atmosphere per body, evaluated from the camera's true place, composited physically; light, shadows and earthshine per body; the Moon's surface reflectance | Sky radiance against the reference model at many altitudes; black space in orbit; the Moon through the Earth's air | 5c |
| **5f** Design space | Routing a design CRS to ITRF2020, design view as a render root, the morph as one transition, the GPU snap pass, the rule for reprojected models | The design globe in design view and morphing; GPU snaps agree with the CPU stand-in; routes match NGS's published values | Routing: 4b only. The rest: 5a, 5d |
| **5g** Earth to Moon: the Artemis II replay | The replay over the trajectory data: the pad scene, the mission clock, the self-directing replay, stage reference frames, the live frame-tree widget, cameras, the communications overlay, the models | The published occultation against SPICE; DSN Now as a sanity check; the directors on an injected clock; browser checks | 5b, 5c, 5d, 5e |
| **5h** The simulated ascent and entry, and their effects | Stage trajectories before the data (the ascent from the pad, each stage's own path) and after it (entry, parachutes, splashdown); plumes with ambient pressure, re-entry heating and plasma; approximations of launch smoke and the splash | The hand-offs to the data continuous in position and velocity; event times match the published ones; visual review against the physical facts; labels and exclusions | 5g |
| **5i** The public API review | A map of the surface, stability tiers, the measurement module's seam, an audit of the WebGPU seams, proposed moves | The surface map checked in CI; moves the owner approves | Last; its map tool lands in 5a |

**Order** **(author's call)**:

```text
4b ─► 5a ─┬─► 5b ──────────────┐
          ├─► 5c ─┬─► 5e ──────┼─► 5g ─► 5h
          │       └─► 5d ◄─────┘    ▲
          │           (5d needs 5b) │
          └─► 5f (morph after 5d) ──┘ (5f and 5g may run side by side)
5f's routing may start as soon as 4b is done.
5d's animation core needs only 5a's clock interface and may start with 5a.
5i runs last; its surface map is built in 5a's first task.
```

The critical path is 4b, 5a, 5c, 5e, 5g, 5h. 5d runs beside 5e. 5a is the
largest sub-plan, because the rig and the render root are what every later
sub-plan stands on. Section 16 places every carried-forward item in a
sub-plan.

## 7. Sub-plan 5a: the core, the camera chain and the frames module

### 7.1 Why

Everything else in plan 5 hangs on this seam. Without it, a Moon view, design
view and per-body cameras would each be special cases inside an Earth-fixed
core. The rig belongs here, not in 5d, because 5c's Moon view needs a camera
on MOON_ME, and because the render root is defined by the rig.

### 7.2 The layers of the camera chain

Decided by the owner (2026-11-07, in review of the first draft). Each layer
owns one thing and reaches the next through an interface:

| Layer | Owns | Knows nothing about |
| --- | --- | --- |
| **GPU renderer** | Camera-relative shaders: an eye position (hi/lo) and a rotation per anchor | Reference frames, rigs, time |
| **Scene core** (World, View, Camera) | Render space; the camera's pose and projection in it; the transform table; anchors; each draw's placement | What render space means |
| **Camera layer** (in the core package) | Rigs, controllers and their constraints, gesture bindings, transitions. Each tick it decides each view's render root | Which library answers its questions about reference frames |
| **Animation core** (in the core package) | Values over a timeline, easing, playback, a wall-clock or scene-clock choice per animation | Cameras, reference frames, `Instant` |
| **Frame resolver** (an interface) | "Where is reference frame A in reference frame B at this scene time, and how fast is it moving?" | Who asks |
| **Frames module** (optional) | Implements the resolver over the frame tree, two-vector frames included; binds anchors to reference frames; computes per-vertex placements for a given render root | Cameras, controllers |
| **Viewer** | Defaults: a rig on ITRF, globe controls, the default gestures, an ellipsoid-only Earth, the Moon as an impostor | — |
| **Application or host** | Which rig and controller, presets, what "zoom to fit" fits, tours, which content it declares. It may bring its own resolver | Render space |

**The rule: a view's render space is its rig's position reference frame,**
or the blend reference frame while a transition runs. Each tick, the camera
layer, for each view:

1. picks the render root: the rig's position reference frame, or the running
   transition's blend reference frame;
2. evaluates the rig in that root, which gives the camera's pose in render
   space;
3. asks the frame resolver where each anchor is relative to the root, and
   asks the frames module for the per-vertex placements that depend on the
   root.

**Without the frames module,** the resolver is the core's own transform
table: its nodes and anchors are the only reference frames, so a rig can still
follow a moving node. A rig on render space, with every anchor at the
identity, is exactly today's behaviour.

**What "invisible" means.** Re-rooting is invisible to the application. It
chooses the rig's reference frame, and that choice is visible, because it
decides what holds still: on MOON_ME the Moon stays put; on GCRF the Earth
turns underneath; on a trajectory the camera rides along. The root that
follows from it never changes pixels for content placed rigidly. Below the
application, the root is real:

- **Per-vertex placements depend on it.** Design view works because the CAD
  rig is in the engineering frame, so straight design lines draw straight.
- **Picks come back in it.** A pick in the camera's own reference frame costs
  nothing.
- **The sky gets the camera's position per body through it** (section 12.2).
- **Anything that compares across ticks works per anchor:** on-demand
  wake-up, label placement, cached screen positions, and later motion vectors
  or temporal accumulation. With a rig on GCRF, the whole Earth moves in
  render space every tick while the clock runs, so nothing may assume that
  content standing still in its anchor stands still in render space.

**Two-vector frames are just reference frames** a rig names (section 9.1).
The camera layer can't tell them from any other. Presets such as "orbital"
and "cockpit" are rig data on top (section 9.2).

**Animation in the same layers.** The animation core is generic: it animates
a value through a setter its caller gives it, and it knows no reference
frames. It gets the scene clock through a small clock interface (the scene
time in seconds, the rate, whether it is paused, and whether time just
jumped or runs backward), not through `Instant`, so the core never depends on
the time library. A camera transition is the camera layer's, built on the
animation core: its setter evaluates both live rigs through the resolver at
the current scene time, blends them in the blend reference frame, and makes
that reference frame the view's root while it runs. At the end, the target
rig's position reference frame becomes the root and its controller takes
over. The owner's "interpolate in a common frame, then re-attach" is exactly
that change of root. Interruption policies are the camera layer's, because
they need the controller's input. Path shapes are the transition's. Easing
and clocks are the animation core's (section 11).

### 7.3 What the owner decided

- "The rendering core knows one flat space and nothing about frames: a
  Cartesian render space in metres with no meaning attached, a transform per
  draw, and a camera pose in it." The core's only reference-frame-adjacent
  feature is that a draw has a placement, affine or per vertex. Without the
  frames module, a draw's transform is a matrix the application sets.
- The frames module is optional and sits above the core. At each tick's time
  it resolves every reference frame in use into the render space and hands the
  core each draw's placement. The render space is the view's render root.
  "Design view is not a special mode, and the design-space morph blends two
  render roots."
- **Render roots are per view** (approved by the owner with the split,
  2026-11-07). Two views of one world can be on different bodies (frames spec
  §6.4). **The render root is the rig's position reference frame** (the
  layering above).
- Reference frames are built on demand. Providers load when a reference frame
  that needs them is first asked for. "Whoever asks chooses the precision."
- The Viewer picks defaults: for a globe app, a rig on ITRF (so ITRF is the
  render root), the ellipsoid Earth, nothing else. Lower-level applications
  choose for themselves, or leave the module out.
- Frame management is its own module, behind interfaces to the drawing code,
  so an application can include it, leave it out or replace it (for example
  with a frame manager not built on PROJ). Coordinate conversion is a service
  the module supplies, and PROJ is one implementation. Picking reports
  positions tagged with their reference frame through an interface the module
  fills in.
- Placement takes a third mode beside rigid and reprojected: content that
  arrives already reprojected by its producer or host.
- The catalog and the tree in use are separate. The catalog is every
  reference frame the library knows by name and costs nothing until used. The
  tree in use is the reference frames a scene touches plus their ancestors.
  "The renderer's own use counts as use": the sky's GCRF and the Moon's
  MOON_ICRF and MOON_ME are shown as "used by the sky". The root stays ICRF.
- A stand-in model declares its accuracy. A reference frame may work on an
  analytic stand-in before its data arrives, but the edge then states the
  stand-in's wider accuracy and visibly changes when the data loads.
  Otherwise the reference frame is unavailable until its data loads. "Choose
  per frame, never silently."
- Change tracking: "Each frame carries a revision, which goes up when its
  placement's inputs change." The tree and single queries stay synchronous.
  Time-dependent values (an accuracy that drifts with time) publish only when
  they change by a visible amount.

### 7.4 Anchors

The core keeps its transform table (`World.addTransform`, parent × local in
float64), with one addition: a top-level transform can be an **anchor**. An
anchor's placement in render space is set per view, each tick, by the camera
layer (from the resolver). Bodies, engineering frames and trajectories each
get an anchor, and content hangs under them. A draw that hangs under no
anchor is in render space directly, as every draw is today.

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
  not the number of draws or tiles. A render root that rotates (a rig on GCRF,
  or on a two-vector frame) costs only the anchors' recomputation each tick.

**The Earth's content hangs under the Earth's anchor from 5a.** The globe,
tilesets, vector content, models and the terrain clipping regions from the
design globe's feedback round all move under it, so that a rig on GCRF draws
the same Earth. Earth-only code then works with the camera expressed in the
Earth's anchor, not in render space:

- horizon culling (`math/horizon.ts`, `Budgeted`, `Stepwise`);
- tile volumes (`streaming/volumes.ts`);
- height clamping;
- terrain clipping, evaluated geodetically in the anchor's coordinates;
- view links (`ViewLink`) and the Viewer widget;
- picking results;
- the atmosphere's camera position (5e generalizes it per body);
- on-demand wake-up and label placement, compared per anchor (section 7.2).

5c generalizes each to any body. With the Earth's anchor at the identity (a
rig on ITRF), every one of them computes what it computes today.

### 7.5 The rig and the render root

Decided by the owner (§13.14, "camera rigs attached to frames"):

- "The rig is only a pose in a frame." It holds no rules about where the camera
  may go. Controllers own the constraints (section 11.3).
- It splits position from orientation, after Cinemachine's Body and Aim:
  - **position:** an anchor (a reference frame's origin, such as Orion's), an
    offset, and the reference frame the offset is expressed in, which is the
    rig's **position reference frame**;
  - **orientation:** an orientation reference frame whose axes the camera's
    up and forward follow, or an aim (look at a target, with an up vector
    taken from a reference frame);
  - **damping,** optional, per part (section 11.3).
- Every orientation choice is a reference frame (two-vector frames, section
  9.1). Named presets sit on top of the generic form (section 9.2).
- The rig's reference frame decides what holds still: on MOON_ME the Moon
  stays put; on GCRF the Earth turns underneath; on a trajectory the camera
  rides along.
- Inputs are expressed in the rig's reference frame: the pivot is a point in
  it, "up" is one of its axes, and heading is measured from a reference axis
  in it.

Design:

- **The rig lives in the camera layer** and resolves every reference frame
  through the frame resolver (section 7.2). Without the frames module, a rig
  is a pose in render space or on a node of the transform table, and today's
  controllers work unchanged.
- **The render root is the rig's position reference frame** (owner, with the
  layering). Changing a rig's position reference frame is re-rooting: the
  camera pose is re-expressed in the new root, and nothing placed rigidly
  moves on screen. Every change of root happens in the camera layer: a
  transition starting or ending, a controller re-attaching (free flight's
  nearest body, section 11.3), or the application setting a new rig.
- **The rig is evaluated at the tick's scene time,** from the clock interface.
  The time library's clock is what turns that scene time into an `Instant`
  for the frames module's providers **(author's call)**.
- **A rig on a reference frame that moves keeps on-demand rendering awake
  while the clock runs,** because its anchors move. A paused clock lets it
  settle.
- **Picks in the rig's reference frame.** The core's picks come back in render
  space, which is the rig's position reference frame, so a readout of "where I
  clicked" in the camera's reference frame needs no conversion.
- **5a ships the rig in its generic form.** The presets, which need two-vector
  frames, come in 5b; damping, controllers beyond today's and transitions come
  in 5d. Until 5d, a rig is set directly, and today's globe controller drives a
  rig on ITRF.

### 7.6 A draw's placement

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
(section 8.4). A per-vertex placement is computed for a given render root;
when the root changes, the frames module recomputes it.

Bounds and culling use the placement. A per-vertex placement states how far it
can move a vertex from the affine part's result, and the tile's bounding volume
grows by that amount.

### 7.7 The frames module

**Packaging** **(author's call; section 17, question 2, asks whether the owner
wants separate packages instead):** entry points of the one package, not
separate packages:

- `@cesium/next`: the core (World, View, Camera, Engine, tilesets, globe,
  vector), the camera layer (rigs, controllers, bindings, transitions) and the
  animation core;
- `@cesium/next/time`: the time library: `Instant`, time scales and leap
  seconds, the scene clock (which implements the core's clock interface), and
  the time formatter (section 9.7). The owner, 2026-11-07: its own entry
  point, so a globe-only app with a timeline needs time and dates without the
  frame tree. It carries no Earth orientation series and no ephemeris data;
- `@cesium/next/frames`: the tree, the catalog, providers, trajectories and the
  frame resolver over the tree;
- `@cesium/next/proj`: the PROJ coordinate service (lazy, as today);
- `@cesium/next/measure`: measurement (5i settles its tool seam).

**The dependency rule:** the core imports nothing from `frames`, `proj` or
`measure`, and nothing from `time` (it sees time only through the clock
interface). `time` imports nothing but the math module and the clock
interface. `frames` imports `time` and core types only (`Body`, `Ellipsoid`,
the math module, the resolver and clock interfaces). `measure` imports
`frames`. The Viewer and the widgets may import `time` without `frames`. An
import-graph test enforces it, and `src/frames/frames.ts`'s import of
`src/measure/constants.ts` moves to a neutral module (carried forward from
plan 3).

**The resolver and anchor bindings.** The frames module implements the frame
resolver over the tree and binds anchors to reference frames (the Earth's
anchor to ITRF, the Moon's to MOON_ME, a trajectory's anchor to its
trajectory's reference frame). The camera layer calls it each tick, per view,
before rendering (section 7.2). It also hands the core the sky inputs the core
used to get from the Viewer (the sun's direction, the celestial rotation), so
they come through the same seam. An application without the module sets
anchors and sky inputs itself, or leaves them at their defaults.

**Providers on demand.** Each catalog reference frame names its provider:

| Reference frame | Provider | Loads |
| --- | --- | --- |
| ITRF (ellipsoid only) | built in | nothing |
| GCRF, EME2000, EARTH_ICRF | Earth orientation | the ERFA series; EOP for precision |
| HCRS, MOON_ICRF, the Sun | ephemeris | DE440 packs; the analytic series as a declared stand-in |
| MOON_ME, MOON_PA | lunar orientation | the lunar PCK pack |
| an engineering frame | coordinate service | PROJ and its grids |
| a trajectory | trajectory | its OEM or SPK |

Asking for a reference frame states the precision wanted: `"analytic"` or
`"precise"` **(the names are the builder's)**. A reference frame runs at the
highest precision anyone has asked for. While its precise data loads, it runs
on its declared stand-in if it has one, stating the stand-in's accuracy, and
its revision goes up when the data arrives. Without a stand-in, a query on it
throws a named error until the data loads (plan 2 R3: reference frames throw,
rendering falls back). Loading is async and cancellable (`AbortSignal`);
queries stay synchronous.

**The sky in a globe-only app** asks for GCRF and the Sun at `"analytic"`. That
means today's analytic sky, unchanged: `icrfToFixed`'s IAU 1976 precession
with sidereal time and no nutation (`src/time/celestial.ts`), and the Meeus
sun and Moon. It loads no series tables and no data. It is GCRF's declared
stand-in, stating its accuracy: 0.0023° (about 8″) from the IAU 2006/2000A
model, as plan 1 measured. The IAU 2006/2000A series (about 100 KB) load only
when someone asks for `"precise"`. So a globe-only Viewer downloads nothing new,
its stars and sun are unchanged against the parity pages, and R10's default
(the Viewer keeps the analytic sky unless `frameData` is given) holds.

**The catalog and the tree in use.** The catalog answers "what reference
frames exist" without loading anything. The tree in use answers "what does
this scene touch", with each reference frame marked by who uses it (the
application, the renderer's sky, a rig, measurement). The explorer's tree
diagram draws from it.

### 7.8 Revisions of reference frames

- Each reference frame has a `revision` that goes up when its placement's
  inputs change: a joint angle, a newly loaded kernel, a new EOP table, a
  revised accuracy. Time alone is not a revision. Time-dependent reference
  frames are keyed by the instant.
- A reference frame whose matrix depends on state calls `invalidate()` when
  the state changes. It can then stay cached, keyed by (instant, revision).
  `cache: false` stays for compatibility **(author's call)**.
- A route's revision combines the revisions along it, so a consumer (a label,
  an overlay, a statement, a diagram) keys its work on the route and skips it
  when nothing moved.
- **The renderer counts as a consumer.** On-demand rendering redraws when a
  revision on a route an anchor or a rig uses goes up, as well as when the
  clock moves a rig's reference frame (section 7.5).
- An edge whose accuracy drifts with time publishes a new value only when it
  changes by more than a stated fraction (author's call: 1% of the figure, or
  1 mm, whichever is larger).

### 7.9 Picks and the coordinate service

- **Picking.** The core's pick returns a render-space position (in the rig's
  position reference frame), the view, the anchor, the draw and the feature. A
  **pick interpreter**, an interface the frames module implements, turns that
  into a point tagged with its reference frame: the body, the body-fixed
  position, the design coordinates where the content has an engineering
  frame, and the composed accuracy. It can also report the point in any
  reference frame the caller names. This closes plan 3 R8. `pickDesign` and
  `pickInFrame` (4b) are rebuilt on it.
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

### 7.10 Seams for later WebGPU features

Decided by the owner (§13.14, "groundwork for post-V1 WebGPU features"):
apply the bindless pattern (§7.1: "design for it; don't build it": one seam
every caller goes through, plus a test that fails on any bypass) to the
features the WebGPU working group has tagged for after V1, so adopting them
later is a backend swap rather than a refactor. "Only where the seam costs
nothing today; no design compromises in the current WebGPU path."

5a lays the seams that plan 5's own work touches **(author's call)**:

- **One query interface for rays and spatial queries** (picking, snapping,
  line of sight, height queries, §13.16), naming its reference frame and its
  scene time. Today it runs on CPU structures or compute traversal; a
  hardware ray-query backend drops in behind it later. 5b's rays (section
  9.5) and 5f's snap pass (section 13.3) go through it. The owner deferred the
  ray-query engine itself (section 3) and asked that it later reach the
  examples without a rewrite, so the interface already has the shape a GPU
  engine needs **(author's calls)**:
  - **Asynchronous.** Every query returns its answer later (a promise, or the
    next tick's result), even where the CPU answers at once, because a GPU
    engine reads results back a tick or more later. No caller is written
    against a synchronous answer.
  - **Batched.** A query takes many rays at once (a line of sight per station,
    a viewshed's fan), so a GPU engine can dispatch them together.
  - **Standing queries.** A caller can register a query that is re-answered
    each tick, or when a revision on its route goes up, and subscribe to its
    answers. The Artemis overlay's line of sight is one: it asks the same
    question every tick.
  - **Three-way answers with reasons.** Each ray answers clear, blocked or
    can't tell, with the spans it couldn't decide, why (tiles not loaded,
    inside the terrain's error, outside the data), and the accuracy of what it
    did decide. "Can't tell" is a first-class answer, not an error.
  - **Answers that improve.** An answer carries a revision and says whether a
    better one may follow (more tiles loading, a finer engine), after 4b's
    snapping split, where a client snap is provisional until the server's
    exact one arrives. A later engine sends better answers through the same
    subscription.
  - **Only through the interface.** Examples and `measure` reach rays only
    through it, never `castTerrainRay` or a tileset's retained geometry
    directly. The bypass test enforces it, so swapping the engine changes the
    answers, not the callers.
- **Acceleration-structure lifetime** (build, refit, evict) hangs off tile
  and draw lifetime in streaming through one hook, so a per-tile bottom-level
  structure and a per-tick top-level one have a place to live. 5a adds the
  hook with no structure behind it.
- **Per-draw constants and draw-argument buffers** go through one seam each,
  so multi-draw indirect and immediates (push constants) later replace an
  emulation rather than call sites. Placements add per-draw data, so 5a routes
  it through these seams, and section 8.2's indirect draw arguments use the
  second.
- **Geometry reaches the GPU through the GPU-driven submission path only**
  (§7, M1), and the content pipeline may carry meshlet or cluster data, so a
  mesh-shader backend later replaces the compute-plus-indirect stage, not the
  content format or the callers.
- **Each seam gets a bypass test,** like `test/bindless.test.ts`.

The seams plan 5 doesn't touch (subgroup and matrix fast paths behind
capability checks, queue affinity in the job graph for async compute, 64-bit
atomics for a later visibility buffer, one registry of probed features and
limits read by every backend choice, Slang shaders organized per capability)
are audited in 5i, which lists each seam, its bypass test, and any gap.

### 7.11 Carried-forward items 5a closes

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
  normal, as body-fixed frames already do. `eastNorthUpFrame` changes to match
  (about 0.13 µrad at 250 m), with a note in its doc comment **(author's
  call)**.
- The stress context's `frames` getter becomes enumerable.

### 7.12 Done when

- Every parity page and gate passes, and a globe-only scene's pixels are
  unchanged (a rig on ITRF).
- A rig on GCRF, with the clock running, draws the Earth turning beneath a
  still star field, with the globe's culling, clamping and clipping unchanged
  against the same scene on ITRF at each instant.
- Re-rooting a view between ITRF and GCRF at a paused instant changes no
  pixel beyond the gate's tolerance.
- A test application with the frames module left out draws a scene, and a rig
  in it follows a moving node of the transform table.
- The import-boundary test passes, and a globe-only Viewer bundle measures
  smaller by the ERFA tables.
- The frames explorer, the design globe and the realtime-tracks example run on
  the new seam. The design globe's morph uses the core's dual-position
  placement, and its custom morph shader is gone. Its pairing of the two
  tilesets stays in the example.
- Each new WebGPU seam has its bypass test.
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
  and why** (the coordinate operation, the render root it was computed for, and
  its accuracy), as a query, not only as something it pushes into the core.
- Draw records can point at **indirect draw arguments** (through section
  7.10's seam), so a later compute pass can write the counts.

### 8.3 What 5a does not do

No subdivision of any kind. Section 13.4 says how plan 5 treats reprojected
models it didn't generate.

### 8.4 The seam, in one sentence

Per-vertex placement and the frames module's per-draw placement query are
what the tessellation engine will consume.

## 9. Sub-plan 5b: the frames library

### 9.1 Two-vector frames

The owner: every orientation choice for a rig is a reference frame in the
tree, "built with SPICE's two-vector dynamic frames (a primary axis along one
vector, a secondary toward another, re-evaluated over time)", and "two-vector
frames are a frame-tree feature in their own right (antenna pointing,
sun-relative frames), not just a camera one".

- **Vector definitions,** after SPICE's: the position of a target from an
  observer, the velocity of a target from an observer in a stated reference
  frame, a constant vector in a stated reference frame, and the near point on
  a body's ellipsoid.
- **Axis assignments:** the primary along ±X, ±Y or ±Z, the secondary in the
  plane of the primary and that axis.
- **Freezing:** a two-vector frame evaluated once at a stated instant and kept
  constant (SPICE's freeze epoch).
- **Velocities** come from central differences, as plan 3 R3. The resolver
  reports them, so a transition can blend a rig on a rotating two-vector frame
  smoothly.
- **Degenerate cases** (the two vectors nearly parallel) throw a named error
  below a stated angle **(author's call: 1 mrad, SPICE's default)**. A rig on
  such a reference frame keeps its last good orientation and says why, rather
  than spinning **(author's call)**.
- **Validation:** against SPICE (spiceypy, run offline, as the other fixtures),
  for an orbital frame on Orion and an Earth–Moon rotating frame.

### 9.2 Rig presets

Named presets sit on the rig's generic form (section 7.5), each a rig built
from reference frames:

- **`"cockpit"`:** the target's body-fixed frame, for both position and
  orientation.
- **`"orbital"`:** a two-vector frame with the primary up from the central
  body and the secondary along the velocity (local vertical, local
  horizontal).
- **`"inertial"`:** a two-vector frame frozen in GCRF when the rig attaches,
  so the stars hold still.
- **`"level"`:** a level-horizon follow, primary the target's forward axis,
  secondary up from the central body.

Each preset is data: an application can read it, change one part, and set
the result. A test checks each preset's axes against the SPICE fixtures.

### 9.3 Reference frames that change at an instant

The Artemis replay needs it twice (section 14): a stage rides the stack until
it separates and then flies its own path, and Orion's own path is simulated
before the data begins and after it ends. **Design (author's calls):**

- **A piecewise reference frame:** a reference frame defined by a list of
  pieces, each valid over a span of time and each a definition of its own (a
  fixed offset in a parent reference frame, a trajectory, any other kind). Its
  parent is the current piece's, so the tree's shape at an instant is the
  shape the pieces give at that instant.
- **Continuity is stated and checked.** At each change, the two pieces' states
  are compared; a change that jumps by more than a stated tolerance in
  position or velocity throws a named error when the reference frame is
  built, unless the change is declared a jump (a cut the application wants).
- **Accuracy is per piece.** A simulated piece states that it is simulated and
  makes no accuracy claim, so a measurement whose route crosses it says so
  (the frames spec's rule that illustrative phases are excluded from accuracy
  claims).
- **Revisions don't change at the switch.** The pieces are keyed by the
  instant, as any time-dependent reference frame is (section 7.8).

### 9.4 Accuracy beyond first order

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
- **A trajectory's covariance** becomes its reference frame's accuracy
  (Orion's).
- **MOON_ME states an orientation accuracy.** Until a published figure is
  found, it is the explorer's estimate, 3 × 10⁻⁷ rad, labelled "estimated".
- **`accuracyOf` is rebuilt on `pointAccuracy`.** The explorer's catalog
  numbers may move only where a bound tightens, and a test lists each move.

### 9.5 Rays through the frame tree

From §13.14 "Ray queries through the frame tree", on the CPU paths that exist,
behind section 7.10's query interface:

- A ray is given in any reference frame at an instant, and is carried to each
  target's reference frame. A query states whether it is geometric or
  light-time corrected.
- **Targets in plan 5:** body ellipsoids, the globe's terrain
  (`castTerrainRay`), a tileset's retained geometry (needed for the Moon's
  terrain, which is a tileset, not a globe), and a body's impostor (section
  10.4), which answers as its ellipsoid with its relief as the accuracy.
- Hits are float64, reported in the reference frame the caller asks for, with
  the composed accuracy of the route plus the target's own.
- Unknown stays unknown. §13.16's question 4 (clip to the body's terrain band
  before counting unloaded spans as unknown) is applied here, for the Earth and
  the Moon, because ground-to-space rays need it **(author's call)**.

### 9.6 Bulk work

The owner: "Plan 5 decides only whether the library offers them as
cancellable (`AbortSignal`), progress-reporting operations that run in a
worker or under the engine's per-frame budget." **Decided here (author's call):
yes.** One shape for every bulk operation: options with `signal` and
`onProgress`, and a promise of the result. An operation runs in a worker when
its inputs can be transferred, and otherwise in slices under the per-tick
budget. Plan 5's bulk operations:

- sampling a trajectory into a path (5g's flight path);
- accuracy statements over many samples;
- `measureSpan`, which also caches `gridFactors` by design point (carried
  forward from 4a);
- PROJ batches.

### 9.7 Showing time

The owner (design globe feedback F9): the timeline should show the time at
the site, and asked whether there is an API for it. Today `widgets/
timeControls.ts` offers `TimeZoneChoice` (`"nominal"`, `"solar"`, `"utc"`,
`"local"`, or a civil zone `{ iana }` the application gives), with the
formatting inside the widget. Design **(author's calls)**:

- **A formatter in the time library,** beside `Instant`, not in the renderer
  or the widget: it turns an `Instant` into the parts a UI shows (date, time,
  the zone's short and long names, its offset from UTC) in one of:
  - UTC, including a leap second (23:59:60, which `Intl.DateTimeFormat` can't
    show);
  - a civil zone by its IANA name, through `Intl.DateTimeFormat`, daylight
    saving included;
  - local mean solar time at a longitude, and the "nominal" zone of whole
    hours from it;
  - the computer's own zone.
- **Finding a place's civil zone is a lookup the application owns,** through
  a small interface (a position in, an IANA name out). A boundary table may be
  offered later as a lazy provider, as other providers are; plan 5 ships none
  **(author's call)**. Without a lookup, a place's time is its solar time,
  labelled so.
- `timeControls` takes the formatter, and the design globe gives each site
  its IANA zone. The Artemis example shows UTC, with mission elapsed time
  beside it.

### 9.8 Carried-forward items 5b closes

- `measure` solves the downlink light time once, not twice.
- Explicit timeouts on the slow data tests (`test/data/trajectory.test.ts:147`
  and `:197`, `test/data/sky.test.ts:86`).

### 9.9 Done when

- Two-vector frames and the presets agree with the SPICE fixtures.
- A piecewise reference frame is continuous at each change within its stated
  tolerance, throws at an undeclared jump, and draws its parent per piece.
- The accuracy tests pass, and the explorer's moves are listed.
- The formatter's tests cover a leap second, a daylight-saving change, and
  solar time at the date line.

## 10. Sub-plan 5c: bodies in one world

### 10.1 Why

The Artemis example needs the Earth's and the Moon's tilesets drawn together,
from the Earth, from the Moon and from anywhere between. 5a re-roots views and
puts the Earth's content under its anchor. 5c adds the second body.

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
  at every distance (its root tile far away)." Section 10.4 generalizes this
  into a handover between the Moon's impostor and its tileset.
- In free flight, the rig re-attaches to the nearest body's body-fixed frame
  (frames spec §6.4, its author's call, kept; section 11.3).

### 10.3 Design

- **A body is a core concept; its reference frame is the frames module's.** A
  body gets an anchor (section 7.4). The globe hangs under the Earth's anchor,
  and a tileset under its body's.
- **Earth-only code becomes per body** (the frames spec counted about 20
  places; 24 files name `Ellipsoid.WGS84` today). 5a already made each one use
  the camera in the Earth's anchor. 5c makes each take its body from the
  content it serves:
  - horizon culling per body, with the camera in that body's anchor;
  - tile volumes on the content's ellipsoid;
  - height clamping per body;
  - view links and the Viewer widget;
  - picking results.
  The globe controller per body is 5d's.
- **`View.body`** keeps working through 5c. In 5e the sky stops needing it, and
  in 5d controllers name their own body. 5i decides whether it stays as a
  convenience **(author's call)**.
- **Depth across bodies.** The engine already uses reverse-Z with an infinite
  far plane and a 32-bit float depth buffer, so the Earth and the Moon share
  one depth range. 5c tests z-fighting at the Moon's limb seen from the Earth,
  and at the Earth's limb seen from the Moon.

### 10.4 The Moon's impostor and its tileset

The owner asked how an application decides between the Moon's impostor and
its real tileset. **Design (author's calls throughout this section):** the
application doesn't decide per tick. It declares what it has, and the scene
core decides by level of detail.

Today the Moon is a ray-cast sphere in the sky pass (`moonDisk` in
`src/atmosphere/sky.slang`): MOON_ME-oriented axes, an albedo map, a
Lommel-Seeliger-like shading, and earthshine. It sits at infinity behind
everything, placed from the sky inputs.

- **An impostor is a body's coarsest level of detail.** Every body with an
  appearance (radii, an albedo map, a reflectance model) gets one. A tileset on
  that body (named by `3DTILES_ellipsoid`, or by the body option when it is
  added) refines from it by the ordinary screen-space-error rule: the impostor
  acts as the root tile's virtual parent, with a geometric error of the body's
  relief or the map's texel size, whichever is larger (for the Moon, about
  10 km of relief). From the Earth's ground the Moon stays an impostor. As the
  camera approaches, the root tile is requested when the impostor's error
  passes the threshold.
- **No hole.** The impostor keeps drawing until the tiles replacing it are
  loaded, as any parent tile does.
- **No pop.** The impostor and the tileset hang under the same anchor (one
  ephemeris, one MOON_ME orientation). Today's sky inputs can come from Meeus,
  about 10″ or some 20 km at the Moon, so the impostor stops taking them: it
  is placed by its anchor like the tileset. Both use the same reflectance
  model (5e's Hapke, or Lommel-Seeliger for both) and the same exposure, so
  the swap is an ordinary refinement.
- **Depth-correct.** The impostor moves out of the sky pass into the opaque
  pass, as a ray-cast ellipsoid that writes depth at its true distance. From
  behind the Moon (Earthset), the Moon is in front of the Earth, which a
  sky-pass disk at infinity gets wrong.
- **Picks on an impostor** hit its ellipsoid and say so, with the relief as
  the accuracy term.
- **The application can override per body:** impostor only, tileset only, or
  a bias on the error threshold.
- **The same works for any body:** the Earth seen from far away without a
  globe, and later bodies.

**The impostor and ion access to Cesium Moon:**

- **What's automatic is the handover, not getting the data.** The library
  never adds ion content or contacts ion on its own, because of the token, the
  account's access, ion usage, and the "a globe-only app pays nothing"
  anti-goal. The application or the Viewer declares the Moon's tileset. The
  Viewer offers it as an opt-in (for example `moon: "impostor" | "ion" |
  <a tileset>`; the names are the builder's), using the Viewer's ion token
  (in examples, Dyno's `ionToken()`). The Viewer's default is the impostor
  only: no token, no download.
- **Lazy all the way down.** Declaring Cesium Moon makes no request, not even
  the call to ion's asset endpoint, until the impostor's error passes the
  threshold. An application that never leaves the Earth costs no ion traffic
  and no ion usage for the Moon.
- **Failure falls back to the impostor, never a hole.** No token, an expired
  token, a token without the asset in its scope, or the asset not in the
  user's ion account (Asset Depot assets have to be added to My Assets first)
  each leave the impostor drawing and raise one warning, naming the cause and
  what to do. The ion resource layer refreshes the endpoint's short-lived
  access token, as it does for other ion assets.
- **Credits follow what's drawn.** ion's credit for Cesium Moon shows only
  while its tiles draw; the impostor's map credit shows while the impostor
  does.
- **The tileset needn't be ion.** Any tileset on the Moon body works the same,
  self-hosted included.
- The Artemis example declares Cesium Moon (section 14.5).

**Cesium Moon's reference frame is assumed MOON_ME,** and its heights are taken
as published, both stated in the example and each a single setting (frames
spec §11, unchanged).

### 10.5 Done when

- A view whose rig is on MOON_ME draws Cesium Moon near the camera and the
  Earth with terrain and imagery behind it, in the right place at the clock's
  time (checked against `frameTransform` to 1 m at the screen).
- From the Earth's ground, with Cesium Moon declared, the Moon draws as its
  impostor and the network log shows no request to ion for it. Flying toward
  the Moon, the impostor hands over to the tileset with no hole and no visible
  jump in place or brightness.
- With Cesium Moon declared and no usable token, the impostor keeps drawing
  and one warning names the cause.
- From behind the Moon, the Moon's impostor and its tileset each hide the
  Earth correctly.
- Two views of one world, one on each body, render side by side.
- Earth-only parity is unchanged.
- A pick on the Moon reports MOON_ME coordinates, and on the Earth ITRF.

## 11. Sub-plan 5d: controllers, bindings, transitions and the animation core

### 11.1 Why

"Today every camera controller quietly assumes the Earth." `GlobeController`
needs a pick under the cursor, so in space the only way to start a rotation is
to grab the Earth. `InspectController` takes "up" from the ellipsoid. The
explorer's camera rig is "a stepping stone, not the design". 5a gave every
view a rig; 5d gives the rig controllers, bindings and transitions.

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
- **It knows no reference frames** (section 7.2). Values are written through a
  setter the caller gives it, and the scene clock comes through the clock
  interface.

Design **(author's calls)**:

- A wall-clock animation advances with real time. A scene-clock animation's
  time is the scene clock's: it pauses with the clock, follows its rate, and
  evaluates at the clock's time when the clock is scrubbed, backwards
  included.
- One timeline per engine, advanced in the tick before the camera layer poses
  the views, so a tick never shows an animation one tick behind its
  reference frames.
- A running animation keeps on-demand rendering awake. A settled one doesn't.
- The core ships setters for a placement's blend `t` and a model node's
  transform (section 11.5). The camera layer's transitions are its own
  setters.

### 11.3 Controllers

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
  Orbit needs no pick to start: it rotates about its pivot in the rig's
  reference frame, so a camera in space can orbit Orion or the Moon without
  grabbing a surface.
- **Every constraint has an off switch,** including the minimum height, the
  collision test and pitch limits. A test turns each one off and drives the
  camera through the surface.
- **Free flight re-attaches** to the nearest body's body-fixed frame as it
  goes (frames spec §6.4). That is a controller policy, and a change of root
  in the camera layer: the pose is re-expressed, and nothing on screen jumps.
- **Rolled reference frames** **(author's call):** a controller takes "up"
  from the orientation reference frame's chosen axis. Free-fly has no up, with
  an optional "level" assist toward the nearest body's up.
- **The hand-over near a body** **(author's call):** below a stated height (a
  fraction of the body's radius, the builder's number), free-fly offers the
  body's globe controls through a transition, never a jump.
- **Damping** **(author's call)** is a critically damped spring per rig part,
  with a time constant in seconds. It runs on the wall clock, so a paused scene
  still settles.
- **The orthographic camera** is new in the core (reverse-Z, as the
  perspective one). Picking, culling, horizon culling and screen-space error
  get orthographic forms. Tile selection's screen-space error uses the
  orthographic pixel size, which doesn't vary with distance.

### 11.4 Gestures as bindings

Decided by the owner: "Gestures are bindings, not subclasses." One gesture set
works the same on the globe and in design space by default, and a host can
change it without writing a controller:

- **actions:** a controller's named operations (orbit, pan, zoom, look, tilt,
  roll, fly forward, fit the selection, the standard views), each done once by
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

### 11.5 Transitions between rigs

Decided by the owner:

- Flights need to be configurable: "an instant jump vs a linear movement vs
  something eased in and out".
- "A camera transition is a blend between two live rigs," after Cinemachine:
  each tick evaluates the source and target rigs at the current scene time
  (so a moving target such as Orion is tracked throughout) and blends them by
  the eased weight in a common reference frame. A cut is duration 0.
- Path and timing are separate. The path is straight in the blend reference
  frame, an arc over the surface (1.x's `flyTo` with its maximum height), or a
  spline. The easing maps time onto it.
- **Interruption is configurable per transition,** with a default for user
  input: `stop` (the camera stays where it is, on the rig it was nearer to),
  `handover` (the transition's velocity carries into the user's drag,
  spring-style), or `finish` (input waits until the transition completes).
  Programmatic interruptions use the same policies.
- Configurable at three levels: per call, per pair of rig kinds (a table of
  defaults, such as "globe → ride-along: 3 s ease-in-out"), and app-wide.
- Flights between rigs need a defined hand-off: "interpolate in a common frame,
  then re-attach". In the layering (section 7.2), that is a change of root:
  the blend reference frame is the view's root while the transition runs, and
  the target rig's position reference frame is the root after.

Who owns what (section 7.2): the transition is the camera layer's, built on
the animation core. The interruption policies are the camera layer's, because
they need the controller's input. The path shape is the transition's. Easing
and the clock are the animation core's.

Design **(author's calls)**:

- **The blend reference frame** is the deepest common ancestor of the two
  rigs' position reference frames, unless the transition names one. Earth to a
  lunar site blends in ICRF; two rigs on ITRF blend in ITRF.
- **Orientation** blends by slerp in the blend reference frame. Field of view
  blends linearly. A switch between perspective and orthographic happens at the
  end that has it, through a field-of-view dolly (the "dolly zoom" trick), so
  the image doesn't jump.
- **The default interruption for user input is `stop`,** as 1.x's `flyTo`
  does.
- **At the end** the target rig becomes the view's rig, and its controller
  takes over.
- **Per-node transforms on a placed model,** set by the application (for the
  DSN dishes' azimuth and elevation in 5g), are added to `ModelPlacement`,
  because the engine has no per-node control today. The animation core can
  drive them.

### 11.6 Done when

- Animation tests run on injected clocks, with no wall-clock flake.
- Each controller is driven by synthetic pointer, wheel, touch and key events,
  on the Earth, on the Moon and in render space without the frames module.
- A transition to a rig following Orion ends on Orion while the clock plays at
  3600×, within a pixel at the target, and the view's root is the blend
  reference frame throughout and Orion's after.
- Free flight from the Earth to the Moon re-attaches with no visible jump.
- The explorer's camera rig is rebuilt on 5a's rig and 5d's controllers, and
  its own `cameraRig.ts` and `orbit.ts` shrink to configuration.

## 12. Sub-plan 5e: the physical sky and light per body

### 12.1 What the owner decided

- "The sky follows what the rig is attached to." Inside or near a body's
  atmosphere, that body's sky scattering; in orbit, black space, with the
  atmosphere drawn only as a shell on the body's limb; on the Moon, no
  atmosphere at all.
- Physically, not by blending. Every body declares its atmosphere, or none.
  Each atmosphere is evaluated from the camera's true position relative to that
  body, in the body's own reference frame, whatever reference frame the rig is
  attached to. What is seen through each is composited physically: the Moon
  seen through the Earth's air from the ground; the Earth's limb shell against
  a black sky from the Moon.
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
- **The camera's place, per body.** Each tick, each atmosphere gets the
  camera's position in its body's anchor (section 7.4), not a height along the
  ellipsoid normal under a render-space camera. 5a already does this for the
  Earth; 5e does it for every body. This is the sunrise bug's likely fix; the
  builder confirms the cause first.
- **Compositing.** Along each view ray, the atmospheres the ray crosses are
  applied in depth order: what lies behind (a surface, another body, its
  impostor, the stars, the sun's disk) is attenuated by each atmosphere's
  transmittance, and each adds its in-scattered light.
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
  opposition surge, as one material shared by the Moon's impostor and Cesium
  Moon, with Lommel-Seeliger for both as the fallback if Hapke's parameters
  can't be sourced)**. Sharing it is what lets section 10.4's handover avoid a
  jump in brightness.
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
  to ITRF2020 at the engineering frame's epoch, through the published
  transformation for its datum (for NAD83(2011), NGS's 14-parameter Helmert to
  ITRF2020; check that `proj.db` carries it).
- **Reasonable defaults, decided by the engine.** Per height system, prefer the
  current geoid model (GEOID18 for NAVD88). Per horizontal datum, prefer the
  published, time-dependent route to ITRF. Rank by stated accuracy only among
  candidates that agree on those. "The defaults should be data (a small table
  the engine ships, with sources), not code paths."
- **Explicitly configurable through the API.** An application can name the
  geoid model, the datum route or a whole pinned pipeline per engineering
  frame, and read back which route was taken and why (`RecordedOperation`, and
  the skipped candidates with their reasons).

Design:

- **The tree's ITRF is ITRF2020** **(author's call).** The frames spec treated
  ITRF as WGS84 (they agree to centimetres). Naming the realization lets a route
  end there. WGS84 (G2296) stays an alias, stated as agreeing to a few
  centimetres.
- **Epochs.** A design point is related at the engineering frame's coordinate
  epoch. Plate motion between that epoch and the scene's instant (a few
  centimetres a year) is stated as an accuracy term when it exceeds 1 cm, never
  ignored silently **(author's call)**.
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

- In isolation, in its native design space, the render root is the
  engineering frame: design E, N and up as straight axes, in design units.
  Straight design lines draw straight. Nothing is reprojected, and picking
  reports design coordinates. In the layering, this is a CAD-style rig whose
  position reference frame is the engineering frame.
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
- The rig's reference frame changes from the engineering frame to the
  Earth-fixed one across the morph. Heading follows grid north at one end and
  true north at the other.

Design **(author's calls)**:

- **The morph is one transition** (section 11.5): one animation drives the rig
  blend and the placement blend `t`, with the CAD-style controller at the
  design end and the globe controller at the other.
- **Its blend reference frame** is the rigid tangent frame at the
  engineering frame's anchor (4b's `RigidPlacement`). At `t = 0`, a draw's
  position is its design position, in metres. At `t = 1`, it is its
  Earth-fixed position, carried into that tangent frame rigidly. Both ends are
  in one Cartesian space, so the blend is a per-vertex mix. While the morph
  runs, the tangent frame is the view's root; when it completes, the root is
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
  then surface, with occlusion from the depth it renders. It is reached
  through section 7.10's query interface.
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

## 14. Sub-plan 5g: Earth to Moon: the Artemis II replay

### 14.1 What the frames spec decided

The frames spec §8.2 stands where the owner's story (section 14.2) doesn't
replace it: the data, with the trajectory data from 2026-04-02 01:58 UTC
(after the upper stage separated) to 2026-04-10 23:53 UTC (entry interface);
the follow and free-flight cameras and their presets; the flight path in a
chosen reference frame; readouts in four reference frames; the communications
overlay with every quantity marked published, computed or assumed; and the
models. The story replaces §8.2's opening and short tour, and widens its
"phases outside the data" into a simulated ascent and entry (5h, section
15.1).

### 14.2 The story

The owner's (2026-11-07): a replay of the whole mission, from the launch pad
to splashdown. It should feel like watching a real flight unfold, true to real
physics as far as the data and public figures allow, with no control of the
spacecraft. "This is just the mission replay/visualizer."

- **Audience:** a viewer first, with the engineering readouts (frames,
  accuracy, the link budget) on toggles, as the design globe does **(author's
  call; the owner didn't say)**.
- **The opening:** SLS with Orion on Launch Complex 39B, dressed with as many
  public models as can be found (section 14.5). A mission clock is always
  visible, and it starts at T−10 s. **Launch is play (author's call):** before
  T−0 the play control reads "Launch", and the clock counts down. Pressing it
  starts the countdown's last seconds and the replay.
- **The flight:** the stack lifts off, and each stage moves through the
  simulated ascent (5h) until it meets the trajectory data. Events are shown as
  they happen: ignition, liftoff, booster separation, the fairing panels' and
  the launch abort system's jettison, core-stage cutoff and separation, the
  upper stage's burns, Orion's burns, crew module separation, entry,
  parachutes, splashdown.
- **Effects:** plumes that look right in the air and in space, re-entry
  heating and plasma, all in Slang custom shaders (5h). Launch smoke and the
  splash are approximations, without a particle system, and secondary: either
  may be dropped if it is too hard.
- **The communications layer** (links, direction, visibility windows, dishes
  slewing to track Orion) toggles on and off at any time.
- **A live frame-tree widget** (section 14.4) shows where the camera is
  attached and moves it to any reference frame with that reference frame's
  controller.
- **The end:** after splashdown the capsule floats in place, and the replay
  ends there.

### 14.3 The self-directing replay

The mission is about ten days, with a few minutes of action between long
coasts. The owner asked for the arrangement that gives the best experience,
to be tried and tuned. **Design (author's calls, to be tried):**

- **"Follow the mission" is on by default.** Two directors run the replay:
  one for the scene clock, one for the camera.
- **The time director.** The scene clock runs at 1× from T−10 s through the
  ascent to orbit insertion. Each later event has a lead-in at 1× and plays at
  1×. Between events, the rate eases up to a coast rate chosen so each quiet
  stretch plays in about 20 s of wall time, capped at 20,000×, and eases back
  down to arrive at 1× at the next lead-in. A ramp eases the logarithm of the
  rate over about 2 s of wall time. A hands-off replay of the whole mission
  lasts roughly ten to fifteen minutes.
- **The camera director** picks a shot per event: a rig preset and a framing,
  such as a pad camera, a tracking camera from the ground, an onboard view, or
  a wide Earth–Moon view during a coast. It moves between shots with 5d's
  transitions.
- **Taking over.** Moving the camera stops the camera director only. Touching
  the clock (scrubbing, the rate, pausing) stops the time director only. One
  "Follow the mission" control resumes both, through a transition, never a
  jump.
- **The event list** is visible, with a "next event in" readout. Clicking an
  event goes there through a transition, and the time director takes up from
  that event if it is on.
- **Clocks.** Stage motion and effects run on the scene clock, so scrubbing
  and warp replay deterministically, backwards included. The directors' ramps
  run on the wall clock (section 11.2's per-animation clock choice).
- **Where it lives.** The directors are the example's: data (an event table
  with lead-ins and shots) over the public animation core, camera layer and
  clock. If 5i finds them general, a "replay director" is a candidate to
  promote.

### 14.4 Stages, reference frames and the tree widget

- **Every stage is a trajectory with its own reference frame:** the two
  boosters, the core stage, the upper stage (ICPS), the launch abort system,
  the service module's three fairing panels, and Orion's crew module and
  service module, which separate before entry. Each is a piecewise reference
  frame (section 9.3): a fixed offset in the stack's body-fixed frame until it
  separates, then its own path. After separation each follows its own path,
  simulated where there is no data (5h).
- **Orion's own reference frame is piecewise too:** the simulated ascent, the
  trajectory data, then the simulated entry, continuous at each change.
- **A stage's path ends** where its simulation ends (a booster's splash, the
  core stage's break-up, a panel's fall). Its reference frame then stays in
  the tree, shown as ended, and a camera on it holds at the last state and
  says so **(author's call)**.
- **The live frame-tree widget** shows the tree in use at the clock's time,
  where the camera is attached (its rig's position reference frame, and the
  orientation reference frame if different), and changes as stages separate,
  because a piecewise reference frame's parent changes. Clicking a reference
  frame starts a transition to a rig on it, handing over to that reference
  frame's controller (the camera chain, sections 7.2, 7.5 and 11).
- **Which rig and controller per reference frame** is a small table of data
  **(author's call)**: a stage's body-fixed frame gets an orbit rig about it
  with the orbit controller; ITRF and MOON_ME get their body's globe controls;
  GCRF gets an orbit rig about the Earth's centre on the `"inertial"` preset;
  the pad's site frame gets the globe controls near the pad. The application
  can change the table.
- **The widget is public.** The frames explorer's tree diagram is promoted
  into it (5i's "`branchPath` and the tree model" promotion), and the explorer
  uses the widget.

### 14.5 Design

- **A new gallery example,** `examples/earth-to-moon/`, on the public API only
  **(author's call)**. The self-directing replay (section 14.3) is its tour,
  and it can be left at any point for free exploration.
- **Before 5h lands,** the stack stands on the pad until T−0, and the replay
  then jumps, labelled as a jump, to the first state of the trajectory data
  **(author's call)**. 5g ships without 5h.
- **Data, from setup into the store:** the Artemis II OEM (primary, plan 2 R9)
  and SPK; DE440 and the lunar PCK; EOP; NAIF's DSN station SPK; the DSN
  810-005 figures and masks; LRO (NAIF id −85) from JPL Horizons, fetched by
  setup and self-hosted as an excerpt; the archived DSN Now readings (plan 3's
  22 rows). Cesium World Terrain, imagery and Cesium Moon stream from ion with
  the user's token. The example declares Cesium Moon, which loads only when the
  camera nears the Moon (section 10.4).
- **Models.** The setup surveys NASA's 3D resources and other public sources
  for SLS Block 1, Orion, the mobile launcher, Launch Complex 39B and the
  crawler, and credits each model it uses. Orion is the CC-BY Sketchfab model,
  which the owner downloads (it needs a login) and which is credited; NASA's
  crew-module mesh is the fallback. A stage with no public model is modelled
  simply, from published dimensions.
- **The mission clock** shows T− and T+ mission elapsed time, with UTC beside
  it (section 9.7).
- **The hypothetical lunar south-pole antenna** in its own site grid (IAU 2015
  south polar stereographic, as 4a's Moon case), labelled hypothetical. A
  hypothetical relay may be added, labelled the same way.
- **Cameras:** the presets from §8.2 (departure after the TLI burn, the far-side
  flyby, Earthset over the lunar horizon, the loss of signal behind the Moon,
  closest approach, a DSN dish slewing to track Orion near a handover, and
  entry), plus the story's launch shots (the pad camera, a tracking camera,
  onboard), each a rig (5b's presets where they fit) and a transition. They
  are the camera director's shots. "Follow" is an orbit rig on any stage. Free
  flight is 5d's free-fly.
- **The flight path,** sampled as a bulk operation (5b), drawn in a chosen
  reference frame, with the simulated spans drawn and labelled differently
  from the data. **The "figure-eight" needs the Earth–Moon rotating frame**
  **(author's call):** the frames spec says "the Earth's: the figure-eight",
  but in GCRF the path is a loop, not a figure-eight. The figure-eight shows in
  an Earth-centred reference frame with x toward the Moon and the Moon's orbit
  in the xy plane, which is a two-vector frame (5b). The path offers GCRF,
  ITRF, MOON_ME and that rotating frame.
- **Readouts** for any stage and a picked point in ITRF, MOON_ME, GCRF and a
  Sun-centred reference frame (ICRF axes at the Sun), each with its accuracy,
  or "simulated" on a simulated span.
- **The communications overlay,** as §8.2 lists it, on `measure`: the DSN
  links while they exist, range, light time, range rate, Doppler at 2216.5 MHz,
  free-space path loss, and received power, G/T, C/N0, Eb/N0 and margin from
  DSN 810-005's ground figures and assumed Orion figures (EIRP about 15 dBW,
  labelled assumed). Visibility windows and handovers against each station's
  masks. The data rate as observed, and the O2O laser demo as an annotation.
  **Before the DSN acquires Orion** (launch and ascent go through the Near
  Space Network's relay satellites), the overlay says the links are the Near
  Space Network's and aren't modelled: the relays' positions need TEME and
  SGP4, an add-on outside plan 5 (section 3) **(author's call)**. If the add-on
  lands first, the relay links join the overlay.
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
  The owner accepts that it will often say "can't tell" until the ray-query
  engine exists (section 3). The overlay is a standing query through section
  7.10's interface and shows the undecided spans as such, so a later engine
  changes its answers, not the example.
- **Dish models** (NASA's DSN 34 m and 70 m GLBs) track Orion in azimuth and
  elevation from the apparent directions, through 5d's per-node transforms. If
  a model has no separate azimuth and elevation nodes, setup splits it
  **(author's call)**.
- **Lines and labels** use what the engine has when 5g is built. The wide-line
  material and GPU labels are carried forward as renderer work, not 5g's.
- **A design pass:** a UX review on the most capable model against the story,
  then the owner's review in context (the design globe's process).

### 14.6 Done when

- The occultation agrees with `gfoclt` to under a second, and with the
  published minutes to ±2 min.
- Every quantity in the overlay shows whether it is published, computed or
  assumed, and an accuracy where one applies; simulated spans say so.
- On an injected clock, a hands-off replay plays every event at 1× and the
  whole mission in ten to fifteen minutes of wall time. Moving the camera
  stops only the camera director, touching the clock stops only the time
  director, and "Follow the mission" resumes both through a transition.
- Clicking each reference frame in the widget moves the camera there with that
  reference frame's controller, and the widget shows the new attachment on the
  next tick.
- Scrubbing backwards across a separation shows the stack whole again.
- The browser checks pass: both themes, 1440 px and 380 px, keyboard-only use,
  reduced motion, the console, and the token search.

## 15. Sub-plans 5h and 5i

### 15.1 5h: the simulated ascent and entry, and their effects

The frames spec §8.2's "phases outside the data" grow, with the owner's story
(section 14.2), into the whole flight before and after the trajectory data.

**The phases outside the data:**

- **Search first,** as §8.2 says: a published ascent trajectory, an ICPS
  trajectory, a descent or splashdown trajectory, and NASA's airborne entry
  imagery. Published data wins wherever it exists.
- **The simulated ascent,** where there is none: from public figures (the
  press kit's event times, altitudes and speeds, and published engine
  figures), propagated with real gravity, drag and thrust, from liftoff
  through booster separation, core-stage cutoff and the upper stage's burns,
  to the first state of the trajectory data. It must meet that state in both
  position and velocity, so the hand-off doesn't jump: a boundary-value fit,
  for example propagating backward from the data's first state and fitting the
  ascent forward to meet it **(the method is the builder's)**. The piecewise
  reference frame's continuity check (section 9.3) proves it.
- **Each separated stage's own path:** the boosters' and the panels' fall with
  drag to the ocean, the core stage to its break-up, the launch abort system
  after jettison, the upper stage after Orion leaves it. Each is simulated
  from its separation state, unless published data exists.
- **The simulated entry,** from the data's last state at entry interface:
  the service module's separation and break-up, the crew module's entry,
  the six-minute blackout, the parachutes, and splashdown. The capsule then
  floats in place and the replay ends.
- **Labelled and excluded.** Every simulated span is labelled simulated, kept
  apart from the exact data, and excluded from measurements' accuracy claims.
  The timeline marks the simulated spans as such.
- **The launch time and event times** come from public sources, cited in the
  example; none is taken from memory.

**Effects,** physical by default, with a stated exaggeration control for the
presets, as §8.2 says, in Slang custom shaders drawn in the existing
translucency pipeline:

- **Plumes change with ambient pressure:** compact in the thick lower air
  (shock diamonds where the nozzle is over- or underexpanded) and spreading
  wide and faint in vacuum. The boosters' plumes bright and opaque; the core
  stage's RS-25s pale with visible shock diamonds at sea level; plumes on proxy
  geometry with a vacuum expansion density model (checked against Simons
  1972); the RL10 nearly invisible, its nozzle extension glowing dull red to
  orange; the OMS-E during TLI (5 min 49 s at 7:49 pm EDT, April 2) a faint
  warm haze with puffs at ignition and shutdown; attitude-thruster puffs of 20
  to 200 ms.
- **Re-entry:** plasma with a shock layer about 0.3 m over the heat shield,
  the heat shield glowing at 1,900 to 3,000 K, the service module breaking up
  separately, and the six-minute blackout.
- **Launch smoke** as an approximation without a particle system (for example
  ray-marched noise volumes or textured proxies): secondary, and dropped if it
  is too hard.
- **The splashdown splash** as an approximation: secondary in the same way.

5h is separate so that 5g ships without it, and so that a slip in the effects
never holds up the engine work.

### 15.2 5i: the public API review

Decided by the owner (§13.14, "A public API review", and "modules with
interfaces"):

- Two outputs: a map of today's surface, and proposed moves.
- **Promote** what examples had to build that every app will need: the accuracy
  types and their composition, `branchPath` and the tree model, app-defined
  reference frames with their accuracy, point placement for labels and
  markers, camera rigs and orbit controls, the stale-answer and generation
  patterns around async work.
- **Demote** what is exported only because an example reaches into it, or
  exposes internals.
- **Shape:** sync against async, `AbortSignal` wherever work can be cancelled,
  `dispose` lifetimes, events or subscriptions against polling, units and
  reference frames named in types, and errors that say what to do.
- **Stability tiers:** which parts are stable and which experimental, how that
  is marked, and what examples may import. Bundle size and tree-shaking follow
  from the split.
- **Measurement and tools as their own module,** open source in this
  repository: "the core provides picks, design coordinates, accuracy terms and
  the frame tree; the module provides the tools and their UI. A host
  application can use it or bring its own."
- **Snapping** keeps its client/server split.
- **The camera chain's layers** (section 7.2): each layer's surface is
  checked against what it may know. The renderer and the scene core name no
  reference frame, the animation core no `Instant`, and the application no
  render root.

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
- **The WebGPU seams are audited** (section 7.10): every seam, its bypass
  test, and the seams still missing, as a list for the owner.
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

Every "Plan 5" item in §13.14's carried-forward lists and results notes, and
the inputs that arrived after the first draft:

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
| A reference frame's revision (change) signal | 5a |
| Composed accuracy beyond 1σ, independent terms | 5b |
| `accuracyOf` on `pointAccuracy` (both entries) | 5b |
| TEME and SGP4 ("Plan 5 or a frames add-on") | Add-on after 5a (section 3) |
| A GPU viewshed | Not plan 5 unless the owner says so (section 17, question 1) |
| The Moon as a tileset | 5c, with its impostor (section 10.4) |
| A near-field bounded terrain trace (§13.16) | As the GPU viewshed |
| A per-tile terrain error over open water (§13.16) | As the GPU viewshed |
| One ENU convention | 5a |
| The API review of the scenarios plan's additions | 5i |
| Groundwork for post-V1 WebGPU features | Seams 5a (section 7.10); audit 5i |
| Terrain clipping under the Earth's anchor | 5a |
| Terrain clipping's later design (vector-tile boundaries, holes, inverse) | After plan 5 (section 3) |
| A time-display API for local time per site | 5b (section 9.7) |
| The frames explorer's tree diagram as a public widget | 5g (section 14.4); promoted in 5i |
| Reference frames that change at an instant (stage separation, simulated spans) | 5b (section 9.3) |

## 17. Questions for the owner

A builder check (a fresh reader planning from this document) raised these.
Only the owner can answer them, and each changes what gets built. Each has
the default plan 5 follows if the owner says nothing.

1. _Answered (2026-11-07): no, deferred to its own project._ "Can't tell" is
   acceptable for many of plan 5's ray queries, and a later GPU engine must
   reach the examples without a rewrite (section 7.10's interface shape).
   The question was: **does plan 5 take on any of §13.16's ray-query
   design?** Plan 5 has one
   query seam (section 7.10) with CPU rays behind it (section 9.5). At the
   lunar south pole the Earth sits near the horizon, so the antenna's line of
   sight runs far over the Moon's terrain, mostly across tiles no view loaded,
   and will mostly read "can't tell". A real answer needs a bounded terrain
   load along the ray (the carried "near-field bounded terrain trace"), which
   is part of §13.16's open design. The GPU viewshed and the per-tile water
   error wait on the same design. _Why it matters:_ yes adds a sub-plan (the
   §13.16 brainstorm, then its build) before 5g's line-of-sight readouts.
   _Default:_ no; 5g says "can't tell" honestly.
2. **One package with entry points, or separate packages?** Section 7.7
   chose entry points of `@cesium/next` (`/time`, `/frames`, `/proj`,
   `/measure`), with the camera layer and the animation core in the core
   entry point and the time library in its own (the owner's choice,
   2026-11-07). _Why it matters:_ it sets 5a's first tasks (the
   build, the import boundary, where the Viewer sits) and what 5i's surface map
   treats as a unit; moving to packages after 5a redoes that work. _Default:_
   entry points.
3. _Answered (2026-11-07):_ a replay of the whole mission from the launch
   pad to splashdown, with each stage on its own trajectory, a mission clock,
   effects in Slang, the communications layer on a toggle, and a live
   frame-tree widget that moves the camera between reference frames (section
   14.2). The self-directing replay (section 14.3) and a viewer-first audience
   are the author's calls, to be tried. The question was: **what is the
   Artemis example's story?**
4. **Reprojected models the engine didn't generate: is "state the rule and
   measure the sag" enough for plan 5?** Section 13.4 adds a declared chord
   tolerance to `BENTLEY_engineering_frame`, measures the sag of tiles that
   declare none, and does no engine subdivision until the tessellation
   engine. _Why it matters:_ the field commits the extension's shape (and
   joins the upstream proposals), and a no means either dropping the field or
   building a stopgap subdivider that the later engine replaces. _Default:_
   as section 13.4.
5. _Answered (2026-11-07):_ the built gallery gets an ion token from Dyno's
   one token setting, pasted by the viewer; builds never embed
   `.env.local`'s (`d2cca2f34a`). 5g ships in the built gallery and needs no
   token task of its own: it reads `ionToken()` and shows Dyno's "Paste an
   ion token" prompt where Cesium World Terrain or Cesium Moon is needed.

## 18. Assumptions and open items

- **Cesium Moon's reference frame is MOON_ME,** and its heights are taken as
  published (frames spec §11).
- **Cesium Moon and the user's ion account** are to be checked before 5c
  builds the handover: whether Cesium Moon has to be added to the user's ion
  account (My Assets) first, and what ion's asset endpoint returns when it
  isn't, so the warning in section 10.4 names the right cause.
- **The impostor's albedo map** is today's sky map; its source and credit are
  checked when the impostor gets its own credit (section 10.4).
- **Orion's comms parameters** are assumed and labelled.
- **ion's terms** for an open-source demo with a user-supplied token are the
  normal Sandcastle pattern, not confirmed with Cesium.
- **The Sketchfab Orion** needs the owner to download it.
- **Published data before separation and after entry interface** is still to
  be searched for (5h): an ascent trajectory, the ICPS's, the stages' after
  separation, and the descent to splashdown.
- **The launch time and the event times** are to be taken from public sources
  (NASA's press kit and mission updates) and cited, before 5h fits the ascent.
- **The models survey** (section 14.5): which public models of SLS Block 1,
  Orion, the mobile launcher, Launch Complex 39B and the crawler exist, their
  licences and credits.
- **The Near Space Network's links** during launch and ascent are not modelled
  in plan 5 (section 14.5) unless the TEME and SGP4 add-on lands first.
- **The lunar reference systems** (§13.14 "Watch"): LunaNet's LRS standard,
  ILuRF2026 and a lunar height system are to be checked before 5g builds the
  lunar antenna's site grid. When one is adopted, it is added beside MOON_ME
  and MOON_PA.
- **`proj.db` carries NGS's NAD83(2011) to ITRF2020 Helmert** is to be checked
  first in 5f. If it doesn't, the route is added to the defaults table with its
  source.

## 19. Left to the builder

- Exact API names and type shapes throughout, including the anchor, placement,
  frame resolver, clock, pick interpreter and coordinate service interfaces.
- The clock interface's shape, within section 7.2 (scene seconds, rate,
  paused, and a flag for jumps and reverse play), and how the time library's
  clock maps it to an `Instant`.
- How anchors are implemented, within section 7.4's precision and cost rules.
- Where a rig's position reference frame puts its origin when the anchor is
  not that reference frame's own origin, within the precision rule.
- The polynomial order and tile fit for the fitted operation, within a stated
  error bound.
- The impostor's thresholds: its geometric error per body, the error bias
  default, and the Viewer option's names (section 10.4).
- The animation core's internals, and the spring's parameterization.
- The free-fly mapping, speeds, hand-over height, and where free flight
  re-attaches between bodies.
- The CAD preset's details beyond section 11.4.
- The sky's compositing shader structure, within the physical rule.
- The time formatter's API shape and the zone lookup interface (section 9.7).
- The Artemis example's layout, timeline design and preset framing, within
  the owner's story (section 14.2) and after a design pass.
- The replay's tuning (section 14.3): each coast's wall-time length (about
  20 s), the rate cap (20,000×), the ramp (about 2 s), the lead-ins, and the
  camera director's shot per event.
- The table of a rig and controller per kind of reference frame (section
  14.4).
- The continuity tolerance for piecewise reference frames (section 9.3), and
  the ascent's fitting method (section 15.1).
- The techniques for launch smoke and the splash, or dropping them.
- Shader techniques for plumes and plasma, within the physical facts.
- The order of tasks inside each sub-plan, provided each leaves the engine
  working.
