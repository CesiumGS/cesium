# Frames 3: Measurement, Light Time and Accuracy Statements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the public API one measurement call. It takes two points in any frames, at an instant, and returns the straight-line distance and delta, the distance over the body, the signal in each direction, line of sight, and an accuracy statement built from the inputs. The signal covers converged light time with the solar, Earth and lunar Shapiro delays, light-time range, range rate, Doppler, and apparent directions at each end.

**Architecture:** Pure TypeScript in a new `src/measure/`, built on plan 2's frame tree and trajectories.

- **The tree's Earth link.** It gains the IERS relativistic link between geocentric TT-compatible coordinates and barycentric TDB-compatible ones. A TDB-compatible Earth-centred frame sits beside it for SPICE-convention data.
- **The signal.** Light time is solved in ICRF, the only inertial frame. Velocities come from central differences of the frame tree.
- **Validation.** Everything is checked against spiceypy fixtures. The finished call is then checked against NASA's archived DSN Now ranges and the published lunar occultation times of Artemis II.

**Tech Stack:** TypeScript (float64), Vitest, `geographiclib-geodesic` 2.2.0 (MIT, Karney's own package, no dependencies), Python via `uv` (spiceypy, geographiclib, numpy) only to generate fixtures locally.

**Spec:** `docs/superpowers/specs/2026-11-05-frames-bodies-measurement-design.md`, sections 4 (the accuracy budget), 6.3 (accuracy classes), 6.5 ("Measurement"), 10 ("Cross-body") and 11. Plans 1 and 2 (`docs/superpowers/plans/2026-11-05-frames-1-time-ephemerides.md`, `…-frames-2-frame-tree-trajectories.md`) supply `Instant`, EOP, `Ephemeris`, the frame tree, `Trajectory` and the setup store.

**Roadmap (plan 3 of 5):**

- **Plan 4:** engineering frames (PROJ, alignments), snapping (R8), design distances and station/offset in this call's result, and the corridor example.
- **Plan 5:** multiple bodies in one scene, frame-tagged picking with the body (R8), cameras, the Artemis II example, DSN horizon masks, and caching `skyState`'s series before it runs in the frame loop.

## Rulings this plan makes

Each ruling ends with what it costs if it is wrong.

- **R1. Two Earth-centred inertial frames.**
  - IERS Conventions 2010, eq. 11.19 (verified in TN36 ch. 11, 2026-11-05) applies to geocentric vectors that are TT-compatible:

    r_TDB = r_TT · (1 − U/c² − L_C) − ½ (V · r_TT) V / c²

    Here U is the potential at the geocenter excluding the Earth, and V is the Earth's barycentric velocity.
  - ITRF coordinates (stations, terrain) are TT-compatible. SPK data are TDB-compatible barycentric differences by SPICE's convention: SPICE subtracts, and never scales.
  - So `gcrf` becomes the true GCRS: TT-compatible, joined to ICRF by eq. 11.19, with `itrf` under it.
  - A new `earthIcrf: Frame<"EARTH_ICRF">` (Earth's origin, ICRF axes, TDB-compatible, a plain translation) carries SPK and OEM data. `eme2000` moves under it.
  - The scaling is 2.5e-8 of the distance: 9.5 m at the Moon's distance plus up to 1.9 m of Lorentz term (spec section 4).
  - Cost if wrong: one edge and one mapping table.
- **R2. The Moon's edge stays Newtonian.**
  - Lunar body-fixed coordinates from DE440 are taken as TDB-compatible.
  - The selenocentric relativistic terms are 3 cm or less at the lunar surface. They are stated in the accuracy statement and not applied.
  - Cost if wrong: 3 cm.
- **R3. Velocities come from central differences.**
  - A point's velocity is the central difference of its position over h = 0.5 s, and range rate is the central difference of light-time range.
  - Within h of a trajectory's data edge, the difference is one-sided.
  - At float64 BCRS magnitudes this gives about 3e-5 m/s, and range rates about 1e-7 m/s.
  - Analytic rotation rates are not needed for this budget.
- **R4. Doppler includes both ends' proper-time rates.**
  - f_r/f_t = (dτ_t/dt at emission) / (dτ_r/dt at reception) · dt_emit/dt_receive, with dτ/dt = 1 − U/c² − v²/2c².
  - U sums the Sun, the Earth and the Moon. v is the end's barycentric speed.
  - Leaving these out would err by about 1e-9, roughly 2 Hz at 2.2 GHz.
- **R5. Light time follows IERS eq. 11.17 in BCRS.**
  - It iterates until a step changes it by less than 1e-14 s, at most 10 iterations, and throws if it doesn't converge.
  - The Shapiro terms are the Sun, the Earth and the Moon by default; the spec names the Sun and the Earth, and the Moon is about 1 mm and free to include.
  - Each body is placed at the signal's mid-time.
  - `shapiro: []` turns them off, which is how the tests match SPICE.
- **R6. Apparent directions use light time plus stellar aberration**, by the observer's barycentric velocity, as SPICE's `CN+S` (receiving) and `XCN+S` (transmitting). The implementer uses the formula SPICE's STELAB and STLABX document, so the fixtures match to 1e-10 rad.
- **R7. Accuracy statements never claim more than the inputs support.**
  - A term with no known size makes the whole statement's `meters` undefined, never small.
  - EOP: measured values give UT1 35 µs (spec section 4) and polar motion 0.1 mas (the builder's conservative call). Predicted values use IERS Bulletin A's formulas (current bulletin, read 2026-11-05), where d is days since the table's last observed row:

    | Term | Formula |
    | --- | --- |
    | Polar motion | 0.00068 · d^0.80 arcsec |
    | UT1 | 0.00025 · d^0.75 s |

  - OEM data's coordinate scale (TT- or TDB-compatible) isn't stated by CCSDS. It is taken as TDB, as NAIF's conversion did, and stated as a term of 2.5e-8 of the geocentric distance.
  - OEM covariance is read in CCSDS's km units unless `covarianceUnits: "m"`.
  - Artemis II's BET covariance is in m². In km² its velocity sigmas would be about 12 m/s, which is implausible for a reconstructed trajectory. In m² they are 0.012 m/s and its position sigma 50 m. The Artemis tests pass `"m"` and say so.
  - Plan 2's rule stays: a frame transform past the EOP table's predictions throws. This plan does not relax it to a degraded statement.
- **R8. Snapping and frame-tagged picking move out of this plan.**
  - Snapping needs new GPU work, because geometry lives only on the GPU (`World.castRays` returns distances, not triangles). Its first exact snapper is the corridor's, so it goes to plan 4 with design coordinates.
  - Picking that names the body goes to plan 5, where content lives on more than one body. Until then a pick is ITRF: `framePoint(frames.itrf, await view.pickPosition(x, y))`.
  - Cost if wrong: the order of work, not what is built.
- **R9. A point can't move during the signal.**
  - A `FramePoint` that carries its own instant is only valid then, so it can't be evaluated at emission or reception times.
  - For such points `measure` gives geometry only: `signal` is undefined, and a warning says why.
  - Points fixed in a frame, including trajectory origins, get everything.
- **R10. The published occultation is checked to ±2 min.**
  - LOS and AOS were published as 22:44–23:25 UTC, April 6, to the minute. Signal loss also depends on the receivers.
  - The test asserts the geometric blocking times within ±120 s for each DSN complex that had Orion more than 10° above the horizon, and prints the measured times.

## Global Constraints

- **Units.** Everything is float64. The public API uses meters, seconds, radians and Hz. Kilometers appear only inside source files and DSN Now's published figures.
- **Constants.** These live in `src/measure/constants.ts`, exactly:

  | Constant | Value | Source |
  | --- | --- | --- |
  | `C` | 299,792,458 m/s | |
  | `GM_SUN` | 1.32712440041279419e20 m³/s² | DE440 |
  | `GM_EARTH` | 3.98600435507e14 | DE440 |
  | `GM_MOON` | 4.902800118e12 | DE440 |
  | `L_C` | 1.48082686741e-8 | IERS 2010 Table 1.1 |
  | `EARTH_ROTATION_RATE` | 7.292115e-5 rad/s | |

- **Matrix conventions** are unchanged from plan 2. Plan 1's rotations are row-major 3×3. Frame transforms are column-major 4×4 `Mat4`, now general affine since the GCRF edge scales. Only `src/frames/matrix.ts` converts between them.
- **Never extrapolate.** Light time whose emission or reception falls outside a trajectory's data throws inside `measure`. `measureSpan` records that sample as an error and carries on. The frame tree still throws outside the ephemeris and past the EOP predictions.
- **Data comes only through setup.** The one new fixture of published numbers, `test/fixtures/frames/dsnnow.json`, is NASA/JPL's DSN Now figures from Internet Archive snapshots, credited in the file and the README. Nothing downloaded is committed.
- **New dependency.** `geographiclib-geodesic`, pinned exactly at `2.2.0` as the package's other dependencies are. It is checked with `snyk_sca_scan` and imported only by `src/measure/surface.ts`.
- **Accuracy against the references:**

  | What | Within | Reference |
  | --- | --- | --- |
  | Light time, Earth center → Orion and → Moon (`shapiro: []`) | 1 mm × c | spiceypy `CN` / `XCN` |
  | Apparent directions, same cases | 1e-10 rad | spiceypy `CN+S` / `XCN+S` |
  | DSS-43 as the observer | 0.5 m and 1e-8 rad | spiceypy (SPICE's own Earth orientation file; no eq. 11.19) |
  | Geodesic distance | 1e-6 m | Python `geographiclib` |
  | DSN Now ranges | ±500 km plus 1 km | archived figures, rounded to 1000 km |
  | DSN Now round-trip light time | ±0.005 s plus 0.001 s | archived figures, rounded to 0.01 s |

- **Earth-only scenes are unchanged.** Nothing here touches rendering. `skyState` keeps calling `celestialToTerrestrial` directly.
- **Repository practice:**
  - Commit locally and never push. End each message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  - `npx tsc --noEmit -p .`, `npx eslint` and prettier pass.
  - Run `snyk_code_scan` on new code and fix what it reports.
  - Commands run in `packages/next`.

## Review Focus

1. **A link whose light path leaves the data.** At the instant itself Orion is inside a segment, but `t − lt` falls in a gap or before the data starts. `measure` throws, naming the spans. `measureSpan` records an error for that sample and keeps going. Neither ever extrapolates. Tests: Task 4 and Task 8.
2. **Two points at the same place,** or a point measured to itself. The distance is 0, and `signal` and the directions are undefined with a warning. No NaN appears anywhere in the result. Test: Task 8.
3. **A station on its own body's surface.** Line of sight to a target above its horizon is clear: the starting surface doesn't block itself. A target below the horizon is blocked by the Earth. Test: Task 6.
4. **Old EOP.** An instant inside the EOP predictions gets an Earth-orientation term that grows with prediction age (Bulletin A). Past the predictions, `measure` throws with the EOP span. Tests: Task 7 and Task 8.
5. **Unknown input accuracy.** A trajectory with no covariance and no `positionSigma` makes `accuracy.meters` undefined. So does an "approximate" trajectory without a sigma. The term names the trajectory. Test: Task 7.

---

### Task 1: The relativistic Earth link and the Earth-centred ICRF frame

**Files:**

- Create: `packages/next/src/measure/constants.ts`
- Modify:
  - `packages/next/src/frames/frames.ts`
  - `packages/next/src/trajectory/Trajectory.ts` (the mapping table)
  - `packages/next/src/index.ts`
  - Plan 2's tests that assert `reference === frames.gcrf` for SPK/OEM data: `test/trajectory.test.ts` and `test/data/trajectory.test.ts`
- Test: `packages/next/test/frameTree.test.ts`, `packages/next/test/data/frameTree.test.ts`

**Interfaces:**

- Consumes:
  - From plan 2: `Frame`, `toParentMatrix` and `frameTransform`.
  - `Ephemeris`: `sun`, `earth` and `moon`, which are `[x, y, z, vx, vy, vz]` in m and m/s.
  - The constants above.
- Produces:
  - **Constants.** `C`, `GM_SUN`, `GM_EARTH`, `GM_MOON`, `L_C` and `EARTH_ROTATION_RATE` in `src/measure/constants.ts`.
  - **`Frames.earthIcrf: Frame<"EARTH_ICRF">`**, a child of `icrf` translated by `ephemeris.earth`.
  - **`Frames.gcrf`.** Its `toParent` becomes the eq. 11.19 affine map, `p_icrf = earth + (1 − U/c² − L_C)·r − ½(V·r)V/c²`, with:
    - V the Earth's barycentric velocity;
    - U = `GM_SUN/|x_E − x_S| + GM_MOON/|x_E − x_M|`. The other planets add about 2e-12, about 1 mm at the Moon's distance.
  - **`Frames.eme2000`** becomes a child of `earthIcrf`.
  - **`Frames.bodyOf(frame: Frame): Body | undefined`.** It walks the frame's ancestors: `itrf` gives `EARTH`, `moonMe` gives `MOON`, and a `moonPa` descendant gives `MOON`.
  - **The trajectory mapping.** Center 399 with ICRF/GCRF axes, or frame 1 with `j2000: "icrf"`, now gives `earthIcrf`. An `eme2000` source stays `eme2000`, now under `earthIcrf`. An ITRF source stays `itrf` (TT-compatible, scaled by eq. 11.19 on the way to ICRF).

- [ ] **Step 1: Write the failing tests.**
  - **Unit tests** (`test/frameTree.test.ts`, with the synthetic frame data):
    - `frameTransform(earthIcrf, icrf, t)` is a pure translation by `earth(t)`.
    - For r = 3.844e8 m perpendicular to V, the GCRF→ICRF translation-removed image of r is shorter by `(U/c² + L_C)·r`, within 1e-9 m of the formula computed in the test from the synthetic ephemeris's values.
    - For r parallel to V, the extra term is `½|V|²r/c²`.
    - `frameTransform(gcrf, earthIcrf, t)` composed with its inverse is identity within 1e-9 m at 4e8 m. This exercises the general affine inverse.
    - `bodyOf(itrf) === EARTH`, `bodyOf(moonPa) === MOON`, and `bodyOf(icrf) === undefined`.
  - **Data test** (`test/data/frameTree.test.ts`): at 2026-04-06T23:00 UTC, the GCRF-vs-EARTH_ICRF difference for a point 3.844e8 m from the geocenter is between 8 and 12 m.
  - **Plan 2's trajectory tests.** Update their expected references to `earthIcrf`. The SPICE comparisons in `test/data/trajectory.test.ts` must still pass unchanged at 1 mm, since Orion's path to MOON_ME is now Newtonian end to end, as SPICE's is.
- [ ] **Step 2: Run** `npx vitest run test/frameTree.test.ts test/trajectory.test.ts` and `npm run test:data`, and confirm the new tests fail.
- [ ] **Step 3: Implement.** The GCRF edge fills its `Mat4` directly: linear part `(1 − U/c² − L_C)·I − ½VVᵀ/c²`, translation `earth`. Note in `toParentMatrix`'s doc that edges may now be affine, but only this one is. The `frames.ts` header cites IERS TN36 eq. 11.19 and R1.
- [ ] **Step 4: Run** the tests, `npm test` and `npm run test:data`, and confirm they pass.
- [ ] **Step 5: Commit** with "measure: the IERS relativistic GCRS link and the Earth-centred ICRF frame".

### Task 2: Accuracy inputs: EOP's last observation, OEM covariance and trajectory sigmas

**Files:**

- Modify:
  - `packages/next/src/time/eop.ts`
  - `packages/next/src/trajectory/oem.ts`
  - `packages/next/src/trajectory/Trajectory.ts`
- Test:
  - `packages/next/test/eop.test.ts`
  - `packages/next/test/oem.test.ts`
  - `packages/next/test/trajectory.test.ts`
  - `packages/next/test/data/trajectory.test.ts`

**Interfaces:**

- Produces:
  - **`EarthOrientationParameters.lastObserved: number`**, the UTC ms of the last row whose `DATA_TYPE` is not `P`.
  - **`OemSegment.covariances?: { epochs: Float64Array; values: Float64Array }`**, read from `COVARIANCE_START…STOP`:
    - `epochs` are TDB seconds.
    - `values` holds 21 numbers per epoch: the lower triangle row by row, as written, in the file's units.
    - A `COV_REF_FRAME` other than the segment's `REF_FRAME` throws "not supported yet".
  - **`Trajectory` options** (both factories):
    - `positionSigma?: number`, in meters, 1σ RSS of position.
    - `fromOem` also takes `covarianceUnits?: "km" | "m"`, default `"km"` (R7).
  - **`Trajectory.positionSigma(instant: Instant): number | undefined`.** It returns the latest covariance epoch at or before the instant, in that segment: `sqrt(c11 + c22 + c33)` in meters. Failing that, the `positionSigma` option. Failing both, `undefined`.
  - **`Trajectory.source: "oem" | "spk"`.**

- [ ] **Step 1: Write the failing tests.**
  - `lastObserved` on a CSV excerpt with O rows then P rows equals the last O row's date.
  - `parseOem` reads a two-epoch covariance block into `covariances`, and an unknown `COV_REF_FRAME` throws.
  - `positionSigma`:
    - between two covariance epochs it uses the earlier one;
    - before the first it falls back to the option, else `undefined`;
    - `"km"` and `"m"` differ by 1000×.
  - **Data test.** The Artemis OEM with `covarianceUnits: "m"` gives `positionSigma` at 2026-04-02T01:58:21.397 within 0.1 m of 50.4 m (`sqrt(2505.73549 + 16.2246271 + 13.2682180)`).
- [ ] **Step 2: Run** the tests and confirm they fail.
- [ ] **Step 3: Implement.** Parse covariance in the existing state machine. Keep each segment's covariance with its Trajectory piece.
- [ ] **Step 4: Run** the tests, `npm test` and `npm run test:data`, and confirm they pass.
- [ ] **Step 5: Commit** with "measure: EOP's last observation, OEM covariance and trajectory sigmas".

### Task 3: The distance over a body

**Files:**

- Create: `packages/next/src/measure/surface.ts`, `packages/next/test/fixtures/frames/geodesic.json`
- Modify:
  - `packages/next/package.json` (`"geographiclib-geodesic": "2.2.0"`)
  - `packages/next/scripts/frameFixtures.py` (section `geodesic`)
- Test: `packages/next/test/surface.test.ts`

**Interfaces:**

- Produces `surfaceDistance(ellipsoid: Ellipsoid, a: ArrayLike<number>, b: ArrayLike<number>): { distance: number; heightDifference: number; azimuthA: number; azimuthB: number }`.
  - `a` and `b` are body-fixed m.
  - The distance is the geodesic between the two points' geodetic footprints. It uses `Geodesic(ellipsoid.a, flattening).Inverse`, Karney's algorithm.
  - `heightDifference` is `h_b − h_a` (m).
  - The azimuths are radians clockwise from north, at each end.
  - It works on the Moon's sphere, where flattening is 0.

- [ ] **Step 1: Generate the fixture.** Add a section `geodesic` to `frameFixtures.py` (`uv run --with geographiclib python scripts/frameFixtures.py geodesic`). It writes 40 point pairs with `Geodesic.WGS84.Inverse` distances and azimuths:
  - 30 random pairs (seeded);
  - nearly antipodal pairs at 0.1° and 0.001° from antipodal;
  - coincident points;
  - pole-to-pole;
  - an equatorial pair.

  It also writes 5 pairs on a 1,737,400 m sphere.
- [ ] **Step 2: Write the failing tests** in `test/surface.test.ts`:
  - Every fixture row's distance is within 1e-6 m and its azimuths within 1e-9 rad.
  - `heightDifference` is right for points 100 m and 350 m above the ellipsoid.
- [ ] **Step 3: Run** `npx vitest run test/surface.test.ts` and confirm it fails.
- [ ] **Step 4: Implement.**
  - Add the dependency (`npm install geographiclib-geodesic@2.2.0 --save-exact` in packages/next).
  - Run `snyk_sca_scan` on packages/next and report the result.
  - Convert to geodetic with the existing `Ellipsoid.cartesianToCartographic`.
- [ ] **Step 5: Run** the test and `npm test`, and confirm they pass.
- [ ] **Step 6: Commit** with "measure: geodesic distance over a body (Karney, geographiclib)".

### Task 4: Light time and apparent directions

**Files:**

- Create:
  - `packages/next/src/measure/motion.ts`
  - `packages/next/src/measure/lightTime.ts`
  - `packages/next/test/fixtures/frames/signal.json`
- Modify: `packages/next/scripts/frameFixtures.py` (section `signal`)
- Test: `packages/next/test/lightTime.test.ts`, `packages/next/test/data/lightTime.test.ts`

**Interfaces:**

- Consumes: Task 1's `Frames` and constants, and plan 2's `convertPoint`, `framePoint` and `Trajectory`.
- Produces:
  - **`positionIn(point: FramePoint, frame: Frame, instant: Instant): Float64Array`**, for a point fixed in its frame (no `instant` of its own).
  - **`velocityIn(point: FramePoint, frame: Frame, instant: Instant): Float64Array`.** It takes a central difference over h = 0.5 s (R3). When one side throws (a data edge), it uses the other side. When both throw, it rethrows.
  - **`type ShapiroBody = "sun" | "earth" | "moon"`.**
  - **`solveLightTime(receiver: FramePoint, transmitter: FramePoint, at: Instant, fixed: "reception" | "emission", frames: Frames, shapiro?: readonly ShapiroBody[]): LightTimeSolution`.**
    - `fixed: "reception"` means the receiver receives at `at`.
    - `fixed: "emission"` means the transmitter emits at `at`.
    - `interface LightTimeSolution`:
      - `lightTime: number` (s)
      - `emission: Instant`, `reception: Instant`
      - `transmitterPosition: Float64Array` (ICRF, at emission)
      - `receiverPosition: Float64Array` (ICRF, at reception)
    - It solves IERS eq. 11.17 iteratively (R5). The default `shapiro` is all three bodies.
  - **`apparentDirection(solution: LightTimeSolution, at: "receiver" | "transmitter", point: FramePoint, frames: Frames): Float64Array`.**
    - It returns a unit vector in `point.frame`'s axes, at that end's time.
    - At the receiver, the direction is toward where the transmitter was; at the transmitter, toward where the receiver will be.
    - Each is corrected for stellar aberration by that end's barycentric velocity (R6).

- [ ] **Step 1: Generate the fixture.** Add a section `signal <store> <frame kernel> <earth pck>` to `frameFixtures.py`. It furnishes plan 2's kernels plus NAIF's `earth_latest_high_prec.bpc` (downloaded to the scratch directory, not the repo). At 12 instants across the Artemis span, including within 5 s of a segment edge, it writes:
  - `spkpos(-24, et, "J2000", abcorr, 399)` for `CN`, `XCN`, `CN+S` and `XCN+S` (light times and vectors);
  - the same for target 301;
  - `spkpos(-24, et, "J2000", "CN+S", 399043)` for DSS-43.
- [ ] **Step 2: Write the failing tests.**
  - **Unit tests** (`test/lightTime.test.ts`, synthetic frames):
    - Two points fixed in ICRF 3e8 m apart, with `shapiro: []`, give a light time of exactly `3e8 / C` within 1e-15 s.
    - A receiver fixed in a frame moving at 1 km/s along the line of sight gives the solution of `c·lt = d + v·lt` within 1e-15 s.
    - The Shapiro delay for a path grazing the Sun at 1 solar radius (6.957e8 m) between points 1 AU away on either side is within 1e-9 of the closed form `(2GM/c³)·ln((r1+r2+ρ)/(r1+r2−ρ))`, about 1.2e-4 s.
    - `velocityIn` of a point 1 m off a constant-velocity trajectory's origin equals that velocity within 1e-6 m/s. At the trajectory's last epoch it falls back to one side without throwing.
    - A light path whose emission time falls before a trajectory's data throws `/outside its data/` (Review Focus 1).
  - **Data tests** (`test/data/lightTime.test.ts`). Orion's SPK is read with `j2000: "icrf"` to match SPICE (plan 2 R1). With `shapiro: []`:
    - Earth center (a point at the origin of `earthIcrf`) → Orion and → Moon: `C·lightTime` within 1 mm of SPICE's, and apparent directions within 1e-10 rad.
    - DSS-43 (from the station SPK, its ITRF position as a point in `itrf`) → Orion: within 0.5 m and 1e-8 rad.
    - With default Shapiro, Earth→Orion light time exceeds the `shapiro: []` value by 0.5 to 50 ns. Print it.
- [ ] **Step 3: Run** both and confirm they fail.
- [ ] **Step 4: Implement.**
  - Positions for the light-time equation are in ICRF, the inertial frame.
  - The Shapiro bodies come from the ephemeris at the mid-time of emission and reception.
  - Aberration follows SPICE STELAB/STLABX's documented formula.
- [ ] **Step 5: Run** the tests, `npm test` and `npm run test:data`, and confirm they pass.
- [ ] **Step 6: Commit** with "measure: converged light time with Shapiro delays, and apparent directions".

### Task 5: Range rate and Doppler

**Files:**

- Create: `packages/next/src/measure/doppler.ts`
- Test: `packages/next/test/doppler.test.ts`, `packages/next/test/data/lightTime.test.ts` (extend)

**Interfaces:**

- Consumes: Task 4's `solveLightTime`, `positionIn` and `velocityIn`.
- Produces:
  - **`properTimeRate(position: ArrayLike<number>, velocity: ArrayLike<number>, instant: Instant, frames: Frames): number`.**
    - `position` and `velocity` are ICRF. The result is `1 − U/c² − v²/2c²`, with U from the Sun, the Earth and the Moon at `instant` (R4).
  - **`interface Leg`:**
    - `lightTime: number`, `range: number` (C·lightTime), `rangeRate: number` (m/s)
    - `dopplerRatio: number` (f_r/f_t)
    - `dopplerShift?: number` (Hz)
    - `transmitterDirection: Float64Array`, `receiverDirection: Float64Array`
  - **`downlink(receiver, transmitter, at, frames, options?: { shapiro?: readonly ShapiroBody[]; frequency?: number }): Leg`.** The receiver receives at `at`.
  - **`uplink(transmitter, receiver, at, frames, options?): Leg`.** The transmitter emits at `at`.
  - `rangeRate` is the central difference of `range` over ±0.5 s of `at` (R3).
  - Doppler follows R4:
    - **Downlink:** `ratio = [rate_t(emission) / rate_r(reception)] · (1 − dlt/dt)`.
    - **Uplink:** `ratio = [rate_t(emission) / rate_r(reception)] / (1 + dlt/dt)`.
    - `dopplerShift = (ratio − 1)·frequency` when `frequency` is given.

- [ ] **Step 1: Write the failing tests.**
  - `properTimeRate`:
    - At a point on the equator of a synthetic Earth placed by the synthetic ephemeris, minus the rate at its geocenter (same velocity), equals `GM_EARTH/(6378137·C²)` within 1e-15.
    - For a hand-built position and velocity, it equals `1 − U/c² − v²/2c²` computed in the test from the three GMs and the synthetic ephemeris, within 1e-16. Don't compare against L_G: at an instant, a surface clock's barycentric rate includes a cross term `v_E·v_rot/c²` of up to ±1.5e-10, which only averages out over a day.
  - Two points fixed in one frame translating uniformly, 1000 km apart, have a constant light time. Their `dopplerRatio` equals the ratio of their `properTimeRate`s (transmitter over receiver) within 1e-14.
  - `rangeRate` for the 1 km/s receding receiver of Task 4 is 1000 m/s within 1e-6.
  - `|dopplerRatio − (1 − rangeRate/C)| < 3e-8` for every data-test row.
  - **Data test.** DSS-43 ← Orion downlink at 2026-04-06T23:30 UTC with `frequency: 2216.5e6` gives a finite `dopplerShift`. Print the shift and the range rate.
- [ ] **Step 2: Run** the tests and confirm they fail.
- [ ] **Step 3: Implement** `doppler.ts`.
- [ ] **Step 4: Run** the tests and `npm test`, and confirm they pass.
- [ ] **Step 5: Commit** with "measure: range rate and one-way Doppler with proper-time rates".

### Task 6: Line of sight

**Files:**

- Create: `packages/next/src/measure/lineOfSight.ts`
- Test: `packages/next/test/lineOfSight.test.ts`

**Interfaces:**

- Consumes: Task 4's `LightTimeSolution`, `Frames.bodyOf` and `bodyFixed`.
- Produces:
  - **`segmentBlocked(p0: ArrayLike<number>, p1: ArrayLike<number>, radii: ArrayLike<number>, inset: number): boolean`.**
    - The segment is in the body's fixed axes, from its center. `radii` gives the ellipsoid's semi-axes.
    - The segment is shortened by `inset` meters at each end, so a point on the surface doesn't block itself.
    - It scales to a unit sphere and runs a segment–sphere test.
  - **`lineOfSight(solution: LightTimeSolution, frames: Frames, bodies?: readonly Body[]): { clear: boolean; blockedBy?: Body }`.**
    - `bodies` defaults to `[EARTH, MOON]`.
    - Each body is placed and oriented at the time the light passes its point of closest approach on the segment: `emission + (s/ρ)·lightTime`, where s is the closest-approach distance along the path. The endpoints are moved into the body's fixed frame at that time.
    - The inset is 1 m.

- [ ] **Step 1: Write the failing tests.**
  - `segmentBlocked`:
    - A segment through a unit sphere's center is blocked.
    - One passing 1.01 radii from the center is clear.
    - A segment starting on the surface and going outward is clear with a 1 m inset.
    - One starting on the surface and going inward is blocked.
    - It works on a WGS84 ellipsoid: a chord grazing at the equator is blocked, and a chord at the same height over the pole is clear.
  - `lineOfSight` with synthetic frames:
    - A station on the synthetic Earth's surface to a target above its horizon is clear.
    - To a target below its horizon it is blocked by `EARTH` (Review Focus 3).
- [ ] **Step 2: Run** `npx vitest run test/lineOfSight.test.ts` and confirm it fails.
- [ ] **Step 3: Implement** `lineOfSight.ts`.
- [ ] **Step 4: Run** the test and `npm test`, and confirm they pass.
- [ ] **Step 5: Commit** with "measure: line of sight against the Earth and the Moon".

### Task 7: Accuracy statements

**Files:**

- Create: `packages/next/src/measure/accuracy.ts`
- Test: `packages/next/test/accuracy.test.ts`

**Interfaces:**

- Consumes:
  - Task 2's `lastObserved`, `positionSigma` and `source`.
  - `Frames.bodyOf`, `frameTransform`, and plan 1's `LeapSeconds.isExpired`.
- Produces:
  - **`interface AccuracyTerm`:** `source: "ephemeris" | "earthOrientation" | "trajectory" | "coordinateScale" | "relativity" | "lightTime"`, `meters: number | undefined`, `note: string`.
  - **`interface AccuracyStatement`:** `meters: number | undefined` (the root sum square of the terms, undefined if any term is), `terms: AccuracyTerm[]`, `warnings: string[]`.
  - **`accuracyOf(a: FramePoint, b: FramePoint, instant: Instant, frames: Frames, options: { signal: boolean }): AccuracyStatement`.** The terms, per end where marked:

    | Term | When | Size |
    | --- | --- | --- |
    | `ephemeris` | the ends' lowest common ancestor is ICRF | 0.01 m (DE440's Earth–Moon fit to lunar laser ranging, Park et al. 2021) |
    | `earthOrientation`, per end | the end is under `itrf` | the UT1 sigma × `EARTH_ROTATION_RATE` × the point's distance from the spin axis, combined in RSS with the polar sigma × \|r\| (measured or Bulletin A, R7) |
    | `trajectory`, per end | the end's frame is a trajectory's | its `positionSigma(instant)`; undefined if unknown, with "approximate" in the note when that is its class |
    | `coordinateScale`, per OEM end | | 2.5e-8 × its geocentric distance (R7) |
    | `relativity`, per end | the end is under `moonIcrf` | 0.03 m (R2) |
    | `lightTime` | `signal` | 0.001 m |

  - **Warnings:** the instant's UTC (`instant.toUtc(frames.data.leapSeconds)`) is past the leap-second table's expiry ("if this instant was given in UTC, a leap second may have been missed").
  - Finding "the end's frame is a trajectory's" needs `Trajectory` to register its frame. Add `Trajectory.of(frame: Frame): Trajectory | undefined` (a module `WeakMap` filled in the constructor).

- [ ] **Step 1: Write the failing tests** with synthetic frames, synthetic trajectories and a stub EOP:
  - **Measured EOP.** Two ITRF points give earthOrientation terms of `3.5e-5 · EARTH_ROTATION_RATE · ρ` combined with `(1e-4″ in rad) · |r|`, within 1e-12 m.
  - **Predicted EOP.** 30 days past `lastObserved`, the terms follow Bulletin A (UT1 0.00025·30^0.75 s, polar 0.00068·30^0.80″) (Review Focus 4).
  - **Unknown trajectory.** A trajectory with no sigma makes `meters` undefined, with its name in the term's note (Review Focus 5). Given `positionSigma: 50` it is 50 in RSS.
  - **OEM scale.** An OEM end 4e8 m from the geocenter adds a coordinateScale term of 10 m.
  - **Lowest common ancestor.** Both ends in ITRF: no ephemeris term. ITRF to a Moon point: ephemeris and relativity terms.
  - **Leap seconds.** An instant past `leapSeconds.expires` adds the warning.
- [ ] **Step 2: Run** `npx vitest run test/accuracy.test.ts` and confirm it fails.
- [ ] **Step 3: Implement** `accuracy.ts` and `Trajectory.of`.
- [ ] **Step 4: Run** the test and `npm test`, and confirm they pass.
- [ ] **Step 5: Commit** with "measure: accuracy statements built from the inputs".

### Task 8: `measure` and `measureSpan`

**Files:**

- Create: `packages/next/src/measure/measure.ts`
- Modify: `packages/next/src/index.ts` (export the measurement API: `measure`, `measureSpan`, `Measurement`, `MeasureOptions`, `Leg`, `AccuracyStatement`, `AccuracyTerm`, `surfaceDistance`, `ShapiroBody` and the constants)
- Test: `packages/next/test/measure.test.ts`

**Interfaces:**

- Consumes: Tasks 1–7.
- Produces:
  - **`interface MeasureOptions`:**
    - `deltaFrame?: Frame` (default `a.frame`)
    - `frequency?: number` (Hz)
    - `shapiro?: readonly ShapiroBody[]`
    - `signal?: boolean` (default true)
    - `bodies?: readonly Body[]`
  - **`interface Measurement`:**
    - `instant: Instant`
    - `distance: number`, the geometric straight-line distance at `instant`
    - `delta: Float64Array`, the vector b − a in `deltaFrame`'s axes, by the rotation part only (a vector, not a point)
    - `deltaFrame: Frame`
    - `overBody?: { body: Body; distance: number; heightDifference: number }`
    - `signal?: { downlink: Leg; uplink: Leg }`. The downlink is b → a, received at a at `instant`; the uplink is a → b, transmitted from a at `instant`.
    - `lineOfSight?: { clear: boolean; blockedBy?: Body }`, along the downlink path
    - `accuracy: AccuracyStatement`
  - **`measure(a: FramePoint, b: FramePoint, instant: Instant, frames: Frames, options?: MeasureOptions): Measurement`.**
    - `overBody` is present when `frames.bodyOf(a.frame) === frames.bodyOf(b.frame)` and neither is undefined. It is `surfaceDistance` in that body's fixed frame.
    - Points carrying their own instant must match `instant` (plan 2's `convertPoint` rule). They get no `signal` or `lineOfSight`, with a warning (R9).
    - Coincident points (distance < 1 mm) get `distance` 0, no `signal` and no `lineOfSight`, with a warning (Review Focus 2).
  - **`measureSpan(a, b, start: Instant, stop: Instant, step: number, frames, options?): Array<{ instant: Instant; measurement?: Measurement; error?: string }>`.** It runs from `start` to `stop` inclusive at `step` seconds. A throwing sample records its message and the span continues.

- [ ] **Step 1: Write the failing tests** with synthetic frames:
  - **Two ITRF points 10 km apart** on the synthetic Earth:
    - `distance` matches the straight-line distance;
    - `overBody.body === EARTH` and its distance is within 1e-6 m of `surfaceDistance`;
    - `delta` in an ENU frame at a has the expected east/north/up components;
    - `signal.downlink.range` is within 1 mm of `distance`.
  - **Coincident points:** distance 0, `signal` undefined, a warning, and no NaN anywhere in the result (Review Focus 2; walk the object).
  - **A point with its own instant:** `signal` undefined, with the R9 warning.
  - **`measureSpan` across a trajectory gap:** samples in the gap carry `error` matching `/outside its data/`, and the rest carry measurements (Review Focus 1).
  - **Past the EOP predictions:** `measure` with an ITRF point and a stub EOP returning `degraded` throws, naming the EOP span (Review Focus 4).
- [ ] **Step 2: Run** `npx vitest run test/measure.test.ts` and confirm it fails.
- [ ] **Step 3: Implement** `measure.ts` and the exports.
- [ ] **Step 4: Run** the test and `npm test`, and confirm they pass.
- [ ] **Step 5: Commit** with "measure: measure and measureSpan".

### Task 9: Checks against DSN Now and the published occultation

**Files:**

- Create:
  - `packages/next/scripts/dsnNowFixture.mjs`
  - `packages/next/test/fixtures/frames/dsnnow.json`
  - `packages/next/test/data/measure.test.ts`
- Modify: `packages/next/README.md` (credit for the DSN Now figures)

**Interfaces:**

- Consumes:
  - Task 8's `measure` and `measureSpan`.
  - Plan 2's store files: the Artemis OEM and SPK, and the station SPK.
  - `eastNorthUpFrame`.
- **The fixture.** `scripts/dsnNowFixture.mjs` fetches these Internet Archive snapshots of `https://eyes.nasa.gov/dsn/data/dsn.xml`, found 2026-11-05 through the archive's CDX index, by `https://web.archive.org/web/<timestamp>id_/https://eyes.nasa.gov/dsn/data/dsn.xml`:

  | Timestamps |
  | --- |
  | 20260403050749, 20260405124853, 20260406150830, 20260406151609 |
  | 20260407035623, 20260408130537, 20260409093133, 20260410223806 |

  - From each snapshot it keeps every `<dish>` whose `<target name="EM2">` has a positive `downlegRange`. Each kept row has: the station's `timeUTC` (ms, from the preceding `<station>`), the dish name (e.g. `DSS26`), `uplegRange` and `downlegRange` (km), and `rtlt` (s).
  - It writes the rows to `dsnnow.json` with a `credit` field reading "NASA/JPL-Caltech DSN Now, via the Internet Archive".
  - Attributes are read with a fixed regular expression per element. The script runs no fetched content and writes only numbers and dish names.
  - The archive is sometimes offline: the script retries each URL 3 times with a 10 s pause, and fails naming the snapshots it couldn't get.

- [ ] **Step 1: Write the script and generate the fixture.** Run `node scripts/dsnNowFixture.mjs` and confirm `dsnnow.json` has at least 8 rows.
- [ ] **Step 2: Write the data tests** in `test/data/measure.test.ts`. Orion comes from the OEM with `{ interpolation: { method: "hermite", degree: 11 }, covarianceUnits: "m" }`. Each station is its station-SPK ITRF position as a point in an `eastNorthUpFrame` at that position (WGS84).
  - **Ranges.** For every fixture row, `measure(station, orion, Instant.fromUtc(row.timeUTC, leap), frames)`:
    - `|downlink.range/1000 − downlegRange| ≤ 501` km;
    - `|uplink.range/1000 − uplegRange| ≤ 501` km;
    - `|downlink.lightTime + uplink.lightTime − rtlt| ≤ 0.006` s.

    Print the differences. The dish name `DSSnn` maps to NAIF id `3990nn`.
  - **The occultation** (R10). For each complex, use one station: DSS-14 (Goldstone), DSS-43 (Canberra), DSS-63 (Madrid).
    - Take those with Orion more than 10° above the horizon at 2026-04-06T22:44 UTC, from `asin` of the receiver direction's up component.
    - Run `measureSpan` from 22:20 to 23:50 UTC at 10 s.
    - The first sample blocked by `MOON` must fall within ±120 s of 22:44:00, and the first clear sample after it within ±120 s of 23:25:00. Print both times per complex.
  - **Accuracy.** For a station ← Orion measurement, `accuracy.meters` is defined and at least 50 m. That is Orion's covariance sigma; the statement must not claim better (spec anti-goal). Print the terms.
- [ ] **Step 3: Run** `npm run test:data` and confirm it passes. If an occultation or range bound fails, report the measured values before changing anything: a mismatch is a finding to rule on, not a tolerance to widen.
- [ ] **Step 4: Snyk.** Run `snyk_code_scan` on the script and fix what it reports.
- [ ] **Step 5: Commit** with "measure: checked against DSN Now ranges and the published occultation".

### Task 10: Docs and the plan note

**Files:**

- Modify: `packages/next/README.md` (the frames section), `CESIUM2_WEBGPU_PLAN.md` §13.14

- [ ] **Step 1: README.** Document:
  - `measure`, its result fields and `measureSpan`;
  - the two Earth-centred frames (R1) and which data belongs in each;
  - how to read an accuracy statement;
  - the Artemis covariance units (R7);
  - the DSN Now credit.
- [ ] **Step 2: Plan note.** Add the measured agreements to §13.14:
  - SPICE light time and directions, DSS-43, geodesic;
  - DSN Now range and round-trip light-time differences;
  - the computed LOS and AOS per complex against 22:44 and 23:25;
  - the Shapiro size and the Doppler at 2216.5 MHz;
  - an example accuracy statement;
  - R1–R10 in one line each.
- [ ] **Step 3: Run the gates:**
  - `npx tsc --noEmit -p .`, `npx eslint .` and `npx prettier --check .` (pre-existing failures outside plan 3 listed, not fixed);
  - `npm test` and `npm run test:data`;
  - `snyk_code_scan` on `src/measure` and the changed files, and `snyk_sca_scan` for the new dependency.
- [ ] **Step 4: Commit** with "Plan: frames 3 results".
