# Frames 2: The Frame Tree, Trajectories and the Sky from DE440 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the public API a frame tree (ICRF, the Earth's and the Moon's inertial and fixed frames, EME2000, local frames), frame-tagged points with explicit conversion at an instant, and trajectories read from CCSDS OEM and SPK files. Then switch the engine's sun, stars and Moon to plan 1's data when it is loaded.

**Architecture:**

- **Frames.** A `Frame` is a node with a parent and a float64 transform to that parent as a function of an `Instant`. `createFrames(data)` builds the built-in tree from plan 1's `FrameData`. `frameTransform` composes any two frames through their lowest common ancestor.
- **Trajectories.** A `Trajectory` interpolates published states, sharing one interpolation module between OEM files and SPK types 8, 9, 12 and 13. It is a member of the tree: its own frame, whose origin moves.
- **Rendering.** The `Viewer` takes the data as configuration and fills the engine's existing sun, star and Moon inputs from it. Without data it keeps today's analytic models.
- **Not in this plan.** Rendering stays Earth-fixed: re-rooting the world under body frames is plan 5.

**Tech Stack:** TypeScript (float64), Vitest, Node setup scripts (`.mjs`), and Python via `uv` (pyerfa, spiceypy, numpy) to generate fixtures locally. As in plan 1, spiceypy runs CSPICE on this machine for reference values only.

**Spec:** `docs/superpowers/specs/2026-11-05-frames-bodies-measurement-design.md`, sections 5 ("The Sun's position for lighting", `icrfToFixed`), 6.1–6.3, 6.4 (`Body` extended with its fixed frame), 9 and 10. Plan 1 (`docs/superpowers/plans/2026-11-05-frames-1-time-ephemerides.md`) supplies `Instant`, `LeapSeconds`, `EarthOrientationParameters`, `celestialToTerrestrial`, `Ephemeris` and `loadFrameData`.

**Roadmap (plan 2 of 5).**
3. Measurement and snapping: light time, the relativistic terms (including the TT/TDB scaling of geocentric vectors, R2 below), velocity transforms, line of sight, and accuracy statements (EOP prediction age; the OEM covariance).
4. Engineering frames: PROJ, alignments, and the corridor example.
5. Multiple bodies in one scene, cameras, and the Artemis II example. LRO's source (Horizons vectors or a NAIF SPK) is settled there.

**Carried from plan 1's final review:**

- Reading non-type-2 SPK segments: Task 3. The files in use are types 13 and 8 (read 2026-11-05), not 21.
- A row-major to column-major helper: R7, Task 1.
- `lastObserved` on the EOP, for prediction age: plan 3.
- A generic `Ephemeris.state(target, center)`: not needed, because the frame tree composes origins.

## Rulings this plan makes

Each ruling is listed with what it costs if it is wrong.

- **R1. The axes behind an SPK's J2000 label are declared, not assumed.** NAIF converted the Artemis II OEM (EME2000) to SPK with `STRING_MAPPING = ('EME2000', 'J2000')`, so the SPK's frame 1 holds EME2000 numbers. DE440's frame 1 is ICRF. The two differ by the frame bias, about 45 m at 400,000 km. So `Trajectory.fromSpk` requires `j2000: "icrf" | "eme2000"`.
  - Cost if wrong: one required option.
- **R2. Frame edges are Newtonian in this plan.** The GCRF→ICRF edge translates by the Earth's barycentric position, with no TT/TDB scaling or Lorentz term (spec section 4: about 9.5 m plus 2 m at the Moon). Plan 3 adds them to that one edge. Tests here compare against SPICE, which is Newtonian too.
  - Cost if wrong: plan 3 changes one edge function and its tolerances.
- **R3. Rendering falls back; frames throw.** The sky functions (Task 7) use the analytic models for an instant outside the ephemeris span, and report which source they used. Frame transforms and trajectories throw outside their data, as plan 1's `Ephemeris` does. Scrubbing to 1950 must not break the sky, and a measurement must never silently degrade.
  - Cost if wrong: a flag.
- **R4. Overlapping SPK data follows SPICE's precedence.** Later files win over earlier ones, and later segments over earlier ones in the same file. This matches SPICE for the Artemis main file plus its gap-fill file, which share segment endpoints. OEM segments follow the same later-wins rule.
- **R5. The OEM reader never guesses an interpolation.** It uses the header's `INTERPOLATION` and `INTERPOLATION_DEGREE`. The Artemis OEM has neither, so `fromOem` then requires `interpolation`. The Artemis tests pass Hermite degree 11, the setting NAIF's OEM2SPK conversion used.
  - Cost if wrong: an option.
- **R6. The world is not re-rooted yet.** Content stays Earth-fixed. `worldTransformFrame` exposes a world transform as an ITRF child for conversions, but rendering composition across bodies is plan 5.
- **R7. Two matrix conventions, one bridge.**
  - Plan 1's rotations stay row-major 3×3, mapping parent to child, as ERFA writes them.
  - Frame transforms are column-major float64 4×4 (`Mat4`, as `World` uses), with `p_parent = M · p_child`.
  - Only `src/frames/matrix.ts` converts between them.
- **R8. Trajectory files join the setup store by default.** These are the Artemis II OEM, its SPK and gap-fill SPK, and NAIF's DSN station SPK: about 12 MB, SHA-256 pinned, credited to NASA. The data tests need them, and plan 5 uses them.
- **R9. The OEM is the primary Artemis source.** OEM2SPK converted UTC to TDB with SPICE's approximate TDB−TT (good to about 30 µs). At up to 11 km/s that is about 0.3 m, so the OEM and the SPK, each read exactly, may disagree by up to 0.5 m. The test asserts that bound and records the measured value.
- **R10. The `Viewer` keeps the analytic sky by default.** The spec loads data only when a scene needs it, so the frames data is opt-in. The bench Explorer opts in.
- **R11. Frames carry positions only.** Velocity transforms, which need the rotation's rate, are plan 3. Trajectories return velocities in their own reference frame.

