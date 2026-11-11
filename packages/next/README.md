# @cesium/next — CesiumJS 2.0 WebGPU proof of concept

Clean-slate, WebGPU-only engine prototype. See `CESIUM2_WEBGPU_PLAN.md` at the repo root.

**Setup, once per machine** (nothing here is committed):

```sh
npm install                                 # at the repo root
npm run setup --workspace @cesium/next      # the 1.x build, the CesiumJS releases Dyno and the benchmarks run, the Slang WASM build, SMLib
```

`setup` builds this repository's 1.x (`npm run build` at the root) if
`Build/CesiumUnminified` is missing, and fetches the catalog's default
CesiumJS releases from npm into `~/.cesium-bench/cesium` (or
`BENCH_CESIUM_DIR`), checked against the registry's integrity hash. The dev
server also fetches a missing release the first time a page asks for it.

**A sky data pack, optional** (local only; builds refuse it): `npm run sky --
build` fetches NASA's star map layers and the HYG catalog into `~/.cesium-bench/sky`
(or `SKY_DATA_DIR`), about 220 MB, and writes a pack to `packs/default`. The
pack's manifest lists its sources, credits and terms as each page read, with
`distributable: false`. The dev server offers it at `/sky-pack/`; the engine
takes it with `setSkyPack`. `npm run sky -- info` lists what is there.
It also fetches the Slang toolchain, pinned to one release in
`scripts/slangTools.mjs` and checked against the release's SHA-256:

