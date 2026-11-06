# @cesium/next — CesiumJS 2.0 WebGPU proof of concept

Clean-slate, WebGPU-only engine prototype. See `CESIUM2_WEBGPU_PLAN.md` at the repo root.

**Setup, once per machine** (nothing here is committed):

```sh
npm install                                 # at the repo root
npm run setup --workspace @cesium/next      # the 1.x build, the CesiumJS releases Dyno and the benchmarks run, the Slang WASM build
```

`setup` builds this repository's 1.x (`npm run build` at the root) if
`Build/CesiumUnminified` is missing, and fetches the catalog's default
CesiumJS releases from npm into `~/.cesium-bench/cesium` (or
`BENCH_CESIUM_DIR`), checked against the registry's integrity hash. The dev
server also fetches a missing release the first time a page asks for it.
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

The Viewer loads none of this by default. `new Viewer({ frameData:
"/frames-data/" })` (or a `FrameData` already loaded) draws the sun, stars and
Moon from DE440 and the IAU 2006/2000A Earth rotation inside the data's span;
`viewer.frameData` is always a promise: it resolves to the data, or to
`undefined`, silently when the option was not given and after one
`console.warn` when loading failed (the sky then stays analytic). A
`FrameData` object that is already loaded applies at construction. Without the option, Earth-only rendering is
unchanged. The bench Explorer opts in.

```sh
npm run build                               # at the repo root: 1.x build used by the parity harness
npm run dev --workspace @cesium/next        # dev server at http://127.0.0.1:5190
npm run test --workspace @cesium/next       # unit + 1.x parity (L0) tests
npm run typecheck --workspace @cesium/next
npm run bench --workspace @cesium/next      # needs the dev server; writes bench/results/*.json
npm run build:lib --workspace @cesium/next  # the library for pages without a build step
```

**The library build** (`build:lib`, `vite.lib.config.ts`) writes
`dist-lib/`: `cesium-next.mjs` (one ES module, the shaders inlined),
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

Pages on the dev server:

- `/#/viewer` — Dyno's Viewer: one engine at a time (2.0 through
  `widgets/Viewer`, or a 1.x release), with sample glTF models and 3D Tiles,
  ion assets (`?asset=<id>`; `VITE_ION_TOKEN` in `.env.local`), iModels and
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
  (`runTileset()`). Private ion assets: put `VITE_ION_TOKEN=<token>` in
  `packages/next/.env.local` (gitignored) and open with `?asset=<id>`
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