## Global Constraints

- **Units.** All positions, times and matrices are float64. The public API uses meters, seconds and radians. Kilometers appear only inside source files (SPK, OEM) and packs.
- **Matrix conventions** follow R7. A matrix is never reinterpreted without going through `src/frames/matrix.ts`.
- **Data comes only through setup.**
  - `npm run setup` writes to `~/.cesium-bench/frames/` (overridden with env `FRAMES_DATA_DIR`), and the dev server serves it at `/frames-data/`.
  - Nothing downloaded is committed. Only code and small JSON fixtures in `test/fixtures/frames/` are.
  - Downloaded NAIF files are checked against pinned SHA-256 values.
- **Licenses and credit.**
  - The frame-bias port keeps ERFA's BSD-3 notice and says "derived from ERFA" in its header.
  - The Artemis II data is credited "NASA JSC FOD Navigation, via NAIF" and the DSN station SPK "NAIF/JPL", in the manifest's `credit` and in the README.
- **Accuracy against the references:**

  | What | Within | Reference |
  | --- | --- | --- |
  | Frame bias matrix | 1e-15 | pyerfa `bp06` |
  | SPK states, positions | 1 mm | spiceypy `spkgeo` |
  | SPK states, velocities | 1e-6 m/s | spiceypy `spkgeo` |
  | Frame-tree rotations | 1e-12 | plan 1's fixtures |
  | Frame-tree translations | 1 mm | plan 1's fixtures |
  | Orion in MOON_ME | 1 mm | spiceypy `spkpos` |

- **Earth-only scenes are unchanged.** Without frames data, every existing test, parity page and gate result stays the same.
- **Repository practice:**
  - Commit locally and never push. End each message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  - `npx tsc --noEmit -p .`, `npx eslint` and prettier pass.
  - Run `snyk_code_scan` on new code and fix what it reports.
  - No ion tokens in the repo.
- **Commands** run in `packages/next`.

## Review Focus

1. **An instant in a trajectory's gap, or outside its data.** The Artemis OEM has gaps of 10 to 38 s between its six segments. `state` throws, naming the covered spans, and never extrapolates. The sky functions fall back, as R3 says. Tests: Task 5 (gap), Task 7 (sky fallback).
2. **EME2000 data under a J2000 label** (R1). Reading the Artemis SPK as ICRF misplaces Orion by tens of meters at the Moon. Tests: Task 5 (the option is required, and the bias is applied); Task 6 (OEM and SPK agree only when both are read as EME2000).
3. **OEM epochs that ms-precision UTC can't express.** These include 23:59:60.5 inside an inserted leap second, day-of-year epochs, and TT or TDB time systems. Test: Task 4.
4. **Interpolation at the edges.** This covers windows that hit a segment's first or last states, an instant exactly on a stored epoch, and an instant on the shared endpoint of a main and a gap-fill segment. Results must match SPICE. Tests: Task 3 (rules), Task 6 (against SPICE).
5. **Stale or mismatched frame state.**
   - A moving point converted at an instant other than its own: throws.
   - A frame's per-instant cache reused for a different instant: must recompute.
   - A world transform changed at the same instant: its frame reads the new matrix.
   - Frames from two different trees combined: throws "no common ancestor".

   Tests: Task 1 and Task 2.

---

### Task 1: `Frame`, transforms between frames, frame-tagged points and local frames

**Files:**

- Create:
  - `packages/next/src/frames/matrix.ts`
  - `packages/next/src/frames/Frame.ts`
  - `packages/next/src/frames/local.ts`
- Modify: `packages/next/src/index.ts`
- Test: `packages/next/test/frames.test.ts`

**Interfaces:**

- Consumes:
  - `Instant` (`.tt`)
  - `Mat4`, `invertAffine`, `multiply` from `src/math/mat4.ts`
  - `eastNorthUpToFixedFrame` from `src/math/transforms.ts`
  - `World.worldMatrix(handle, out)` and `TransformHandle`
- Produces:
  - `toParentMatrix(parentToChild: ArrayLike<number>, origin: ArrayLike<number> | undefined, out: Mat4): Mat4`
    - `parentToChild` is row-major 3×3 (`child = R · parent`).
    - `origin` is the child's origin in the parent, in meters.
    - It writes `M` with `p_parent = Rᵀ · p_child + origin`.
  - `class Frame<N extends string = string>`:
    - `readonly name: N`
    - `readonly parent: Frame | undefined`
    - `constructor(name: N, parent: Frame, toParent: (instant: Instant, out: Mat4) => void, options?: { cache?: boolean })`. `cache` defaults to true. When caching, the frame keeps one entry keyed by `instant.tt`.
    - `static root<N extends string>(name: N): Frame<N>`
    - `static constant<N extends string>(name: N, parent: Frame, toParent: ArrayLike<number>): Frame<N>`
    - `toParent(instant: Instant, out?: Mat4): Mat4`. A root returns identity.
  - `frameTransform(from: Frame, to: Frame, instant: Instant, out?: Mat4): Mat4`. It returns `p_to = M · p_from`, composed through the lowest common ancestor, and throws `no common ancestor` across trees.
  - `interface FramePoint<N extends string = string> { readonly frame: Frame<N>; readonly position: Float64Array; readonly instant?: Instant }`
  - `framePoint<N extends string>(frame: Frame<N>, position: ArrayLike<number>, instant?: Instant): FramePoint<N>`
  - `convertPoint<M extends string>(point: FramePoint, to: Frame<M>, instant?: Instant): FramePoint<M>`
    - The instant defaults to `point.instant`.
    - It throws when both are given and their `tt` differ, or when neither is given.
    - The result carries the instant used.
  - `eastNorthUpFrame<N extends string>(name: N, bodyFixed: Frame, ellipsoid: Ellipsoid, position: ArrayLike<number>): Frame<N>`
  - `worldTransformFrame<N extends string>(name: N, world: World, handle: TransformHandle, earthFixed: Frame): Frame<N>`. It is uncached and reads `world.worldMatrix` on every call (R6).
  - All of these are exported from `src/index.ts`.

