# Frames 1: Time, Ephemerides and Earth Orientation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the engine meter-accurate time scales, Sun/Earth/Moon positions and the Earth's and Moon's orientations, from data that `npm run setup` prepares, as the foundation the frame tree is built on.

**Architecture:** Pure TypeScript modules under `packages/next/src/time/` and `packages/next/src/ephemeris/`, with no rendering changes. Setup downloads NAIF and CelesTrak files into a store outside the repository and writes compact Chebyshev "packs" from them. The dev server serves the store, and `loadFrameData(baseUrl)` loads it. Correctness is pinned by reference values from pyerfa and jplephem, generated once and checked in as small JSON fixtures.

**Tech Stack:** TypeScript (float64 `Float64Array`/`number`), Vitest, Node scripts (`.mjs`) for setup, Python via `uv` (pyerfa, jplephem, spiceypy, numpy) only to generate test fixtures locally. spiceypy runs CSPICE on this machine for reference values; nothing from it ships.

**Spec:** `docs/superpowers/specs/2026-11-05-frames-bodies-measurement-design.md` (sections 3, 4, 5, 9, 10).

**Roadmap (this is plan 1 of 5).** Each later plan gets its own document, written when this one lands:
2. The frame tree in the public API, and trajectories (CCSDS OEM and SPK readers, with the EME2000→ICRF frame-bias rotation). It also switches the engine's sun, stars and Moon to this plan's data when loaded.
3. Measurement and snapping: light time, the relativistic terms, line of sight, accuracy statements.
4. Engineering frames: PROJ in WebAssembly, alignments, the synthetic corridor and its example.
5. Multiple bodies in one scene, the free-flight and follow cameras, and the Artemis II example.

## Global Constraints

- All positions and times are float64. The public API uses meters, seconds and radians; kilometers appear only inside packs, as in the source kernels.
- Data comes only through setup: `npm run setup` writes to `~/.cesium-bench/frames/` (override with env `FRAMES_DATA_DIR`), and the dev server serves it at `/frames-data/`. Nothing downloaded is committed. Only code and small generated fixtures (`test/fixtures/frames/*.json`) are committed.
- The ephemeris span defaults to 2000–2050, set with setup's `--frames-span 2000-2050`.
- Licenses:
  - ERFA ports keep ERFA's BSD-3 notice (`src/time/erfa/LICENSE`) and say "derived from ERFA" in each file's header.
  - Each pack's manifest records its NAIF source file, the source's SHA-256 and the span excerpted, and the pack is named as derived. Packs are never distributed.
  - EOP data is credited to IERS, via CelesTrak.
- Accuracy against the references:
  - Sun, EMB and Moon positions within 1 mm of jplephem;
  - Moon Euler angles within 1e-12 rad;
  - the GCRS→ITRS rotation within 1e-11 rad of pyerfa `c2t06a`;
  - TDB−TT within 1 ns of pyerfa `dtdb`.
- Repository practice:
  - Commit locally, never push, ending each message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  - `npx tsc --noEmit -p .`, `npx eslint` and prettier pass.
  - Run `snyk_code_scan` on new code and fix what it reports.

## Review Focus

1. **An instant outside the data:** before or after the pack span, past the EOP table's predictions, or past the leap-second table's expiry. The call throws an error naming the span, or for EOP falls back to predictions, then zero corrections, with a `degraded` flag. It never extrapolates silently. Tests: Task 1 (leap-second expiry), Task 3 (EOP), Task 8 (ephemeris span).
2. **Times at and across a leap second:** UTC milliseconds can't express 23:59:60. Conversion must stay monotonic across 2016-12-31T23:59:59 → 2017-01-01T00:00:00, and TT must advance 2 s across that 1 s of UTC. Test: Task 1.
3. **Setup never run, or the store moved:** `loadFrameData` rejects with an error that says to run `npm run setup` (and names `FRAMES_DATA_DIR`). It must not fail later with a parse error. Test: Task 9.
4. **Float precision far from J2000** (2049-12-31): Instant arithmetic subtracts in integer milliseconds before scaling, so TT round-trips UTC to the millisecond and the ephemeris matches jplephem there too. Tests: Task 1 and Task 8.
5. **An epoch exactly on a Chebyshev record boundary:** the record chosen follows jplephem's rule (the later record at an exact boundary), and positions are continuous across it to under 1 mm. Test: Task 5.