- the native `slangc` for this platform, into `~/.cesium-bench/slang-native`,
  for build-time Slang (`npm run shaders`, the engine's; `npm run slang`, a
  custom shader's stages);
- the WebAssembly build, into `~/.cesium-bench/slang-wasm`, which the dev
  server serves at `/slang-wasm/` for runtime Slang (`CustomShader.fromSlang`,
  Dyno's Slang playground).

`node scripts/slangTools.mjs` fetches just these. `SLANGC` and
`SLANG_WASM_DIR` still point elsewhere if set.

**SMLib in WebAssembly** (plan §13.33). `setup` fetches NVIDIA's usd-brep at
one commit (SMLib and its SM_API) and emsdk at one version (about 750 MB),
both pinned in `scripts/smlibTools.mjs`, into `~/.cesium-bench/smlib` and
`~/.cesium-bench/emsdk`. It builds `smlib.mjs` and `smlib.wasm` there, which
takes a few minutes the first time. What it builds with is committed: the
bindings JavaScript calls, in `scripts/smlib/`. `src/brep/smlib.ts` loads the
build and converts its solids to `BrepForm`; the dev server serves it at
`/smlib/`, and `npm run test:data` tests the conversion against it.
`node scripts/smlibTools.mjs --check` builds it alone, then loads it in Node and
measures size, startup, tessellation and a boolean. `SMLIB_DIR` points at
another build.

**Open CASCADE in WebAssembly** (plan §13.33, the CSG sample's second kernel).
`setup` also fetches replicad's OpenCascade.js build (`replicad-opencascadejs`,
one npm version pinned in `scripts/occtTools.mjs` and checked against its
integrity hash, about 20 MB) into `~/.cesium-bench/occt`. Only the
single-threaded build is kept, since the threaded one needs cross-origin
isolation. It is LGPL 2.1, so it is never bundled: the dev server serves it at
`/occt/`, and `src/brep/occt.ts` loads it on request and converts its solids
to `BrepForm`. Check the licence before distributing anything built with it.
`node scripts/occtTools.mjs` fetches it alone, and `OCCT_DIR` points at
another copy.

**Frames data** (`src/time`, `src/ephemeris`; `loadFrameData()`). `setup`
also fetches the data the frames layer needs, into `~/.cesium-bench/frames`
(or `FRAMES_DATA_DIR`), from the URLs in `scripts/frameData.mjs`:

- NAIF's `de440s.bsp` (planets) and `moon_pa_de440_200625.bpc` (lunar
  orientation), each checked against a SHA-256 pinned in the script;
- IERS `Leap_Second.dat` (leap seconds), from `hpiers.obspm.fr` (the runtime
  also bundles NAIF's `naif0012.tls` table, `LeapSeconds.builtIn()`, and uses
  the download only when it expires later);
- `EOP-All.csv` (Earth orientation), from CelesTrak;
- the Artemis II trajectory files (the OEM, its SPK and gap-fill SPK, about
  12 MB) and NAIF's DSN station SPK, each checked against a pinned SHA-256
  and stored as they are (manifest role `trajectory`, optional at load).

- PROJ 9.7.1 under `proj/` (manifest role `proj`), from proj.js v0.9.2's
  GitHub release: the WebAssembly build (`proj_capi.mjs`, `proj_capi.wasm`,
  `proj.db`) and the host's native `proj_capi.node`, each tarball checked
  against a pinned SHA-256, plus the GEOID18 grid `us_noaa_g2018u0.tif`
  (NOAA/NGS, public domain, from cdn.proj.org). PROJ and proj.js are MIT;
  `proj.db` carries the EPSG Dataset, credited to IOGP
  (https://epsg.org/terms-of-use.html). `loadProj` (`src/engineering/proj.ts`)
  loads it lazily.
- PROJ-data grids under `grids/` (manifest roles `gridCatalog` and `grid`):
  PROJ-data 1.25.0's catalog, `files.geojson`, and its
  `copyright_and_licenses.csv`, both pinned by SHA-256, and the grids of the
  named sets in `scripts/gridSets.mjs`, each checked against the catalog's
  size and SHA-256. `--grids portfolio,tests` is the default; `--grids
egm2008` adds EGM2008 (80.6 MB), and `--grids all` every grid in the
  catalog (about 0.9 GB). See "Grids" below.
- The design globe's tilesets and exact answers under `design-globe-dual/`,
  written by `scripts/designTiles.mjs` from the frames data and grids above
  (about 96 MB). An older `design-globe/` is left where it is, and can be
  deleted. They are regenerated only when an input changes.

NAIF's generic kernels are public, but what the runtime loads are packs,
derived excerpts of them (each pack's manifest names its source file, that
file's SHA-256 and the span). The packs are written on your machine and never
redistributed by this repository. Credit: EOP data is "IERS, via CelesTrak";
leap seconds are "IERS"; the Artemis II files are "NASA JSC FOD Navigation,
via NAIF" and the station SPK "NAIF/JPL". The DSN Now ranges in
`test/fixtures/frames/dsnnow.json` (written by `node scripts/dsnNowFixture.mjs`
from Internet Archive snapshots) are credited "NASA/JPL-Caltech DSN Now, via
the Internet Archive". DSN Now shows one range per spacecraft, the same at
every dish. It agrees with our per-dish light-time ranges within 5.7% and
with no geometry better, so it is only a 30% sanity check here.

`--frames-span y0-y1` sets the excerpted years, both included (default `2000-2050`):
`npm run setup --workspace @cesium/next -- --frames-span 2000-2050`.

The dev server serves the store at `/frames-data/`, so restart it after a
first setup. `npm run test:data --workspace @cesium/next` runs the tests that
compare against the real store (they need setup to have run). Without a store,
`loadFrameData` rejects with a message saying to run `npm run setup`.

**Frames and trajectories** (`src/frames`, `src/trajectory`). With the frames
data loaded, `createFrames(data)` builds the frame tree. Every frame is a
`Frame` with a name, a parent and a float64 transform that depends on the
instant. Positions only: velocities do not transform. Every edge is a
translation and a rotation except `gcrf` to `icrf`, which also scales (eq.
11.19, see below). The Moon's edge applies no relativistic terms: they are
3 cm or less at its surface, and the accuracy statement lists them.

| Frame       | Name         | Parent      | What it is                                                                         |
| ----------- | ------------ | ----------- | ---------------------------------------------------------------------------------- |
| `icrf`      | `ICRF`       | none        | The root: the solar system barycenter, ICRF axes                                   |
| `hcrs`      | `HCRS`       | `icrf`      | The Sun's center, ICRF axes                                                        |
| `gcrf`      | `GCRF`       | `icrf`      | The Earth's center, ICRF axes, TT-compatible (the true GCRS)                       |
| `earthIcrf` | `EARTH_ICRF` | `icrf`      | The Earth's center, ICRF axes, TDB-compatible (SPK and OEM data)                   |
| `eme2000`   | `EME2000`    | `earthIcrf` | The Earth's center, J2000 mean equator and equinox (ICRF turned by the frame bias) |
| `itrf`      | `ITRF`       | `gcrf`      | Earth-fixed (IAU 2006/2000A and the EOP)                                           |
| `moonIcrf`  | `MOON_ICRF`  | `icrf`      | The Moon's center, ICRF axes                                                       |
| `moonMe`    | `MOON_ME`    | `moonIcrf`  | Moon-fixed, mean Earth / polar axes                                                |
| `moonPa`    | `MOON_PA`    | `moonMe`    | Moon-fixed, principal axes                                                         |

`frames.bodyFixed(EARTH)` is `itrf` and `bodyFixed(MOON)` is `moonMe`; any
other body throws. `frameTransform(from, to, instant, out?)` writes the
column-major 4x4 with `p_to = M * p_from`, composed through the two frames'
lowest common ancestor (frames of different trees throw). The matrices from
`src/time` and `src/ephemeris` stay row-major 3x3, parent to child;
`src/frames/matrix.ts` is the only place that converts. A `FramePoint` is a
position in meters tagged with its frame (`framePoint(frame, position,
instant?)`). `convertPoint(point, to, instant?)` re-expresses it, and throws
for a point that has an instant when you ask for a different one.
`eastNorthUpFrame` makes a tangent frame at a place on a body, and
`worldTransformFrame` exposes a world transform as an ITRF child. Content is
still Earth-fixed; rendering across bodies comes in plan 5.

Frame transforms throw outside the ephemeris span, and the ITRF edge also
throws past the EOP table's predictions (the error gives the covered dates;
`npm run setup` refreshes the table), since UT1 would otherwise drift by about
a millisecond a day with nothing to show for it. The sky does not:
`skyState(ms, data, out)` takes the sun, Moon and stars from DE440 inside the
span and from the analytic models outside it, and `source` says which.

A `Trajectory` is an object's path from an OEM or SPK file:

```ts
const orion = Trajectory.fromSpk([main, gapfill], -24, frames, {
  name: "orion",
  accuracy: "precise",
  j2000: "eme2000", // required, see below
});
orion.state(instant); // [x, y, z, vx, vy, vz] in meters and m/s, in orion.reference
convertPoint(framePoint(orion.frame, [0, 0, 0], instant), frames.moonMe);
```

`state` throws outside the data (and in the 10 to 38 s gaps between the
Artemis OEM's segments) and names the covered spans; it never extrapolates.
`orion.frame` is a child of `orion.reference` that sits on the object.

**Two Earth-centred frames.** Time scales make the Earth's center two
frames. ITRF coordinates (stations, terrain) are TT-compatible. SPK and OEM
data are TDB-compatible: SPICE subtracts barycentric positions and never
scales them. IERS Conventions 2010 eq. 11.19 joins the two:
`r_TDB = r_TT (1 - U/c² - L_C) - ½ (V · r_TT) V / c²`, where `U` is the
potential at the geocenter without the Earth and `V` the Earth's barycentric
velocity. The scale is 2.5e-8 of the distance: 9.5 m at the Moon, plus up to
1.9 m of Lorentz term.

- Put ITRF-derived points (stations, picks, terrain) in `frames.itrf` or
  `frames.gcrf`. They are TT-compatible.
- Put SPK and OEM data (Orion, the planets) in `frames.earthIcrf` or
  `frames.eme2000`. `Trajectory` already does: its `reference` is one of these.
- Converting between the two groups applies eq. 11.19. At the Moon's
  distance that is 9.48 m (tested: perpendicular to V on 2026-04-06T23:00
  UTC).

**Warning: an SPK's J2000 label does not say which axes it holds.** NAIF made
the Artemis II SPK from the OEM, which is in EME2000, and labeled it J2000.
DE440's J2000 is ICRF. The two differ by the frame bias, about 45 m at the
Moon's distance (28 m at the 2026-04-06 flyby, seen in MOON_ME). So
`Trajectory.fromSpk` requires `j2000: "icrf" | "eme2000"`, and Artemis II is
`"eme2000"`. Reading it as ICRF misplaces Orion by tens of meters.
`Trajectory.fromOem` takes the interpolation from the OEM header and never
guesses: the Artemis OEM has none, so pass `interpolation: { method:
"hermite", degree: 11 }`, the setting NAIF's conversion used.

**Measuring** (`src/measure`). `measure(a, b, instant, frames, options?)`
takes two `FramePoint`s and returns a `Measurement`:

```ts
// `dss43Frame` is a frame on the station (from the station SPK, for
// instance) and `orion` a Trajectory, as above; both are defined elsewhere.
const leap = frames.data.leapSeconds;
const m = measure(
  framePoint(dss43Frame, [0, 0, 0]), // the station
  framePoint(orion.frame, [0, 0, 0]), // the spacecraft
  Instant.fromIso("2026-04-06T23:30:00", "UTC", leap),
  frames,
  { frequency: 2216.5e6 },
);
m.signal.downlink.rangeRate; // 236.93 m/s
m.signal.downlink.dopplerShift; // -1750.15 Hz
m.accuracy.meters; // undefined, or 1σ in meters
```

| Field         | Meaning                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| `distance`    | Straight-line distance at `instant`, m, in `a`'s frame                                                  |
| `delta`       | b − a in the axes of `options.deltaFrame` (default `a.frame`), m                                        |
| `overBody`    | Only for two points on one body: geodesic `distance` over its ellipsoid, and `heightDifference`, both m |
| `signal`      | `downlink` (b to a, received at `instant`) and `uplink` (a to b, sent at `instant`), each a `Leg`       |
| `lineOfSight` | `clear`, and `blockedBy` (a `Body`) if not, for the downlink path                                       |
| `accuracy`    | An `AccuracyStatement`                                                                                  |

A `Leg` has `lightTime` (s), `range` (m), `rangeRate` (m/s), `dopplerRatio`,
`dopplerShift` (Hz, with `frequency`), and the directions `transmitterDirection`
and `receiverDirection`. Light time follows IERS eq. 11.17 in the barycentric
frame with the Shapiro delay of the Sun, Earth and Moon (`shapiro: []` turns
it off; the delay on the Artemis links is 0.46 to 27 ns). Directions include
stellar aberration. The Doppler ratio includes both ends' proper-time rates.
`rangeRate` is a central difference over ±0.5 s, one-sided within 0.5 s of a
trajectory's data edge, and is good to a few mm/s (float64 TDB quantization).
Light time that would need data outside a trajectory throws; nothing is
extrapolated.

Special cases: two points closer than 1 mm give distance 0, a zero `delta` and
no `signal`, with a warning. A point at a body's center has no geodetic
footprint, so `overBody` is left out with a warning. A `FramePoint` that carries its own instant gets geometry
only, with a warning, because it can't be placed at the emission and
reception times. `signal: false` skips both legs and the line of sight.

`measureSpan(a, b, start, stop, step, frames, options?)` runs `measure` every
`step` seconds of TDB, inclusive of both ends, and returns
`{ instant, measurement?, error? }` per sample. A sample that throws (a light
path outside the data, say) records its message and the span continues.

**Reading an accuracy statement.** `accuracy.meters` is the root sum square
of `accuracy.terms`, each a 1σ in meters with a `source` (`ephemeris`,
`earthOrientation`, `trajectory`, `coordinateScale`, `relativity`,
`lightTime`) and a `note`. If any term's size is unknown, `meters` is
`undefined`, never small: a trajectory with no covariance and no
`positionSigma` does this, and the term names it. Earth orientation is 35 µs
of UT1 and 0.1 mas of polar motion where the EOP are measured; past
`eop.lastObserved` they grow by IERS Bulletin A's prediction formulas
(`0.00068 · d^0.80` arcsec, `0.00025 · d^0.75` s, d in days) and never fall
below the measured values. Degraded EOP gives no number. `coordinateScale`
is the unstated TT/TDB ambiguity of a trajectory whose `coordinateScale`
option is `"unknown"` (the default; pass `"tdb"` when the scale is known), 2.5e-8
of the geocentric distance. It applies to OEM and SPK data alike (NAIF's SPK
of the Artemis OEM inherits the ambiguity), when the trajectory's reference is
`earthIcrf` or a descendant (`eme2000` included). ITRF-referenced data
(stations) is TT-compatible and gets none, and nor do `moonIcrf`, `hcrs` or
`icrf` references. The `ephemeris` term, 0.01 m, is DE440's Earth-Moon fit and
is claimed only when both ends are in the Earth or Moon frame subtrees; for
heliocentric or barycentric geometry it is `undefined`.
Example: DSS-26 ← Orion at 2026-04-06T15:08:26 UTC is 10.05 m, of which
`coordinateScale` is 10.04 m, Orion's position sigma 0.49 m, Earth
orientation 0.014 m, the ephemeris 0.01 m and light time 0.001 m.

**Artemis covariance units.** CCSDS says OEM covariance is in km and km².
Orion's file writes m². Read as km², its velocity sigmas would be about
12 m/s, which is implausible for a reconstructed trajectory. In m² they are
0.012 m/s and the position sigma is 0.49 m at 2026-04-06T15:08:26 UTC (51.07 m
at the start of the flight, the larger of the first two covariance epochs'
sigmas, 50.35 and 51.07 m: between epochs `positionSigma` takes the larger of
the epoch before and the epoch after). So pass `covarianceUnits: "m"` to
`Trajectory.fromOem` for it. The default stays `"km"`, as the standard says.

The Viewer loads none of this by default: its reference frames are a catalog
(`viewer.frames`) whose precise providers load by dynamic `import()` only when
asked, so a globe-only Viewer's main chunk carries none of them (`npm run
check:bundle` checks it). `Viewer.create(container, { frameData:
"/frames-data/" })` (or a `FrameData` already loaded) draws the sun, stars and
Moon from DE440 and the IAU 2006/2000A Earth rotation inside the data's span.
`viewer.frameData` is always a promise: it resolves to the data, or to
`undefined`, at once when the option was not given and with one
`frameDataFailed` warning when loading failed (the sky then stays analytic). A
`FrameData` object that is already loaded is in use when `Viewer.create`
resolves. Stale data (an EOP table that ends before now, an expired
leap-second table) is a warning too: `viewer.warnings` lists them,
`viewer.events` emits `warning`, and a small notice over the view shows them
(`warningNotice: false` turns it off). Without the option, Earth-only rendering is
unchanged. The bench Explorer opts in.

**Engineering frames** (`src/engineering`). An `EngineeringFrame` is a design
CRS on a body: a projected CRS such as a State Plane zone, with an optional
site transform, in the CRS's own units. PROJ does the projection and datum
work. The engine's `Ellipsoid` does geodetic to body-fixed, and body-fixed
coordinates are in meters, as everywhere else. The proj entry
(`@cesium/next/proj`, `src/proj/index.ts`) exports all of it: the frame,
placement and alignment types, and `loadProj`,
`gridFactors`, `resolveOperation`, `listOperations`, `crsUnits`,
`crsDefinition` and `MOON_GEOGRAPHIC_CRS` with their types (`CrsRef`,
`CrsUnits`, `RecordedOperation`, `OperationCandidate`, `GridFactors`,
`ProjApi`, `LoadProjOptions` and `ResolveOptions`).

```ts
import { EARTH } from "./src/index.ts";
import {
  EngineeringFrame,
  designPoint,
  gridFactors,
  loadProj,
} from "./src/proj/index.ts";

// Browser: base is where the dev server serves the store's `proj/`. Name the
// grid files the frame will need. Node: base is the store's `proj/` path.
const proj = await loadProj({
  base: "/frames-data/proj/",
  grids: ["us_noaa_g2018u0.tif"],
});
const site = EngineeringFrame.create(
  {
    name: "Site",
    body: EARTH,
    // California zone 3 (US survey feet) with NAVD88 heights (US survey feet).
    crs: { format: "wkid", authority: "EPSG", wkid: 6420, vcsWkid: 6360 },
    site: {
      origin: [6_000_000, 2_100_000, 0],
      rotation: 0.2182,
      scale: 1.0000375,
    },
  },
  proj,
);
const p = designPoint(site, [1200, 800, 35]); // e, n, u in design units
const xyz = site.toBodyFixed(p.design); // ITRF meters
site.fromBodyFixed(xyz); // back to design coordinates
site.operation.accuracy; // 2.015 m: PROJ's stated accuracy, undefined if none
gridFactors(site, p.design).combinedFactor; // grid = ground x this
```

- **CRS references** (`CrsRef`) follow the 3D Tiles 2.0 draft's
  `EXT_geospatial_crs`: `{ format: "wkid", authority, wkid, vcsWkid?, epoch? }`
  or `{ format: "wkt2", wkt2 }`. The draft has no site transform, placement
  mode or alignment. Those live on `EngineeringFrameDefinition` here.
  `epoch` (a decimal year) is the coordinate time of a time-dependent
  operation.
- **Recorded operations.** PROJ picks its "best" operation by which grids are
  installed, and can pick one whose grid is missing. A frame resolves its
  operation once, at creation (`resolveOperation`). It takes the first
  candidate whose grids are all loaded, or the `pipeline` you pin. It keeps
  that operation's PROJ string (`frame.operation.pipeline`) and uses it in
  both directions. If every candidate needs a grid that is not loaded,
  `create` throws and names the file (NAVD88 heights without
  `us_noaa_g2018u0.tif`, for example). It never falls back to a ballpark
  transform unless you pass `allowBallpark: true`, and then the accuracy is
  undefined.
  A frame on a bound CRS (a BOUNDCRS or TOWGS84) also reports accuracy as
  undefined, so `meters` is undefined: PROJ states no accuracy for
  transformation parameters the CRS carries itself. The operation's inverse is
  refined against its forward, so `fromBodyFixed` reverses `toBodyFixed` to
  1e-6 m (about three times the PROJ calls), and throws if it cannot.
  `listOperations(proj, source, target)` lists the candidates PROJ offered,
  as plain data: each one's name, PROJ string, accuracy, area of use, the
  grids it reads and which of them are missing, and whether it is a ballpark.
  `resolveOperation` records the first one that qualifies. Both take an
  optional `areaOfInterest` (`{ west, south, east, north }` in degrees):
  without one PROJ keeps only operations whose area covers the whole source
  CRS, so for a large datum such as ED50 only the ballpark is left; with a
  box around your coordinates the transformations that cover them are listed
  and can be recorded.
- **Units** come from the CRS, never from an assumption. `frame.units` holds
  the horizontal unit's name and meters per unit (a US survey foot is
  1200/3937 m, about 0.3048006096 m; an international foot is 0.3048 m), and
  `frame.metersPerHeightUnit` the height unit's. A design height is in the
  vertical unit, or in the horizontal unit when the CRS has no vertical axis.
  A geographic CRS is refused: design work happens on a grid.
- **Site transforms.** `site` takes local site-grid coordinates `(e, n, u)`
  in design units to the projected CRS's coordinates in the same units:
  `[E, N] = [E0, N0] + scale · R(rotation) · [e, n]` and `U = U0 + u`.
  `rotation` is in radians, counterclockwise from the CRS's grid east.
  `scale` is the site scale factor: an iModel GCS's Helmert scale, or a DOT
  project's ground-to-grid factor. Height is not scaled, and the inverse is
  exact. `origin` is in CRS units.
- **The body.** PROJ stops at the body's geographic CRS: EPSG:4979 for the
  Earth, and `MOON_GEOGRAPHIC_CRS` (IAU_2015:30100) for the Moon. PROJ's
  database has no 3D lunar CRS, so that one is 2D. A lunar height passes
  through unchanged, as height above the 1,737,400 m sphere. ITRF is treated
  as WGS84.
- **Rigid placement.** `RigidPlacement` maps design coordinates to body-fixed
  meters by one rotation, a uniform scale and a translation, as an iModel's
  `ecefLocation` and `EXT_georeference` do. It is exact at its anchor and sags
  away from it as the body curves from the tangent plane: 7.80 m at 10 km
  from the anchor. Its rigid scale ignores the site scale too (it is the
  unit conversion only). Use `frame.toBodyFixed` for anything long.
- **Grid factors.** `gridFactors(frame, design)` gives the projection's
  `pointScale` k, the `elevationFactor` R/(R + h), their product
  `combinedFactor` and the grid `convergence` (radians, from true north to
  grid north, positive east). They come from PROJ's `proj_factors`, evaluated
  at the geodetic position of the design point's grid coordinates. R is the
  ellipsoid's geometric-mean radius there and h is the ellipsoidal height in
  meters. Grid distance = ground distance × combined factor, as CAD practice
  has it. The site scale is separate and not in the factor.
- **Alignments.** An `Alignment` is lines, circular arcs and clothoid spirals
  in design (site-grid) coordinates, with an optional vertical profile of
  grades and parabolas. Pass `alignments` on the definition and read them
  from `frame.alignments`.
  - `pointAt(station, offset?)` gives design E, N (and the elevation, with a
    profile). `stationOffset(point)` gives `{ station, offset, elevation? }`.
    `elevationAt` and `azimuthAt` read the profile and the heading.
  - Azimuth is clockwise from grid north. A positive radius curves left. The
    offset is positive to the right of the direction of travel.
    `azimuthAt` is continuous from `startAzimuth` and is not reduced to
    [0, 2π).
  - Spirals use Fresnel integrals (`fresnel(t)`), exact to float64.
  - A point whose perpendicular foot lies before the start or after the end
    throws "outside the alignment". Nothing is extrapolated. A point
    equidistant from two elements takes the lower station.

**Design measurements.** `measure` and `measureSpan` also take a `DesignPoint`
at both ends (a `MeasurePoint` is a `FramePoint` or a `DesignPoint`). Every
result above still applies, because the design points are first placed in the
body-fixed frame. When both ends are design points in one frame, the result
adds `design`:

| Field                       | Meaning                                                                                      |
| --------------------------- | -------------------------------------------------------------------------------------------- |
| `design.unitName`           | The horizontal unit's name, with `metersPerUnit` (from PROJ)                                 |
| `design.distance`           | Distance between the design coordinates, in design units: what a CAD tool reports            |
| `design.horizontalDistance` | The same for E, N alone, in design units                                                     |
| `design.delta`              | b − a in design coordinates (E, N in the horizontal unit, U in the height unit)              |
| `design.combinedFactor`     | `{ a, b, mean }`: the grid factors at each end and their mean for the line                   |
| `design.convergence`        | `{ a, b }`: the CRS's grid convergence at each end, radians (the site rotation is not in it) |
| `design.siteScale`          | The frame's site scale (1 without a site)                                                    |

The ground (true) distance is about `design.distance × design.siteScale ×
metersPerUnit / combinedFactor.mean`. For 10,000 ftUS in California zone 3
with a site scale of 1.0000375, that predicts 3048.32435 m against a
measured 3048.32434 m. `options.alignment` names one of the frame's alignments
and adds `alignment`: `{ name, a, b }`, the station and offset of each end. A
name the frame lacks throws, and an end outside the alignment makes the call
throw (in `measureSpan`, that sample records the error).

**The `projection` accuracy term.** Each design end adds a term with source
`projection`. Its size, in meters, is PROJ's stated accuracy for the frame's
recorded operation (2.015 m for NAD83(2011) + NAVD88 to WGS 84 with GEOID18).
When PROJ states none (a pinned pipeline, or an operation with no accuracy),
or the operation is a ballpark one, the term's `meters` is `undefined`, and
so is the statement's `meters`. The term's `note` names the frame, the grids
and the ballpark case.

**Where PROJ comes from.** PROJ 9.7.1 is not an npm dependency: proj.js's npm
package downloads its binaries on every install. `npm run setup` fetches
proj.js v0.9.2's GitHub release, checks each tarball against a pinned SHA-256
and keeps `proj_capi.mjs`, `proj_capi.wasm`, `proj_capi.node` and `proj.db`
under `proj/` in the frames store (see above). The WebAssembly build serves
the browser and the native build serves Node. Both expose the same PROJ C API.
Nothing loads PROJ until a frame is created. The only npm dependency is
`@emnapi/runtime` 1.8.1, which the WebAssembly build needs. PROJ's own files
are pinned in `src/engineering/projPins.ts`, which setup and the loader share.
The browser hashes the glue, the WebAssembly and `proj.db` before using them,
and imports the glue from a Blob URL of the bytes it checked, so what runs is
what was hashed. Node re-hashes `proj.db` against the pin and the native
`.node` against setup's manifest entry (its extracted hash differs by
platform). A mismatch is refused, naming the file and both hashes.

**Grids** (`src/engineering/proj.ts`, `gridCatalog.ts`). PROJ reads exactly the
grids loaded explicitly, in the browser and in Node alike; nothing it finds
lying around counts.

- **The catalog is the trust root.** PROJ-data 1.25.0's `files.geojson`
  (331,044 bytes) and `copyright_and_licenses.csv` are pinned by SHA-256
  (`PROJ_DATA_CATALOG`). Every grid's name, size, SHA-256, agency and license
  come from them. A name that isn't a current (not removed) catalog key is
  never fetched or loaded.
- **`GridSource` and its layout.** `gridSource({ base })` reads
  `<base>files.geojson` and `<base>copyright_and_licenses.csv`, checks both
  against the pins and parses the catalog. Grids are then `<base><name>`:
  cdn.proj.org's own layout, so any mirror with that layout is a source.
  cdn.proj.org sends no CORS headers, so in the browser grids come from your
  own server (the dev server's `/proj-grids/`, or a mirror). A newer catalog
  is taken with `catalogSha256`, `licensesSha256` and `version`.
- **`loadGrids(proj, source, names)`** checks every name first, then fetches
  (browser) or reads (Node) each grid, checks its length and SHA-256, and puts
  it where PROJ looks: the WebAssembly file system, or a private per-process
  staging directory beside `proj.db` in Node. PROJ must then find it at
  exactly that path. A TIN or deformation-model `.json` is confirmed by
  building the operation that reads it. `loadedGrids(proj)` lists what is
  loaded. A Node process supports one PROJ base. `loadProj`'s `grids` option
  is `loadGrids` over `gridSource({ base })`, and omitted it loads none.
- **One rule for every operation.** An operation may read only plain-named
  grids that `loadGrids` verified, whether it came from PROJ's own choice, a
  pinned pipeline or a tileset's declaration. Anything else is refused before
  PROJ creates it.
- **`/proj-grids/`** is the dev server's grid endpoint
  (`scripts/projGrids.mjs`). It mounts only when the store's catalog matches
  the pin. It serves the store's `grids/`, and the first time a page on the
  same site asks for a grid that isn't stored it fetches it from
  cdn.proj.org, verifies it against the catalog, caches it and serves it.
  Only a name that is exactly a current catalog key is served: there is no
  path traversal, no other origin, no redirect followed, the catalog's size
  is the cap, at most two fetches run at once, a request from another origin
  on the same site gets only stored grids and one from another site gets
  nothing, and error bodies say nothing (details go to the server log).
  `/frames-data/` doesn't serve `grids/` or `*.partial` files; its `proj/`
  serves only the pinned GEOID18 grid, which setup verified.

**`EngineeringFrame.load`** is `create` after fetching the grids the best
operation needs: `EngineeringFrame.load(definition, { proj, grids })`. It
lists PROJ's candidates within `definition.areaOfInterest`, loads the missing
grids of the first accurate (not ballpark) candidate whose grids the catalog
has (for a pinned pipeline, the grids it names), then resolves as `create`
does. Without `grids` it is `create`. `frame.gridCredits` names the agency,
license and PROJ-data version of each grid the operation reads.

- **Better candidates.** A candidate skipped because its grids aren't loaded
  is recorded in `operation.betterCandidates`, with the grids it needs, when
  it is better: not a ballpark, a strictly smaller stated accuracy, and the
  same vertical grids as the chosen operation (PROJ's stated accuracies don't
  compare geoid models, so one that swaps GEOID18 for GEOID99 isn't better).
  A design measurement then warns `coarser-operation`, and the `projection`
  term's note names them.
- **Pinned pipelines** are structured: a `Pipeline` (global parameters and
  steps), with `parsePipeline` and `formatPipeline`, values held to a
  character allowlist both ways. `pipelineGrids` reads every grid key
  (`grids`, `nadgrids`, `geoidgrids`, `xy_grids`, `z_grids`, `file`,
  `model`), with `@` marking an optional grid. A pin that matches one of
  PROJ's candidates keeps that candidate's stated accuracy; one that matches
  none states none. The corridor and Phoenix pin GEOID18 this way, because
  PROJ ranks NADCON5 with GEOID99 (±1.14 m) ahead of GEOID18 (±2.015 m).
- **Geoid fallbacks are opt-in and named.** `geoidFallback: "EGM96" |
"EGM2008"` applies only when the compound CRS's horizontal part resolves
  with no missing grids and its vertical part does not. Design heights are
  then read as that model's heights, `frame.fallback` says which model
  replaced which vertical CRS and why, and the operation is the fallback
  CRS's. The `geoidFallback` accuracy term is undefined, never small, unless
  you give `fallbackSigma` (metres), and a measurement warns
  `geoid-fallback`. EGM2008's grid is 80.6 MB and loads whole.
- **A height system with no grid** throws, naming the vertical CRS and what
  was checked: for example "no PROJ-data grid relates it to the ellipsoid"
  for MLLW depth (EPSG:5866), or that its grids are on another horizontal
  datum, naming the CRS to use instead.
- **Depth axes.** `CrsUnits.verticalDirection` is `"down"` for a depth CRS:
  a depth of +10 lies 10 units below 0, and a rigid placement's up axis
  points down. **Tidal and chart datums** work where PROJ-data has a grid:
  Denmark's lowest astronomical tide, DKLAT(2023) (EPSG:25832+10550,
  `dk_sdfi_dklat_2023.tif`), is tested. NOAA's VDatum surfaces (MLLW, MHW and
  others) aren't in PROJ-data and are reported as unavailable. `proj.db`
  9.7.1 relates the Dutch LAT depth only by a ballpark.

**Placement modes** (`src/engineering/placement.ts`). A `TilesetPlacement` says
how a tileset's design coordinates become drawn positions, and the exact way
back:

- `placeRigid(frame, anchor)`: one rigid transform at the anchor, as an
  iModel's `ecefLocation` does. It is exact at the anchor and sags away from
  it: 7.96 m at 10 km and 31.6 m at 20 km on the corridor.
- `placeReprojected(frame)`: every vertex through the frame's recorded
  operation, with no sag.

Each has `displayed(design)` (body-fixed metres, as drawn), `designOf(position)`
(its exact inverse, so a measurement agrees with the design data in either
mode) and `displayError(design)` (how far the placement draws the point from
where it truly is; 0 when reprojected).

`georeferenceTileset(tileset, { proj, grids })` places a tileset by its
declaration (below): it loads the frame with `EngineeringFrame.load`, builds
the declared placement, checks a rigid one against the tileset's root
transform (`checkRigidTransform`) and sets `tileset.placement`.
`Tileset3D.load` only parses the declaration (`tileset.georeference`); PROJ
loads when `georeferenceTileset` is called. Each refusal is an error and a
`tileset.warnings` entry: a tileset that declares nothing (no placement is
guessed), a `modelMatrix` other than the identity, a WKT2 PROJ's strict parser
refuses, two declared CRSs that aren't the same CRS, a declared grid that
isn't a current catalog key, a frame that doesn't load, or a rigid anchor the
root transform disagrees with. `tileset.placement` is the whole tileset's
design placement; `Tile.placement` is still a content's model placement.

**Picking design coordinates.** `pickDesign(view, x, y, tilesets)` takes CSS
pixels from the view's top-left and resolves a `DesignPick`: the body-fixed
`position`, the listed tileset and feature hit, and `design` coordinates when
that tileset has a placement. Design coordinates come only when the position,
the feature and the camera all come from one frame and the hit tile's bounds
contain the position; if the camera moved during the pick it is tried once
more, then only the position returns. Over the sky it resolves undefined.
`tolerance` is one CSS pixel's footprint at the hit, in metres.

**Snapping**, split as CesiumJS 1.x splits it (`src/engineering/snap.ts`):

- **The client side, `ClientSnapService`** (1.x's `Scene#snap`), snaps at once
  to what is drawn, on the CPU over the triangles that tiles keep with
  `retainGeometry: true`. From `pickDesign`'s hit it takes the nearest vertex
  within the aperture (`point`), else the nearest edge point (`segment`), else
  the surface. Points the hit draw's own triangles hide from the camera are
  passed over. The tolerance is the tile's geometric error, and no client snap
  is exact. A 200,000-vertex draw snaps in about 3 ms. Plan 5 replaces it with
  a GPU snap pass.
- **The server side, `SnapService`** (1.x's `SnapService`), snaps against the
  source design data. It takes a `ServiceSnapRequest` (the tileset, the
  feature, `testPoint`, `closePoint`, the camera, the canvas size and the
  aperture) and an `AbortSignal`. The design globe's exact alignment snap is
  one.
- **`refiningSnap(request, client, server, onUpdate, signal)`** shows the
  client's snap at once (`provisional`), then updates it with the server's.
  A server answer that is malformed, claims `exact` with a tolerance, puts
  `design` anywhere but where the placement draws `snapPoint`, lands outside
  the aperture or behind the camera, or is hidden by the hit draw is refused,
  with a warning on the tileset, and the client snap stands. Aborting stops
  further updates.
- **A `SnapResult`** has `snapPoint` (the answer to use; with `design`, the
  exact design point), `hitPoint` (where the cursor hit), `kind`, `normal`,
  `curve`, `tolerance`, `exact` and `source`. `shownPoint`, at most 2 m from
  `snapPoint`, is where to draw the marker when the exact point lies inside
  the drawn mesh, such as an alignment's profile grade line under a median
  barrier. Readouts use `snapPoint` and `design`.

**The pick term.** A design point made from a pick or a snap carries
`obtained: { how: "pick" | "snap", tolerance, kind? }`, and `measure` adds a
`pick` accuracy term for it: the pick's pixel footprint, the client snap's
geometric error, or 0 for an exact snap.

**`BENTLEY_engineering_frame`** (`src/engineering/georeference.ts`) is a vendor
extension in `tileset.json`'s `extensions` that declares a tileset's design
CRS and placement:

```json
"extensions": {
  "BENTLEY_engineering_frame": {
    "name": "Mainline",
    "body": "EARTH",
    "crs": {
      "format": "wkid",
      "extensions": {
        "EXT_geospatial_crs_wkid": { "authority": "EPSG", "wkid": 6420, "vcsWkid": 6360 }
      }
    },
    "site": { "origin": [6082000, 2111500, 0], "rotation": 0.218, "scale": 1.0000375 },
    "areaOfInterest": { "west": -122.5, "south": 37.5, "east": -121.5, "north": 38.2 },
    "placement": { "mode": "rigid", "anchor": [0, 0, 0] },
    "pipeline": "+proj=pipeline +step …"
  },
  "BENTLEY_alignments": { "alignments": [ … ] }
}
```

- **It builds on `EXT_geospatial_crs`.** `crs` has the 3D Tiles 2.0 draft's
  object shape: `format` plus an `EXT_geospatial_crs_wkid` or
  `EXT_geospatial_crs_wkt2` companion (the draft's `epoch` is a decimal-year
  string). It maps to `CrsRef` unchanged.
- **It composes with what exists.** The source CRS comes from
  `EXT_geospatial_crs_source` (CesiumGS/glTF#131, an open draft), else
  `ESRI_crs` (3D Tiles 1.1), else our `crs`. All present must agree, judged by
  PROJ, or the tileset is refused naming both. The body comes from
  `3DTILES_ellipsoid` when present. The area of interest comes from the root
  bounding volume unless `areaOfInterest` overrides it. A tileset with only
  `ESRI_crs` gets a warning and no placement, because nothing says which mode.
- **What the draft lacks, and this adds:** the placement mode (`rigid` with
  an `anchor` in design coordinates, or `reprojected`), the site transform
  with its scale (`site`: origin, rotation and scale, as IFC 4.3's
  `IfcMapConversionScaled`), a declared pinned `pipeline` (only catalog grids,
  and only allowlisted operations and keys) or `geoidFallback` with
  `fallbackSigma`, and alignments, as their own extension,
  `BENTLEY_alignments`, beside it. Alignment segments use IFC 4.3's
  `IfcAlignment` segment types (`LINE`, `CIRCULARARC`, `CLOTHOID`,
  `CONSTANTGRADIENT`, `PARABOLICARC`); the field names are ours, and
  `georeference.ts` maps each to IFC's.
- **A rigid tileset uses the standard root `transform`,** equal to the rigid
  placement's matrix, and a reprojected one is plain Earth-fixed tiles, so
  both draw in any 3D Tiles 1.1 viewer.
- **Every string is untrusted.** A WKT2 must start with a WKT2 CRS keyword,
  may hold no PROJ tokens or `PARAMETERFILE` paths outside the catalog, is at
  most 65,536 characters and goes through PROJ's strict WKT parser. There are
  at most 64 alignments of at most 4,096 segments each. A malformed field
  throws a `GeoreferenceError` naming its JSON path, and nothing is guessed.
  The old name, `EXT_engineering_frame`, is still read, with a warning.

**The observer** (`src/scene/observer.ts`, `src/render/post`). `view.observer`
owns everything between the scene's light and a pixel: `exposure`, `toneMapping`,
`glare` and a list of `stages`. Light stays in physical units; EV100 is the
exposure's unit. `cameraObserver({ ev100: 15 })` is a camera set for direct sun,
`eyeObserver()` is the eye (it adapts; its readout is an equivalent, shown as
"≈ EV100 x"), and `view.readout()` says what the view is doing, including the
glare tier in use and why. `DAYLIGHT_EXPOSURE`, `EYE` and `UNITLESS_EXPOSURE` are
the usual exposures, `ev100ToScale` and `scaleToEv100` convert, and
`observerPointSpread` gives the stars' point spread an exposure implies. Glare is
`eyeGlare()` (a veil) or `cameraGlare()` (a veil and a lens's spikes), in tiers by
GPU and view size. Only an M2 has been measured, and Intel figures are owed.

**Post stages** (`createPostStage`, `PostStage`, `PostStageError`). A stage is one
fullscreen WGSL function at its simplest, or declared passes over textures it
owns, in the slot `scene` (linear, pre-exposed), `exposed` (after the response,
before tone mapping) or `display`. Each says what it is: physics, a model of an
eye or a lens, or a look. A look changes the picture and not the light, and
nothing in the scene is lifted for looks. `astrophotoCurveStage()` is a look, and
`eyeLimitStage()` is the eye's model of the faintest star it sees. A stage that
could hang the GPU is refused at creation (loops need a constant bound), and a
device loss turns the stages that were on off for good.

**A sky pack's rule.** A pack is never shipped. Builds (`npm run build`, `build:lib`,
`handbook`) refuse one that isn't marked `distributable: true` with a clearance,
and the handbook holds no image or file made from one. The Viewer shows a pack's
credits as text and warns once when it isn't cleared. `setSkyPack` takes a pack,
`npm run sky` builds one locally.

**Observer controls** (`attachObserverPanel`, `widgets/observerPanel.ts`).
One panel for exposure (physics), optics (models: veil, spikes, the eye's limit)
and look (tone mapping, the astrophoto curve), plus the sky data in use. Sliders
run right for brighter, the exposure slider is in EV100, and every readout says
EV100, never a bare scale. `examples/night-sky/` uses it. The cost of all of it
is `bench/observerCost.html` (`node bench/run.mjs observerCost`), over synthetic
stars that need no data.

**Design globe example.** `examples/design-globe/` (in the gallery, "Design
coordinates on the globe") shows why a long design can't be placed rigidly: a
50 km highway in California zone 3 (US survey feet, NAVD88 through GEOID18),
generated twice by setup (rigid and reprojected, with identical tile trees and
vertex order), which the placement switch morphs between, the other placement
ghosted. It opens with two measurements: station 1700+00 against its own true
position (30.586 m apart when rigid, 0.000 m reprojected) and NGS mark HS5109
against the centreline. A scale ladder of sites in seven countries' height
systems (a building, a city block, a port, an airport, a solar farm, a campus
and a 30 km pole line) shows the rigid error growing from 2.6 mm to 18 m, with
its parts (curvature, scale factor, geoid). The measure tool snaps to the
alignment's exact design (server) and to the drawn mesh (client), and every
figure is checked against the generator's exact answers in Checks. It needs
`npm run setup` (the tiles and grids) and the dev server's `/proj-grids/`.

**Frames explorer example.** `examples/frames-explorer/` (in the gallery) opens
on eleven scenarios, each a real problem solved by the frame tree it builds:
Orion's speed in three frames, the Earth turning, the Moon from Sacramento, a
clock on the Moon, a dish tracking Orion, a BIM site, a survey corridor, a
drone, a ship, a robot arm on the pad, and all of them at once. Each one
answers on the globe, states its accuracy and shows how it is checked. The reference-checked stress catalog is on the
Verification tab (`npm run test:data` runs the same catalog).

**Credits.** The EPSG Dataset in `proj.db` is credited to IOGP, under its
terms of use (https://epsg.org/terms-of-use.html). PROJ and proj.js are MIT.
Each PROJ-data grid carries its own license, from the pinned
`copyright_and_licenses.csv`, and a frame names them in `gridCredits` as
`"<agency> (<license>), via PROJ-data 1.25.0"`; a page that shows a grid's
result credits it. The grids setup stores by default:

| Grids                                   | Agency                                                          | License       |
| --------------------------------------- | --------------------------------------------------------------- | ------------- |
| GEOID18, CONUS NADCON, California HPGN  | US National Oceanographic and Atmospheric Administration (NOAA) | Public domain |
| EGM96, EGM2008 (opt-in)                 | US National Geospatial Intelligence Agency (NGA)                | Public domain |
| OSTN15, OSGM15                          | Ordnance Survey                                                 | BSD-2-Clause  |
| AUSGeoid2020                            | Geoscience Australia                                            | CC-BY-4.0     |
| JPGEO2024, GSIGEO2011                   | Geospatial Information Authority of Japan                       | CC-BY-4.0     |
| RDNAPTRANS2018 (rdtrans2018, nlgeo2018) | Nederlandse Samenwerking Geodetische Infrastructuur (NSGI)      | CC-BY-4.0     |
| FIN2000, YKJ to ETRS-TM35FIN            | National Land Survey of Finland (MML)                           | CC-BY-4.0     |
| DKLAT(2023)                             | Danish Agency for Data Supply and Infrastructure                | CC-BY-4.0     |

Other grids in the catalog carry other licenses: OGL-Canada-2.0, the Etalab
Open Licence (France), CC-BY-SA-4.0, CC0-1.0 and the Data licence Germany,
among others. `GridCatalog.credit` reads each from the CSV.

```sh
npm run build                               # at the repo root: 1.x build used by the parity harness
npm run dev --workspace @cesium/next        # dev server at http://127.0.0.1:5190
npm run test --workspace @cesium/next       # unit + 1.x parity (L0) tests
npm run typecheck --workspace @cesium/next
npm run bench --workspace @cesium/next      # needs the dev server; writes bench/results/*.json
npm run build:lib --workspace @cesium/next  # the library for pages without a build step
```

**The library build** (`build:lib`, `vite.lib.config.ts`) writes
`dist-lib/`: `cesium-next.mjs` (the core's ES module, the shaders
inlined), `cesium-next-time.mjs`, `cesium-next-frames.mjs`,
`cesium-next-proj.mjs` and `cesium-next-measure.mjs` (the other entry
points, `@cesium/next/time` and so on, sharing chunks under `assets/`),
`assets/` (the content worker and the Draco and Basis wasm, each found
relative to the module that loads it) and `types/` (declarations). A page
needs no bundler or TypeScript: a module script imports it, from its own
server or another origin (a CDN, with CORS headers, as npm CDNs send).
Browsers start workers only from the page's origin, so from another origin
the worker starts through a same-origin `blob:` module that imports the
real one (`WorkerPool`). Nothing generates code at runtime: under a
Content Security Policy only the workers need `'wasm-unsafe-eval'`, the
page nothing (`basisTranscoderEsm.ts`). `standalone/index.html` loads two compressed
models (Draco, Basis) that way; serve the folder (e.g. `python -m
http.server` in `packages/next`; pages opened as `file://` load no modules
or workers) and open `/standalone/`, with `?lib=<url of
cesium-next.mjs>` and `?data=<models folder>` to load either from
elsewhere.

Layout: `src/math` (float64 geodesy), `src/gpu` (device, timers, allocators,
mips, IBL environment), `src/io` (worker pool, glTF parsing),
`src/render` (frame graph, byte layouts), `src/shaders` (WGSL),
`src/scene` (Engine, World, View, ViewLink, Camera), `demo/`, `test/`.

The Cesium ion token: paste one in Dyno (ion token, at the foot of the rail;
kept for the session or remembered on the device), and every view, example,
Lab page and benchmark uses it. On the dev server `VITE_ION_TOKEN=<token>` in
`packages/next/.env.local` (gitignored) also works; production builds never
contain it (`bench/suite/ionToken.ts`, and `scripts/vitePluginEnvSecrets.ts`
fails a build that would). With neither, public assets load with CesiumJS's
evaluation token.

Pages on the dev server:

- `/#/viewer` — Dyno's Viewer: one engine at a time (2.0 through
  `widgets/Viewer`, or a 1.x release), with sample glTF models and 3D Tiles,
  ion assets (`?asset=<id>`; the ion token below), iModels and
  a synthetic city; tile selection, globe, split view and overview inset,
  lighting, picking and the inspector
- `/demo/` — multi-view demo (split, linked overview, second canvas, offscreen)
- `/parity/` — L2 image parity against 1.x (`runParity()` in the console)
- `/parity/models.html` — Khronos sample models, 1.x `Model` vs the 2.0 glTF
  path (`runModels()`)
- `/spikes/precision.html` — camera-relative precision of the prep kernel
- `/spikes/worker.html` — the engine running in a worker on an OffscreenCanvas
- `/spikes/indirect.html` — indirect vs direct draws in render bundles
- `/bench/baseline.html` — 1.x vs 2.0 performance baselines (draw scaling,
  picking, log depth, four views)
- `/bench/alloc.html` — scene for the steady-state allocation gate (the
  runner profiles it with the sampling heap profiler)
- `/parity/tileset.html` — 3D Tiles content (b3dm/glb, feature IDs, batch and
  property tables) vs 1.x `Cesium3DTileset`, including picks
  (`runTileset()`). Private ion assets: with the ion token below, open with `?asset=<id>`
  (`&pick=<property>`, `&zoom=<k>`), or run
  `ION_ASSET=<id> npm run bench -- tileset`
- `/spikes/slang-kernels.html` — each Slang port against the hand-written
  WGSL it replaced (`spikes/slang/reference/`), timed and its outputs
  compared: the Slang migration's performance gate
- `/spikes/slang-probes.html` — each Slang feature the shaders need,
  compiled by `slangc` and validated in WebGPU (re-run per Slang release)

The engine's shaders are Slang (`src/**/*.slang`), compiled to checked-in
WGSL and reflection in `src/shaders/generated/` by `npm run shaders` (with
the `slangc` that `npm run setup` fetched, or `SLANGC=/path/to/slangc`);
`npm run shaders:check` fails if any is out of date. Runtime compilation
(custom shaders' Slang stages) uses the WebAssembly build the dev server
serves once setup has fetched it. `node scripts/dumpMsl.mjs module.wgsl
entry…` prints the Metal source Chrome compiles from a module.

`npm run bench` runs every page above in headless Edge via Playwright with
WebGPU developer features (unquantized GPU timestamps) on the high-performance
GPU. Pass suite names to run a subset (`precision indirect parity models
slang-kernels baseline alloc tileset`); set `BENCH_CHANNEL` to use another installed browser and
`BENCH_HEADED=1` to watch.

**The frames library** (`@cesium/next/frames`, `@cesium/next/time`; plan 5b).
What cameras, replay and measurements stand on. Float64 on the CPU throughout.

- **Two-vector reference frames.** `twoVectorFrame(name, parent, definition)`
  builds axes from two vectors, after SPICE's two-vector frames: a primary
  axis along the first vector, the secondary in the plane of the two. Each
  vector is `position`, `velocity`, `constant` or `nearPoint`, and all are
  geometric (no light time). The origin is the parent's: `axesAt(name,
origin, axes)` makes a parent with one reference frame's origin and
  another's axes. With `freeze` the axes are the ones at that instant, and
  are recomputed only when an input's revision goes up. When the two vectors
  come closer than 1 mrad to parallel (or one is zero), it throws
  `TwoVectorDegenerateError`. An input that can't answer (a trajectory past
  its data, data still loading) gives its own error, never a matrix of NaNs.
  `frameVelocity` and `angularVelocity` are central differences over ±0.5 s.
- **Rig presets.** `rigPreset("cockpit" | "orbital" | "inertial" | "level",
options)` builds two-vector reference frames, adds them to the catalog as
  rig users, and returns a plain `Rig` (data you can read and change).
  `engine.cameras.held(view)` says which reference frame and why while a rig
  keeps its last good pose.
- **Piecewise reference frames.** `piecewiseFrame(name, pieces)` is one
  reference frame that is another over time. It hangs under a fixed hub, so
  routes stay static; `parentAt(instant)` and `catalog.treeInUse(at)` say
  the current piece's parent. Pieces are half-open. A change is checked
  for continuity (0.01 m and 0.01 m/s) unless declared a `jump`; a piece may
  be `simulated`, and a route across it makes no accuracy claim.
- **Accuracy beyond first order.** A reference frame's `accuracy` states
  figures: `meters`, `radians` (about an `axis`, or the origin), a
  `covariance`, each at `"1σ"`, `"95%"` or `"max"` with a `distribution`;
  further `parts`; a shared `source` with a rule (`"linear"`, or
  `"difference"` for a bound on the difference of two edges); `predicted` and
  `estimated` flags. `pointAccuracy(point, to)` and
  `separationAccuracy(a, b)` compose a 1σ covariance per figure, rotate it
  into the result's axes, and report the root of its trace, the error
  ellipsoid (`ellipsoid`) and, with `confidence: "95%"`, 2.7955 times its
  longest semi-axis. For independent figures with no axis that is the
  root-sum-square, as before. A figure at 95% with no distribution is
  refused, naming the edge (`refusedBy`); `routeTerms` add terms that are on
  no edge. The built-in edges state every term (ITRF: UT1 about +Z and polar
  motion; MOON_ME: 3 × 10⁻⁷ rad, estimated); a trajectory's reference frame
  states its position covariance.
- **Rays through the reference frames.** A `RayQuery` with a `frame` (and
  its `world`) is carried into each target's anchor through the world's frame
  resolver, answered there and reported in `reportIn`. Targets: `"terrain"`,
  `"draws"`, `{ kind: "body", body }`, `{ kind: "impostor", body }` and
  `{ kind: "tileset", tileset }` (a tileset that retains its geometry).
  `correction: "lightTime"` places each target where it was when the light
  left it. Each body has a `terrainBand`: above it a span is clear, below it
  blocked, without tiles. A route the resolver can't answer is `unknown` with
  reason `"route"`; the other targets still answer.
- **Bulk work.** `runBulk(total, step, { signal, onProgress, scheduler })`
  runs in slices (`timeSlices()`, 8 ms a task; `engine.bulk`, 4 ms a tick, no
  tick listener while idle). Aborting rejects with `AbortError`.
  `samplePath` and `accuracySpan` (frames), `measureSpan` (its bulk options
  under `bulk`) and `EngineeringFrame.toBodyFixedBatch` use it.
- **Showing time.** `timeParts(instant, zone)` gives the wall clock in UTC (a
  leap second reads 23:59:60), a civil zone, solar or nominal time, or the
  computer's zone. `placeZone(place, lookup)` gives a civil zone through an
  application's `ZoneLookup`, else solar time, labelled so. The time controls
  use it: with `zoneLookup` they offer and open on the place's civil zone.
