# Bodies, frames and engineering coordinates

**What this holds:** Reference frames, bodies, geodesy, engineering coordinates and measurement: the design behind the frames plans, with the owner's held questions. Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

Everything today is in Earth-fixed coordinates (ECEF): the globe, tiles,
the camera and the atmosphere. Two kinds of users want more: space
customers (other bodies, and moving between them) and designers (models in
their own coordinate systems, which are not the Earth's).

**Other bodies.**

- **The moon from its tileset.** Seen from the Earth, the moon can be the
  Cesium Moon terrain tileset placed at its ephemeris position (384,000 km
  away, a handful of root tiles by screen-space error), lit by the sun with
  a regolith BRDF (Lommel-Seeliger or Hapke: the full moon's flat look and
  opposition surge, which Lambert gets wrong) plus earthshine, and seen
  through the atmosphere (transmittance and the sky's radiance in front).
  Its phase, libration and eclipses come out right with no special case.
- **Views on any body without a reload.** Each body has its own fixed frame
  (the Earth's ITRF, the Moon's principal-axis frame, Mars' IAU frame), and
  content belongs to a body. A view's camera is expressed in one body's
  frame; per frame, each body's frame is placed relative to it from the
  ephemerides at the view's time, composed in float64 on the CPU (as the
  transform table already composes placements), then rendered
  camera-relative. Moving a view from the Earth to the Moon changes a root
  transform, not the scene, and different views of one world can be on
  different bodies (one view in Houston, one at the lunar south pole).
- **The gotchas**: time scales (UTC, TT, TDB) and Earth orientation
  parameters; light time (the moon is seen where it was 1.3 s ago, about a
  kilometer of motion, visible at close range) and aberration; per-body
  ellipsoids, terrain, heights and atmospheres (Mars has one, the Moon has
  none); globe controllers per body (up, minimum height, hand-off between
  bodies at a sphere of influence during a flight); one tile cache and
  budget across bodies; picks that return the body and body-fixed
  coordinates; and float32 nowhere near an absolute position (hi/lo and
  camera-relative everywhere, as now). Ephemerides: analytic series to
  start (1.x's Simon 1994 and its moon theory), JPL DE440 for precision.
- **A demo**: fly from a city on the Earth to the Apollo 11 site, the
  Earth's tiles and the Moon's streaming together, the atmosphere's limb
  thinning to black, stars and the Earth in the lunar sky, on the real date
  with the real phase. It exercises every part of this section.

**Engineering coordinates.** Design models are authored in projected
systems (state plane, UTM) or local site grids, often treated as flat over
long distances, with heights in a local vertical datum. One rigid placement
(an iModel's `ecefLocation`) is exact at its origin and wrong away from it:
over a 50 km highway the Earth's curvature drops about 196 m (d²/2R), and
the projection's scale varies by up to 1:10,000 (5 m over 50 km). So:

- **Placement**: reproject vertices through the model's real coordinate
  system when tiles are made (exact in ECEF), or at least place each tile
  rigidly from a tangent frame at its own center (error bounded by the tile
  size); nonlinear warping in a shader is the last resort.
- **Measurement in the design's terms**: the engine keeps each model's
  engineering frame (its CRS and datum, from the source or tileset
  metadata) and its inverse, so picks return both ECEF and design
  coordinates, and measurement tools show grid distance, station and offset
  along an alignment, and elevation in the project datum next to the true
  (geodesic) values, with the combined scale factor that relates them.
  PROJ (MIT) compiled to WebAssembly does the exact transforms on demand.
  Carrying a CRS in 3D Tiles (tileset metadata, or an extension) would be a
  proposal to the 3D Tiles community.

Bodies and engineering frames are one concept: a tree of frames (ICRF to a
body's fixed frame to a model's engineering frame), rigid transforms in
float64 along it, with the nonlinear ones (map projections) at the edges,
resolved when tiles are made or when a point is measured.

**Typed frames in the API (noted r53, with the model ownership API).** Today
every matrix and position is a bare `Float64Array`. Precision is safe:
float64 throughout, hi/lo and camera-relative on the GPU ([gpu-limits-and-capacities.md](gpu-limits-and-capacities.md)). What the
type doesn't say is which frame a value is in, and the frame tree above
will multiply the frames in play:

- ICRF;
- each body's fixed frame (Earth-centered ECEF, the Moon's mean-Earth or
  principal-axis frame);
- east-north-up tangent frames at a place;
- a parent transform's local frame (a tileset root, a node);
- an iModel's local engineering coordinates, placed by its `ecefLocation`
  or reprojected from its CRS;
- a placement's own frame, where GPU instance matrices live.

Passing an ECEF position where a parent-relative one is expected, or an
iModel-local point as if it were Earth-centered, type-checks today and is
off by thousands of kilometers. A frame tree is the fix: every frame a node
(`Frame`, with its parent and float64 transform), and values carry their
frame in the type, so converting is an explicit walk up and down the tree
(`frame.toFixed(p)`, `a.transformTo(b)`), never an implicit reuse.

- **What changes in the API.** Positions and matrices could be branded by
  frame (`Fixed<Vec3>`, `Local<Mat4, F>`) or wrapped
  (`{ frame, matrix }`). Placements would take a frame-tagged matrix
  (`PlacementOptions.modelMatrix` today: Earth-fixed or relative to
  `parent`, said only in the doc comment), and picks would return points
  in each frame asked for (ECEF and the design's coordinates, as above).
- **When.** Once a second body or engineering frames land: one frame
  (Earth-fixed) plus parent-relative transforms hasn't caused a bug yet,
  while the tree is what would make Moon content and iModel-local
  measurement safe to write.

**Design rule (r41): every option and API that involves the globe, the
sky, light, heights or coordinates names its body, Earth by default.** A
`Body` is a name, a reference ellipsoid and an optional atmosphere
(`src/scene/Body.ts`; `EARTH` today, the Moon and Mars to come with their
frames). What is body-aware so far: `View.body` (whose sky and light a view
sees), the sky and the sky-view table (heights and horizon from the body's
ellipsoid), the per-pixel sunlight (the body's radii in the view uniform,
no WGS84 constants in shaders), and a body without an atmosphere (a black
sky, the sun's whole 132.5 klx; its stars and disk come with the night sky).
The engine builds one atmosphere (the Earth's) and refuses a view of a body
with another until per-body atmospheres exist. Still Earth-only, to convert
as each is touched: the globe (terrain and imagery tiling, level-zero
errors from the WGS84 radius), the camera controllers (GlobeController,
OrbitController, InspectController), horizon culling (`math/horizon.ts`),
height clamping, view links, tile volumes (`streaming/volumes.ts`),
feature coordinates, the Viewer widget, and the sun's position (an Earth
ephemeris). Content declares its body: `3DTILES_ellipsoid` today (the
Moon's tilesets), and 3D Tiles 2.0's georeferencing when it settles (its
draft extensions place content by a CRS and a position on an ellipsoid; the
names and shape were still under discussion when checked, r41).

_Frames 1 results (r61): time and ephemerides._ The first of five plans
for the frames design
(`docs/superpowers/specs/2026-11-05-frames-bodies-measurement-design.md`;
plan `docs/superpowers/plans/2026-11-05-frames-1-time-ephemerides.md`)
landed in `src/time/` and `src/ephemeris/`. The engine's rendering is
unchanged: it still uses `icrfToFixed` and `moonAxes`, and plan 2 switches
it over. What landed, with the worst agreement the tests measured:

- **`Instant`** (TT seconds past J2000, float64; `fromUtc`, `fromTt`,
  `fromTdb`) with leap seconds bundled from NAIF's `naif0012.tls`
  (`LeapSeconds.builtIn()`, expiring 2027-06-28 per IERS Bulletin C 72).
  The store's IERS copy is used only when it expires later.
  - TT advances 2 s across the 2016/2017 leap.
  - TAI−UTC is looked up by TAI (`taiMinusUtcAtTai`), and `toUtc` is exact
    and monotonic: it holds at 23:59:59.999 through the inserted second.
  - UTC→TT and TDB agree with pyerfa's chain within 2.4e-7 s, out to
    2049-12-31.
- **TDB−TT** from ERFA `dtdb`: within 1 ns of pyerfa.
- **EOP** from CelesTrak's `EOP-All.csv` (IERS data): 4-point Lagrange,
  stepping through UT1−TAI across a DAT change. Outside the table it holds
  the last row or returns zero corrections, flagged `degraded`. Samples
  carry `ut1MinusTai`. `atInstant(instant, leap)` locates an instant by
  TAI, so a time inside an inserted second reads the pre-leap day.
  `eop.at(instant.toUtc(leap))` read the post-leap day there, putting UT1
  1 s fast; the final review found it.
- **GCRS→ITRS** (IAU 2006/2000A, CIO-based, ported from ERFA, BSD-3),
  `celestialToTerrestrial(instant, eopSample)` with UT1 = TAI +
  `ut1MinusTai`:
  - against pyerfa: `xy06` 3e-18 rad, `s06` 1e-22 rad, `era00` 6e-14 rad,
    and the full matrix 7.4e-12 (limit 1e-11), over 34 instants that
    include four across the 2016/2017 leap;
  - inside the inserted second, using real EOP lookups: 2.1e-12;
  - 0.0023° from the old `icrfToFixed`.
- **SPICE DAF reader** (SPK and binary PCK, type 2) and **Chebyshev packs**:
  excerpts that record their NAIF source, its SHA-256 and the span. Both
  reject malformed layouts with named errors. The DAF bounds and NEXT
  checks stop a crafted file from looping. Reading segments of other types
  (13, 21 for trajectories) is plan 2's first task.
- **`Ephemeris`** from DE440 (`de440s.bsp`) and the lunar PCK
  (`moon_pa_de440_200625.bpc`, MOON_PA = 31008):
  - Sun, EMB, Earth and Moon within 1.5e-5 m of jplephem at the
    fixtures' TDB, and within 7.1 mm when built from UTC (the float64
    floor below);
  - Moon Euler angles identical to SPICE;
  - J2000→MOON_PA and →MOON_ME within 2.6e-13 of SPICE `pxform`;
  - PA→ME (`moon_de440_250416.tf`) within 5e-20.

  The plan's Earth formula was the old geocentric-Moon form. With SPK's
  301/3 (Moon wrt EMB) it is `emb − moonWrtEmb/EMRAT`; the plan's form was
  about 57 m off. A test against DE440's own 3→399 segment now pins it.
  Summing Chebyshev terms smallest first was needed for ψ (about 1e4 rad).

- **Setup and the store.** `npm run setup` downloads the four sources to
  `~/.cesium-bench/frames` (`FRAMES_DATA_DIR`); nothing downloaded is
  committed. It checks the NAIF files against pinned SHA-256s, validates
  refreshed tables before replacing a good copy, and writes 2000–2050 packs
  (`--frames-span`, inclusive). The dev server serves the store at
  `/frames-data/`, and `npm run test:data` runs the tests against it.
- **`loadFrameData()`** verifies each file's SHA-256 and returns typed
  `warnings` (`leapSecondsExpired`, `eopEnded`). `Ephemeris.contains`
  tests the span without a throw. In the browser it resolves, with the
  geocentric Moon at 386,847 km on 2026-11-05.

The precision floor is `Instant`'s single float64: 2.4e-7 s near 2050. That
is about 1.7e-11 rad of Earth rotation (0.1 mm at the surface), about 7 mm
in SSB-relative positions (the Earth's 30 km/s), and about 0.2 mm Earth to
Moon: all far inside the meter goal. A two-part `Instant` is the fix if a
later plan needs more.

_Frames 2 results (r62): the frame tree and trajectories._ The second of
five plans (`docs/superpowers/plans/2026-11-05-frames-2-frame-tree-trajectories.md`)
landed in `src/frames/`, `src/ephemeris/spk.ts` and `src/trajectory/`. Worst
agreement the tests measured, 2026-11-05:

- **The tree** (`createFrames`): ICRF, HCRS, GCRF, EME2000, ITRF, MOON_ICRF,
  MOON_ME, MOON_PA and `bodyFixed(body)`, with `Frame`, `frameTransform`,
  `FramePoint`/`convertPoint`, `eastNorthUpFrame` and `worldTransformFrame`.
  - The frame bias is within 1e-15 of pyerfa `bp06`.
  - GCRF→ITRF is within 1e-11 of plan 1's fixtures (worst 7.4e-12, the
    float64 TT spacing); Moon ME and PA are within 1e-12.
  - ITRF→MOON_ME translation is within 1 mm.
- **SPK and trajectories**: `readSpk` reads types 2, 8, 9, 12 and 13 and
  NAIF's old "NAIF/DAF" file id; `Trajectory.fromSpk` and `fromOem`;
  `parseOem` and `Instant.fromIso`.
  - Artemis II SPK against SPICE `spkgeo`, over 40 instants (segment edges
    and the shared main and gap-fill endpoints included): positions within
    1.2e-7 m, velocities within 6.0e-9 m/s.
  - DSN stations (DSS-14, DSS-43): within 9.3e-10 m.
  - Orion in MOON_ME against `spkpos`: within 8.7e-5 m.
- **OEM against SPK** (R9), both read as EME2000 with Hermite degree 11:
  at most 0.26 m over 1,286 instants. NAIF's conversion used SPICE's
  approximate TDB.
- **The frame bias at the flyby**: reading EME2000 as ICRF moves Orion by
  28.4 m in MOON_ME at the 2026-04-06T23:00 UTC flyby (R1).
- **The sky from DE440** (`skyState`) against the analytic models: the sun
  within 0.0042°; the Moon within 0.056° at 2026-04-06 and 0.14° at
  2000-06-21 (the analytic Moon's own error), its distance within 0.017%;
  the Moon's pole within 0.0046°.
- **Cost**: `skyState` with data takes 0.43 ms per call, mostly the IAU
  2006/2000A X, Y and s series. It runs once per clock change, so every
  frame while the clock plays. A cache over a short interval would cut it
  if it matters.
- **Earth-only rendering is unchanged without data.** The analytic path is
  tested bit for bit, the Viewer's `frameData` option is off by default,
  and only the bench Explorer opts in.
- **Setup** now also stores the Artemis II OEM, SPK and gap-fill SPK and
  NAIF's DSN station SPK (about 12 MB, SHA-256 pinned, credited to "NASA JSC
  FOD Navigation, via NAIF" and "NAIF/JPL").
- **Gates**: `npm test` 369 passing; `npm run test:data` 34 passing.

Rulings:

- **R1**: the axes behind an SPK's J2000 label are declared (`j2000:
"icrf" | "eme2000"`), not assumed.
- **R2**: frame edges are Newtonian until plan 3, which changes the one
  GCRF→ICRF edge and its tolerances.
- **R3**: rendering falls back (the sky uses the analytic models outside the
  data); frames and trajectories throw.
- **R4**: overlapping SPK data follows SPICE's precedence (later files, then
  later segments, win); OEM segments follow the same rule.
- **R5**: the OEM reader never guesses an interpolation; the Artemis OEM
  needs `interpolation` (Hermite, degree 11).
- **R6**: the world is not re-rooted; content stays Earth-fixed until plan 5.
- **R7**: plan 1's rotations stay row-major 3×3, parent to child; frame
  transforms are column-major float64 4×4; only `matrix.ts` converts.
- **R8**: trajectory files join the setup store by default.
- **R9**: the OEM is the primary Artemis source; the OEM and SPK may differ
  by up to 0.5 m (measured 0.26 m).
- **R10**: the Viewer keeps the analytic sky by default; `frameData` is
  opt-in.
- **R11**: frames carry positions only; velocity transforms are plan 3.

Controller rulings made while building it:

- The GCRF→ITRF rotation bound is 1e-11, plan 1's bound.
- `frameBias` uses ERFA `bp06`'s IAU 2006 construction.
- Sub-microsecond ISO fractions hold to float64 TT's 1.2e-7 s.
- OEM spans honor `USEABLE_START_TIME` and `USEABLE_STOP_TIME`.
- SPK spans clamp to the stored epochs.
- A half-specified OEM interpolation header throws.
- The old "NAIF/DAF" file id is read (the DSN station SPK uses it).
- SPK window sizes are capped at SPICE's limits.

_Frames 3 results (r63): measurement._ The third of five plans
(`docs/superpowers/plans/2026-11-05-frames-3-measurement.md`) landed in
`src/measure/`, with the eq. 11.19 edge in `src/frames/frames.ts` and the
accuracy inputs on `Trajectory` and the EOP table. Rendering is unchanged.
Worst agreement the tests measured, 2026-11-05:

- **Two Earth-centered frames** (R1): `gcrf` is the true GCRS (TT-compatible,
  joined to ICRF by IERS eq. 11.19) and `earthIcrf` carries SPK and OEM data.
  At 3.844e8 m perpendicular to V on 2026-04-06T23:00 UTC the two differ by
  9.48 m.
- **Light time and apparent directions** against SPICE (`shapiro: []`):
  - Earth to Orion: 2.1e-5 m (CN) and 3.1e-5 m (XCN); 1.4e-12 rad (CN+S)
    and 1.7e-12 rad (XCN+S).
  - Earth to the Moon: 1.5e-5 m, 1.4e-13 rad.
  - DSS-43 to Orion: 0.263 m, worst angle times range 0.30 m. This is a
    constant offset of about 8 mas between our ITRF and NAIF's ITRF93 file.
- **Shapiro delay** on the Artemis links: 0.46 to 27 ns.
- **Geodesic distance** against Python geographiclib: 6e-9 m on WGS84,
  1.6e-8 m on the Moon's sphere.
- **Doppler**, DSS-43 from Orion at 2026-04-06T23:30 UTC: range rate
  236.93 m/s, shift -1750.15 Hz at 2216.5 MHz. The worst difference from
  1 − rr/c is 2.45e-9 (the proper-time terms). Range-rate noise is 1.8 mm/s
  rms and 2.9 mm/s at most, from float64 TDB quantization.
- **Occultation**, Canberra DSS-43 (Orion 25.5° up at 22:44 UTC, April 6):
  first blocked by the Moon at 22:43:00 (60 s before the published 22:44),
  first clear at 23:23:20 (100 s before 23:25). Goldstone and Madrid had
  Orion below their horizons.
- **DSN Now**: 22 rows from 8 archived snapshots. The displayed range is
  one figure per spacecraft, identical at every dish (upleg equals downleg).
  It agrees with our per-dish light-time ranges within 5.7% (round trip
  4.9%) and with no geometry better (the geocentric range misses by up to
  27%), with no consistent lag. So it can't validate to its rounding as the
  spec hoped; it stays as a 30% sanity check.
- **An accuracy statement**, DSS-26 from Orion at 2026-04-06T15:08:26 UTC:
  10.05 m. Terms: `coordinateScale` 10.04 m (the OEM's unstated TT/TDB
  scale), Orion's position sigma 0.49 m, Earth orientation 0.014 m,
  ephemeris 0.01 m, light time 0.001 m. At the flight's start Orion's sigma
  is 50.35 m.
- **Orion's OEM covariance is in m²**, not CCSDS's km²: in km² its velocity
  sigmas would be about 12 m/s.
- **Gates**: `npm test` 453 passing; `npm run test:data` 48 passing.

Rulings:

- **R1**: two Earth-centered frames; SPK and OEM data sit under `EARTH_ICRF`.
- **R2**: the Moon's edge stays Newtonian (3 cm or less, stated, not applied).
- **R3**: velocities are central differences over 0.5 s, one-sided at data edges.
- **R4**: Doppler includes both ends' proper-time rates.
- **R5**: light time follows eq. 11.17 with Sun, Earth and Moon Shapiro terms.
- **R6**: apparent directions are light time plus stellar aberration (`CN+S`, `XCN+S`).
- **R7**: accuracy never claims more than the inputs support; an unknown term makes `meters` undefined.
- **R8**: snapping goes to plan 4 and frame-tagged picking to plan 5.
- **R9**: a point carrying its own instant gets geometry only.
- **R10**: the published occultation is checked to ±2 min.

Controller rulings made while building it:

- SPK and OEM data are read under `EARTH_ICRF` (R1's second frame).
- Task 4's tolerances: DSS-43 directions 0.5 m per range; the Shapiro bound
  is 0.1 to 50 ns.
- Derivatives at data edges are 3-point one-sided; range rate is good to mm/s
  (quantization-limited), not R3's 1e-7 m/s.
- `properTimeRate` leaves out a body's own potential at its center.
- Line of sight treats an endpoint below the ellipsoid as on it.
- Predicted EOP is floored at the measured sigmas, and degraded EOP gives no
  number.
- The trajectory term comes from the nearest trajectory ancestor of a frame.
- `signal: false` also omits line of sight.
- DSN Now is a 30% sanity check (above).
- `geographiclib-geodesic` was checked with Snyk's package health (Healthy,
  0 vulnerabilities, no dependencies). Once the owner trusted the repo in
  Snyk, the SCA scan of packages/next's production dependencies found 0
  issues (2026-11-05).

_Carried forward from frames plans 2 and 3._ These are deferred items that
are real work. The test-strength and wording nits the reviews raised are left
out, because none of them changes a result.

- **Plan 5:** a SPICE `gfoclt` fixture for the Moon's occultation of Orion
  from DSS-43. Today's check is against the published minute (±120 s), from
  one complex. The fixture would make it a sub-second validation.
- **Plan 5:** cache `skyState`'s IAU 2006/2000A series (X, Y, s) over
  minutes. It costs about 0.1–0.4 ms per clock change and runs every frame
  while the clock plays. This is already in plan 3's roadmap.
- **Plan 5:** bundle size. `widgets/Viewer.ts` imports `skyState` and
  `loadFrameData` statically, so every Viewer bundle carries the ERFA tables
  (about 100 KB) and the pack readers, even with `frameData` off. Load that
  path with a dynamic `import()`.
- **Plan 5:** surface `FrameData.warnings` in the Viewer and the bench
  Explorer. These are an expired leap-second table, and an EOP table that
  ends before now. Today they're only on the returned object.
- **Plan 5:** a unit test for the Viewer's `frameData` option. It would cover
  a URL or an object, data arriving late, and a load that fails with one
  warning.
- ~~**Plan 4 or later:** `measure` solves the downlink light time twice, once
  inside `downlink` and again for line of sight. Return the solution from
  the leg internally.~~ Done (plan 5b, Task 10): the downlink's solution goes to the line of sight.
- ~~**Plan 4b (owner's requirement, 2026-11-06): global geoid and
  height-system coverage, lazily loaded.**~~ Done in plan 4b (see "Frames 4b
  results" below): the catalog pin and grid store (Task 1), verified PROJ
  bytes (Task 2), one verified grid set on both platforms (Task 3), the dev
  server's `/proj-grids/` (Task 4), `EngineeringFrame.load` (Task 6), the
  opt-in EGM96 and EGM2008 fallbacks (Task 7), and the geoid cases checked
  against their publishers (Task 9). Cropped regional tiles aren't built
  (carried forward). The original entry follows. The portfolio needs the country
  and region geoids and height systems, with EGM96 and EGM2008 as fallbacks,
  not only GEOID18. Facts checked 2026-11-06:
  - **PROJ-data's catalog** (`cdn.proj.org/files.geojson`) lists 458 grids
    from 32 countries, 0.91 GB in all. Each entry has a `sha256sum`, so
    setup and the server verify against the catalog instead of hand pins.
  - **EGM96** (`us_nga_egm96_15.tif`) is 2.7 MB.
  - **EGM2008** at 2.5′ (`us_nga_egm08_25.tif`) is 80.6 MB. The 1′ grid is
    not on the CDN.
  - **The CDN sends no CORS headers,** so grids are self-hosted: served by
    the dev server, or by the user's own mirror using the same layout.
  - **To design in 4b:**
    - Pin the catalog itself, by hash and version, as the trust root.
    - The dev server fetches a grid on first request into the store,
      verifies it against the catalog, and serves it. Setup can prefetch
      sets.
    - At run time, an operation's candidate grids are known before loading
      (PROJ names them even when unavailable). Fetch the first candidate's
      grids, load them, then resolve. This is an async step before
      `resolveOperation`, and plan 4a's R2 still holds: no silent fallback.
    - EGM96 and EGM2008 fallbacks are opt-in per frame and named. A
      fallback adds an accuracy term for the offset between the global
      model and the local datum.
    - Browser memory for large grids: PROJ loads whole files into the
      WebAssembly FS (80 MB for EGM2008). Consider cropped regional tiles
      made by setup.
    - Keep the grid source a configurable base URL, with cdn.proj.org's
      file layout and catalog format. A hosted service, such as Cesium ion
      later (owner's suggestion), can then serve the grids, with CORS and
      possibly cropped tiles, with no engine change. The dev-server cache is
      only the local-development default.
- **Done (r65, built before 4b): a gallery example for frames and
  projections** (owner's request, 2026-11-06; results are in "Frames example
  results" below). It shows off the tree-based transforms and the PROJ work,
  and stress-tests them. **What 4b adds to it:** tileset placement modes
  (rigid and exact placement of a tileset on a frame) and the global-geoid
  cases (EGM96, EGM2008 and the country geoids, from the entry above). Both
  need library work that the example could not use. Both are done: plan 4b's
  Task 21 added them to the explorer's catalog as two groups, global geoids
  and tileset placement. The list below is the
  original request, kept as the record of what was asked.
  - **The tree, visualized live at the clock's time.** It covers:
    - ICRF, HCRS and EARTH_ICRF;
    - GCRF (with eq. 11.19) and ITRF;
    - EME2000;
    - MOON_ICRF, MOON_ME and MOON_PA;
    - local ENU and world-transform frames;
    - trajectories;
    - engineering frames.
  - **Each edge labeled with its kind:** Newtonian translation, rotation,
    the IERS affine edge, or a recorded PROJ operation with its pipeline,
    grids and accuracy.
  - **Stress tests run on the page:**
    - round trips across many CRSs: UTM zones, State Plane in US and
      international feet, polar stereographic, lunar grids, and site
      transforms with rotation and scale;
    - points far from a projection's origin and at zone edges;
    - instants across a leap second, past the EOP table and in trajectory
      gaps;
    - each result shown with its accuracy statement, and pass/fail against
      the stated tolerance.
  - **The viewer, not just a panel (owner's addition, 2026-11-06),** so the
    transforms can be seen working:
    - axis triads drawn for the selected frames at their true placement:
      ITRF and ENU on the globe, a site grid's rotated axes, the Moon's ME
      and PA axes, EME2000 against ICRF (the frame bias exaggerated on a
      control);
    - a design grid (a projected CRS's graticule and a site grid) draped
      on the globe, so projection distortion and grid convergence are
      visible;
    - a rigid placement drawn next to the exact reprojection of the same
      long line, showing the sag growing away from the anchor;
    - round-trip test points drawn as markers, colored by error against
      tolerance;
    - selecting a tree node moves the camera to that frame and highlights
      its path to the root.
- **Plan 4 or later:** `src/frames/frames.ts` imports its constants from
  `src/measure/constants.ts`, so the frames layer depends on measurement.
  Move the shared constants to a neutral module.

_Frames 4a results (r64): engineering frames._ The fourth of five plans
(`docs/superpowers/plans/2026-11-05-frames-4a-engineering-frames.md`) landed
in `src/engineering/` (`proj.ts`, `crs.ts`, `EngineeringFrame.ts`,
`factors.ts`, `alignment.ts`, `fresnel.ts`) and `src/measure/` (design points
and the `projection` accuracy term). Rendering is unchanged, and nothing
loads PROJ until an engineering frame is created. Worst agreement the tests
measured, 2026-11-05:

- **PROJ against pyproj 3.8.0** (PROJ 9.8.1; the engine runs 9.7.1), four
  cases of 12 points, forward and inverse: exactly 0 m, against a tolerance of
  1e-6 m. The cases are California zone 3 in US survey feet with NAVD88,
  Arizona Central in international feet, UTM 11N, and the Moon's south polar
  stereographic. The recorded operation equals pyproj's choice in all four. The
  browser (WebAssembly) build gives the Node result to 1 ulp in height
  (1e-14 m).
- **Round trips.** Design to body-fixed to design, over 21 points on a 50 km
  line and 100 km from the central meridian, with a site transform (rotation
  12.5°, scale 1.0000375): 3.1e-9 m, against a limit of 1e-4 m. The Moon:
  1.4e-9 m. A rigid placement's inverse of its own forward: 2.3e-10 m. The
  site transform's own round trip is exact to 1e-12.
- **Factors against pyproj `get_factors`.** Scale: 5.4e-14 (California),
  2.0e-13 (Arizona), 0 (UTM) and 6.0e-12 (Moon polar). Convergence: 2.3e-14 rad,
  0, 0 and 1.9e-13 rad. The Earth's tolerance is 1e-12 and the Moon's 1e-10.
  The scale is PROJ's parallel scale: its meridional and parallel scales differ
  by up to 1.5e-11 for a conformal projection.
- **Rigid-placement sag** at 10 km of grid east of the anchor: 7.80 m, in the
  spec's 7.8 m ± 1.5 m.
- **Units.** EPSG:6420 and a WKT2 copy of the same CRS with international-foot
  axes, at the same numbers, differ by 2.0034e-6 in ratio (the unit ratio
  is 2.000004e-6; the remainder is the scale factor's change over the 4 m
  origin shift). PROJ's US survey foot is 0.30480060960121924 m, 1 ulp above
  1200/3937.
- **Alignment recovery.** `stationOffset(pointAt(s, o))` returns `(s, o)`
  within 4.6e-13 design units at a start of (1000, 2000), over 20,000 random
  points plus every join and end, left and right. At State Plane magnitudes
  (start (6,000,000, 2,000,000)) it is 2.6e-10 for station and 4.8e-10 for
  offset, which is the ulp of the coordinate itself (9.3e-10). A point on the
  centerline has offset within 2.1e-13. Near the center of curvature the
  station is known only to about 3.5e-9 (offset -90, radius 100, at E =
  6,000,000), the input's rounding times R/(R - |offset|). That is irreducible
  and an independent exact foot agrees to 2.3e-13. A spiral whose
  estimated Fresnel cancellation error exceeds 1e-11 design units (radii
  nearly equal) is evaluated by quadrature instead (6.3e-13 or better).
- **Fresnel integrals** against SciPy 1.16.2 over 6,500 points: 9.9e-16
  relative below t = 1.5, 1.9e-15 up to t = 6 and 5.8e-15 up to t = 100.
  At large t the phase is reduced exactly, and the values match an exact
  reference to 5.6e-17 where SciPy's own phase loss reaches 1.9e-12.
- **Design measurement.** 10,000 ftUS of design distance in California zone 3
  (site scale 1.0000375) is a true distance of 3048.324343749 m. The relation
  `distance × siteScale × metersPerUnit / combinedFactor.mean` predicts it to
  3.3e-6 m. A design measurement equals the same call on the body-fixed points
  to 1e-9 m. The `projection` term for NAD83(2011) + NAVD88 to WGS 84 with
  GEOID18 is 2.015 m (Arizona's operation without a grid, 4 m; the Moon's
  south polar, undefined).
- **Gates**: `npm test` 523 passing; `npm run test:data` 110 passing.

Rulings:

- **R1**: PROJ comes from proj.js v0.9.2's GitHub release, pinned in setup, not from npm (the npm package downloads its binaries on every install).
- **R2**: a frame records its PROJ operation at creation, takes the first candidate whose grids are loaded, and throws naming a missing grid (never a silent ballpark).
- **R3**: CRS references follow the 3D Tiles 2.0 draft's `EXT_geospatial_crs`; the site transform, placement and alignments live on the frame definition, and 4b proposes them as draft additions.
- **R4**: PROJ stops at the body's geographic CRS and the engine's `Ellipsoid` does the rest. Amended: `proj.db` 9.7.1 has no Moon 3D CRS, so the Moon uses `IAU_2015:30100` (2D) and heights pass through as heights above the 1,737,400 m sphere.
- **R5**: units come from the CRS, never assumed (US survey foot 1200/3937 m, international foot 0.3048 m).
- **R6**: the site transform is `[E, N] = [E0, N0] + s·R(θ)·[e, n]`, `U = U0 + u`, with height unscaled and an exact inverse.
- **R7**: scale and convergence come from `proj_factors`, and the combined factor is k × R/(R + h).
- **R8**: alignment geometry is exact to float64 with Fresnel clothoids, a point past an end throws "outside the alignment", and a tie takes the lower station.
- **R9**: design ends add a `projection` accuracy term from PROJ's operation accuracy, and undefined (never small) when PROJ states none or the operation is a ballpark one.

Controller rulings made while building it:

- A rigid placement takes its grid north from the operation itself (one design
  unit along +N, projected on the tangent plane), so it needs no convergence
  formula. Its scale is `metersPerUnit`, not the point scale factor.
- The design result gains `siteScale`, so the ground distance is
  `distance × siteScale × metersPerUnit / combinedFactor.mean`.
- An engineering frame requires a projected CRS. A geographic design CRS
  throws, naming the CRS.
- `epoch` is the coordinate time of a time-dependent operation. `proj_create`
  rejects `CRS@epoch`, so it is not part of the definition string.
- A CRS or pinned pipeline that `proj_create` cannot build is detected by its
  empty result (PROJ does not throw), and a ballpark operation by its name.
- The native module read `PROJ_DATA` at first use, so a second base moved the
  first one's grids. `loadNode` now forces initialization, with a regression
  test.
- `gridFactors` evaluates at the inverse projection of the point's grid
  coordinates on the CRS's own datum, not at the WGS84 position (1-2 m away,
  1e-10 in k).
- Near the join and ends of an element the perpendicular-foot window scales with
  float64 rounding of the coordinates and with 1/|f'| at the foot, so a point
  at the end station is not rejected by its own rounding. A point past the end
  still throws.
- Snyk: a Medium CWE-23 at `proj.ts` `writeGrids` is accepted as a false
  positive (the target is the WebAssembly module's in-memory file system and
  grid names are validated as plain file names). `src/measure` has 0 issues.
  `@emnapi/runtime` 1.8.1 is Healthy with 0 vulnerabilities.

_Frames 4a final review._ No silent wrong answers. The reviewer checked
convergence against RigidPlacement's north (8e-9 rad, the sign right in both
hemispheres), and WebAssembly against native PROJ (body-fixed within 9e-10 m,
scale factor within 1.8e-13). The single fix wave did five things:

- exported the 4a API from `src/index.ts`, with `@emnapi/runtime` now a
  dynamic import;
- removed a false end-of-alignment throw near the center of curvature;
- added WKT2 `BOUNDCRS` support, for the TOWGS84 CRSs GDAL and iModels
  export. Units and factors come from the source CRS, and the operation from
  the bound CRS;
- fixed five setup and loader robustness defects;
- corrected the README.

The re-review then found that every 2D projected CRS with a geocentric
Helmert round-tripped off by millimeters: EPSG:30169 by 2.8 mm, EPSG:26741 by
0.76 mm. The cause is PROJ pushing the height around the Helmert. The inverse
is now refined against the forward, so these round trips are under 1e-8 m, and
an inverse that can't reproduce its forward within 1e-6 m throws. Final
counts: `npm test` 533 passed, `npm run test:data` 121 passed.

_Carried forward from frames plan 4a._ These are deferred items that are real
work. The test-strength and wording nits the reviews raised are left out,
because none of them changes a result.

- ~~**Plan 4b:** tests for design points on the Moon, across two frames and
  with `signal: false`.~~ Done (plan 4b, Task 8). Today's design-measurement
  tests cover the Earth, one frame and the signal path.
- ~~**Plan 4b: grid names in pinned pipelines.**~~ They are read from `+grids=`
  only. A pinned pipeline using `+nadgrids` or `+geoidgrids`, or an optional
  `@` grid, reports an empty or partial grid list. The missing-grid check and
  the accuracy note then don't name its files. Parse those keys as well, in the
  same step that fetches grids. Done (plan 4b, Task 5): `pipelineGrids` reads
  every grid key, with `@` for an optional grid.
- ~~**Plan 4b: a coarser operation taken silently.**~~ Done (plan 4b, Tasks 6
  and 8: `betterCandidates` and the `coarser-operation` warning; the "better"
  rule as the owner amended it). Without its NADCON grid,
  PROJ ranks EPSG:26741's 7 m Helmert first, and the 5 m and 2.15 m candidates
  are never reported. The stated accuracy is honest, but R2 and Review Focus 1
  disagree here. Record the better candidates and the grids they need.
- ~~**Plan 4b: grids differ by platform.**~~ Done (plan 4b, Task 3; Task 21
  removed Node's legacy default). Node saw every grid in `base`; the
  browser saw only the listed ones. Both now see exactly the grids loaded.
- **Plan 4b:** after a PROJ upgrade, regenerate `test/fixtures/frames/proj.json`
  with `scripts/frameFixtures.py`. The 1e-12 factor tolerance against pyproj
  holds because both sides see bit-identical inputs, and sits at PROJ's
  numerical-differentiation noise floor. Folded into plan 4b's Task 2: the
  fixture records `engineProjVersion`, and a test fails, saying to regenerate,
  when the loaded PROJ's version differs.
- ~~**Plan 4b: the native loader.**~~ Done (plan 4b, Tasks 2 and 3). In
  `loadNode` (`src/engineering/proj.ts`), the native `.node` was not re-hashed
  at load, and `PROJ_DATA` was set process-wide. The `.node` is now checked
  against setup's manifest entry, and `PROJ_DATA` points at a private
  per-process staging directory (one PROJ base per process).
- ~~**Plan 4b: PROJ's log noise.**~~ Done (plan 4b, Task 3: `PJ_LOG_NONE`
  while listing; `test:data`'s PROJ lines went from 243 to 1). Listing
  candidates whose grids are missing made PROJ write to stderr (and the
  browser console).
- ~~**Plan 5:** `measureSpan` runs `gridFactors` twice per sample, a `proj_factors`
  call at each end. Cache the factors by design point, or compute them once for
  a span's fixed ends.~~ Done (plan 5b, Task 10): a span computes its two ends' factors once; 100 samples make 2 `proj_factors` calls.
- ~~**Frames example: PROJ object lifetimes.**~~ Neither build exposes
  `proj_destroy`, and the binding's glue uses a `FinalizationRegistry`. PROJ
  objects are probably freed on garbage collection. The example's cases make
  many frames, but it measured no heap, so this is still unverified. Check it
  with a heap measurement over repeated "Run all" runs, rather than planning
  explicit destroy calls. Done (plan 4b, Task 6): the resident memory stayed
  flat over 300,000 probes, so PROJ objects are freed on garbage collection.

_Frames example results (r65): the frames-and-projections gallery example._
The example from the entry above landed in
`packages/next/examples/frames-explorer/` (plan
`docs/superpowers/plans/2026-11-06-frames-explorer-example.md`), built before
4b. It uses only the public API, except for the library fixes below. It has
the frame tree live at the clock's time, stress tests that run in a worker,
overlays on the globe, a six-stop tour, and a "try your own CRS" area (paste
WKT2 for a bound-CRS check; an ion asset ID loads as a tileset for context,
because ion exposes no CRS for an asset). Measured 2026-11-06:

- **Catalog.** 77 cases and 225 results in 24 groups, 54 of them
  fingerprinted (pipeline, grids and coordinates, recorded in
  `fingerprints.json`). The data test (`npm run test:data`) runs all of them
  in 3.8 s alone (up to 8 s on a loaded machine; the worker's run reads 5–7 s).
  The page's "Run all" gives 212 passed, 0 failed and 13 shown (results with
  no pass or fail, such as effect sizes), which is the data test's 225.
  Without frame data, the checks that need none still run and the rest are
  skipped as missing, with the reason shown.
- **Browser against Node.** The browser (WebAssembly PROJ) and native PROJ
  agree on pipelines and grids exactly. Their coordinates differ by up to
  1.86e-9 m, the last bits of musl's libm against the host's. The check
  allows 16 ULP of the point's magnitude (about 1.5e-8 m at Earth radius). The
  worst case reads 3.75 ULP (IOGP's Transverse Mercator forward). The flat
  1e-9 m the plan first set is about 1 ULP at 6.4e6 m, so it was impossible by
  construction. Drift that matters shows up at a millimeter or more.
- **Reference values (R10).** Every expected value is from a source that
  does not use this library or PROJ, retrieved 2026-11-06:
  - NGS Data Sheets for five marks (California 3, Florida East,
    Pennsylvania South, Colorado Central, Arizona Central): SPC, UTM and
    combined factors, with GEOID18 and NAVD 88 heights;
  - IOGP 373-7-2 worked examples (Lambert conic 2SP, Transverse Mercator,
    polar stereographic B, Pseudo-Mercator, the position-vector and
    time-dependent Helmerts), the Ordnance Survey Transverse Mercator worked
    example, and the Wyoming DOT clothoid table;
  - EPSG registry records (transformations 1311, 1133, 1134, 1314, 15484,
    1175 and 8970, ellipsoids, the WGS 84 ensemble), ODOT's OCRS handbook
    (±10 ppm), Snyder (USGS PP 1395), IERS Conventions 2010, NAIF's lunar
    frame kernels, DSN 810-005 (DSS 43), the GDA2020 Technical Manual,
    Ashby & Patla (2024) for lunar time, and the IFC 4.3 Annex E examples;
  - bound-CRS WKT2 inputs written by PROJ 9.7.1's `proj_as_wkt`, from
    `+towgs84` definitions (GDAL and `projinfo` are not installed). These
    are inputs, not expected values.

  Not fetched or not usable: Mahun's spiral chapter (Cloudflare), the TDOT
  spiral guide (approximate formulas and arithmetic errors in its example),
  buildingSMART's geo-referencing user guide (behind a login), the GDA2020
  manual v1.7 and v1.8 (icsm.gov.au timed out; the archived v1.2 was used),
  and USNO's archived leap-second page (empty; IS-GPS-200N was used). No
  case was dropped for a missing source. The IFC case checks the model
  origin and x axis of Annex E.7.3 against the file's own `IfcSite` values
  (0.96 mm), because no public example gives a non-origin model point; the
  example's missing `Scale` for millimeter units is recorded as a finding.
  IOGP's Transverse Mercator forward example differs from the library by
  9.9 mm, while the Ordnance Survey worked example agrees. IOGP's uses the
  JHS formulas, so the difference is the method. It is shown as an effect
  size, and the Ordnance Survey example is the check.

- **Rigid-placement budget** (ground-scaled site grid, measured east from its
  origin; the limit for both checks is 10% of √(2Rε)):

  | Site           | 1 mm     | 1 cm     | 10 cm     | Off √(2Rε) by |
  | -------------- | -------- | -------- | --------- | ------------- |
  | 0°, UTM 31N    | 112.94 m | 357.16 m | 1129.44 m | 0.17%         |
  | 37°, UTM 10N   | 113.01 m | 357.38 m | 1130.12 m | 0.11%         |
  | 60°, UTM 32N   | 113.09 m | 357.61 m | 1130.86 m | 0.04%         |
  | 80°, EPSG:3413 | 112.91 m | 357.06 m | 1129.12 m | 0.19%         |

  So a rigid placement stays within a centimeter of exact out to about 357 m
  from its anchor. The tour's rigid-against-exact line sags 31.4 m at 20 km.

- **Other effect sizes.** Giving no coordinate epoch moves a point by 29.88 cm
  in 16 years (NAD83(2011) from ITRF2014, EPSG 8970). The US survey foot
  against the international foot differs by 2.0 ppm. Lunar time runs 55.99
  µs/day against the Earth's geoid, averaged over the synodic month (Ashby &
  Patla: 56.02); the plan's sidereal month gave 57.53 µs/day, 2.7% off,
  because two ~2 µs/day synodic terms do not average out over it, so the
  synodic month is the right period. The tour's walk from MOON_PA to ITRF
  composes to ±32 mm (ephemeris 10 mm, the Moon's relativity term 30 mm,
  Earth orientation under 0.1%), where the design stub had ±1 m. The
  library's accuracy statement governs.
- **Library bugs the references caught, now fixed:**
  - **`gridFactors` on spherical-method CRSs.** EPSG:3857 returned the
    sphere's scale (1/cos φ), not the ellipsoid's, so Web Mercator combined
    factors were wrong by 0.25% at 60°. The same fault was in EASE-Grid
    (3975, 3973), EPSG:32662, ESRI:54002 and the ARC System zones (2.5e-3
    in k at 60°). Detection now uses the conversion's method from PROJ's API
    (Pseudo-Mercator and the authalic and equidistant-cylindrical
    "(Spherical)" methods), not PROJ-string tokens, and factors come from
    PROJ's derivatives against the CRS's true ellipsoid. Every other CRS keeps
    PROJ's own factors. A related fault: the projection rebuilt from a +R_A
    string inverted a point 0.066° off, so `gridFactors` now locates the
    point with the CRS's own conversion inverse. The derivative path throws at a
    pole, and NAD27, UPS and 3413 at the pole have tests. It costs about 18 µs per call.
  - **Warning codes.** `AccuracyStatement.warningCodes` (optional, kept in
    step with `warnings`) and the `WarningCode` export, so a caller can tell
    a signal-only warning from one that bears on the position without
    matching text. The walk's amber state depends on it.
  - **`build:lib`'s types.** The Node-only PROJ loader moved to
    `src/engineering/projNode.ts`, typed by the little of Node it uses, so
    `tsc -p tsconfig.lib.json` passes with no new dependency. `npm run
build:lib` exits 0, and `loadProj` from its output resolves in a browser
    page in about 115 ms.
  - **`onProgress` loaders.** `loadProj` and `loadFrameData` take an optional
    `onProgress(item, received, total)`. The WebAssembly is passed to the
    glue as one `ArrayBuffer` (the JS heap held three copies of it before).
    `readWithProgress` is exported. The dev server's `/frames-data/` now
    sends `Content-Length`, so dev progress bars are determinate.
  - Smaller additions: `ResolveOptions` and `listOperations` take an optional
    area of interest (PROJ's default spatial filter drops every partial-area
    ED50 transformation, leaving the ballpark one); `listOperations` and
    `areaOfUse` rethrow PROJ's errors with a `cause`, not `[]`;
    `earthOrientationSigma`, `properTimeRate` and `rotationPart` are
    exported.
- **The gallery contract.** An example's `run` may now return
  `{ dispose, panel }`: a React panel that Dyno renders (StrataKit
  components, unstyled by Dyno's DOM-panel rules, which are now scoped with
  `:where(.examples-panel:not(.react))`). The context gains `params`,
  `setParams` and `watchParams` (deep links such as
  `?select=frame:MOON_PA&lens=space&tour=...` go through them, not
  `location.href`), and `link()` for "Copy link". The runner effect is
  passive, so the panel's cleanups run before `dispose`. Leaving an example
  whose `dispose` throws reports in its own dismissible notice.
- **The owner's "no slab" bug** (Examples → realtime-tracks → back showed
  "World: no slab 0"). The cause was the passive-effect runner above: React
  runs a removed tree's passive cleanups parent first, so the page destroyed
  the engine before the runner disposed the example. `share()` in
  `bench/suite/views/exampleRun.ts` now refcounts the engine. It is destroyed
  after the page's release and after every run's cleanup and async start, in
  any order. Five unit tests, and the owner's path, two other examples, quick
  switches and a mid-start leave were checked in the browser.
- **Production-build check (R13).** `npm run build` served statically
  (dist plus `/frames-data/` with `Content-Length`): PROJ loads, Run all gives
  212 / 0 / 13, the design grid draws at ±2.00 m and Orion's path at ±10 m.
  The module worker and its runtime `import()` of `proj_capi.mjs` work with
  no `worker.format` change, so above's "`loadProj` in a production build"
  item is closed, and so is the `build:lib` check. The longest
  requestAnimationFrame gap during Run all was 33 ms in the first build
  and 50 ms in the repo's build (limit 100 ms); the dev server showed
  100–150 ms, from StrictMode's double render and dev React. Production is
  what users run, so the dev figure is informational.
- **Screenshots and reviews.** Two UX reviews on the most capable model,
  against the design stubs and then the real page (headless Chrome with
  Metal; the bundled Chromium falls back to SwiftShader and draws no globe).
  Findings, all fixed:
  - the first pass found the globe undesigned, the tree walk not adding up to
    the composed statement, accuracies stated inconsistently, and result rows
    breaking at 380 px (4 Critical, 19 Important);
  - the second found stop 4 not showing the rigid-placement sag (now a side
    camera, with the sag drawn ×50 and labeled, plus a "Show true scale"
    switch), the walk amber from a signal-only warning, geocentric triads
    running through the Earth, stop 2 near-black at 3600× and then washed
    out (exposure −1.5 at desktop widths, −0.6 narrow), and the narrow
    caption covering downward tips (it folds under 560 px);
  - the browser checks found the HUD's focus ring at 2.4:1 in light mode
    (now 11.6:1) and wrong "Compared against" text on several results.
  - 45 browser checks and 3 more pass: tree, tour, deep links, report, keyboard,
    contrast (0 below AA), reduced motion, Slow 4G loading, switching away
    mid-load, missing data, and a token search (the ion token appears
    nowhere: report, console, URL, storage or DOM).
- **Gates**: `npm test` 859 passing; `npm run test:data` 187 passing;
  `snyk_code_scan` on the example and its tests, 0 issues. In `src/engineering`
  and `vite.config.ts`, the Snyk findings are all at HEAD before this plan
  (the accepted CWE-23 in `proj.ts`, and 5 in `vite.config.ts`, below).

_Carried forward from the frames example._ These are deferred items that are
real work. The wording and test-strength nits the reviews raised are left out,
because none of them changes a result.

- **Renderer / engine: a screen-space wide-line material.** The overlays use
  1-pixel line lists, with hierarchy by color strength and no halos. A
  wide line with a halo would let them read at a distance.
- **Renderer / engine: a no-depth-test draw flag.** The geocentric triads need
  x-ray dashes where they pass behind the Earth. Today a whole axis is hidden
  while its tip is behind the limb.
- **Renderer / engine: a per-layer imagery brightness and saturation control.**
  The example dims the lit globe under overlays with exposure compensation,
  which has no desaturation.
- **Renderer / engine: document draw tints above 1.** The overlays' lighter
  tint relies on them. They render as expected in Chrome on Metal, and the
  engine does not say they are allowed.
- **Renderer / engine: ray artifacts in the lunar terrain's shadows** at tour
  stop 6 (13.10's ray queries).
- **Dyno: a resizable side column that stacks below about 900 px.** The panel
  takes 579 px of 1440, and 380 px of 900.
- ~~**Dyno: a Viewer time-control option to show UTC.**~~ Done in the
  scenarios plan (Task 9): `attachTimeControls` takes `zone` and `label`
  options, and the explorer opens in UTC.
- **Dyno: the root error alert is misleading.** Any error reads "Dyno could
  not read the results".
- ~~**Dyno: with no ion token, the default imagery throws** an uncaught `ion
asset 2: no access token`, on every example.~~ Done (ion token setting): the
  token is a Dyno-wide setting (the rail's ion token popover), an empty
  `VITE_ION_TOKEN` no longer counts as one, and an example whose ion content
  is turned away shows "Paste an ion token" with the button that opens the
  setting. Production builds never contain the `.env.local` token.
- **Dyno: the other `.env.local` keys still go into builds when set.**
  `VITE_GOOGLE_MAPS_KEY` (`bench/suite/suite.ts`) and `VITE_ITWIN_SHARE_KEY`
  (the Viewer's iTwin tab) are inlined as the ion token was. Gate them on
  `import.meta.env.DEV` and add them to `keepEnvSecretsOut`
  (`scripts/vitePluginEnvSecrets.ts`), with a paste field where a build
  needs one.
- **Dyno: a static host of the built gallery needs `/specs-data/`** for
  Real-time tracks' truck model (and `/frames-data/` for the frames
  explorer), which only the dev server provides. The example fails with
  "Unexpected token '<'".
- **Dyno: `/favicon.ico` 404s** on every page.
- **Dyno: a static host of the built gallery needs `/bench-results/index.json`,**
  which only the dev server provides. Without it the gallery shows the
  misleading alert above.
- **Dyno: dev-server endpoint hardening (security).** Snyk on `vite.config.ts`
  finds 5 issues, all from before this example (the Dyno image regression
  and the M0 spikes): two High CWE-23 path traversals at the image-regression
  `readFileSync` and `writeFileSync` endpoints, a CWE-770 on `serveDirectory`
  and two CWE-209 error leaks. The example added one `Content-Length` line.
- **Dyno: the example runner's loose ends.** A rollback of the search params
  between two quick `setParams` calls (`searchKey` and `store.sync`) is
  unverified. A run left mid-way still calls `dispose` after `viewer.destroy`
  and `resumePresentation` (it predates the example).
- **Plan 5: `loadFrameData` takes no `AbortSignal`.** The example terminates
  its worker instead.
- **Plan 5: a bogus huge `Content-Length` makes `readWithProgress` preallocate
  and possibly throw.** Cap the preallocation, or grow the buffer.
- **Plan 5: the stress context's `frames` getter is non-enumerable,** so
  spreading the context loses it. Nothing spreads it today.
- ~~**Plan 4b: a test case for Mercator (Spherical)**~~ (EPSG methods 1026 and
  9841). Folded into plan 4b's Task 9: WKT2 cases on a sphere agree with
  1/cos φ to 6.1 × 10⁻¹³, and on an ellipsoid `gridFactors` refuses, saying
  PROJ projects it on the conformal sphere R_C(φ0). Supporting R_C is carried
  forward. PROJ 9.7.1 can't build 9841 at all.
- ~~**Plan 4b: `frameCache` is unbounded** in the worker.~~ Closed by
  `e9f362f3a5`, which bounds it.
- ~~**Plan 4b: verify PROJ's served bytes in the browser.**~~ Done (plan 4b,
  Task 2). `loadProj`'s browser path didn't check the SHA-256 of `proj.db` or the WebAssembly it
  fetches. The example's report labels them "manifest SHA-256 (not verified
  in the browser)". Hash the bytes after the fetch, and refuse a mismatch, as
  setup already does in Node.
- ~~**Plan 5: explicit timeouts for slow data tests.** These pre-plan tests run
  on vitest's 5 s default and can time out under heavy machine load:
  `test/data/trajectory.test.ts:147` (about 2.6 s),
  `test/data/trajectory.test.ts:197` (about 2.0 s) and
  `test/data/sky.test.ts:86` (about 1.2 s). One `test:data` run failed this
  way during the example's final fix wave. Give each an explicit timeout.~~ Done (plan 5b, Task 1): 30 s on each.
- **Plan 5: a frame's revision (change) signal** (Task 7b, the robot arm).
  A frame whose matrix depends on state beyond the instant (a joint's angle)
  must be built with `cache: false`, and nothing tells a renderer or a cache
  that it moved. A revision counter the frame bumps when its state changes
  would let it stay cached and let the renderer redraw only then.
- **Plan 3: velocities through app-defined frames.** `Frame` carries
  positions only; a joint turning at a rate, or a trajectory under a moving
  joint, has no velocity until plan 3's rates reach `toParent`.
- ~~**Plan 5: composed accuracy beyond 1σ, independent terms** (Task 7b,
  `pointAccuracy`). Confidence levels, correlated terms (two encoders on one
  shaft, a survey shared by two bases) and per-direction error ellipsoids.
  Today an angular term scales by the point's distance from the frame's
  origin, an upper bound, because a `FrameAccuracy` names no axis; a stated
  axis would give the exact lever (the distance to the axis).~~ Done (plan 5b, Task 4): confidence, shared sources, a stated axis, covariance and an error ellipsoid.
- **Plan 5: `accuracyOf` on `pointAccuracy`.** `accuracyOf` (measure)
  composes Earth orientation, ephemeris, trajectory and relativity terms on
  its own, apart from the edges' stated accuracy. The two agree on the ITRF
  edge only as an upper bound (`accuracyOf` scales UT1 by the distance from
  the spin axis). Rebuild `accuracyOf` on `pointAccuracy` once frames state
  every term (a trajectory's `positionSigma` as its frame's accuracy, the
  Moon's relativity term on its edge), and check the catalog's numbers move
  only where the bound tightens.
  (Task 7b's brief had `accuracyOf` move into `pointAccuracy`; deferred by
  ruling in its fix round 1. Already on `pointAccuracy`: earth-turns' answer
  and the frames explorer's walk wherever the route crosses an app-defined
  frame, which since the owner's follow-up of 2026-11-07 is every frame the
  example defines: Sacramento's site, the lunar site, the DSN dishes, the
  drone and the ship state their accuracy (`scenarios/stated.ts`). Still on
  `accuracyOf`: walks over built-in frames only, and each walk's part past
  its nearest built-in frame. Moving those needs a stated rotation axis in
  `FrameAccuracy` (UT1's lever is the distance from the spin axis) and
  frames that carry the terms on no edge. `accuracyOf` still gives a point
  on the Moon no lever for MOON_ME's orientation, and the library's MOON_ME
  still states none. The explorer covers it on its own side: it estimates
  MOON_ME at 3 × 10⁻⁷ rad, labeled "estimated, illustrative", and its walk
  adds that times a point's distance from the Moon's center, so the lunar
  site walks to ITRF at ±0.52 m, not the ±3 cm `accuracyOf` alone gives.)

_Plan 5 design input: routing a design CRS into the frame tree (owner,
2026-11-07)._ Today an engineering frame relates its CRS to WGS 84
(EPSG:4979), and PROJ ranks the candidate operations by a stated accuracy that
the step to the WGS 84 ensemble dominates (1–2 m). For California zone 3 +
NAVD88 that made PROJ prefer GEOID99 plus NADCON5 (±1.14 m) over GEOID18
(±2.015 m), though GEOID18 is NGS's current model and the one an engineer's
data uses. Plan 4b pinned GEOID18 and ruled that a "better" candidate must
keep the same geoid. Plan 5 designs the routing properly:
_Plan 5b (Task 5) did part: the built-in edges state every term (the ephemeris edges' shared source, ITRF's UT1 and polar motion, MOON_ME's estimate as `MOON_ME_ORIENTATION_RADIANS`) and a trajectory's frame states its covariance. `accuracyOf` and the explorer's walk are not rebuilt on `separationAccuracy`; see "Frames 5b results"._

- **Route to the frame tree's own root, not to WGS 84.** Relate a design CRS
  to ITRF2020 at the frame's epoch, through the published transformation for
  its datum (for NAD83(2011), NGS's 14-parameter Helmert to ITRF2020; check
  `proj.db` carries it). Stated accuracies then describe the real chain at
  centimeter level, and comparing candidates means something.
- **Reasonable defaults, decided by the engine.** Per height system, prefer the
  current geoid model (GEOID18 for NAVD88, and so on). Per horizontal datum,
  prefer the published, time-dependent route to ITRF. Rank by stated accuracy
  only among candidates that agree on those. The defaults should be data (a
  small table the engine ships, with sources), not code paths.
- **Explicitly configurable through the API.** An application can name the
  geoid model, the datum route or a whole pinned pipeline per frame, and can
  read back which route was taken and why (`RecordedOperation`, and the
  skipped candidates with their reasons).

_Plan 5 design input: snapping on the GPU, and the client/server split
(owner, 2026-11-07)._ Mirror 1.x: `Scene#snap` is a client-side GPU snapping
pass (an offscreen pick render into an RGBA32F target whose pixels carry the
pick ID, an edge flag and eye-space depth; `Snapping.js`, `SnapFramebuffer.js`),
and `SnapService` / `IonSnapService` is the separable server side, which
refines a snap against the source design data from the client's element, test
point, camera and canvas size (`snapPoint`, `hitPoint`, heat, geometry type,
curve). Plan 4b ships the split with a CPU stand-in for the client side
(retained tile geometry) and the design globe's exact alignment snap standing
in for the server. Plan 5 replaces the stand-in with a GPU snap pass, which
handles occlusion and cost by construction.

_Upstream proposals, for the owner to take to the right people (owner,
2026-11-07)._ Prior-art research (2026-11-07) found that the design globe's
tileset declaration overlaps existing work for its CRS (`ESRI_crs` in 3D
Tiles 1.1; `EXT_geospatial_crs_source`, an open draft in the 3D Tiles 2.0
work, CesiumGS/glTF#131) and its body (`3DTILES_ellipsoid`; the 2.0 root
CRS). The declaration is renamed `BENTLEY_engineering_frame` and composes
with those. What is new, and worth proposing:

- **A placement mode on the source CRS (3D Tiles 2.0, #131):** _withdrawn
  (owner, 2026-11-11); see "no placement modes" in [geometry-through-placement-review.md](geometry-through-placement-review.md)._ It was one field,
  `"placement": "rigid" | "reprojected"`, saying whether content in a design
  CRS is meant to be placed rigidly at an anchor or reprojected vertex by
  vertex. The 3D Tiles 2.0 draft's CRS types and `EXT_georeference` select
  the route instead.
- **Alignments (3D Tiles, and possibly glTF):** horizontal and vertical
  alignment geometry (lines, arcs, clothoid spirals, grades, parabolic vertical
  curves, stationing) as tileset data, with segment kinds named after IFC
  4.3's `IfcAlignment`, so exact snapping and station-offset readouts work on
  streamed content. Ours is `BENTLEY_alignments`, beside the frame.
- **A declared coordinate operation (3D Tiles 2.0):** which operation the
  producer used to reproject, as WKT2 `COORDINATEOPERATION` or `BOUNDCRS`
  (standard) rather than a PROJ pipeline string, so a consumer can reproduce
  the producer's placement exactly, with a rule that every grid it names is a
  published, hashed grid.
- **A site transform mapped to IFC (3D Tiles 2.0):** our rotation, scale and
  origin match IFC 4.3's `IfcMapConversionScaled`; proposing that shape (or a
  reference to it) would let IFC-sourced tilesets carry it unchanged.
- **Deliberately not proposed:** the geoid fallback (EGM96 or EGM2008 when a
  national grid is missing), which is application policy, not tileset data.

_Plan 5 design input: animation, starting with camera transitions (owner,
2026-11-07)._ Flights between rigs need to be configurable: "an instant jump
vs a linear movement vs something eased in and out". This is the place to lay
groundwork for animation in general.

- **A small animation core, not camera-specific.** An animation animates a
  value over a timeline, with timing (duration, delay, easing) and playback
  controls (play, pause, reverse, playback rate, a `finished` promise), after
  the Web Animations API. Easing is a named preset, a cubic Bézier, a spring
  (which keeps its velocity when interrupted) or a function. Keyframed
  values use glTF's samplers (step, linear, cubic spline). The same core
  drives camera transitions, the design globe's placement morph, and later
  any animated property.
- **Every animation chooses its clock,** the wall clock or the scene clock
  (owner: "configurable between wall clock and scene clock for all
  animations").
- **A camera transition is a blend between two live rigs,** after Unity's
  Cinemachine: each frame evaluates the source and target rigs at the
  current time (so a moving target such as Orion is tracked throughout) and
  blends them by the eased weight in a common frame of the tree. A cut is
  duration 0.
- **Path and timing are separate.** The path is the route (straight in the
  blend frame, an arc over the surface as 1.x's `flyTo` does with its maximum
  height, or a spline); the easing maps time onto it.
- **Interruption is configurable per transition (owner, 2026-11-07),**
  with a default for user input: `stop` (the camera stays where it is, on
  the rig it was nearer to), `handover` (the transition's velocity carries
  into the user's drag, spring-style), or `finish` (input waits until the
  transition completes). Programmatic interruptions, such as a new
  transition starting, use the same policies.
- **Configurable at three levels:** per call, per pair of rig kinds (a
  Cinemachine-style table of defaults, such as "globe → ride-along: 3 s
  ease-in-out"), and app-wide.

_Terms (owner, 2026-11-07):_ a draw's **placement** is how its content
coordinates reach the render space, rigid (affine) or per vertex; the frames
module computes it from a **coordinate operation** (PROJ's and ISO 19111's
term), and applying one is **reprojection**. "Warp" and "deformation" are
avoided (the latter means crustal motion in geodesy, as in PROJ's `defmodel`),
as is "projection" for this (it is the camera's).

_Plan 5 design input: one flat render space, and frames above it (owner,
2026-11-07)._ This replaces the question of a default frame tree. "The
default frame tree that's needed for a scene is application dependent and we
don't need to load up a bunch of frame tree stuff for an app that's never
going to go into space."

- **The rendering core knows one flat space and nothing about frames:** a
  Cartesian render space in meters with no meaning attached, a transform per
  draw, and a camera pose in it. Precision stays camera-relative, so one core
  serves a site, the Earth and the Moon. The core's only frame-adjacent
  feature is that a draw has a **placement**: affine (a matrix) or per vertex,
  for content that is reprojected,
  flattened or morphing. Without the frames module, a draw's transform is a
  matrix the application sets.
- **The frames module is optional and sits above the core.** At each tick's
  time it resolves every frame in use into the render space and hands the
  core each draw's placement. The render space is one chosen frame, the
  **render root**: ITRF for the globe view, the engineering frame for design
  view (so design coordinates are straight axes, and the globe's tiles reach
  it flattened through the frame's projection), MOON_ME on the Moon. Design
  view is not a special mode, and the design-space morph blends two render
  roots.
- **Frames are built on demand, so an app pays for what it uses.** Providers
  load when a frame that needs them is first asked for: an ellipsoid-only
  Earth (the globe default); Earth orientation (IAU models, plus IERS data
  for precision) when GCRF is asked for; an ephemeris for the Moon or the
  Sun; PROJ for an engineering frame; a trajectory with its data. Whoever
  asks chooses the precision.
- **The Viewer picks defaults** (for a globe app: ITRF as the render root,
  the ellipsoid Earth, nothing else); applications on the lower-level APIs
  choose for themselves, or leave the module out.
- **A draw's placement is also where tessellation meets the coordinate
  operation:** the frames module knows each draw's placement into the render
  root, so subdividing reprojected geometry (see "tessellating reprojected models")
  can be driven from the same information.

_Design input after plan 5: one GPU tessellation engine, for reprojected models
and B-reps (owner, 2026-11-07)._ Rendering B-reps (trimmed NURBS and other
analytic surfaces from CAD) needs view-dependent tessellation too. A CPU
kernel such as SMLib may tessellate, but the engine wants it on the GPU. One
engine should serve both cases: evaluate surface patches (Bézier or NURBS)
and the draw's placement together in compute, subdivide by screen-space error,
handle trim curves (trim textures or signed distance fields), and draw with
indirect draws (WebGPU has neither tessellation nor mesh shaders). Prior art
to start from: Guthe et al.'s GPU trimming and tessellation of NURBS (2005),
feature-adaptive subdivision (OpenSubdiv), and direct ray-casting of trimmed
NURBS. Plan 5 only keeps the seam open: per-vertex placement and the frames
module's per-draw projection are what this engine would consume.

_Plan 5 design input: groundwork for post-V1 WebGPU features (owner,
2026-11-07)._ Apply the bindless pattern ([risks.md](risks.md), "Bindless textures: not in the PoC, designed for in 2.0": "design for it; don't build
it": one seam every caller goes through, plus a test that fails on any
bypass) to the features the WebGPU working group has tagged for after V1, so
adopting them later is a backend swap rather than a refactor. Only where the
seam costs nothing today; no design compromises in the current WebGPU path.

- **Ray queries and acceleration structures.** Every ray or spatial query
  (picking, snapping, line of sight, height queries, [ray-queries-where-they-run.md](ray-queries-where-they-run.md)) goes through one
  query interface that names its frame and instant. Today it runs on CPU BVHs
  or compute traversal; a hardware ray-query backend drops in behind it.
  Acceleration-structure lifetime (build, refit, evict) hangs off tile and
  draw lifetime in streaming through one hook, so a per-tile BLAS and a
  per-frame TLAS have a place to live.
- **Mesh shaders.** Geometry reaches the GPU through the GPU-driven
  submission path only (the frames spec's §7, M1), and the content pipeline can carry
  meshlet or cluster data, consumed today by compute culling and indirect
  draws. A mesh-shader backend replaces the compute-plus-indirect stage, not
  the content format or the callers.
- **Multi-draw indirect, push constants (immediates), texel buffers and
  64-bit atomics:** per-draw constants and draw-argument buffers go through
  one seam each, so multi-draw indirect and immediates replace an emulation
  rather than call sites; 64-bit atomics would enable a visibility buffer or
  software rasterization later ([risks.md](risks.md), "Bindless textures: not in the PoC, designed for in 2.0"'s reassessment).
- **Subgroups and cooperative matrices:** keep the portable kernels with
  subgroup fast paths behind a capability check ([risks.md](risks.md), "Platform and WebGPU risks"), and extend the same
  rule to any matrix-unit work.
- **Multiple queues and async compute:** the job graph marks each pass's
  queue affinity and dependencies now, so async compute is a scheduling
  change.
- **Capability tiers:** one registry of probed features and limits ([gpu-limits-and-capacities.md](gpu-limits-and-capacities.md)'s
  tiers), read by every backend choice; Slang shaders are organized per
  capability, so a new stage (mesh, ray query) adds a module rather than
  editing every shader. Each seam gets a bypass test like
  `test/bindless.test.ts`.

_Plan 5 design input: modules with interfaces (owner, 2026-11-07)._ "We
should generally be thinking about how to make 2.0 more modular so pieces of
it can be reused and composed in interesting ways and we can easily plug
different module implementations in for places where that makes sense."
Plan 5's API review designs the seams:

- **Frame management as its own module,** behind interfaces to the core
  drawing code, so an application can include it, leave it out, or replace
  it, for example with a frame manager that isn't built on PROJ. Coordinate
  conversion becomes a service the module supplies (PROJ is one
  implementation). Placement takes a third mode beside rigid and
  reprojected: content that arrives already reprojected by its producer or
  host. Picking reports frame-tagged positions through an interface the
  module fills in.
- **Measurement and tools as their own module,** open source in this
  repository. 1.x keeps its measurement toolkit separate from the engine,
  and 2.0 does too: the core provides picks, design coordinates, accuracy
  terms and the frame tree; the module provides the tools and their UI. A
  host application can use it or bring its own.
- **Snapping** keeps the client/server split (plan 4b, Task 16): the client
  side is the core's, and the server side is a service any host can supply.
- **Later, after prototyping: the drawing layer's portability.** Whether
  drawing can be modularized enough to support WebGPU's compatibility mode,
  or a WebGL 2 backend. Not now: the owner wants no design compromises in
  the WebGPU approach while the prototype is built. Notes on the layers this
  would need are in [layers-engine-renderer-backend.md](layers-engine-renderer-backend.md).

_Plan 5 design input: tessellating reprojected models (owner, 2026-11-07)._ A
reprojected model's edges are straight chords between reprojected vertices,
so a large flat face (a runway slab, a panel row) sags below the curved
Earth by about d²/8R at its middle (2 cm for a 1 km edge, 2 m for 10 km),
and cuts through terrain. Plan 4b's generator subdivides faces at write time
until the sag is under the tile's geometric error. Plan 5 designs how the
engine handles models it didn't generate. WebGPU has no tessellation stage,
so the options are:

- compute-shader adaptive subdivision with indirect draws;
- per-vertex placement in the vertex shader, carrying design coordinates and applying the
  curvature correction per vertex, so the subdivision can be coarse;
- refinement driven by screen-space error, folded into tile selection;
- requiring producers to subdivide, and stating the rule in
  `BENTLEY_engineering_frame`.

_Plan 5 design input: clipping, beyond the first terrain clips (owner,
2026-11-07)._ "If using CWT ends up with the terrain poking through some of the
synthetic tilesets geometry we might need a quick clipping API for terrain,
probably just clipping rects or simple polygons to start and a note to think
more deeply about this later (like using vector tiles to specify clipping
boundaries)." The quick API is built: a globe's `addTerrainClip` takes a
rectangle or a simple polygon in geodetic degrees, at most 32 a world and
1,024 vertices each. Each region is packed into the world's clip-box buffer
and tested per fragment in the region's tangent plane, a gnomonic projection
from where its anchor's normal meets the polar axis. A grid over the plane,
refined until a cell lists at most about 8 edges, holds per cell a sample
point and whether it is inside, so a fragment tests only its cell's edges.
The CPU sets a bit per region in each globe tile's draw record for the tiles
the region touches (by its grid, so a long strip masks only the tiles it
crosses), and no region costs nothing. Picks, terrain rays and height
queries treat clipped terrain as a hole (`globe/terrainClip.ts`). Measured on
the MacBook Air at 1456×1360 (Cesium World Terrain, with other pages sharing
the GPU, so ±2 ms noise): four site regions in view cost about 1 to 2 ms, and
those with a 660-vertex, 50 km corridor strip about 4 ms. Most of it is in
the depth, prepass and shadow passes, which test every fragment of a touched
tile; the shading pass doesn't, since after the depth prepass a clipped
fragment can't equal the depth. The 0.1 ms the owner asked for isn't met.
Plan 5 designs the rest:

- **Clipping boundaries from vector tiles.** Site footprints, parcels and
  building outlines arrive as vector tiles, many more than 32 and with
  thousands of vertices. Per-tile region lists replace the 32-bit mask (a
  list per draw in the clip buffer), and the vector tile's own tiling can be
  the prefilter. A coverage mask rasterized per terrain tile (a texture slice
  like imagery's, composited from the vector tiles: inside, outside, or
  "edge here") makes most fragments one sample, however many regions and
  edges there are, with the exact edge test only in the mask's edge texels.
  That is also the way to the 0.1 ms budget: today every fragment of a
  touched tile projects into each region's plane.
- **Holes and nested regions.** Today a region is one simple ring. Polygons
  with holes (a courtyard left standing) and regions inside regions need
  even-odd or nonzero winding across rings, tested in one pass, and a CPU
  validator for rings that touch.
- **Inverse clipping: terrain only inside.** A site shown on its own (the
  terrain outside its boundary removed) is the same test inverted per globe,
  or per region with a flag. The CPU's prefilter then inverts as well: a tile
  wholly outside every region is dropped from selection, not drawn and
  discarded.
- **Clipping imagery and other content, not only terrain.** The record bit
  and the clip buffer don't care what draws: 3D Tiles (the existing
  buildings a design replaces), imagery layers (clip one layer, show the one
  under it), models and point clouds. 1.x has `ClippingPolygonCollection` on
  tilesets and the globe; 2.0 should have one clip collection that any
  content can reference. GPU ray casts (`World.castRays`) need the clip test
  too: today they still hit clipped terrain, and `raycast.slang` already
  binds the base tier's eight storage buffers, so the clip data has to share
  one of them.
- **Clipping in a frame other than the body's.** Regions are geodetic on the
  globe's body. A design's site boundary is in its engineering frame (a
  projected CRS, or a local grid), and its edges are straight there, not on
  the ellipsoid. Regions should be able to name a frame of the frame tree and
  be tested in it: the projection plane is already per region, so a region
  in a projected CRS is a different plane (that CRS's, linearized near the
  site), and a moving frame updates the region's anchor per frame.
- **Smaller things.** Edges are aliased: they discard per pixel, not per
  sample. Height clamping inside a clip stands on collision tilesets, or keeps
  its height. A clip can't be edited in place: changing one is remove then
  add, and dragging a vertex re-uploads the region.

_Plan 5 design input: camera rigs attached to frames (owner, 2026-11-06)._
Today every camera controller quietly assumes the Earth. `GlobeController`
works in Earth-fixed coordinates, constrains the camera to the ellipsoid, and
needs a pick under the cursor, so in space the only way to start a rotation is
to grab the Earth. `InspectController` takes "up" from the ellipsoid's
east-north-up at its target. The frames example's custom orbit "up" axis
(2026-11-06) is a stepping stone, not the design. Plan 5 designs this properly,
with a brainstorm first:

- **The camera rig belongs to a frame.** Its pose lives in a frame of the tree
  (ITRF, GCRF, MOON_ME, an engineering frame, a trajectory), resolved to world
  coordinates every frame at the clock's time. That choice decides what holds
  still: on MOON_ME the Moon stays put as time runs; on GCRF the Earth turns
  underneath; on a trajectory the camera rides along.
- **Inputs are expressed in the rig's frame.** The pivot is a point in it (a
  body center, a site, a selected frame's origin). "Up" is one of its axes (a
  pole, an orbit normal, an engineering frame's up). Heading is measured from
  a reference axis in it (north, grid north, x).
- **The rig is only a pose in a frame (owner, 2026-11-07).** It holds no
  rules about where the camera may go. **Controllers own the constraints:**
  a globe controller may keep the camera above a body's surface (that body's
  ellipsoid or terrain, so the Moon's on the Moon) or let it go under;
  free-fly has only a range limit. Underground visualization is a first-class
  case, so no constraint lives anywhere a controller can't turn it off
  (seeing underground, such as translucent terrain, is the renderer's).
- **The rig splits position from orientation (owner, 2026-11-07),** after
  Cinemachine's Body and Aim, so any follow behavior is expressible and the
  user chooses it:
  - **position:** an anchor (a frame's origin, such as Orion's), an offset,
    and the frame the offset is expressed in;
  - **orientation:** a frame whose axes the camera's up and forward follow,
    or an aim (look at a target, with an up vector taken from a frame);
  - **damping,** optional, per part.

  Every orientation choice is a frame in the tree, built with SPICE's
  **two-vector dynamic frames** (a primary axis along one vector, a secondary
  toward another, re-evaluated over time): a cockpit view is the target's body
  frame; an orbital view is primary up from the central body, secondary along
  the velocity (local vertical, local horizontal); a stars-fixed view is a
  constant frame captured in GCRF when the rig attaches; a level-horizon
  follow is primary the target's forward axis, secondary up from the central
  body. Named presets (`"cockpit"`, `"orbital"`, `"inertial"`) sit on top of
  the generic form. Two-vector frames are a frame-tree feature in their own
  right (antenna pointing, sun-relative frames), not just a camera one.

- **Controllers are policies over the rig.** The globe controls are a rig on
  ITRF with Earth's ellipsoid and grab-the-surface input. Orbit is a pivot
  plus an up axis. Free-fly can join them.
- **A CAD-style controller for design space (owner, 2026-11-07),** with
  orbit about the point under the cursor, pan, zoom to the cursor, and
  animated standard views (top, front, side, isometric). The camera API
  offers `fitBounds(bounds)`; what to fit (a selection, a model's extents)
  is the application's. Orthographic or perspective is the camera's
  projection, not the controller's. Section and clip planes are the
  renderer's and the application's.
- **Gestures are bindings, not subclasses (owner, 2026-11-07).** One gesture
  set works the same on the globe and in design space by default, and a host
  can change it without writing a controller:
  - **actions:** the controller's named operations (orbit, pan, zoom, look,
    tilt, roll, fly forward, frame selection, the standard views), each done
    once by the controller;
  - **bindings:** a plain, serializable map from input to action, such as
    `{ "drag:left": "orbit", "drag:middle": "pan", "wheel": "zoom" }`,
    covering mouse, touch and keys; a host passes a whole map or merges
    overrides into a preset;
  - **presets,** after Blender's "Blender" and "Industry Compatible"
    keymaps: 2.0's default, and CAD-style sets;
  - **custom actions:** a host registers a function over the rig and binds
    it like any other;
  - **full replacement** stays possible, because a controller is an
    interface.
- **Flights between rigs need a defined hand-off,** for example the Earth to
  a lunar site: interpolate in a common frame, then re-attach.
- **The sky follows what the rig is attached to (owner, 2026-11-06).** Today
  the Earth's sunrise and sunset sky colors still show while the camera
  orbits in space, as in the frames example's orbit scenes. The sky and
  atmosphere should come from the rig's body and the camera's place relative
  to it:
  - inside or near a body's atmosphere, that body's sky scattering;
  - in orbit, black space, with the atmosphere drawn only as a shell on the
    body's limb;
  - on the Moon, no atmosphere at all.

  **Physically, not by blending (owner, 2026-11-07):** "physically correct as
  the camera transitions between frames in the same way that zooming out of
  earth right now shows the atmosphere accurately … a general system there
  rather than naive blending." Every body declares its atmosphere, or none.
  Each atmosphere is evaluated from the camera's true position relative to
  that body, in the body's own frame, whatever frame the rig is attached to,
  and what is seen through each is composited physically (the Moon seen
  through Earth's air from the ground; Earth's limb shell against black sky
  from the Moon). The frames example's orbit scenes showing Earth's sunrise
  colors in space are a bug in how the camera's position reaches the
  atmosphere, not a missing blend.

**Design space and the global view, with a morph between them (owner,
2026-11-06).** An engineering model, such as an iModel in its design CRS,
needs two ways to be seen:

- **In isolation, in its native design space.** The render frame is the
  engineering frame: design E, N and up as straight axes, in design units.
  Straight design lines draw straight. Nothing is projected, and picking
  reports design coordinates.
- **In the global view.** The same model is drawn Earth-fixed and reprojected
  through its recorded operation (4b's reprojected placement). It warps to fit
  the ellipsoid, so design lines curve and grid north leans by the
  convergence.

A camera transition between the two morphs the content. The model warps from
flat to fitted as the camera pulls out, and the terrain and imagery tiles
under it start laid out flat in the design CRS and curve down onto the globe.

- **Prior art:** CesiumJS 1.x's scene morph between 3D, Columbus view and 2D.
  Columbus view is a flat projected world, and the morph animates each vertex
  between its projected and 3D positions with a blend parameter. Here the
  "flat" projection is the model's design CRS, not a fixed map projection.
- **Per-vertex dual positions, or a GPU-side projection.** Each vertex needs
  a design-space and an Earth-fixed position. Content has both. Terrain and
  imagery tiles need their design-space positions too. PROJ per vertex is
  too slow, so fit the projection per tile (affine or low-order polynomial),
  with a stated error bound. The accuracy display (frames example R8) says
  what the fit costs.
- **What the camera does:** the rig's frame (above) changes from the
  engineering frame to the Earth-fixed one across the morph. Heading follows
  grid north at one end and true north at the other.
- **Links:** 4b's rigid and reprojected placements are the two end states.
  The frames example's rigid-vs-exact stop and its design grid with true
  north are small versions of this picture.

**The default frame tree: a catalog, and a tree in use (owner, 2026-11-06).**
The frames example's scenarios showed the question: every scenario's tree
started from the full built-in set, so "The Earth turns" drew HCRS, EME2000
and the Moon's frames it never used. Two things are mixed up in "the default
tree". Plan 5 should separate them:

- **The catalog** is every frame the library knows by name, each defined by a
  published convention: ICRF, GCRF, ITRF, EME2000, HCRS, EARTH_ICRF and
  MOON_ICRF/ME/PA, then TEME, ecliptic frames and other bodies. It is always
  addressable and costs nothing until something uses a frame.
  - **Prior art:** Orekit's `FramesFactory` builds well-known frames lazily.
    SPICE has every built-in frame but fails clearly when a frame's kernel
    isn't loaded.
- **The tree in use** is the frames the scene touches, plus their ancestors.
  This is what a diagram shows, and what a scenario builds. "The Earth turns"
  is then ICRF → GCRF → ITRF → its site frame, and nothing else.
- **Data loads with first use, not with the catalog.** ITRF needs EOP, the
  Earth and Moon branches need DE440, and MOON_ME needs the lunar PCK. A
  globe-only app shouldn't fetch an ephemeris because the catalog lists the
  Moon.
- **A stand-in model declares its accuracy.** A frame can work before its data
  arrives on an analytic stand-in, but the edge then states the stand-in's
  wider accuracy and visibly changes when the real data loads. Otherwise the
  frame is unavailable until its data loads. Choose per frame, never silently.
  The cautionary tale: the sky Moon on Simon 1994 put the lunar pole triad
  404 km off with nothing saying so (fixed by `setFrameData`).
- **The renderer's own use counts as use.** A plain globe touches GCRF for the
  sky and the sun, and MOON_ICRF/ME for the Moon disk. A diagram shows these
  dimmed, as "used by the sky", so the tree is honest without implying the
  scene added them.
- **The root:** keep ICRF (barycentric), so a lunar site and a ship meet at a
  common ancestor. Run the Earth branch on a declared stand-in until DE440
  loads, so a globe-only app never waits for it. Orekit roots at GCRF to avoid
  that dependency; the stand-in removes the reason.

**Accuracy along a route: declared per edge, composed by the library (owner,
2026-11-06).** "Seems easy for a user to screw up." The rule: the app
declares each edge's error in its own terms (an angle for an encoder or Earth
orientation, meters for a link tolerance, a survey or an ephemeris, exact by
definition, or not stated), and the library composes it for a point along the
route. The frames example's Task 7b lands the first-order version: an optional
`accuracy` on `Frame`, and `pointAccuracy`, which scales angular terms by
their lever arms, adds meter terms, combines them root-sum-square, names the
dominant term, and propagates "not stated" by name. Plan 5 designs the rest:

- **Confidence is declared, and never mixed silently.** Each edge says whether
  it gives 1σ, a 95% bound or a hard maximum. The composer converts where a
  distribution is stated, and refuses to combine otherwise, saying why.
- **Correlated terms.** An edge whose error is systematic, or two edges that
  share one error source (the same encoder model, the same EOP table), add
  linearly rather than root-sum-square. The declaration needs a way to say so.
- **Per-direction error.** First-order radii are fine for small angles. Full
  covariance through each edge's Jacobian gives an error ellipsoid at the
  point, and shows that an encoder error is across-track, not along it.
- **Time-varying accuracy.** Some edges, like predicted Earth orientation,
  degrade with age. The query takes the instant, and the breakdown says when a
  term is a prediction.
- **Where it surfaces:** picking, measurement and the frames diagram all report
  the composed accuracy with its breakdown, so "±1.8 mm, mostly the shoulder
  encoder" is something any app gets, not something the example computes.

**When the frame tree is rebuilt, and what needs to be async (owner,
2026-11-06; revised after measuring).** The frames example hitched about once
a second while its clock played. The first suspect was the once-a-second
tree rebuild, which prompted the owner's question about an async API "so they
can be spread across multiple frames like other stuff in the engine".
Measuring showed the rebuild takes 0.4 ms. The real cost was every consumer
(the whole React panel, about 117k elements a second) redrawing every frame,
whether or not anything had changed (Task 4d of the frames-explorer scenarios
plan). The owner, on seeing that: "if rebuilding the frame tree is that fast
we probably don't need the async API". So:

- **The tree and single queries stay synchronous.** Building or rebuilding a
  tree, and one transform or one point at an instant, cost microseconds to
  well under a millisecond. Making them async would add API cost for nothing.
- **Change tracking is the lesson.** Each frame carries a revision, which goes
  up when its placement's inputs change: a joint angle, a newly loaded kernel,
  a new EOP table, a revised edge accuracy. Consumers (diagrams, overlays,
  labels, statements) key their work on the revisions along their route and
  skip it when nothing moved. This is also the "change signal" gap that the
  example's robot-arm task records.
- **Time-dependent values publish on change.** An edge whose accuracy drifts
  with time, such as predicted EOP, publishes a new value only when it
  changes by a visible amount. Only its own consumers update.
- **Bulk work only, if anything, gets an async shape.** Sampling a long
  trajectory into a mesh, accuracy statements over many samples, proof checks
  and PROJ batches are genuinely heavy, and today they run in the example's
  worker. Plan 5 decides only whether the library offers them as cancelable
  (`AbortSignal`), progress-reporting operations that run in a worker or
  under the engine's per-frame budget. That is a question about bulk
  operations, not about the frame tree.

**Ray queries through the frame tree (owner, 2026-11-06).** Ray queries
([ray-queries-and-path-tracing.md](ray-queries-and-path-tracing.md)) assume one Earth-fixed world today. Plan 5 makes them frame-aware:

- **Rays in a frame.** A ray is given in some frame at an instant (a dish's
  ENU, a drone camera's mount, a robot tool, a lunar site), and the library
  carries it through the tree to each target's frame. It doesn't assume
  Earth-fixed meters.
- **Targets in their own frames.** Terrain and tilesets belong to a body
  frame: Earth terrain in ITRF, the Moon's terrain and imagery in MOON_ME,
  and an iModel in its design space or placed through its CRS. Moving bodies
  (a ship, a drone, a spacecraft) carry their geometry in their body frames.
  A query transforms the ray into each target's frame, not every target into
  one world.
- **Time.** Each target is placed at the query's instant. Across long
  distances, light time can matter: Earth to Orion, or Earth to the Moon. The
  query states whether it is geometric or light-time corrected, as
  `lineOfSight` does.
- **Precision.** Rays and hits stay float64 on the CPU. GPU rays use the same
  hi/lo, camera-relative origins as the rasterizer, and hits are reported in
  the frame the caller asked for.
- **Accuracy.** A hit's position carries the composed accuracy of the route
  from the ray's frame to the target's frame, through `pointAccuracy`, plus
  the target geometry's own accuracy.
- **Links:** the frames example's terrain line of sight (Task 5b) is the
  Earth-only first step; the dish, ship, drone, robot-arm and "Everything at
  once" scenarios are the use cases; frame-tagged picking (plan 3 R8) is the
  same question for the cursor.

**A public API review (owner, 2026-11-06).** Plan 5 is also the time to
look at the public API as a whole. Decide what belongs on which side of it,
based on what has been built on top of the engine so far: the frames
explorer, the realtime-tracks example, the Viewer widgets, the stress catalog
and the bench. The review has two outputs: a map of today's surface, and
proposed moves. Questions to answer:

- **Promote.** What did the examples have to build themselves that every app
  will need? Candidates from the frames explorer:
  - the accuracy types and their composition (`EdgeAccuracy`, `accuracyOf`,
    which Task 7b is already moving);
  - `branchPath` and the tree model;
  - app-defined frames with their accuracy;
  - point placement for labels and markers;
  - camera rigs and orbit controls;
  - the stale-answer and generation patterns around async work.
- **Demote.** What is exported only because an example reaches into it, or
  exposes internals (stress-context getters, renderer state the examples
  poke)?
- **Shape.** Check the API's consistency: sync versus async, `AbortSignal`
  everywhere work can be canceled, `dispose` lifetimes, events or
  subscriptions versus polling, units and frames named in types, and errors
  that say what to do.
- **Stability tiers.** Which parts are stable and which are experimental, how
  that is marked, and what the examples are allowed to import, given that
  the examples are documentation. Bundle size and tree-shaking follow from
  this split. The Viewer's `skyState` import, carried forward above, is one
  case.

Camera rigs and render frames are one question from two sides: plan 5 is also
where the world stops being drawn Earth-fixed (R6 of plans 2 and 3), so
design them together. Open choices for the brainstorm: what holds still by
default, how flights cross frames, how input maps onto a rolled frame, and
how picking reports positions in the rig's frame (frame-tagged picking, plan
3 R8).

_Carried forward from the stress-test example's industry review (owner,
2026-11-06)._ These library gaps came up while planning the frames example's
stress tests. The example can't test them until the library has them.

- **Plan 5 or a frames add-on: TEME and SGP4.** Satellite operators publish
  orbits as two-line element sets. These are propagated with SGP4 in the
  TEME frame. Neither is in the frame tree. Add TEME under GCRF, with its
  equation-of-the-equinoxes rotation, and add an SGP4 trajectory source.
- **Later: rail alignments.** Rail chainage crosses station equations
  ("station back = station ahead"), and rail uses non-clothoid transitions:
  Bloss, cubic parabola and sine half-wave. `Alignment` has neither.
- ~~**Plan 4b: tidal and chart datums.**~~ Done where PROJ-data has grids
  (plan 4b, Task 7): depth axes (`verticalDirection`), and Denmark's
  DKLAT(2023) tested. Hydrography and coastal work use lowest astronomical
  tide and mean lower low water (as in NOAA's VDatum). NOAA's surfaces
  aren't in PROJ-data; hosting them is held for the owner.
- **Later: grid references and accuracy reporting.** MGRS and the US
  National Grid aren't in PROJ, and defense and emergency response use both.
  Accuracy statements also need a CE90/LE90 form: 90% horizontal and
  vertical error.

_Watch: lunar reference systems (checked 2026-11-06)._ No lunar 3D CRS or
height system is standardized yet.

- **CRS codes.** PROJ's IAU 2015 lunar codes and Esri's (for example
  ESRI:104903, "GCS_Moon_2000") are 2D: latitude and longitude on the
  1,737,400 m IAU sphere.
- **Height convention.** The USGS lunar data standard measures height above
  that sphere. The engineering frames do the same: PROJ does the horizontal
  projection, height passes through, and `MOON`'s sphere gives body-fixed
  coordinates.
- **What to check before building on the Moon** (plan 5, or any lunar
  engineering frame):
  - **NASA's LunaNet Lunar Reference System Standard (LNIS-TBD-3011).** It was
    scheduled for a public v1 in November 2026 (IOAG/ICG Cislunar 2026
    workshop slides). Its release was unconfirmed on 2026-11-06.
  - **The International Lunar Reference System** and its first realization,
    ILuRF2026 (arXiv 2510.15484 and 2607.27762; A&A 2026, INPOP-based
    realizations). It is built from combined lunar ephemerides, with the
    origin at the Moon's center of mass and published as a time series from
    1970 to 2050. When it is adopted, add it to the frame tree beside
    MOON_ME and MOON_PA, built from that series.
  - **The IAG/IAU Joint Working Group 1.1.3 height system** (lunar frames,
    time and heights). A lunar geoid will most likely ship as a grid. It plugs
    in like NAVD88 does on Earth: through an engineering frame's pinned PROJ
    pipeline with a vertical grid step, which plan 4a supports.

**Frames explorer scenarios: results (2026-11-07).** The explorer now opens on
eleven scenarios instead of a tour and a test report
(docs/superpowers/specs/2026-11-06-frames-explorer-scenarios-design.md, plan
docs/superpowers/plans/2026-11-06-frames-explorer-scenarios.md). Each one
builds its own frame tree, answers one question on the globe, says how sure it
is, and shows how that is checked. The stress catalog is still there, behind
the Verification tab.

- **The scenarios and their trees.**
  - **One path, three frames:** how fast is Orion going? GCRF, ITRF and
    MOON_ME, with Orion's OEM.
  - **The Earth turns:** where is Greenwich pointing, against the stars?
    ITRF under GCRF, with measured Earth orientation.
  - **Where's the Moon from here?** Its direction and distance from
    Sacramento, through the site's ENU frame, checked against JPL Horizons.
  - **Stand on the Moon:** how fast does a clock run at a lunar site?
    MOON_ME, MOON_PA and the site's ENU frame.
  - **A dish tracks Orion:** light time and pointing from DSS-43, with the
    DSN horizon masks.
  - **A BIM site on the globe:** a site grid under a design CRS (rotation and
    scale), at San Francisco or Portland.
  - **Survey a corridor:** station and offset on a design alignment.
  - **A drone over the site:** what the camera is looking at on the design
    grid. The drone and camera mount are app-defined frames from a track.
  - **A ship enters San Francisco Bay:** its position on California zone 3,
    and whether the mast sensor's sight line to Harding Rock's buoy clears
    the headland.
  - **A robot arm on the pad:** a joint chain on LC-39A, tied to NGS mark
    AK1155 and checked against survey mark CCV6.
  - **Everything at once:** any two objects from the other scenarios, with
    the route between them through the meeting frame. The checked pair is
    DSS-43 ← Orion.
- **The proof model.** Each check has a kind: published reference, measured
  data, hand formula, round trip or live re-run. Only measured rows may say
  "validated". Each scenario has a checked setup. Off it, the reference rows
  say they apply at the checked setup, and the round trips and live rows
  re-run at your setting. The answer's accuracy comes from the frames' stated
  accuracy (`Frame.accuracy`, `pointAccuracy` and `dominantTerm`, new in
  this plan), up to the nearest built-in frame, then from the example's
  accuracy composer beyond it, combined root-sum-square. A failed evaluation
  shows its error with Retry, and no figure from an earlier setting.
- **Terrain line of sight.** `terrainLineOfSight` now returns the deciding
  margin (clearance, error, position). The explorer never says "clear"
  inside the terrain's error band, or without a bound. Over undrawn or coarse
  terrain it says "can't tell yet". The drone gives a spot only when the ray
  before the hit is drawn and clear.
- **Data sources.**
  - **The ship's track is synthetic,** along the 33 CFR 167.400 inbound lane.
    No AIS extract is used.
  - **Harding Rock's buoy** is from a YRA compilation that cites the USCG
    Light List; the Light List itself returned 403.
  - **The robot arm's pad** is at NGS mark AK1155, carried through PROJ to
    ITRF2020 at epoch 2026.0 with CCV6's velocity. **CCV6** (PID DI3564)
    comes from NGS's NAD83(2011)↔ITRF2020 values on the NODD S3 bucket.
  - **The DSN masks** are the published receive masks (DSN 810-005, module
    301).
  - **Orion's OEM** is NASA's Artemis II ephemeris, as in plan 3.
- **Screenshots.** Task 9 took about 150 of them: every scenario in both
  themes at 1440 and 380 px, the checks on and off the checked setup, the
  Expand dialog, and the failure state. They're in the plan's workspace and
  not committed (owner, 2026-11-06).
- **Gates.**
  - `npm test`: 1,365 pass.
  - `npm run test:data`: 295 pass. `fingerprints.json` only gains two
    entries (`reference-values.ngs-di3564.itrf2020` and
    `rigid-placement-budget.site-gap.drop`).
  - tsc and eslint are clean, and `npm run build` builds.
  - `snyk_code_scan` finds 0 issues in the example and `widgets`. In `src`
    it finds only the accepted CWE-23 in `proj.ts`, which predates this plan.
  - The browser checks pass: Review Focus 1–5, keyboard-only use, reduced
    motion, the console, and the token search.

_Carried forward from the frames explorer scenarios plan._ These are deferred
items that are real work. The wording and test-strength nits the reviews raised
are left out.

- **Renderer / engine: GPU labels and wide polylines for the example's HUD.**
  The labels are DOM elements positioned each frame, and the overlay lines are
  1-pixel lists. Port them to the vector renderer's GPU labels (with a
  decluttering compute pass) and to wide polylines when those land. Keep the
  precision lesson from the jitter fix (labels and markers far from the Earth)
  as a vector-renderer test. The globe's labels can still collide.
- **Plan 5: a GPU viewshed.** The drone's viewshed overlay isn't built,
  because the CPU trace can't meet its 50 ms budget.
- **Plan 5: the Moon as a tileset.** In Earth views, the Moon is a backdrop
  body, and the scenarios say so.
- **Plan 5 / [ray-queries-where-they-run.md](ray-queries-where-they-run.md): a near-field bounded terrain trace.** Trace 20–50 km
  round each end with tiles at a level chosen for the error, whatever the
  camera is doing. Today a sight line takes the error of the tiles the
  camera happened to load. That is why the ship's lighthouse reads "in
  sight" at the checked setup only where the Gate is drawn at level 13 (a
  desktop canvas, once the tiles load; the scene's camera was moved close
  for it) and "can't tell" where coarser tiles stand in (the buoy it
  replaced always did), why the drone often reads "can't tell yet", and why
  an Earth end in the capstone says "not judged from this far out".
- **Plan 5 / [ray-queries-where-they-run.md](ray-queries-where-they-run.md): a per-tile terrain error over open water,** or a
  quantized-mesh water mask. The level-wide error overstates the error over
  flat sea many times over.
- **Plan 5: one ENU convention.** Body frames take "up" at their foot;
  `eastNorthUpFrame` takes it at the point (about 0.13 µrad apart at 250 m).
  Pick one and document it.
- **Plan 5: move the example's `accuracyOf` onto `pointAccuracy`.** Partly
  done (the owner's follow-up, 2026-11-07): every frame the example defines
  states its accuracy (`scenarios/stated.ts`: published where a source gives
  one, DSN 810-005 for the dishes; estimated and labeled for the drone and
  the ship; exact by definition for a chosen site or a knob's value), the
  walk composes those with `pointAccuracy` up to the nearest built-in frame,
  and each answer carries its app-defined ends at the walk's figure (a data
  test holds them). What remains: the built-in part of every walk, from
  that frame on, is still `accuracyOf` (through `measure`). Moving it needs
  a stated rotation axis on each frame, a home for terms that sit on no edge
  (light time, relativity), and a trajectory's covariance as its frame's
  accuracy (Orion's), and it will move catalog numbers. MOON_ME's
  orientation now has its lever at a point on the Moon in the explorer's
  walk, from an estimate that lives in the explorer (3 × 10⁻⁷ rad,
  `scenarios/stated.ts`), not in the library: the library's MOON_ME still
  states none, and `accuracyOf` still has no lever term for it. That, and a
  published figure to replace the estimate, remain. _Plan 5b (Task 5) did part: the built-in edges state every term (the ephemeris edges' shared source, ITRF's UT1 and polar motion, MOON_ME's estimate as `MOON_ME_ORIENTATION_RADIANS`) and a trajectory's frame states its covariance. `accuracyOf` and the explorer's walk are not rebuilt on `separationAccuracy`; see "Frames 5b results"._
- **Plan 5: the API review of this plan's library additions.**
  - Whether `LEVEL_ZERO_ERROR` stays exported (it was exported for the test
    hill).
  - `castTerrainRay` and five terrain tile types became public alongside
    `terrainLineOfSight`.
  - Some production modules export test-only helpers.
  - `Trajectory.velocitySigma` is new.
- **Example: the coarse-terrain guard applies only to the capstone.** The
  "not judged from this far out" rule, for an end whose terrain error is
  above `COARSE_TERRAIN_METERS`, belongs in the shared line-of-sight text, so
  every scenario's trace gets it.
- ~~**Plan 4b: the chart datum (MLLW).**~~ Folded (plan 4b, Task 7): MLLW
  depth (EPSG:5866) is reported as unavailable, naming it, because PROJ-data
  has no grid for it. The ship's heights stay NAVD88, and the answer says
  that charts use MLLW.
- **Library: widgets expose their occluders** (`occluders()` or
  `data-occludes`) instead of the example matching Dyno class names in
  `labelPanels.ts`. The credits and the time bar also overlap (a z-index fix
  in `widgets/credits.ts` and `timeControls.ts`).
- **Example: split the older files over 800 lines** (`overlays.ts`, `host.ts`,
  `globe.ts`, `stress/runner.ts`) when they are next changed.
- **Example: tag overlay frame requests by scenario,** so the first frames
  after a switch aren't evicted and rebuilt.
- **Example: the worker returns path sample times,** so Orion's dot sits at
  the clock's time.
- **Example: panel boxes from a ResizeObserver** instead of a
  `querySelectorAll` each frame.
- **Example: the terrain scan's `cancel()` resets `waitingSince`,** and its
  first slice on cold tiles takes about 30 ms.
- **Example: the tree diagram's keyboard and fit.**
  - Every edge is its own Tab stop (19 in the capstone); a roving tabindex
    would make it one.
  - The route row's "can't both fit" test looks only at width.
  - The "Checks ↓" pill can cover the tree.
- **Example: the route steps show PROJ's pipeline as a wall of text.** Show
  the operation's name, and put the pipeline behind a disclosure.
- **Example: the notation test** covers answers and check rows, but not route
  steps or globe labels.
- **Example: knob and answer precision differ** for the same quantity, and
  "Run all again" shows before a full run has happened.
- **Example: whether the tree's key should keep the "added" versus "your app"
  distinction** (owner's call).
- **Example: "Show source" shows only `main.ts`** (later gallery work).
- **Data: spot-check the DSN masks** against a fresh download of the
  spreadsheet.
- **Data: check the buoy's position against the USCG Light List.** It came
  from a third-party compilation. Fixing it is one constant.
- **Dyno: the shell overflows at a 380 px viewport.** See the resizable side
  column item above.
- ~~**Dyno (security): `npm run build` inlines `VITE_ION_TOKEN`**~~ Done
  (`d2cca2f34a`, the ion token setting): production builds contain the token
  in 0 files. It was inlined into 10 bundles.
- **Bisect gap:** `de5a508f52` doesn't type-check on its own; the next commit
  fixes it.

**Frames 4b results (2026-11-07).** Plan 4b
(docs/superpowers/plans/2026-11-07-frames-4b-placement-and-geoids.md) places
long design models on the globe rigidly or reprojected per vertex, picks and
snaps on them in design coordinates, and measures in design and true terms, in
any country's height system. Grids are fetched lazily and checked against a
pinned PROJ-data catalog. The library work is in `src/engineering/` (grids,
`EngineeringFrame.load`, structured pipelines, geoid fallbacks, depth axes,
`TilesetPlacement`, the tileset declaration, `pickDesign` and snapping),
`src/measure/` (the `pick` and `geoidFallback` terms and two warnings) and
`src/streaming/` (`Tileset3D`'s declaration, placement and retained geometry).
The §8.1 example is the new gallery page `examples/design-globe/`, with a
generator in `scripts/designTiles*` that setup runs. The README documents the
API.

- **Round trips** (design to displayed to design):
  - the corridor's tilesets, over 4,617 vertices (every 50th of every leaf):
    rigid 2.9 × 10⁻⁹ m, reprojected 1.5 × 10⁻⁵ m, against 10⁻⁴ m;
  - the site-grid building in the explorer's tileset-placement group: a rigid
    placement's inverse of its own forward is 8.2 × 10⁻¹⁰ m, against 4 ULPs
    of an Earth-radius coordinate (about 3.7 × 10⁻⁹ m), and reprojected
    3.0 × 10⁻⁹ m;
  - every leaf vertex of the seven ladder sites, both placements: within
    10⁻⁴ m. Each pair of tilesets draws the same design point per vertex.
- **Rigid sag on the corridor,** from `answers.json`: 7.955 m and 8.053 m at
  the stations nearest 10 km from the anchor (one on each side; the spec says
  7.8 m ± 1.5 m), 31.645 m at 20 km (31 m ± 3 m), and 34.08 m at the far end,
  20.76 km away. Task 10's test on plan 4a's California frame reads 7.80 m and
  31.16 m. The site-grid building's sag 20 km along its x axis is 31.199 m,
  and a hand formula that includes GEOID18's rise agrees within 0.089 mm.
- **Geoid cases against their publishers** (Task 9; each tolerance is the
  publisher's stated precision):
  - Ordnance Survey, OSTN15 and OSGM15, 28 points: worst 7.4 mm horizontal
    and 2.0 mm in height, within 1 cm;
  - NSGI, RDNAPTRANS2018, 15 points: 0.098 mm, within 1 mm;
  - Geoscience Australia, AUSGeoid2020, 6 grid nodes: 0.0018 mm, within 1 mm;
  - GSI, JPGEO2024 and GSIGEO2011, 7 points each: 0.047 mm and 0.050 mm,
    within 0.1 mm;
  - NGS, GEOID18, 8 grid nodes: 0.40 mm, within 1 mm;
  - NGA, EGM2008, 4 points from NGA's archived test output: 9.92 mm, within
    1 cm (the margin is thin: PROJ's bilinear against NGA's interpolation);
  - EGM96 has no reference: NGA's test values are spline-interpolated, and NGA
    states no precision for interpolating the grid.

  GA and NGS are checked at grid nodes, because their calculators don't
  interpolate bilinearly between them (1 to 2 mm off the nodes).

- **NGS mark HS5109 (GOLD CREEK) against PROJ.** PROJ's California zone 3,
  through the corridor's own operation, gives the datasheet's easting to
  0.0016 ftUS and its northing to 0.0051 ftUS, within 0.00664 ftUS (the
  datasheet's millimeter rounding converted to feet, plus its 0.005). Its
  body-fixed position matches the datasheet's X, Y, Z within 0.6 mm. The
  page's distance from the mark to the centerline is 501.188 ftUS against
  501.193 ftUS from NGS's own zone 3 values, within 0.0094 ftUS.
- **Snapping.** An exact snap on the alignment lands on the analytic geometry
  within 10⁻¹⁰ ft in the browser (the check allows 10⁻⁶ design units). The
  10,000 ft pair measures 10,000.000 ftUS horizontal, 10,001.9998 ftUS in 3D
  and 3,048.8485 m true, equal to the answers. A client snap to a barrier
  edge was within 1.1 × 10⁻⁸ m of the analytic barrier top, and a surface
  fallback 8 mm off, inside its stated ±77 mm. A client snap over a
  200,000-vertex draw takes about 3 ms.
- **The opening measurements.** Station 1700+00 against its own true position
  reads 30.586 m when rigid and 0.000 m reprojected. The mark leads with its
  live rigid offset, 19.278 m, and 0.000 m reprojected.
- **The scale ladder's rigid error at each model's edge,** with its parts
  (curvature d²/2R, the scale factor rigid ignores, and the geoid's rise):

  | Site      | Model      | Error at the edge  | Mostly              |
  | --------- | ---------- | ------------------ | ------------------- |
  | Amsterdam | building   | 2.56 mm at 30 m    | the scale factor    |
  | Tokyo     | city block | 69.1 mm at 489 m   | the scale factor    |
  | Jakarta   | port       | 0.293 m at 1.52 km | curvature and scale |
  | Sydney    | airport    | 0.390 m at 1.99 km | curvature           |
  | Phoenix   | solar farm | 0.474 m at 2.00 km | curvature and scale |
  | Nairobi   | campus     | 2.04 m at 5.07 km  | curvature           |
  | London    | pole line  | 18.34 m at 15.4 km | curvature           |

  The three parts predict every measured error within 3.7%.

- **Gates.**
  - `npm test`: 2,046 pass. `npm run test:data`: 457 pass and 1 skipped
    (EGM96's missing reference).
  - The frames explorer: 240 results unchanged, 251 in all; `fingerprints.json`
    only gains 8 keys.
  - Both tsc configs, eslint and prettier are clean, and `npm run build` and
    `npm run build:lib` build. Eslint needed one fix: it now ignores
    `packages/next/dist/` and `dist-lib/` (flat config doesn't read
    `.gitignore`).
  - `snyk_code_scan` finds 0 issues in `src/engineering`, `src/streaming`,
    `src/measure`, `src/io`, `src/scene`, `examples/design-globe` and
    `widgets`. Every finding elsewhere predates the plan: in `scripts/`,
    three Low CWE-23 in `erfaTables.mjs`, `leapTable.mjs` and
    `frameFixtures.py`; in `vite.config.ts`, the five the frames example carried forward;
    in `bench/suite`, seven (below); in `test/projGrids.test.ts`, two Low
    CWE-319 on its loopback servers, accepted. The CWE-23 in `proj.ts` that
    plan 4a accepted no longer appears.
  - Browser checks on the final page: the design globe loads with no console
    errors, the corridor's "Rigid's error at the edge" row reads "curvature
    33.8 m, the scale factor 2.3 m, the geoid's rise −159 mm", and Copy link
    with a real click says "Link copied".

Calls made, one line each (the plan lists all 23 with their undo costs):

- **GEOID18 pinned (owner).** The corridor, its building and Phoenix pin
  GEOID18's operation, because PROJ ranks NADCON5 with GEOID99 (±1.14 m)
  ahead of it (±2.015 m). A pin that matches a PROJ candidate keeps that
  candidate's stated accuracy.
- **The "better operation" rule (owner).** A skipped candidate is better only
  if it isn't a ballpark, states a strictly smaller accuracy and reads the
  same vertical grids. A ballpark choice still lists every accurate candidate.
- **Phoenix is on NAD83(2011) / Arizona Central in international feet**
  (EPSG:6405+8228), not the original NAD83, so it needs only GEOID18.
- **`BENTLEY_engineering_frame` and `BENTLEY_alignments` (owner),** vendor
  extensions in `tileset.json`, composed with `ESRI_crs`,
  `EXT_geospatial_crs_source` and `3DTILES_ellipsoid`: the source CRS from
  those when present (they must agree), the body from `3DTILES_ellipsoid`.
  The old name, `EXT_engineering_frame`, is read with a warning.
- **The design globe's story (owner):** a viewer audience first; the rigid
  placement's error is the point; a morph between placements with the other
  ghosted (translucent, once the GPU timer fix showed its true cost); true
  scale by default; two opening measurements; a six-step tour you can leave.
- **The scale ladder (owner):** seven sites from a building to a 30 km pole
  line, each as rigid and reprojected tilesets. Rigid stays as most viewers do
  it, without the scale factor, and each site's error is split into its
  parts, so the small rungs teach grid against ground and the big ones
  curvature.
- **Snapping keeps 1.x's client/server split (owner):** `ClientSnapService`
  (the client, on the CPU over retained geometry until plan 5's GPU pass),
  `SnapService` (the server), and `refiningSnap`, which shows the client's
  answer and updates it with the server's after checking it. `shownPoint`
  draws an exact point that lies inside the mesh on the surface above it.
- **Only verified grids.** An operation may read only plain-named grids that
  `loadGrids` verified against the catalog, whatever chose it: PROJ, a pin or a
  tileset's declaration. Both platforms see exactly the grids loaded.
- **A coarser operation warns, never throws** (`coarser-operation`); 4a's R2
  stands.
- **Jakarta replaced São Paulo** (SRGI2013 with INAGeoid2020 heights, on the
  EGM96 fallback): `proj.db` 9.7.1 has no Brazilian vertical CRS.
- **Tokyo reads JPGEO2024,** PROJ's first choice and GSI's official geoid;
  GSIGEO2011 is a test case.
- **Tidal datums:** Denmark's DKLAT(2023) is the tested LAT; `proj.db`
  relates the Dutch LAT depth only by a ballpark.
- **EGM2008 is opt-in** (80.6 MB, `--grids egm2008`), loaded whole.
- **Strict WKT2 everywhere** for declared and app-supplied CRSs; the
  explorer's "Try your own" still takes WKT1, labeled, under the grid rule.
- **`/frames-data/proj/` still serves the pinned GEOID18 grid** that setup
  verified; every other grid comes through `/proj-grids/`.

Held for the owner, still open:

- The owner's real long models for the design globe's ion slots (built empty),
  with their CRS, units, site transform and placement mode.
- Hosting NOAA's VDatum surfaces (MLLW, MHW and others).
- Taking the upstream proposals (the placement mode, alignments, a declared
  operation, the site transform) to the right people.
- A hosted grid service, with CORS and possibly cropped tiles.
- Plan 5's spec (`docs/superpowers/specs/2026-11-07-frames-5-earth-to-moon-design.md`)
  and its four questions.
- Whether a frame with `geoidFallback` and `allowBallpark` should take the
  ballpark, as it does today.

_Carried forward from frames plan 4b._ These are deferred items that are real
work. The wording and test-strength nits the reviews raised are left out.

- **Grids: cropped regional tiles** for large grids such as EGM2008 (setup
  could make them).
- **Grids: deformation models.** `load` skips a candidate that needs a
  deformation model's `.json`, because PROJ names its component grids only
  inside it. Read them from the model and load them.
- **Grids: stale files in the store.** A crashed run leaves a uniquely named
  `.partial` (sweep them in `ensureGrids`), and grids dropped from the sets
  (NADCON5, GEOID99 and GEOID03 tiles, Arizona's HPGN, the Dutch LAT) stay in
  `grids/`.
- **Engineering: Mercator (Spherical) on an ellipsoid** (EPSG 1026): support
  PROJ's conformal sphere R_C(φ0) in `gridFactors`, with tests.
- **Engineering: the vertical-grid diagnosis compares datums by name,** and
  a named best operation may itself need an absent grid. Compare by code where
  PROJ gives one.
- **Engineering: an ESRI_crs-only tileset isn't placed** (it has no placement
  mode), a `wkid` of 32767 or less is read as EPSG, and the area of interest
  derived from a bounding volume is untested on the Moon.
- **Engineering: EGM96 against its publisher.** Add a case if NGA's grid-node
  or bilinear values become reachable.
- **Streaming: the content worker grows 7.9 kB** because Vite inlines the
  declaration parser's dynamic import in workers, and `modelMatrix`'s setter
  compares exactly.
- **Snapping: occlusion is tested only against the hit draw,** and not at all
  when it kept no geometry; the scratch buffers stay at about 11 MB after a
  200,000-vertex snap. Plan 5's GPU snap pass handles both by construction.
- **Plan 5 API review:** `@internal` test options (`pins`, `importGlue`,
  `catalogPins`) no longer ship in the public `.d.ts` (`stripInternal`, the
  file split's second pass); check nothing outside needed them.
  `projTokenProblem` and `Alignment.horizontalElements` are newly exported.
- **Renderer / engine: translucency passes** could clip to the blended draws'
  screen rectangle, the exact-mode sort could skip empty pixels
  (`composite.slang`), and `translucentRange` ignores the frustum.
- **Renderer / engine: the sleeping frame loop.** Wake on the inputs it still
  can't see (`View.readHdr`, `PointCuller`'s pipelines, Safari's pixel-ratio
  changes), let per-frame sync loops (the translucency example) sleep, and
  document the accessors' behavior change (`Camera.version` and the View
  fields lose their own keys). The Viewer's clock listener isn't removed on
  destroy (older), and MOON_ME's label jumps 10 px for one frame while
  playing (untraced).
- **Example (design globe):** external camera changes don't wake its driver;
  the accuracy's ±2.0 m per end is GEOID18's height figure and should say so
  or split horizontal from vertical; a snap that falls back to the surface
  should say so in the status line; the legend lists the ghost and ribbon
  while the ruler view sets them aside.
- **Example (frames explorer):** its legend and tree read `operation.accuracy`
  for a fallback frame, and the accuracy bar's shares ignore unknown terms;
  an EGM2008 opted in stays loaded for the page's later runs; the split
  between a failed and a missing grid is untested.
- **Dyno (security): `bench/suite`'s Snyk findings,** all from before plan 4b:
  a High DOM XSS in `suite.html`'s `document.write` of the 1.x build URL, two
  Medium DOM XSS from stored chart HTML (Compare, Trends), one from an error
  into a script `src` (Explorer), a CWE-770 in `frozen.mjs`'s static server, an
  open redirect in `limitsTier.ts`, and a false positive on `ionToken.ts`'s
  storage key.
- **Repo: prettier in `packages/next`.** Run there, `prettier --check .` flags
  37 files from before plan 4b (generated shader JSON, bench results,
  `tsconfig.lib.json`, three scripts), because the root `.prettierignore`,
  which leaves JSON out, applies only from the root.
- **CI: run `packages/next`'s vitest on Node 24.** CI runs only the root's
  Karma tests, and the package now declares Node 24 in `engines`.

_Engine fixes made alongside plan 4b (2026-11-07)._

- **On-demand rendering stays idle again** (`2bfc87e395`, `4df1579ad4`): a
  settled exposure ignores the meter's own half-float rounding, which had kept
  OSM Buildings rendering every frame; the test runs on Node 22 and pins the
  band's edges.
- **Translucency and the GPU timer** (`62a56785d4`, `8c8e87361a`):
  translucency passes run only for translucent draws a view shows, and the
  GPU timer counts overlapping passes once (Apple GPUs had counted a small
  translucent quad as about 46 ms, not about 1 ms). Benchmark results carry
  the timer's version, and older GPU medians are kept apart as
  `gpuSummedP50`.
- **The frame loop sleeps when settled** (`075cd8b27e`, `2f2940e6bb`): no
  requestAnimationFrame while nothing changes, woken by every fingerprinted
  change, with the order tick, render, then after-tick work.
- **No native PROJ call on an object PROJ couldn't create** (`4cc6030f87`),
  which had segfaulted Node.
- **Node 24 in `packages/next`'s `engines`** (`ce15acf113`), as the gallery's
  `DisposableStack` and the tests need.
- **Dyno shows Scenes without runs** (`95371f3fff`).
- **Dyno has one ion token setting** for every view (`d2cca2f34a`), and builds
  never embed `.env.local`'s token.

**Frames 5a results (2026-11-09).** Plan 5a
(docs/superpowers/plans/2026-11-07-frames-5a-core-and-camera-chain.md) built
the core and the camera chain: the entry points and their dependency rule,
render space with anchors and an eye per anchor, rigs, the camera layer and
the reference frame resolver, the catalog, `attachSky`, picks and the pick
interpreter, the coordinate service and `hosted`, per-vertex placements, the
query interface, the seams with their bypass tests, and the surface map.
Scene items ([scene-items.md](scene-items.md)) replaced the design globe's pairing of two tilesets.
Closed by Task 22.

- **Parity.** On Metal, the parity suites the tasks ran (image, models,
  tracks, heights, tileset) matched the base commit except the tileset
  suite's row 16, `InstancedRTC` unlit. Its FLIP moved
  from 0.015939687808453853 to 0.015947530756269895, with the other two
  values at 0.015694062963991402 and 0.14132077991962433. The GPU's inputs
  are bit-identical. Metal reorders a float sum when a kernel's code changes:
  once `relativeMatrix` multiplies by the anchor's axes, even the identity,
  even behind a branch that never runs, the compiler sums the instance's
  translation in the order the code is written, and 14 of 75 components move
  by one float32 ulp (3.6 to 22 micrometers at 40 to 380 m). That is not a
  precision loss: against the exact sum the old order was closer, but
  neither order is promised. One 4× sample at pixel (113, 152) flips. Plan call 18
  promises the inputs, not the pixels, and no engine change was made. Whoever
  re-baselines the gate takes these three values. Any later kernel edit can
  move a row the same way, so explain a one-ulp difference before accepting
  it.
- **Draw records grew by 16 bytes** each, for the placement (about 4 MB at
  the most draws).
- **`castRays` and the terrain line of sight test unplaced triangles.** A
  ray ignores a per-vertex placement. This is documented, and left for 5b or
  the tessellation engine.
- **Loops.** The Slang loops that ran to a count read from a buffer or a
  local are now bounded by constants with an early `break`, and their buffer
  indices clamped: the image-based lighting prefilter and irradiance
  kernels, the light table's assignment and the surface's per-pixel light
  list and sample loop. Tint still guards every loop it can't prove finite in
  the Metal it makes, so the gain is the rule, not a faster kernel.

_Carried forward from frames plan 5a._ These are deferred items that are
real work. The wording and test-strength nits the reviews raised are left out.

- **Tile selection and casters: measured costs, accepted for now.**
  Selection takes 2.75 ms on Google's tileset at 150 m. The shadow casters'
  bytes are 2.09 and 2.45 times the view's on one photogrammetry tileset. A
  return after 60 s with a full cache can cost reloads, since cold tiles
  are dropped only on evidence they are not coming back. The shadow pass's
  own GPU time is unmeasured.
- **Queries (5b).** Standing queries don't reach `measure` yet, and the
  explorer's re-trace should subscribe to standing answers. Tile spheres are
  wider than their tiles (use `Tile.volume` boxes), and a per-world revision
  over-triggers standing queries.
- **Sky (5e).** `attachSky` falls back for the whole sky at once, where the
  resolver falls back per edge of a route. Settle which is right when the
  physical sky goes per body, together with the exposure tuning (the 0.18
  target and the highlight guard need more testing).
- **Emission in nits (owner, 2026-11-08; build after the file split, before
  5e).** glTF 2.0 defines an emissive value of 1 as 1 cd/m2, and says adding it
  directly to display pixels is incorrect. `KHR_materials_emissive_strength` is
  a unitless multiplier that keeps those units. So a material with the
  extension emits factor x strength nits, multiplied by exposure and metered,
  with no scale of our own. A material without the extension stays
  display-relative, which departs from the core spec on purpose: most models
  treat 1 as "fully lit", and read literally they'd go black outside the night.
  An override per item or material (`emission: "physical"` or `"display"`)
  handles the jump this leaves between no extension and a strength just past 1;
  display-relative stays out of the meter. A custom shader has one field,
  `material.emissive`, in nits: a draw with a custom shader is physical unless
  its item or material says `emission: "display"`, which a stylistic glow can
  use. Seven of the Slang playground's presets write it, and the handbook's reel
  uses four of those shaders, so they need `emission: "display"` or new values.
  Emitters only show to the camera, and don't light their surroundings. Try it on real models, since the default may change. Today
  `gltfParse.ts` ignores the extension and `surface.slang` treats all emission
  as display-relative.
- **Exact lists and the meter.** A layer with emission writes a second list
  node for the meter, so the 32-node cap holds 16 such layers, and at the cut a
  layer's emission can stay without its body. The moments branch of `layersAt`
  has no Node port or pin.
- **The public API review's (CS-102) list (the API review):**
  - "placement" means five things: `SceneItemOptions.placement` (a number from
    0 to 1), the `Placement` union, `Tileset3D.placement`, `ModelPlacement`,
    and `/proj`'s `TilesetPlacement`, `PlacementMode` and `placeRigid`. An
    item's number can't grow into a fitted operation, so rename it to a
    position blend before anyone relies on it;
  - `/proj` holds what a host needs (`placeHosted`, `pickDesign`, `Alignment`,
    `SnapService`, `ClientSnapService`, `EngineeringFrame`), beside the `Pj*`
    types. Split an engineering entry from `/proj` before 5f adds to it;
  - "opacity" has two meanings: a region at 0.5 stops picks and can stay
    ground, an item at 0.5 lets picks through, casts nothing, and is ground
    only if nothing opaque draws;
  - two ways in: `Engine.addTileset` against `loadTileset` plus `world.add`;
    `TilesetOptions.customShader` and `style` against
    `SceneItemOptions.shader`; `show` on both; `anchor` and `modelMatrix` on
    the tileset though an item attaches to a reference frame;
  - `SceneItem.surfaceRank` holds a rule from one example (a translucent item
    counts as ground only where no opaque item draws), under a header saying
    the engine gives items no meaning. A host may want otherwise;
  - core names in the public surface: `castTerrainRay`, `TerrainRay*`,
    `SlicePool`, `SliceUser`, `STAGES`, `MaterialFlags`, `BASE_*_LIMITS`,
    `PLACEMENT_MONOMIALS`, `collectFullDetailContents`, `summarizeContent`,
    `tileHeaderKey`. Ion's names belong behind the content source of [ion-as-a-module.md](ion-as-a-module.md);
  - smaller: `FrameStats` beside `FrameResolver` and `FrameMotion`;
    `PickCamera` in both core and `/proj`; a `Globe` takes degrees in
    `terrainClipped`, radians in `sampleHeight`; `/frames` publishes
    `toParentMatrix`, `rotationPart` and `frameBias`; `/proj` lists
    `projTokenProblem` and `strictWkt2`; `/measure` re-exports `C` and `GM_*`;
  - a view bit freed by removing a view can be reused, so an item masked to the
    old view appears in the new one;
  - `eastNorthUpToFixedFrame`'s engine callers keep the normal at the point,
    for parity with the Earth, so two east-north-up conventions differ by
    about 0.13 microradians at 250 m;
  - `sampleHeight`, `exactHeight` and `surfaceHeight` work in
    radians;
  - what the geometry-submission check can't see: storage-bound vertex data,
    a plain `pass.draw`, calls through a variable, and a second Slang
    arguments buffer under another name;
  - a hosted tileset gets design coordinates only through the pick
    interpreter, not through `pickDesign` or snapping;
  - `Sky.starsOn` is private, and the re-rooting page reads it;
  - examples that import `src/` internals, for the review to list.
- **Upsampling follow-ups.** No local imagery stop (an `upsampledFromParent`
  rule); a refetch per child after eviction, which bypasses the terrain
  request window; imagery slices sit outside the byte budget; the worker path
  of upsampling has not been run.
- **Smaller engine items.** `Ellipsoid.cartesianToCartographic` loses about
  0.3 micrometers of height near the equator. Tile load, unload and slot reuse
  have no clip tests. A thrown server error does not reset the snap run. The
  design globe shows a thin line where its item switches to opaque, and its
  rigid normals stay as they are until the [geometry-through-placement-review.md](geometry-through-placement-review.md) review.
- **Content the engine doesn't load yet.** Implicit tiling, all of a tile's
  multiple contents, S2 volumes, metadata and glTF 1.0 content; point clouds
  and vector tiles (`pnts`, `vctr`, `geom`) wait for the vector renderer.

Owner-requested later work, written up as notes and designs, is [layers-engine-renderer-backend.md](layers-engine-renderer-backend.md) to
[geometry-through-placement-review.md](geometry-through-placement-review.md): layers, scene items ([scene-items.md](scene-items.md)), reference data ([reference-data.md](reference-data.md)), the indirect
draw risk on Intel integrated GPUs ([indirect-draws-on-intel.md](indirect-draws-on-intel.md)) and the review of geometry
through placement ([geometry-through-placement-review.md](geometry-through-placement-review.md)).

**Frames 5b results (2026-11-09).** Plan 5b
(docs/superpowers/plans/2026-11-07-frames-5b-frames-library.md) built the
frames library: two-vector reference frames with freezing and angular
velocity, rig presets with `held(view)`, piecewise reference frames, accuracy
composed beyond first order, rays through the reference frames (body,
impostor and tileset targets, light time, terrain bands), bulk work in slices,
`measureSpan` as bulk work with factors once, PROJ batches, and a time
formatter the time controls now use.

- **What was measured against SPICE** (twoVector fixture, 12 instants across
  the Artemis II span). Axes: worst 7.6 × 10⁻⁹ rad (orbital, inertial and
  level presets: 2.5 × 10⁻⁹, 2.4 × 10⁻¹¹ and 3 × 10⁻¹⁶ rad), inside call 6's
  1 × 10⁻⁸. Angular velocity by ±0.5 s central differences misses call 6's
  tolerance for ORION_LVLH (3.9 × 10⁻⁷ rad/s worst, against 1.6 × 10⁻³ rad/s)
  and EARTH_MOON_ROT (2.5 × 10⁻⁸ against 2.4 × 10⁻⁶). A wider step cuts the
  Earth-Moon error from 5 × 10⁻⁹ (0.5 s) to 2 × 10⁻¹¹ rad/s (60 s): the axes
  carry about 10⁻⁹ rad of jitter, taken over one second. That is precision,
  not an accuracy figure, and SPICE's own rate for a dynamic reference frame
  is numerical too. The two cases stay as known misses in the data test, not
  loosened. The plan's "0.001 rad/s within 1 × 10⁻¹²" cannot hold: the
  difference's truncation is (rate × 0.5 s)² / 6 of the rate, 4 × 10⁻¹¹ rad/s.
  The near-point frame (ORION_NADIR) needs NAIF's Earth PCK and the Moon frame
  kernel, which are not on the machine that built this: its geometry is tested
  analytically only.
- **Accuracy moves.** None. The 384-row baseline (every scenario's composed
  views and six `measure` cases) is unchanged, so `accuracyMoves.json` was not
  needed. The edges' new statements are additive: the library's MOON_ME now
  states the explorer's 3 × 10⁻⁷ rad (estimated); ITRF's two figures give the
  tree the same root-sum-square in radians.
- **Rulings.** The resolver's `motion` is left as it was (it already differenced
  over the catalog). `BulkOptions.signal` collides with `MeasureOptions.signal`,
  so `measureSpan` takes bulk options under `options.bulk`. Non-cockpit presets
  keep `forward` and `up` for the preset's own axes (+X, +Z); `level`'s
  `forward` picks the body axis. The tileset target reads a tile and a tileset
  through two small structural interfaces, so it is tested without a GPU.
  The widgets import the Intl helpers from `@cesium/next/time`, so the time
  entry exports `ianaOffsetMinutes` and `ianaAbbreviation`.
- **Not done: `accuracyOf` and the explorer's walk on `separationAccuracy`
  (Task 5, second half).** Building them on the composer would make every
  east-north-up reference frame without an accuracy unbounded in `accuracyOf`
  (the DSN-station rows, many `measure` and design tests), and would drop the
  Earth-orientation term for two Earth sites, because the route never crosses
  ITRF. That is a wide behavior change across `measure`, the design tests and
  the explorer, so it needs a pass of its own, with its moves listed. One rule
  to settle in it: the ephemeris edges share a "difference" source, but a
  route from an Earth site to Orion crosses GCRF and EARTH_ICRF, both the
  Earth's position, which cancels rather than counts once.
- **Browser checks.** `parity` and `alloc` ran at the end on port 5193: the
  parity numbers are identical to the three runs before this branch (Apple M2,
  Metal), and the allocation gate shows 16,878 bytes a tick against 16,702 and
  16,787 on the base, with no new site (an idle `Engine.bulk` registers no
  tick listener). Not run: the time controls and the design globe on their
  pages (Task 12), and the bulk task's own browser page (Task 9).

_Carried forward from frames plan 5b._ Real deferred work only.

- **`accuracyOf` and the explorer's walk on the composer,** with the moves
  listed (above).
- **Angular velocity at a precision the fixtures can hold:** a wider or adaptive
  difference step for two-vector reference frames, or SPICE's own derivative
  written out, so ORION_LVLH and EARTH_MOON_ROT meet call 6.
- **The near-point fixture:** run `frameFixtures.py twoVector` with the frame
  kernel and the Earth PCK to add ORION_NADIR.
- **Rays:** the tileset target culls by `Tile.volume` boxes and treats a
  sphere volume as covering the whole segment; a standing query with a frame
  takes its revision from the world's content revision alone, not from the
  frame resolver's routes.
- **Terrain bands** are offset ellipsoids; the Earth's geodetic offsets differ
  from them by meters near the poles.

_Carried forward from the sky and observer plan._ These are deferred items that are real work. The nits are left out.

- **The veil's asymmetric form.** The veil is symmetric about a source. The paper's glare filter is perception-based and its body wasn't read here (only its abstract), so what it makes of asymmetry isn't known.
- **A truss across spikes.** A sprite takes one visibility value, so a beam across a bright star's spikes can't cut them. The veil is cut per pixel and is right.
- **The Moon and planets in the light list.** `lightListFor` and glare's records hold the sun and stars. Adding them also ends the Moon's undercount where it clips at a low EV100.
- **The eye's color for bright stars.** Under dark adaptation bright stars read gray-blue (`eyeSees`), where the eye sees their color. A decision for the owner, by looking.
- **Ambient occlusion's slot.** It feeds shading before the opaque pass, so no post stage can hold it. It needs a slot there.
- **Graph-level slicing ([sky-light-and-points-unifications.md](sky-light-and-points-unifications.md)).** A long chain of stages on a slow GPU has no way to spread over ticks.
- **A `Renderer` interface**, when a second renderer is chosen ([sky-light-and-points-unifications.md](sky-light-and-points-unifications.md)). Not before.
- **A hidden sun's veil pops at the screen's edge.** While any disc tap is on screen the veil takes its visibility from those; a sun leaving the screen jumps to the body-only answer in about one tick of a pan.
- **Recovery after device loss.** A loss turns the stages that were on off for good and says so; nothing listens to `restored`.
- **The eye's limit costs 3.9 ms at 2560×1440 on an M2** (the cost page), the biggest single post stage. A half-size ring would cut it.
- **The terms of the default sky pack's sources, still unsettled.** The pack stays marked not cleared and local. This plan concludes nothing about licenses.