---

### Task 1: Leap seconds and `Instant`

**Files:**

- Create: `packages/next/src/time/leapSeconds.ts`, `packages/next/src/time/Instant.ts`
- Test: `packages/next/test/instant.test.ts`

**Interfaces:**

- Produces:
  - `class LeapSeconds { static fromIers(text: string): LeapSeconds; taiMinusUtc(utcMs: number): number; readonly expires: number /* UTC ms */; isExpired(utcMs: number): boolean }`
- The source is IERS `Leap_Second.dat` (Bulletin C). Its data lines are `MJD day month year TAI-UTC`, and its `#File expires on <d> <Month> <yyyy>` line gives `expires`.
  - `class Instant { readonly tt: number; static fromUtc(utcMs: number, leap: LeapSeconds): Instant; static fromTt(tt: number): Instant; toUtc(leap: LeapSeconds): number; tai(): number; jdTt(): [number, number] }`
- `tt` is TT seconds past J2000 (JD 2451545.0 TT).
- `jdTt()` returns a two-part Julian date `[2451545.0, tt / 86400]` for ERFA-style calls.

- [ ] **Step 1: Write the failing tests** in `test/instant.test.ts`. Embed an excerpt of `Leap_Second.dat` as a string, with its `#File expires on 28 June 2027` line and the rows for 1972 (10 s) through 2017-01-01 (37 s). Tests:
  - `taiMinusUtc` is 36 at `Date.UTC(2016,0,1)` and 37 at `Date.UTC(2017,0,1)`.
  - `Instant.fromUtc(Date.UTC(2000,0,1,11,58,55,816), leap).tt` equals 0 to within 1e-9 s (J2000 TT).
  - Across the 2016 leap, `Instant.fromUtc(Date.UTC(2017,0,1)).tt − Instant.fromUtc(Date.UTC(2016,11,31,23,59,59)).tt === 2` (within 1e-9). This is Review Focus 2.
  - Round trip: for `Date.UTC(2049,11,31,23,59,59,999)` and `Date.UTC(2026,3,6,22,44,0)`, `fromUtc(ms).toUtc(leap) === ms` exactly. This is Review Focus 4.
  - `tai() === tt − 32.184` exactly.
  - `isExpired(Date.UTC(2027,5,29))` is true and `isExpired(Date.UTC(2026,0,1))` is false (Review Focus 1).
- [ ] **Step 2: Run** `npx vitest run test/instant.test.ts` and confirm it fails (modules missing).
- [ ] **Step 3: Implement.**
  - `LeapSeconds.fromIers` parses the data lines into sorted UTC-ms thresholds (from each MJD), and the expiry line into `expires`.
  - `Instant.fromUtc` computes `tt = ((utcMs − 946_728_000_000) / 1000) + taiMinusUtc(utcMs) + 32.184`. 946,728,000,000 is the Unix ms of 2000-01-01T12:00:00, as if TT were UTC-labelled; the integer subtraction happens first. Check: at J2000 TT, UTC is 11:58:55.816 and TAI−UTC is 32.
  - `toUtc` inverts it, iterating once on `taiMinusUtc` at a leap boundary, and rounds to the millisecond.
- [ ] **Step 4: Run** the test and confirm it passes.
- [ ] **Step 5: Commit** `test/instant.test.ts src/time/leapSeconds.ts src/time/Instant.ts` with "frames: Instant and leap seconds".

### Task 2: TDB−TT, ported from ERFA, and the fixture generator