- [ ] **Step 1: Write the failing tests** in `test/frames.test.ts`. Use synthetic frames:
  - `root` "R".
  - `spin`, a child of `root`, rotating about z by `ω·tt` (ω = 1e-3 rad/s) with origin `[1e11, 0, 0]`.
  - `arm`, a constant child of `spin` translated `[0, 6.4e6, 0]`.
  - `other`, a child of `root` translated `[0, 0, 3.8e8]`.

  Tests:
  - `toParentMatrix` with R a 90° frame rotation about z (`[0,1,0, -1,0,0, 0,0,1]` row-major) maps child `[1,0,0]` to parent `[0,1,0]` plus origin.
  - `frameTransform(arm, other, t)` equals the hand-composed `inverse(other) · spin(t) · arm`, element-wise within 1e-4 m and 1e-15. The float64 spacing at 1e11 m is 1.5e-5 m.
  - `frameTransform(a, b, t) · frameTransform(b, a, t)` is identity within 1e-15 (rotation) and 1e-4 m (translation).
  - `frameTransform(f, f, t)` is identity.
  - Two calls at different instants give different results, so the cache is keyed by instant (Review Focus 5).
  - A frame from a second `Frame.root("R2")` tree makes `frameTransform` throw `/no common ancestor/`.
  - `convertPoint` of a point with instant t1, asked for instant t2 ≠ t1, throws. Asked for t1 or with no instant argument, it converts. With neither instant, it throws.
  - `worldTransformFrame`: add a world transform. Convert a point. `setTransform` to a new matrix. Convert again at the same instant and see the new placement (Review Focus 5).
  - `eastNorthUpFrame` at `fromDegrees(-75, 40, 0)` on WGS84: its z axis expressed in the parent equals the ellipsoid normal there, within 1e-15.

  Build `World` the way `test/world.test.ts` does (`fakeGpu.ts`).
- [ ] **Step 2: Run** `npx vitest run test/frames.test.ts` and confirm it fails (modules missing).
- [ ] **Step 3: Implement** `matrix.ts`, `Frame.ts` and `local.ts`.
  - **Composition.** Walk both frames to the root to find the lowest common ancestor. Multiply `toParent` up from `from` to it. Multiply up from `to` to it and invert that with `invertAffine`. Use the general affine inverse, not the transpose, because plan 3 adds a scale to one edge (R2).
  - **Allocation.** Keep per-call scratch in module-level `Mat4`s. `out` may not alias them.
- [ ] **Step 4: Run** the test and confirm it passes. Then run `npm test` and confirm nothing else broke.
- [ ] **Step 5: Commit** with "frames: Frame, frameTransform, frame-tagged points and local frames".

### Task 2: The frame bias and the built-in frame tree

**Files:**

- Create:
  - `packages/next/src/time/erfa/bias.ts`
  - `packages/next/src/frames/frames.ts`
  - `packages/next/test/fixtures/frames/bias.json`
- Modify:
  - `packages/next/scripts/frameFixtures.py` (section `bias`)
  - `packages/next/src/scene/Body.ts`
  - `packages/next/src/math/ellipsoid.ts`
  - `packages/next/src/index.ts`
- Test: `packages/next/test/frameTree.test.ts`, `packages/next/test/data/frameTree.test.ts`

**Interfaces:**

- Consumes:
  - From Task 1: `Frame`, `toParentMatrix` and `frameTransform`.
  - `FrameData` (`leapSeconds`, `eop`, `ephemeris`).
  - `Ephemeris`: `sun`, `earth` and `moon` (positions are `[0..2]`), and `moonMeanEarth(instant, out)` (row-major, `me = M · icrf`).
  - `MOON_PA_TO_ME` (row-major, `me = M · pa`).
  - `EarthOrientationParameters.atInstant(instant, leap)`.
  - `celestialToTerrestrial(instant, sample, out)` (row-major, `itrs = M · gcrs`).
- Produces:
  - `frameBias(out?: Float64Array): Float64Array`. It is row-major and gives `eme2000 = B · icrs`: ERFA `bi00`'s offsets, assembled as `eraBp06`'s `rb`.
  - `interface Frames`:
    - Inertial frames:
      - `icrf: Frame<"ICRF">`, the root.
      - `hcrs: Frame<"HCRS">`, with origin the Sun and ICRF axes.
      - `gcrf: Frame<"GCRF">`, with origin the Earth's center and ICRF axes.
      - `eme2000: Frame<"EME2000">`, a child of `gcrf` with `frameBias` axes.
      - `moonIcrf: Frame<"MOON_ICRF">`, with origin the Moon and ICRF axes.
    - Fixed frames:
      - `itrf: Frame<"ITRF">`, a child of `gcrf` through `celestialToTerrestrial`.
      - `moonMe: Frame<"MOON_ME">`, a child of `moonIcrf` through `moonMeanEarth`.
      - `moonPa: Frame<"MOON_PA">`, a constant child of `moonMe` through `MOON_PA_TO_ME`.
    - `bodyFixed(body: Body): Frame`. It returns `itrf` for `naifId` 399 and `moonMe` for 301, and throws naming the body otherwise.
    - `readonly data: FrameData`.
  - `createFrames(data: FrameData): Frames`
  - `Body` gains `readonly naifId?: number`. `EARTH` gets `naifId: 399`.
  - The new `MOON: Body` is `{ name: "Moon", ellipsoid: Ellipsoid.MOON, naifId: 301 }`, with no atmosphere.
  - `Ellipsoid.MOON` is a sphere of 1,737,400 m (1.x's `Ellipsoid.MOON`, Cesium Moon's).
  - `frameBias`, `createFrames`, `Frames` and `MOON` are exported.