**Files:**

- Create:
  - `packages/next/scripts/erfaTables.mjs`: extracts series tables from ERFA C source into TS. Run by hand, its output committed.
  - `packages/next/src/time/erfa/LICENSE`: ERFA's BSD-3 text.
  - `packages/next/src/time/erfa/dtdb.ts` and the generated `packages/next/src/time/erfa/dtdbTable.ts`.
  - `packages/next/scripts/frameFixtures.py`: writes `test/fixtures/frames/*.json`.
  - `packages/next/test/fixtures/frames/dtdb.json`.
- Modify: `packages/next/src/time/Instant.ts` (add `tdb()`).
- Test: `packages/next/test/erfa.test.ts`

**Interfaces:**

- Produces:
  - `function tdbMinusTt(jd1: number, jd2: number): number`: seconds, geocentric (ERFA `eraDtdb` with `ut = 0, elong = u = v = 0`, so its topocentric terms vanish).
  - `Instant.tdb(): number`: TDB seconds past J2000, which is SPICE's ephemeris time (ET).
- `scripts/erfaTables.mjs <erfa-src-dir>` reads the `static const` term tables of `dtdb.c`, `xy06.c` and `s06.c` and writes them as `export const` arrays of numbers. Task 4 uses its xy06 and s06 output.
- `scripts/frameFixtures.py <section> [args]` takes a section name (`dtdb`, `earth`, `ephemeris`, `moon`), so each task adds its own section.

- [ ] **Step 1: Fetch ERFA and generate the tables.** Download liberfa `v2.0.1` (`https://github.com/liberfa/erfa/archive/refs/tags/v2.0.1.tar.gz`) into the session scratchpad, not the repo. Run `node scripts/erfaTables.mjs <scratch>/erfa-2.0.1/src` and check that `src/time/erfa/dtdbTable.ts` exists with ERFA's term count. Copy ERFA's `LICENSE` to `src/time/erfa/LICENSE`.
- [ ] **Step 2: Generate fixtures.** Run `uv run --with pyerfa --with numpy python scripts/frameFixtures.py dtdb`. It writes `test/fixtures/frames/dtdb.json` with `[{jd1, jd2, dtdb}]` for 50 TT instants from 2000-01-01 to 2050-12-31, using `erfa.dtdb(jd1, jd2, 0, 0, 0, 0)`.
- [ ] **Step 3: Write the failing test.** `test/erfa.test.ts › tdbMinusTt matches pyerfa`: for every fixture row, `|tdbMinusTt(jd1, jd2) − dtdb| < 1e-9`, and the annual amplitude, max |value| over the fixtures, lies between 1.6e-3 and 1.7e-3 s.
- [ ] **Step 4: Run** it and confirm it fails.
- [ ] **Step 5: Implement `tdbMinusTt`** by transcribing `eraDtdb` against the generated table, then `Instant.tdb() = tt + tdbMinusTt(...this.jdTt())`.
- [ ] **Step 6: Run** it and confirm it passes.
- [ ] **Step 7: Commit** the scripts, LICENSE, table, `dtdb.ts`, fixture, test and `Instant.ts` with "frames: TDB−TT from ERFA, fixture generator".

### Task 3: Earth orientation parameters (EOP)

**Files:**

- Create: `packages/next/src/time/eop.ts`
- Test: `packages/next/test/eop.test.ts`

**Interfaces:**

- Produces:
  - `interface EopSample { ut1MinusUtc: number /* s */; xp: number; yp: number /* rad */; dX: number; dY: number /* rad */; predicted: boolean; degraded: boolean }`
  - `class EarthOrientationParameters { static fromCelestrakCsv(text: string): EarthOrientationParameters; at(utcMs: number): EopSample; readonly first: number; readonly last: number /* UTC ms */ }`
- Units: CelesTrak gives X, Y, DX and DY in arcseconds and UT1-UTC in seconds; convert to radians and seconds.