- [ ] **Step 1: Generate the fixture.**
  - Add a section `bias` to `scripts/frameFixtures.py`. It writes `erfa.bp06(2451545.0, 0.0)[0]` (rb, row-major) and `erfa.bi00()` to `bias.json`.
  - Run `uv run --with pyerfa --with numpy python scripts/frameFixtures.py bias`.
- [ ] **Step 2: Write the failing tests.**
  - **Unit tests** (`test/frameTree.test.ts`) build `FrameData` from `test/syntheticPacks.ts`. Its `eop` is a stub whose `atInstant` returns one fixed `EopSample`, cast to `EarthOrientationParameters`. Later tasks' unit tests reuse this stub.
    - `frameBias()` matches `bias.json` element-wise within 1e-15, and `B · Bᵀ` is identity within 1e-15.
    - The GCRF origin in ICRF (the translation of `frameTransform(gcrf, icrf, t)`) equals `ephemeris.earth(t)` within 1e-4 m.
    - The same holds for `hcrs`/`sun` and `moonIcrf`/`moon`.
    - `frameTransform(eme2000, gcrf, t)`'s rotation equals `frameBiasᵀ`.
    - `bodyFixed(EARTH) === frames.itrf`, and `bodyFixed(MOON) === frames.moonMe`.
    - `bodyFixed({ name: "Mars", ellipsoid })` throws `/Mars/`.
    - An instant outside the packs' span makes `frameTransform(itrf, icrf, t)` throw with the span in its message (R3).
  - **Data tests** (`test/data/frameTree.test.ts`) use the store via `framesDataDirectory()`, as `test/data/ephemeris.test.ts` does, and plan 1's checked-in fixtures:
    - For every `earth.json` row, the rotation of `frameTransform(gcrf, itrf, t)` equals that row's GCRS→ITRS matrix within 1e-12 (rows' instants via `Instant.fromTt`). Each row gets a stub `eop` returning that row's sample, built as `test/earthOrientation.test.ts` builds it.
    - For every `moon.json` row, the rotation of `frameTransform(icrf, moonMe, t)` equals its `me` within 1e-12, and that of `frameTransform(icrf, moonPa, t)` equals its `pa` within 1e-12.
    - The ITRF→MOON_ME translation, composed through ICRF, agrees with `R_me · (earth − moon)` computed directly from `Ephemeris` within 1 mm.
- [ ] **Step 3: Run** `npx vitest run test/frameTree.test.ts` and `npm run test:data`, and confirm both fail.
- [ ] **Step 4: Implement.**
  - `bias.ts` carries ERFA's license header.
  - Each edge in `frames.ts` is a `Frame` whose `toParent` fills its `Mat4` through `toParentMatrix`, using plan 1's functions and scratch arrays.
  - `MOON` and `Ellipsoid.MOON` go in `Body.ts` and `ellipsoid.ts`.
- [ ] **Step 5: Run** both test commands and confirm they pass. Then run `npm test` and confirm it passes.
- [ ] **Step 6: Commit** with "frames: frame bias, the built-in frame tree, and the Moon as a Body".

### Task 3: SPK state segments (types 8, 9, 12, 13) and the shared interpolation

**Files:**

- Create: `packages/next/src/trajectory/interpolate.ts`
- Modify:
  - `packages/next/src/ephemeris/spk.ts`
  - `packages/next/test/spkWriter.ts` (write types 8, 9, 12 and 13)
- Test: `packages/next/test/spkStates.test.ts`

**Interfaces:**

- Consumes: `parseDaf` and the existing `Type2Segment`.
- Produces:
  - `Type2Segment` gains `type: 2`.
  - `interface StateSegment`:
    - `type: 8 | 9 | 12 | 13`
    - `target`, `center`, `frame` and `name`
    - `start` and `end` (TDB s)
    - `epochs: Float64Array` (TDB s). Types 8 and 12 are expanded from their start and step.
    - `states: Float64Array`, with 6 values per epoch in km and km/s, as stored.
    - `windowSize: number`, which is degree + 1 for 8 and 9, and the stored value + 1 for 12 and 13.
    - `method: "lagrange" | "hermite"`
  - `readSpk(buffer: ArrayBuffer): { segments: (Type2Segment | StateSegment)[] }`. It throws for other types, naming the type. `readDaf` keeps its type-2-only contract by delegating to it.
  - In `src/trajectory/interpolate.ts`:
    - `windowStart(epochs: Float64Array, t: number, size: number): number` returns the 0-based index of the window's first state.
    - `interpolateState(method: "lagrange" | "hermite", epochs: Float64Array, states: Float64Array, first: number, size: number, t: number, out: Float64Array): Float64Array`
      - **Lagrange** interpolates each of the six components separately, as SPICE's types 8 and 9 do.
      - **Hermite** interpolates position from positions and velocities, and returns the derivative of that same polynomial as velocity, as SPICE's types 12 and 13 do (`HRMINT`).
      - Results stay in the input's units.
- **The window rule** (SPICE `spkr09`/`spkr13`):
  - Let `low` be the index of the last epoch strictly before `t`.
  - For an even size, `first = low − size/2 + 1`.
  - For an odd size, center the window on the epoch nearest `t`: `first = near − (size−1)/2`.
  - Then clamp `first` to `[0, count − size]`.
  - At a stored epoch, either neighboring window gives the stored state, so the tie doesn't change values. Task 6's spiceypy fixtures pin the even case on real data.

- [ ] **Step 1: Write the failing tests** in `test/spkStates.test.ts`.
  - Extend `test/spkWriter.ts` to write the four types' layouts from SPK Required Reading:
    - States, then epochs (9 and 13), then epoch directories every 100 epochs (9 and 13).
    - The trailer is `[start epoch, step, degree, n]` for type 8, `[start epoch, step, window−1, n]` for type 12, `[degree, n]` for type 9 and `[window−1, n]` for type 13.
  - Tests:
    - **Exact reproduction.** Take a cubic trajectory `x(t) = a + b·t + c·t² + d·t³` per axis, with the velocity its derivative. Written as a type 9 (degree 3), 13 (window 2), 8 and 12, each reads back position within 1e-9 km and velocity within 1e-12 km/s, at instants between epochs, at stored epochs, and inside the first and last windows (Review Focus 4).
    - **Uneven spacing.** Type 9 and 13 epochs are uneven (steps 60, 37, 60, 10, …), and interpolation still reproduces the cubic.
    - **The window rule.**
      - For 10 epochs `0..9` and size 6, `windowStart(epochs, 4.5, 6) === 2`.
      - At `t = 0.2`, `windowStart(epochs, 0.2, 6) === 0` (clamped).
      - At `t = 8.9`, `windowStart(epochs, 8.9, 6) === 4`.
      - For size 5 at `t = 4.4`, it returns 2 (nearest 4); at `t = 4.6`, it returns 3.
    - **Rejections.** `readSpk` on a type-21 segment throws `/type 21/`. `readDaf` on a type-13 file still throws (its type-2-only contract).
- [ ] **Step 2: Run** `npx vitest run test/spkStates.test.ts` and confirm it fails.
- [ ] **Step 3: Implement** `readSpk` and `interpolate.ts`. Find `low` by binary search over `epochs`; the epoch directories don't need reading. Hermite uses the standard divided-difference form on doubled nodes.
- [ ] **Step 4: Run** the test, `npx vitest run test/spk.test.ts test/pack.test.ts`, and `npm test`, and confirm they pass.
- [ ] **Step 5: Commit** with "frames: SPK types 8, 9, 12 and 13 with SPICE's interpolation windows".

### Task 4: Reading CCSDS OEM, and ISO times in any time scale

**Files:**

- Create: `packages/next/src/trajectory/oem.ts`
- Modify: `packages/next/src/time/Instant.ts`
- Test: `packages/next/test/oem.test.ts`

**Interfaces:**

- Consumes: `Instant`, `LeapSeconds` (`taiMinusUtc`, `isExpired`).
- Produces:
  - `Instant.fromIso(text: string, scale: "UTC" | "TAI" | "TT" | "TDB", leap: LeapSeconds): Instant`
    - It accepts `YYYY-MM-DDThh:mm:ss[.f…]` and `YYYY-DDDThh:mm:ss[.f…]` (day of year), with an optional trailing `Z`.
    - Seconds may be `60.x` only in UTC, and only at the end of a day that ends with an inserted leap second (per `leap`). Otherwise it throws.
    - Fractions keep every digit given; parse them as a decimal, not through `Date`.
  - `interface OemSegment`:
    - `objectName`, `objectId`, `centerName`, `refFrame` and `timeSystem` (strings, as given)
    - `start`, `stop`: `Instant`
    - `useableStart?`, `useableStop?`: `Instant`
    - `interpolation?: "LAGRANGE" | "HERMITE" | string`
    - `interpolationDegree?: number`
    - `epochs: Float64Array` (TDB s)
    - `states: Float64Array` (m and m/s, 6 per epoch)
  - `parseOem(text: string, leap: LeapSeconds): { version: string; segments: OemSegment[] }`
    - It reads the KVN form (CCSDS 502.0-B-3), versions 1.0 to 3.0.
    - It skips `COMMENT` lines, blank lines and `COVARIANCE_START…COVARIANCE_STOP` blocks (plan 3 reads covariance).
    - It ignores accelerations (columns 7 to 9).
    - It throws, naming the line number, on:
      - the XML form;
      - a data line with other than 7 or 10 fields;
      - a missing `META_STOP`;
      - epochs that don't increase;
      - an epoch outside `START_TIME…STOP_TIME`;
      - `TIME_SYSTEM` outside {UTC, TAI, TT, TDB}.

- [ ] **Step 1: Write the failing tests** in `test/oem.test.ts`.
  - **`fromIso`:**
    - `Instant.fromIso("2026-04-02T01:58:21.397", "UTC", leap).toUtc(leap) === Date.UTC(2026,3,2,1,58,21,397)`.
    - The day-of-year form `"2026-092T01:58:21.397"` gives the same instant.
    - `fromIso("2016-12-31T23:59:60.5", "UTC")` lies 1.5 s of TT after `"2016-12-31T23:59:59"` and 0.5 s before `"2017-01-01T00:00:00"`, within 1e-9 (Review Focus 3).
    - `"2015-12-31T23:59:60"` throws (no leap second that day).
    - `fromIso("2000-01-01T12:00:00", "TT").tt === 0`.
    - `fromIso("2000-01-01T12:00:00", "TDB").tdb()` is within 1e-9 of 0.
    - `"2026-04-02T01:58:21.0000004"` keeps its 0.4 µs (TT differs from `…21` by 4e-7 within 1e-9).
  - **`parseOem`**, on a synthetic two-segment OEM written in the test. It has comments, a covariance block, a segment with accelerations, `USEABLE_START_TIME`, `INTERPOLATION = HERMITE` and `INTERPOLATION_DEGREE = 7`:
    - The segment count, the metadata strings, the km→m scaling, and epochs equal to `fromIso(…).tdb()`.
    - Each listed error throws with `/line \d+/`.
  - **The Artemis header form.** A three-line excerpt in the Artemis header's form (`CCSDS_OEM_VERS = 3.0`, `REF_FRAME = EME2000`, `CENTER_NAME = EARTH`, `TIME_SYSTEM = UTC`, no `INTERPOLATION`) parses, with `interpolation` undefined.