- [ ] **Step 1: Write the failing tests** with an embedded six-row CSV in CelesTrak's `EOP-All.csv` header form (`DATE,MJD,X,Y,UT1-UTC,LOD,DPSI,DEPS,DX,DY,DAT,DATA_TYPE`, `DATA_TYPE` being `O` or `P`), with known values. Tests:
  - `at()` at a row's midnight returns that row exactly.
  - Halfway between rows it returns the 4-point Lagrange interpolate, within 1e-12 of a value computed in the test.
  - `predicted` is true on `P` rows.
  - Past `last` it returns the last row's values with `degraded: true`, and `predicted` true if that row was. Before `first` it returns zeros with `degraded: true`. This is Review Focus 1.
  - Parsing is by header name: shuffled columns parse the same.
- [ ] **Step 2: Run** `npx vitest run test/eop.test.ts` and confirm it fails.
- [ ] **Step 3: Implement** as specified, with 4-point Lagrange interpolation in MJD on each quantity. UT1−UTC is not interpolated across a leap-second step: across a row where DAT changes, interpolate `UT1−TAI` instead.
- [ ] **Step 4: Run** it and confirm it passes.
- [ ] **Step 5: Commit** with "frames: Earth orientation parameters".

### Task 4: The GCRS→ITRS rotation (IAU 2006/2000A, CIO-based)

**Files:**

- Create:
  - `packages/next/src/time/erfa/xy06.ts` and `s06.ts`, with the tables generated in Task 2 (`xy06Table.ts`, `s06Table.ts`);
  - `packages/next/src/time/erfa/fundamental.ts`: the IERS 2003 fundamental arguments `fal03`, `falp03`, `faf03`, `fad03`, `faom03`, `fame03` … `fane03`, `fapa03`;
  - `packages/next/src/time/erfa/rotation.ts`: `era00`, `sp00`, `c2ixys`, `pom00`, and the composition;
  - `packages/next/src/time/earthOrientation.ts`;
  - `packages/next/test/fixtures/frames/earth.json`.
- Modify: `packages/next/scripts/frameFixtures.py` (add the `earth` section).
- Test: `packages/next/test/earthOrientation.test.ts`

**Interfaces:**

- Consumes: `Instant` (Task 1), `EopSample` (Task 3), `LeapSeconds` (Task 1).
- Produces:
  - `function celestialToTerrestrial(instant: Instant, eop: EopSample, leap: LeapSeconds, out?: Float64Array): Float64Array`: row-major 3×3, `itrs = M · gcrs`, the same convention as `icrfToFixed` in `src/time/celestial.ts`.
  - Exported for tests: `xy06(jd1, jd2): [number, number]`, `s06(jd1, jd2, x, y): number`, `era00(ut1jd1, ut1jd2): number`.
- UT1 is UTC + `ut1MinusUtc`, as a two-part JD.
- The CIP is X+dX, Y+dY. `s'` comes from `sp00`, polar motion from `pom00(xp, yp, sp)`.
- The composition is ERFA's `c2tcio(c2ixys(x, y, s), era, rpom)`.

- [ ] **Step 1: Generate fixtures.** `frameFixtures.py earth` writes, for 30 UTC instants from 2000 to 2050 with assumed EOP values (stated in the fixture: `xp`, `yp`, `dut1`, `dx`, `dy` per row, of realistic size), pyerfa's `xy06`, `s06`, `era00` and `c2t06a`-with-dX/dY matrix. pyerfa has no `c2t06a` taking dX/dY, so compose `c2ixys(x+dx, y+dy, s06)`, `era00`, `pom00(xp, yp, sp00)` and `c2tcio` the same way.
- [ ] **Step 2: Write the failing tests:**
  - `xy06` within 1e-12 rad.
  - `s06` within 1e-13 rad.
  - `era00` within 1e-13 rad.
  - Every element of `celestialToTerrestrial` within 1e-11 of the fixture matrix.
  - The result is a rotation (orthonormal to 1e-14).
  - It stays within 0.01° of the existing `icrfToFixed(utcMs)` from `src/time/celestial.ts` at 2026-01-01. That function omits nutation, the equation of the equinoxes and polar motion, together a few thousandths of a degree.
- [ ] **Step 3: Run** `npx vitest run test/earthOrientation.test.ts` and confirm it fails.
- [ ] **Step 4: Implement** by transcribing the named ERFA routines over the generated tables, keeping ERFA's argument order and units.
- [ ] **Step 5: Run** it and confirm it passes.
- [ ] **Step 6: Commit** with "frames: IAU 2006/2000A Earth orientation from ERFA".

### Task 5: Reading SPICE DAF files: SPK and binary PCK, type 2

**Files:**

- Create:
  - `packages/next/src/ephemeris/daf.ts`: DAF file record, summaries and names, little-endian `LTL-IEEE` only;
  - `packages/next/src/ephemeris/chebyshev.ts`;
  - `packages/next/src/ephemeris/spk.ts`.
- Test: `packages/next/test/spk.test.ts`, with a helper `packages/next/test/spkWriter.ts` that writes synthetic type-2 DAF buffers.

**Interfaces:**

- Produces:
  - `interface Type2Segment { target: number; center: number; frame: number; start: number; end: number /* TDB s past J2000 */; init: number; intervalLength: number; recordSize: number; count: number; coefficients(): Float64Array /* the segment's records, each [MID, RADIUS, c0..cn for x, y, z] */ }`
  - `function readDaf(buffer: ArrayBuffer): { kind: "SPK" | "PCK"; segments: Type2Segment[] }`: throws for big-endian files and for segment types other than 2.
  - `function chebyshev(records: Float64Array, recordSize: number, init: number, intervalLength: number, t: number, out: Float64Array /* [x,y,z,vx,vy,vz] */): Float64Array`
- Record choice: `index = floor((t − init) / intervalLength)`, clamped to `[0, count−1]`, so an exact boundary takes the later record. This is jplephem's rule.
- Velocity is the derivative of the polynomial, scaled by `1 / RADIUS`.

- [ ] **Step 1: Write the failing tests.** `spkWriter.ts` builds a DAF with one type-2 segment whose coefficients encode a known cubic per axis over 4 records. Tests:
  - `readDaf` returns the segment's ids, span and record layout.
  - `chebyshev` reproduces the cubic within 1e-9 km, and its derivative within 1e-12 km/s.
  - At an exact record boundary it uses the later record, and the positions on either side agree within 1e-6 km. This is Review Focus 5.
  - A big-endian (`BIG-IEEE`) file throws `"DAF: only little-endian (LTL-IEEE) files are supported"`.
  - A type-3 segment throws `"SPK: segment type 3 is not supported (type 2 only)"`.
- [ ] **Step 2: Run** `npx vitest run test/spk.test.ts` and confirm it fails.
- [ ] **Step 3: Implement** as specified.
  - DAF layout follows NAIF's DAF Required Reading: the file record is 1024 bytes; summaries hold ND doubles and NI integers; the segment data comes from the summary's initial and final addresses, which are 1-based in doubles.
  - The type-2 trailer is `[INIT, INTLEN, RSIZE, N]`.
- [ ] **Step 4: Run** it and confirm it passes.
- [ ] **Step 5: Commit** with "frames: SPICE DAF and type-2 Chebyshev reader".

### Task 6: Chebyshev packs

**Files:**

- Create: `packages/next/src/ephemeris/pack.ts`
- Test: `packages/next/test/pack.test.ts`

**Interfaces:**