- [ ] **Step 2: Run** `npx vitest run test/oem.test.ts` and confirm it fails.
- [ ] **Step 3: Implement.**
  - **`fromIso`.** Split the text into calendar fields, a whole second and a fraction. For a UTC tag, call `Instant.fromUtc(ms, leap)` with the whole-second ms, then add the fraction in TT. For seconds 60, use 59 as the whole second and add 1 s more. A day ends with an inserted leap second when `taiMinusUtc` at the next midnight exceeds its value at 23:59:59 by 1. For a TT, TAI or TDB tag, compute seconds past J2000 of that scale with `Date.UTC` arithmetic on the calendar fields (no leap seconds, by definition), then call `fromTt`, `fromTt(tai + 32.184)` or `fromTdb`.
  - **`parseOem`.** A line-by-line state machine.
- [ ] **Step 4: Run** the test and `npx vitest run test/instant.test.ts`, and confirm they pass.
- [ ] **Step 5: Commit** with "frames: CCSDS OEM reader and ISO times in UTC, TAI, TT and TDB".

### Task 5: `Trajectory`

**Files:**

- Create: `packages/next/src/trajectory/Trajectory.ts`
- Modify: `packages/next/src/index.ts`
- Test: `packages/next/test/trajectory.test.ts`

**Interfaces:**

- Consumes:
  - `Frames` and `Frame` (Tasks 1–2).
  - `readSpk`, `StateSegment`, `windowStart` and `interpolateState` (Task 3).
  - `parseOem` and `OemSegment` (Task 4).
- Produces:
  - `type TrajectoryAccuracy = "precise" | "approximate"`
  - `class Trajectory<N extends string = string>`:
    - `readonly name: N`
    - `readonly accuracy: TrajectoryAccuracy`
    - `readonly reference: Frame`, the frame its states are in.
    - `readonly frame: Frame<N>`, a child of `reference` translated by the object's position at the instant, with `reference`'s axes. Its origin is the object.
    - `readonly spans: readonly (readonly [number, number])[]` (TDB s, sorted and merged)
    - `contains(instant: Instant): boolean`
    - `state(instant: Instant, out?: Float64Array): Float64Array`, giving m and m/s in `reference`. It throws outside `spans` with the spans as ISO UTC in the message.
    - `static fromOem<N extends string>(oem: { segments: OemSegment[] }, frames: Frames, options: { name: N; accuracy: TrajectoryAccuracy; object?: string; interpolation?: { method: "lagrange" | "hermite"; degree: number } }): Trajectory<N>`
    - `static fromSpk<N extends string>(files: ArrayBuffer[], target: number, frames: Frames, options: { name: N; accuracy: TrajectoryAccuracy; j2000: "icrf" | "eme2000" }): Trajectory<N>`
- **Mapping a source's origin and axes to `reference`:**

  | Center | Axes | Reference |
  | --- | --- | --- |
  | EARTH, 399 | EME2000 (OEM), or frame 1 with `j2000: "eme2000"` | `eme2000` |
  | EARTH, 399 | ICRF / GCRF, or frame 1 with `j2000: "icrf"` | `gcrf` |
  | EARTH, 399 | ITRF / ITRF93, SPK frame 13000 | `itrf` |
  | MOON, 301 | ICRF or EME2000 | `moonIcrf` (an EME2000 Moon-centred source throws "not supported yet") |
  | SUN, 10 | ICRF | `hcrs` |
  | SSB, 0 | ICRF | `icrf` |

  Anything else throws, naming the center and frame. All segments must map to one reference.
- **Interpolation.** An OEM segment uses its header's method and degree. Without them it uses `options.interpolation`, and without that it throws, naming the segment (R5).
  - A Lagrange degree d uses a window of d+1.
  - A Hermite degree d uses a window of (d+1)/2. An even Hermite degree throws.
- **Precedence** follows R4.