- Consumes: `Type2Segment` (Task 5).
- Produces:
  - `interface PackSegment { name: string; target: number; center: number; frame: "ICRF" | "MOON_PA"; kind: "position" | "euler"; start: number; end: number; init: number; intervalLength: number; recordSize: number; count: number; offset: number /* in doubles */ }`
  - `interface PackManifest { format: "cesium-chebyshev-pack/1"; source: string; sourceSha256: string; span: [string, string]; derivedFrom: string; segments: PackSegment[] }`
  - `function writePack(manifest: Omit<PackManifest, "segments">, segments: Array<{ segment: Type2Segment; name: string; frame; kind; start: number; end: number }>): Uint8Array`: copies only the records overlapping `[start, end]`.
  - `function readPack(bytes: ArrayBuffer): { manifest: PackManifest; data: Float64Array }`
- Layout: bytes `"CPK1"`, then a u32 manifest byte length (little-endian), then the manifest JSON (UTF-8), then zero padding to an 8-byte boundary, then little-endian float64 records.

- [ ] **Step 1: Write the failing tests.**
  - Round trip: write the synthetic segment from Task 5's `spkWriter` excerpted to its middle two records, read it back, and check that `chebyshev` over the pack equals `chebyshev` over the source at 20 instants.
  - Excerpting keeps the source's record boundaries, so `init` moves forward by whole intervals.
  - A file without the `CPK1` magic throws `"pack: not a Chebyshev pack"`.
- [ ] **Step 2: Run** it and confirm it fails.
- [ ] **Step 3: Implement** as specified.
- [ ] **Step 4: Run** it and confirm it passes.
- [ ] **Step 5: Commit** with "frames: Chebyshev packs".

### Task 7: Setup and the data store

**Files:**

- Create: `packages/next/scripts/frameData.mjs`: `ensureFrameData({ span })` and `framesDataDirectory()`, called from `scripts/setup.mjs`; also runnable alone.
- Modify:
  - `packages/next/scripts/setup.mjs`: call `ensureFrameData`, and accept `--frames-span y0-y1` (default `2000-2050`);
  - `packages/next/vite.config.ts`: `serveDirectory("/frames-data", framesDataDirectory())` when it exists, and `test.exclude` gets `test/data/**` unless env `FRAMES_DATA` is set;
  - `packages/next/package.json`: `"test:data": "FRAMES_DATA=1 vitest run test/data"`.
- Test: `packages/next/test/data/frameData.test.ts`

**Interfaces:**

- Consumes: `readDaf` (Task 5), `writePack` and `readPack` (Task 6), `LeapSeconds` (Task 1), `EarthOrientationParameters` (Task 3).
- Produces:
  - `framesDataDirectory(): string`: `FRAMES_DATA_DIR`, else `~/.cesium-bench/frames`.
  - `ensureFrameData({ span: [number, number] })` downloads to the store, verifies and writes. Downloads:
    - `https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/de440s.bsp`
    - `https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/moon_pa_de440_200625.bpc`
    - `https://hpiers.obspm.fr/iers/bul/bulc/Leap_Second.dat`
    - `https://celestrak.org/SpaceData/EOP-All.csv`
  - It verifies the two NAIF files against SHA-256 values pinned in a constant. Record them on the first download and commit them in the script; a mismatch is an error. The leap-second and EOP files are refreshed when older than 7 days.
  - It writes `planets-de440-<y0>-<y1>.pack` (segments 10/0, 3/0 and 301/3) and `moon-pa-de440-<y0>-<y1>.pack`, plus `manifest.json` listing every file with its SHA-256, source URL and role (`planets`, `moon`, `leapSeconds`, `eop`).
- The store layout is the contract with Task 9's `loadFrameData`.

- [ ] **Step 1: Write the failing data test** `test/data/frameData.test.ts`, reading the store with `node:fs`:
  - the manifest lists both packs, and their spans cover 2000–2050;
  - both packs pass `readPack`;
  - `LeapSeconds.fromIers` on the stored file gives 37 now and isn't expired;
  - `EarthOrientationParameters.fromCelestrakCsv` on the stored file covers today.