- [ ] **Step 1: Write the failing tests** in `test/trajectory.test.ts`, with synthetic `Frames` (as Task 2's unit tests build them), synthetic OEM text and synthetic SPKs from `test/spkWriter.ts`:
  - **A cubic trajectory reproduces exactly.**
    - Through `fromOem` with Hermite degree 7, the position is within 1e-6 m.
    - Through `fromSpk` type 13, the result is the same.
  - **Gaps.** Two OEM segments with a 38 s gap, one ending 2026-04-02T22:49:21.397 and the next starting 22:49:59.741, as Artemis's first two do: `state` inside the gap throws `/2026-04-02T22:49:21/`, giving the covered spans; `contains` is false there (Review Focus 1).
  - **Precedence.** Two SPK files covering `[0,100]` and `[100,200]`, and a third covering `[90,110]` with different states, loaded last: at `t = 100` and `t = 95` the third wins, and at `t = 50` the first (R4).
  - **Missing interpolation.** An OEM without `INTERPOLATION` and no `interpolation` option throws `/interpolation/` (R5).
  - **R1, EME2000 through J2000.** `fromSpk(…, { j2000: "eme2000" })` gives `reference === frames.eme2000`. `j2000: "icrf"` gives `frames.gcrf`. The same file read both ways and converted to `gcrf` differs by the frame-bias rotation of its position.
  - **Tree membership.** `convertPoint(framePoint(traj.frame, [0,0,0]), frames.gcrf, t)` equals `state(t)` turned to `gcrf`.
  - **Rejections.** A source centered on Mars (499) throws `/499/`. An OEM with two objects and no `object` option throws, listing both.
  - **Accuracy.** `accuracy` is stored as given.
- [ ] **Step 2: Run** `npx vitest run test/trajectory.test.ts` and confirm it fails.
- [ ] **Step 3: Implement** `Trajectory.ts`.
  - Keep each source segment as `{ start, end, epochs, states (m, m/s), method, windowSize }`, in precedence order.
  - Choose the segment by a scan from the highest precedence. The Artemis data has 11 segments, so a scan is enough.
- [ ] **Step 4: Run** the test and `npm test`, and confirm they pass.
- [ ] **Step 5: Commit** with "frames: Trajectory from OEM and SPK, as a member of the frame tree".

### Task 6: Trajectory data in the setup store, checked against SPICE

**Files:**

- Create:
  - `packages/next/test/fixtures/frames/trajectories.json`
  - `packages/next/test/data/trajectory.test.ts`
- Modify:
  - `packages/next/scripts/frameData.mjs`
  - `packages/next/scripts/frameFixtures.py` (section `trajectories`)
  - `packages/next/test/frameDataRefresh.test.ts` if setup's tested behavior changes
- Test: `packages/next/test/data/trajectory.test.ts`

**Interfaces:**

- Consumes:
  - From Tasks 2 and 5: `Trajectory`, `createFrames` and `parseOem`.
  - `framesDataDirectory()` and `NAIF_SHA256`.
- Produces store files, which the manifest lists with role `trajectory`, `sourceUrl`, `sha256` and `credit`. Each is pinned in `NAIF_SHA256` (values recorded 2026-11-05):

  | File | Source path | SHA-256 |
  | --- | --- | --- |
  | `EM2_FODNAVBET_revF_PUBLIC.oem` | `https://naif.jpl.nasa.gov/pub/naif/ARTEMIS/kernels/spk/` | `d8ed8a5a16d40d69da32a54d83a19970e47f4e8bd6e547210b01b1c78e002ff3` |
  | `art002_rec_260402_260410_jsc_bet_revf.bsp` | `https://naif.jpl.nasa.gov/pub/naif/ARTEMIS/kernels/spk/` | `b8b3ebc4d703c3a73c9651b9da36114c3ef0b2c75f92873dd4970f32367aa7be` |
  | `art002_rec_260402_260410_jsc_bet_revf_gapfill.bsp` | `https://naif.jpl.nasa.gov/pub/naif/ARTEMIS/kernels/spk/` | `ac9e3f21302a6a510757fff41a9f8a55df907b75fb2142b8fdfc44a599ddc9b9` |
  | `earthstns_itrf93_260814.bsp` | `https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/stations/` | `007eb0aad5dd022c6d61bdbfb2395680bd1eb31c49a8637d0b0a1cfbea737c6b` |

- **What the files hold, read 2026-11-05:**
  - **Main SPK:** target −24, center 399, frame 1, type 13, 6 segments, TDB 828367171 to 829137274.
  - **Gap-fill SPK:** the same target, center, frame and type, 5 segments.
  - **Stations:** 19 targets 3990xx, center 399, frame 13000 (ITRF93), type 8.
  - **OEM:** 6 segments, EME2000, Earth-centred, UTC, with no `INTERPOLATION` keyword. NAIF converted it with Hermite degree 11.
  - `loadFrameData`'s required roles are unchanged; trajectories are optional.

- [ ] **Step 1: Extend setup.** `ensureFrameData` downloads the four files with `ensureNaif` (pinned), stores them, and adds their manifest entries. Their credits are "NASA JSC FOD Navigation, via NAIF" for the Artemis files and "NAIF/JPL" for the stations. Run `npm run setup` and confirm the four files are in the store and the manifest.
- [ ] **Step 2: Generate the fixture.** Add a section `trajectories <store> <frame kernel>` to `frameFixtures.py`. No LSK is needed, since every instant is given as TDB. It furnishes the main then the gap-fill SPK, `de440s.bsp`, `moon_pa_de440_200625.bpc`, the frame kernel `moon_de440_250416.tf` and the station SPK. It writes:
  - Orion `spkgeo(-24, et, "J2000", 399)` at 40 TDB instants:
    - one at each of the 11 segment starts and ends, including the shared main/gap-fill endpoints (Review Focus 4);
    - one at a stored epoch;
    - one 1 s inside each segment end;
    - the rest spread across the span.
  - Orion `spkpos(-24, et, "MOON_ME", "NONE", 301)` at 10 of those instants.
  - DSS-14 (399014) and DSS-43 (399043): `spkgeo(id, et, "ITRF93", 399)` at 3 instants.

  Run `uv run --with spiceypy --with numpy python scripts/frameFixtures.py trajectories ~/.cesium-bench/frames <path to moon_de440_250416.tf>`. Download the frame kernel to the scratch directory, not the repo.
- [ ] **Step 3: Write the data tests** in `test/data/trajectory.test.ts`:
  - `Trajectory.fromSpk([main, gapfill], -24, frames, { j2000: "icrf", … })`, compared to `spkgeo`: position within 1 mm, velocity within 1e-6 m/s, at every row.
  - The stations through `fromSpk([stations], 399014, …)` match within 1 mm, with `reference === frames.itrf`.
  - **Orion in MOON_ME.** Convert the SPK trajectory read with `j2000: "icrf"` to `frames.moonMe` and compare with `spkpos`, within 1 mm. This matches SPICE's convention, as R1 explains.
  - **OEM against SPK** (R9). Read the OEM with `{ interpolation: { method: "hermite", degree: 11 } }` and the SPK, both with EME2000 axes. Compare their positions every 600 s inside the OEM's segments: the maximum difference is under 0.5 m. Print the maximum so the plan note can record it (Review Focus 2).
  - **The bias's size.** Read the SPK with `j2000: "icrf"` and with `"eme2000"`, then convert both to MOON_ME at the flyby (2026-04-06T23:00 UTC). They differ by 20 to 80 m. This states R1's size so a reviewer can see it.
- [ ] **Step 4: Run** `npm run test:data` and confirm it passes. Then run `npx vitest run test/frameDataRefresh.test.ts` and confirm it passes.
- [ ] **Step 5: Commit** with "frames: Artemis II and DSN station trajectories in the store, checked against SPICE".

### Task 7: The sun, the stars and the Moon from DE440

**Files:**

- Create: `packages/next/src/frames/sky.ts`
- Modify:
  - `packages/next/src/time/celestial.ts`
  - `packages/next/widgets/Viewer.ts`
  - `packages/next/bench/suite/views/viewerHost.ts`
  - `packages/next/src/index.ts`
- Test: `packages/next/test/sky.test.ts`, `packages/next/test/data/sky.test.ts`

**Interfaces:**

- Consumes:
  - From Task 2: `FrameData`, `celestialToTerrestrial` and `Ephemeris`.
  - The analytic models: `sunDirection`, `moonPosition`, `moonAxes` and `icrfToFixed`.
- Produces:
  - `icrfToFixed(ms: number, out?: Float64Array, data?: FrameData): Float64Array`. With `data` and an instant inside its span, it returns `celestialToTerrestrial(Instant.fromUtc(ms, data.leapSeconds), data.eop.atInstant(…))`. Otherwise it is today's model. Spec section 5 keeps this name for its existing users.
  - `interface SkyState`:
    - `icrfToFixed: Float64Array` (9, row-major)
    - `sunDirection: Float64Array` (3, unit, Earth-fixed)
    - `moonPosition: Float64Array` (3, m, Earth-fixed)
    - `moonAxes: Float64Array` (6, Earth-fixed: `[0..2]` toward ME longitude and latitude 0, `[3..5]` the ME pole)
    - `source: "ephemeris" | "analytic"`
  - `createSkyState(): SkyState`
  - `skyState(ms: number, data: FrameData | undefined, out: SkyState): SkyState`
    - With data inside the span, the Sun is geometric (spec 2: apparent positions are not drawn): `normalize(R · (sun − earth))`.
    - `moonPosition` is `R · moonFromEarth`.
    - `moonAxes` is the ME rows of `moonMeanEarth` turned by `R`.
    - One `Instant` and one `R` serve all four.
  - New `Viewer` options and members:
    - `ViewerOptions.frameData?: string | FrameData`, a base URL for `loadFrameData` or loaded data. The default is none (R10).
    - `viewer.frameData: Promise<FrameData | undefined>` resolves to `undefined` after one `console.warn` when loading fails.
    - The Viewer's clock handlers use `skyState`.
  - The bench Explorer passes `frameData: "/frames-data/"` and adds a host warning when it resolves `undefined`.

- [ ] **Step 1: Write the failing tests.**
  - **Unit tests** (`test/sky.test.ts`), with Task 2's synthetic `FrameData`:
    - `skyState(ms, undefined, out)` equals the analytic functions' results exactly, with `source "analytic"`.
    - With data inside the span: `source "ephemeris"`, `sunDirection` is unit length, and `sunDirection` equals the normalized translation of `frameTransform(hcrs, itrf, t)` within 1e-12, so the light and the frame tree agree.
    - With data and an instant outside its span: the analytic result with `source "analytic"`, and no throw (R3, Review Focus 1).
    - `icrfToFixed(ms, out, data)` equals `skyState`'s matrix.
  - **Data tests** (`test/data/sky.test.ts`), with the store, at 2026-04-06T23:00 UTC and 2000-06-21T12:00 UTC:
    - The ephemeris sun is within 0.02° of Meeus's (`sunDirection`).
    - The ephemeris Moon's direction is within 0.1°, and its distance within 0.2%, of the analytic one turned by the analytic `icrfToFixed`.
    - The `moonAxes` pole is within 0.05° of the analytic `moonAxes` pole.

    These bounds check that the two models agree within their stated accuracies, which shows the switch is wired right. Also time 1,000 calls of `skyState` with data and print the mean per call for the plan note.
- [ ] **Step 2: Run** `npx vitest run test/sky.test.ts` and `npm run test:data`, and confirm both fail.
- [ ] **Step 3: Implement.**
  - **`sky.ts`** holds `SkyState`, `createSkyState` and `skyState`.
  - **`icrfToFixed`** gains its optional `data` parameter.
  - **Viewer.** The constructor starts loading when `frameData` is a string. `applyClockSky` and `applyClockSun` use one `skyState` per clock change and copy its parts into `engine.icrfToFixed`, `engine.moonPosition`, `engine.moonAxes` and, while the sun follows the clock, `engine.sunDirection`. When the data arrives, the Viewer applies the clock once and calls `requestRender()`.
  - **Explorer.** Add the option in `viewerHost.ts`.
- [ ] **Step 4: Run** the tests and `npm test`, and confirm they pass.
- [ ] **Step 5: Check it in the browser.**
  - Start the bench dev server (`preview_start`).
  - Open the Explorer with a globe. Set the clock to 2026-04-06T23:00 UTC with the time controls. Confirm the console shows no errors and no frames-data warning, and that the Moon and the stars draw.
  - Restart the dev server with `FRAMES_DATA_DIR` set to an empty scratch directory, so `/frames-data/` serves nothing. Confirm the Explorer warns once and draws the analytic sky. Then restart it normally.
  - Don't benchmark on this page (it loads the GPU heavily).
- [ ] **Step 6: Commit** with "frames: the sun, stars and Moon from DE440 when frames data is loaded".

### Task 8: Docs and the plan note

**Files:**

- Modify:
  - `packages/next/README.md` (the frames section plan 1 added)
  - `CESIUM2_WEBGPU_PLAN.md` §13.14

- [ ] **Step 1: README.** Document the frame tree and its names, `frameTransform` and `convertPoint`, `Trajectory` with the `j2000` warning (R1), the Viewer's `frameData` option, the store's new files and their credits, and R2 (Newtonian edges until plan 3).
- [ ] **Step 2: Plan note.** Add to §13.14:
  - what landed;
  - the measured OEM-to-SPK maximum difference (R9);
  - the size of the EME2000 bias at the flyby;
  - `skyState`'s cost per call;
  - Earth-only rendering unchanged without data;
  - the rulings R1 to R11 in one line each.
- [ ] **Step 3: Run** `npx tsc --noEmit -p .`, `npx eslint .`, `npx prettier --check .`, `npm test`, `npm run test:data` and `snyk_code_scan` on `src/frames`, `src/trajectory` and the changed scripts, and confirm all are clean.
- [ ] **Step 4: Commit** with "Plan: frames 2 results".