- [ ] **Step 2: Run** `FRAMES_DATA=1 npx vitest run test/data/frameData.test.ts` and confirm it fails (no store).
- [ ] **Step 3: Implement** `frameData.mjs`, the setup hook, vite serving and the `test:data` script.
- [ ] **Step 4: Run** `npm run setup -- --skip-build` and confirm the store has the four sources, the two packs and `manifest.json`. Then `npm run test:data` passes, and `npx vitest run` still excludes `test/data`.
- [ ] **Step 5: Commit** with "frames: setup data store and serving".

### Task 8: `Ephemeris`: the Sun, Earth and Moon, and the Moon's orientation

**Files:**

- Create: `packages/next/src/ephemeris/Ephemeris.ts`, `packages/next/test/fixtures/frames/ephemeris.json`, `packages/next/test/fixtures/frames/moon.json`
- Modify: `packages/next/scripts/frameFixtures.py` (add the `ephemeris` and `moon` sections)
- Test: `packages/next/test/data/ephemeris.test.ts` (a data test: needs the store from Task 7)

**Interfaces:**

- Consumes: `readPack` and `chebyshev` (Tasks 5–6), `Instant.tdb()` (Task 2), the store (Task 7).
- Produces `class Ephemeris`:
  - `static fromPacks(planets: ArrayBuffer, moon: ArrayBuffer): Ephemeris`
  - `readonly span: [number, number] /* TDB s */`
  - `sun(instant: Instant, out?: Float64Array): Float64Array`, `earthMoonBarycenter(instant, out?)`, `earth(instant, out?)`, `moon(instant, out?)`: `[x,y,z,vx,vy,vz]` in m and m/s, ICRF, relative to the solar system barycenter.
  - `moonFromEarth(instant, out?)`: geocentric, from the Moon-wrt-EMB segment directly.
  - `moonPrincipalAxes(instant, out?: Float64Array): Float64Array`: row-major 3×3, `pa = M · icrf`, composed from the PCK Euler angles (φ, θ, ψ) as NAIF's PCK Required Reading defines type-2 angles (`[ψ]3 [θ]1 [φ]3`). The test against SPICE's own `pxform` decides the exact composition.
  - `moonMeanEarth(instant, out?)`: `MOON_PA_TO_ME · moonPrincipalAxes(instant)`.
- Constants:
  - `MOON_PA_TO_ME`, from the TKFRAME angles of `moon_de440_250416.tf`: `[67.8526, 78.6944, 0.2785]` arcseconds about axes `[3, 2, 1]`, composed as NAIF's Frames Required Reading defines a TKFRAME given by angles. The test against SPICE's `pxform("MOON_PA", "MOON_ME", et)` decides the exact composition and signs.
  - `EMRAT = 81.300568221497215`.
  - The Earth is `emb − moonWrtEmb / (1 + EMRAT)`.
- An instant outside `span` throws `"ephemeris: <ISO time> is outside the loaded span <start>–<end> (npm run setup -- --frames-span)"`. This is Review Focus 1.

- [ ] **Step 1: Generate fixtures** from the store (Task 7):
  - `uv run --with jplephem --with numpy python scripts/frameFixtures.py ephemeris <store>` uses jplephem on `de440s.bsp` to write `[{tdb, sun, emb, moonWrtEmb}]` in km at 40 instants over 2000–2050, including 2049-12-31 and an exact record boundary.
  - `uv run --with spiceypy --with numpy python scripts/frameFixtures.py moon <store> <scratch>/moon_de440_250416.tf`, with the frame kernel downloaded into the scratchpad from NAIF's `generic_kernels/fk/satellites/`. It furnishes `de440s.bsp`, `moon_pa_de440_200625.bpc` and the frame kernel, and writes at the same instants:
    - SPICE's Euler angles (`pckeul` or the type-2 evaluation);
    - `pxform("J2000", "MOON_PA", et)`, `pxform("J2000", "MOON_ME", et)` and `pxform("MOON_PA", "MOON_ME", et)`.
- [ ] **Step 2: Write the failing tests:**
  - Positions within 1 mm of the fixture, velocities within 1e-6 m/s, including at 2049-12-31 and at a record boundary (Review Focus 4 and 5).
  - Euler angles within 1e-12 rad. Our PA matrix, ME matrix and `MOON_PA_TO_ME` each within 1e-12 of SPICE's `pxform` values.
  - The ME z-axis in ICRF lies within 0.02° of the existing `moonAxes` pole (IAU 2009, `src/time/moon.ts`) at 2026-01-01.
  - The ME x-axis points within 10° of the direction to the Earth: the mean-Earth convention.
  - An instant in 2051 throws the span error.
- [ ] **Step 3: Run** `FRAMES_DATA=1 npx vitest run test/data/ephemeris.test.ts` and confirm it fails.
- [ ] **Step 4: Implement** as specified.
- [ ] **Step 5: Run** it and confirm it passes.
- [ ] **Step 6: Commit** with "frames: Ephemeris from DE440 and the lunar PCK".

### Task 9: `loadFrameData` and the public API

**Files:**

- Create: `packages/next/src/ephemeris/loadFrameData.ts`
- Modify: `packages/next/src/index.ts` (the exports below), `packages/next/README.md` (the setup section)
- Test: `packages/next/test/loadFrameData.test.ts`

**Interfaces:**

- Consumes: the store layout and `manifest.json` (Task 7), and every type above.
- Produces:
  - `interface FrameData { leapSeconds: LeapSeconds; eop: EarthOrientationParameters; ephemeris: Ephemeris }`
  - `function loadFrameData(baseUrl?: string /* default "/frames-data/" */): Promise<FrameData>`: fetches `manifest.json`, then the files it lists by role.
- Exported from `src/index.ts`: `Instant`, `LeapSeconds`, `EarthOrientationParameters`, `EopSample`, `celestialToTerrestrial`, `Ephemeris`, `loadFrameData`, `FrameData`, `tdbMinusTt`.

- [ ] **Step 1: Write the failing tests** in `test/loadFrameData.test.ts`:
  - With `fetch` stubbed to return 404 for `manifest.json`, `loadFrameData("/frames-data/")` rejects with a message containing `"npm run setup"` and `"FRAMES_DATA_DIR"` (Review Focus 3).
  - With `fetch` stubbed to serve a manifest and small files built in the test (an IERS excerpt, a six-row EOP CSV, the synthetic packs from Task 6's test), it resolves, and `ephemeris.span` matches the packs.
- [ ] **Step 2: Run** `npx vitest run test/loadFrameData.test.ts` and confirm it fails.
- [ ] **Step 3: Implement** `loadFrameData`, the exports and the README section. The README says what setup fetches, from where, under what terms (NAIF's redistribution rule, IERS credit), where it's stored, and how to change the span.
- [ ] **Step 4: Run** it and confirm it passes.
- [ ] **Step 5: Verify end to end:**
  - `npx tsc --noEmit -p .`, `npx vitest run` and `npm run test:data` all pass.
  - In the dev server, `await (await import("/src/index.ts")).loadFrameData()` resolves in the browser, and its `ephemeris.moonFromEarth` for now is between 356,000 and 407,000 km.
  - Run `snyk_code_scan` on `src/time`, `src/ephemeris` and `scripts`, and fix what it reports.
- [ ] **Step 6: Commit** with "frames: loadFrameData and the public API".

### Task 10: Plan bookkeeping

**Files:**

- Modify: `CESIUM2_WEBGPU_PLAN.md` §13.14 (a short "Frames 1 (r61)" results note pointing to the design and this plan, with the measured agreement figures from the tests), and this plan's checkboxes.

- [ ] **Step 1: Write the note:** what landed, the measured worst agreement for each check, the data span, and that the engine's rendering is unchanged (plan 2 switches it over).
- [ ] **Step 2: Commit** with "Plan: frames 1 results".
