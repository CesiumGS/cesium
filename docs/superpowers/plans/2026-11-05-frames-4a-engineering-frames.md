# Frames 4a: Engineering Frames, PROJ, Alignments and Design Measurement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Attach a design's coordinate system to a body through PROJ, exactly and in both directions. Then measure in design terms beside true terms: design distance and deltas in the design's units, scale factor and grid convergence, and station, offset and elevation along an alignment.

**Architecture:**

- **PROJ.** PROJ 9.7.1 (proj.js v0.9.2's prebuilt builds) is fetched by setup and SHA-pinned into the store, as the Slang compiler is. It is loaded lazily through one small typed interface: WebAssembly in the browser, the native C-API module in Node. Both run the same PROJ C API.
- **Engineering frames.** An `EngineeringFrame` maps design coordinates to body-fixed coordinates and back. It goes through the design CRS, an optional site transform, and one recorded PROJ operation to the body's geographic 3D CRS. The last step, geodetic to body-fixed, uses the engine's own ellipsoids. Alignments are pure TypeScript.
- **Measurement.** `measure` accepts design points and adds a `design` result and an `alignment` result.
- **Not in this plan.** Tilesets, picking, snapping and the corridor are plan 4b.

**Tech Stack:**

- TypeScript (float64) and Vitest.
- Node setup scripts (`.mjs`).
- `@emnapi/runtime` 1.8.1 (MIT, the proj.js WebAssembly's Node-API shim).
- Python via `uv` (pyproj, numpy), only to generate fixtures.

**Spec:** `docs/superpowers/specs/2026-11-05-frames-bodies-measurement-design.md`, sections:

- 2 (the anti-goal: a measured value that disagrees with the CAD data);
- 4 (US survey foot vs international foot; round trips well under 1 mm);
- 6.1 (engineering frames);
- 6.5 ("Design distance", "Station, offset and elevation");
- 7.1, 7.3–7.6;
- 9 and 10.

Plans 1–3 supply the frame tree, `Body` (EARTH, MOON), `Ellipsoid`, `measure` and accuracy statements.

**Roadmap:**

- **4b:** the 3D Tiles georeferencing reader, rigid and reprojected placement of tilesets, picking design coordinates, snapping (client-side and exact), and the corridor generator and example. It also covers global geoid and height-system coverage, lazily loaded: country and region geoids from PROJ-data's catalog, with opt-in EGM96 and EGM2008 fallbacks (the owner's requirement; see CESIUM2_WEBGPU_PLAN.md §13.14, Carried forward).
- **5:** multiple bodies and the Artemis example.

## Rulings this plan makes

Each ruling ends with what it costs if it is wrong.

- **R1. PROJ comes from proj.js v0.9.2's GitHub release, pinned in setup.** This is the owner's choice, 2026-11-05.
  - proj.js's npm package carries no binaries. Its install scripts download them on every `npm install`, so it is not an npm dependency.
  - Setup downloads `emscripten-wasm32.tar.gz` (the browser) and the host's native tarball (Node). From these it extracts only:
    - `proj_capi.mjs` and `proj_capi.wasm`;
    - `proj_capi.node`;
    - `proj/proj.db`.
  - Both builds expose the same PROJ C API (verified by a spike, 2026-11-05).
  - Cost if wrong: one loader module.
- **R2. A frame records its PROJ operation.** PROJ picks the "best available" operation by which grids are installed. A spike found EPSG:2227 → EPSG:4326 silently choosing a NADCON grid that wasn't there and returning nothing.
  - An engineering frame resolves its operation once, at creation.
  - The candidates come from PROJ's operation list for the pair. The frame takes the first whose grids are all loaded, or a pipeline the caller pins.
  - It keeps that operation's PROJ string and uses it for both directions.
  - If every candidate needs a missing grid, it throws, naming the grids. It never falls back to a ballpark transform unless `allowBallpark: true`, and then the accuracy is undefined.
  - Cost if wrong: one creation option.
- **R3. CRS references follow the 3D Tiles 2.0 draft.**
  - A reference is `{ format: "wkid", authority, wkid, vcsWkid?, epoch? }` or `{ format: "wkt2", wkt2 }`, exactly `EXT_geospatial_crs` with `_wkid` / `_wkt2` (CesiumGS/glTF branch `3d-tiles-2.0`, read 2026-11-05). Plan 4b's reader then maps it directly.
  - The draft has no site transform, placement mode or alignment. These live on `EngineeringFrameDefinition` here, and 4b proposes them as draft additions.
- **R4. PROJ stops at the body's geographic 3D CRS.** EPSG:4979 serves the Earth. For the Moon it is the IAU 2015 geographic 3D Moon CRS that PROJ lists; Task 2 finds its code in `proj.db` and records it.
  - The engine's own `Ellipsoid` (WGS84, Moon sphere) does geodetic ↔ body-fixed.
  - ITRF is treated as WGS84, as the spec does.
- **R5. Units come from the CRS.** Each axis's `unit_conv_factor` comes from PROJ. Design units are never assumed.
  - The US survey foot is 1200/3937 m = 0.3048006096012192 m. The international foot is 0.3048 m.
  - A site transform's translation is in design units.
- **R6. The site transform.**
  - It takes local site-grid coordinates `(e, n, u)` in design units to the projected CRS's coordinates in design units:

    [E, N] = [E0, N0] + s·R(θ)·[e, n]
    U = U0 + u

  - Here θ is counterclockwise from the CRS's grid east, s is the site scale factor (an iModel GCS's Helmert scale, or a DOT project's ground-to-grid factor), and `(E0, N0, U0)` is the site origin in CRS units.
  - Height is not scaled.
  - The inverse is exact.
  - Cost if wrong: the definition's documented convention.
- **R7. Scale factor and convergence come from `proj_factors`.**
  - They are evaluated on the projected CRS's conversion at the point's geodetic position.
  - The combined factor is k × R/(R + h), with R the ellipsoid's geometric-mean radius at the point and h its ellipsoidal height. That is the CAD practice of grid = ground × combined factor.
  - In `measure`, the design result gives the combined factor and convergence at each end, and their mean for the line.
- **R8. Alignment geometry is exact to float64.**
  - Clothoids use Fresnel integrals: an adaptive series for small arguments and an asymptotic form for large ones, to 1e-12 relative.
  - A point whose perpendicular foot lies before the alignment's start or after its end throws "outside the alignment"; nothing is extrapolated (as in plans 1–3).
  - A point equidistant from two elements takes the lower station.
- **R9. Design ends add a `projection` accuracy term.** Its size is PROJ's operation accuracy (`proj_coordoperation_get_accuracy`, m), or undefined when PROJ reports none. A ballpark or unknown operation makes the statement's `meters` undefined, as plan 3's R7 requires.

## Global Constraints

- **Units.** Everything is float64. Body-fixed values are meters. Design values are in the design CRS's own units, stated in every result (`unitName`, `metersPerUnit`). Angles are radians.
- **Matrix conventions** are unchanged: row-major 3×3 rotations from the time and ephemeris code, column-major `Mat4` frame transforms, and `src/frames/matrix.ts` as the only bridge.
- **Data comes only through setup.**
  - The store (`~/.cesium-bench/frames`, overridden with `FRAMES_DATA_DIR`) gains `proj/`: `proj_capi.mjs`, `proj_capi.wasm`, the host's `proj_capi.node`, `proj.db`, and grids.
  - The dev server serves it at `/frames-data/proj/`.
  - Nothing downloaded is committed.
- **Pinned SHA-256 values,** recorded 2026-11-05. Task 1 records the other native tarballs (darwin-x64, linux-x64, win32-x64) the same way on first download.

  | File | SHA-256 |
  | --- | --- |
  | `https://github.com/mmomtchev/proj.js/releases/download/v0.9.2/emscripten-wasm32.tar.gz` | `ccd990a625607dc24225170632bd96dc67977ba48b14180435b69bf9d173ac88` |
  | `…/v0.9.2/darwin-arm64.tar.gz` | `0352f888a1923bbd2c3b616a7a7d0c07ab49552fe166a8b60b189173c791c9cb` |
  | `https://cdn.proj.org/us_noaa_g2018u0.tif` (GEOID18 CONUS, 16,742,155 bytes) | `fa9a407ac7ee3f5a3694008e4bcd09ce9cc250452f0c3b11700a4960340abce2` |

- **New npm dependency.** `@emnapi/runtime`, pinned exactly at `1.8.1`. It has no install scripts and depends only on `tslib`. Check it with `snyk_sca_scan` (the repo is trusted in Snyk) and `snyk_package_health_check`. Import it only in `src/engineering/proj.ts`.
- **Licenses and credit.**
  - PROJ is MIT.
  - proj.js is MIT.
  - `proj.db` carries the EPSG dataset under its terms of use: the README credits IOGP and links the terms.
  - GEOID18 is a NOAA/NGS product, public domain.
- **Lazy loading.** Nothing loads PROJ until an engineering frame is created. Earth-only scenes and existing tests are unchanged.
- **Accuracy against the references:**

  | What | Within | Reference |
  | --- | --- | --- |
  | Projection and datum operations | 1e-6 m | pyproj `Transformer`, using the store's grids |
  | Scale factor | 1e-12 | pyproj `Proj.get_factors` |
  | Convergence | 1e-12 rad | pyproj `Proj.get_factors` |
  | Design → body-fixed → design round trips, anywhere on a 50 km line | 1e-4 m | (well under 1 mm) |
  | Alignment points constructed and recovered | 1e-9 design units | |

- **Repository practice:**
  - Commit locally and never push. End each message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  - `npx tsc --noEmit -p .`, `npx eslint` and prettier pass.
  - Run `snyk_code_scan` on new code.
  - Never rewrite downloaded or compiler output (the glue loads as shipped).
  - Commands run in `packages/next`.

## Review Focus

1. **A CRS whose best operation needs a grid that isn't loaded,** for example NAVD88 heights without GEOID18. Creating the frame throws, naming the grid file. It never silently uses PROJ's next, coarser operation. Test: Task 2.
2. **US survey foot vs international foot.** The same numeric design coordinates in EPSG:2227 (ftUS) and EPSG:2223 (ft) give body-fixed points that differ by the 2 ppm scale, and each round trips. Units are never assumed. Tests: Task 2 and Task 3.
3. **Far from the CRS origin and across a 50 km line.**
   - Round trips stay under 1e-4 m at both ends, in the middle, and at 100 km from the projection's central meridian or origin.
   - The scale factor there matches pyproj.

   Tests: Task 3 and Task 4.
4. **A site transform with rotation and a scale ≠ 1** (for example s = 1.0000375, θ = 12.5°): the round trip is exact and the documented convention holds. Test: Task 3.
5. **Station and offset at element joins and beyond the ends.**
   - Exactly at an arc/spiral join, station and offset are continuous from both sides.
   - A point beyond the start or the end throws "outside the alignment".
   - A point on the alignment's centerline has offset 0.

   Test: Task 5.

---

### Task 1: PROJ in the store, and the loader

**Files:**

- Create:
  - `packages/next/src/engineering/proj.ts`
  - `packages/next/src/engineering/projApi.ts`
  - `packages/next/test/data/proj.test.ts`
- Modify:
  - `packages/next/scripts/frameData.mjs`
  - `packages/next/package.json` (`"@emnapi/runtime": "1.8.1"`)
  - `packages/next/vite.config.ts` only if `/frames-data/proj/` needs a MIME type for `.mjs`/`.wasm`
- Test:
  - `packages/next/test/data/proj.test.ts`
  - a browser check

**Interfaces:**

- **`ProjApi`** (`projApi.ts`) is a hand-written minimal interface over the C API functions this plan uses. The names are PROJ's, as the release's typings give them:
  - `proj_create`, `proj_create_crs_to_crs`, `proj_normalize_for_visualization`
  - `proj_create_operations`, `proj_list_get_count`, `proj_list_get`
  - `proj_coordoperation_is_instantiable`, `proj_coordoperation_get_grid_used_count`, `proj_coordoperation_get_grid_used`, `proj_coordoperation_get_accuracy`
  - `proj_as_proj_string`, `proj_trans`, `proj_factors`
  - `proj_crs_get_coordinate_system`, `proj_cs_get_axis_count`, `proj_cs_get_axis_info`, `proj_crs_get_sub_crs`, `proj_get_type`
  - `proj_coord`, `PJ_FWD`, `PJ_INV`

  Check each against `swig/proj_capi.d.ts` in the release's npm tarball, and add only what is used.
- **`loadProj(options: { base: string; grids?: readonly string[] }): Promise<ProjApi>`** (`proj.ts`):
  - **In the browser:** it imports `${base}proj_capi.mjs`, initializes it with `@emnapi/runtime`'s `getDefaultContext()` (as proj.js's `wasm/emnapi.mjs` does), and writes `proj.db` and each listed grid, fetched from `base`, into the module's FS root.
  - **In Node:** it `createRequire`s `${base}proj_capi.node` from a file path, with `PROJ_DATA` set to the store's `proj/` directory, so grids are found there.
  - It loads once per base (memoized), and is idempotent.
- **`setup`** adds `proj/` to the store and a manifest role `proj`. Each file entry carries `sha256`, its source URL and a credit.

- [ ] **Step 1: Extend setup.** In `frameData.mjs`:
  - Download the pinned WebAssembly tarball and the host's native tarball (`process.platform`-`process.arch`: darwin-arm64, darwin-x64, linux-x64, win32-x64). Record the three hashes not given above on first download, in the same `NAIF_SHA256`-style map.
  - Extract the four files with Node's `zlib` and a minimal tar reader; don't add a tar dependency.
  - Download `us_noaa_g2018u0.tif`.
  - Write the manifest entries.
  - Run `npm run setup` and confirm the store has them.
- [ ] **Step 2: Add the dependency.** `npm install @emnapi/runtime@1.8.1 --save-exact`. Then run `snyk_package_health_check` and `snyk_sca_scan` on packages/next, and record the results.
- [ ] **Step 3: Write the failing data test** (`test/data/proj.test.ts`, Node, native):
  - `loadProj` resolves.
  - EPSG:2227's first axis has `unit_conv_factor` 0.30480060960121924 and unit name "US survey foot".
  - EPSG:2223's has 0.3048.
  - `proj_trans` of a pinned pipeline (`+proj=pipeline +step +inv +proj=lcc …` for California zone 3 on GRS80) matches a pyproj value the test embeds, within 1e-6 m. Generate that value once with `uv run --with pyproj python -c "…"` and paste it into the test with the command in a comment.
- [ ] **Step 4: Run** `npm run test:data` and confirm the new test fails.
- [ ] **Step 5: Implement** `projApi.ts` and `proj.ts`.
- [ ] **Step 6: Run** `npm run test:data` and `npm test`, and confirm they pass.
- [ ] **Step 7: Check it in the browser.**
  - In the dev server (`preview_start` "dyno"), from the page's console, run `const P = await (await import('/src/engineering/proj.ts')).loadProj({ base: '/frames-data/proj/' })`.
  - Then evaluate the same pinned pipeline.
  - The result matches the Node value, and the console has no errors.
- [ ] **Step 8: Commit** with "engineering: PROJ 9.7.1 from the pinned proj.js release, loaded lazily".

### Task 2: CRS references and recorded operations

**Files:**

- Create:
  - `packages/next/src/engineering/crs.ts`
  - `packages/next/test/fixtures/frames/proj.json`
- Modify: `packages/next/scripts/frameFixtures.py` (section `proj <store>`)
- Test: `packages/next/test/data/crs.test.ts`

**Interfaces:**

- Consumes: Task 1's `ProjApi` and `loadProj`.
- Produces:
  - **`type CrsRef`:**
    - `{ format: "wkid"; authority: string; wkid: number; vcsWkid?: number; epoch?: number }`
    - or `{ format: "wkt2"; wkt2: string }`

    The shape is R3's, mirroring `EXT_geospatial_crs`.
  - **`crsDefinition(ref: CrsRef): string`**, the string PROJ accepts. A wkid becomes `"EPSG:2227"`, or a compound `"EPSG:6420+6360"` when `vcsWkid` is given.
  - **`interface CrsUnits`:** `{ horizontalUnitName: string; metersPerUnit: number; verticalUnitName?: string; metersPerVerticalUnit?: number }`. It is read from the CRS's axes (R5).
  - **`interface RecordedOperation`:**
    - `pipeline: string`, the PROJ string;
    - `accuracy: number | undefined` (m);
    - `grids: readonly string[]`;
    - `ballpark: boolean`;
    - `forward(xyz: ArrayLike<number>, out?: Float64Array): Float64Array`;
    - `inverse(xyz: ArrayLike<number>, out?: Float64Array): Float64Array`.

    Coordinates are in the source CRS's axis order and units, normalized for visualization: easting and northing first, longitude and latitude in degrees.
  - **`resolveOperation(proj: ProjApi, source: CrsRef, target: string, options?: { pipeline?: string; allowBallpark?: boolean }): RecordedOperation`.** It follows R2:
    - A given `pipeline` is used as is.
    - Otherwise it walks PROJ's candidate list in order and takes the first instantiable operation whose grids are all available.
    - If none qualify, it throws, naming the missing grids. A ballpark operation is accepted only with `allowBallpark`.
  - **`crsUnits(proj: ProjApi, ref: CrsRef): CrsUnits`.**
  - **`moonGeographic3d`:** the PROJ code string for the IAU 2015 Moon geographic 3D CRS, found in `proj.db` and recorded as a constant (R4).

- [ ] **Step 1: Generate the fixture.** Add a section `proj <store>` to `frameFixtures.py`. Run it with `uv run --with pyproj --with numpy python scripts/frameFixtures.py proj ~/.cesium-bench/frames`, with `PROJ_DATA` pointed at the store's `proj/` so pyproj finds GEOID18. For 12 points each, it writes pyproj `Transformer` forward and inverse values for:
  - NAD83(2011) / California zone 3 (ftUS) with NAVD88 height (ftUS), compound EPSG:6420+6360, to EPSG:4979;
  - NAD83 / Arizona Central (ft), EPSG:2223, to EPSG:4979;
  - WGS 84 / UTM zone 11N, EPSG:32611, to EPSG:4979;
  - a Moon south-polar stereographic CRS from IAU 2015 to the Moon geographic 3D CRS.

  The points include the zone origin, 50 km lines and a point 100 km off the central meridian. It also records the operation's PROJ string and accuracy.
- [ ] **Step 2: Write the failing data tests** (`test/data/crs.test.ts`):
  - **Each fixture row** matches forward and inverse within 1e-6 m. Compare degrees × 111,320 m and heights, or convert to meters, as the test documents.
  - **The recorded pipeline** for 6420+6360 names `us_noaa_g2018u0.tif` in `grids` (Review Focus 1).
  - **Grids missing** (`loadProj` with an empty grid list, on a fresh base or Node `PROJ_DATA` pointing at a directory without the geoid): `resolveOperation` throws `/us_noaa_g2018u0/` (Review Focus 1).
  - **Units:** `crsUnits` for EPSG:2227 gives metersPerUnit 0.3048006096012192, and for EPSG:2223 gives 0.3048 (Review Focus 2).
  - **Ballpark:** with `allowBallpark: true` and the grid missing, `ballpark` is true and `accuracy` is undefined.
- [ ] **Step 3: Run** `npm run test:data` and confirm the new tests fail.
- [ ] **Step 4: Implement** `crs.ts`.
- [ ] **Step 5: Run** `npm run test:data` and `npm test`, and confirm they pass.
- [ ] **Step 6: Commit** with "engineering: CRS references and deterministic recorded operations".

### Task 3: `EngineeringFrame` and rigid placement

**Files:**

- Create: `packages/next/src/engineering/EngineeringFrame.ts`
- Modify: `packages/next/src/index.ts`
- Test: `packages/next/test/data/engineeringFrame.test.ts`, `packages/next/test/engineeringFrame.test.ts`

**Interfaces:**

- Consumes:
  - Task 2's `CrsRef`, `resolveOperation`, `crsUnits` and `moonGeographic3d`.
  - `Body`, `EARTH`, `MOON` and `Ellipsoid` (`cartographicToCartesian` and `cartesianToCartographic`).
  - Plan 2's `Frames.bodyFixed` and `Frame`.
- Produces:
  - **`interface SiteTransform`:** `{ origin: [number, number, number]; rotation: number; scale: number }`. The origin is in CRS units and the rotation in radians, counterclockwise from grid east (R6).
  - **`interface EngineeringFrameDefinition`:** `{ name: string; body: Body; crs: CrsRef; site?: SiteTransform; pipeline?: string; allowBallpark?: boolean }`.
  - **`class EngineeringFrame`:**
    - readonly fields: `definition`, `units: CrsUnits`, `operation: RecordedOperation`, `body: Body`;
    - `static create(definition: EngineeringFrameDefinition, proj: ProjApi): EngineeringFrame`;
    - `toBodyFixed(design: ArrayLike<number>, out?: Float64Array): Float64Array` (design units → m, body-fixed);
    - `fromBodyFixed(position: ArrayLike<number>, out?: Float64Array): Float64Array`;
    - `toGeodetic(design)` returns `{ longitude, latitude, height }` in radians and m;
    - `projected(design)` returns the projected-CRS coordinates after the site transform, in CRS units.
  - **`interface DesignPoint`:** `{ readonly engineeringFrame: EngineeringFrame; readonly design: Float64Array }`.
  - **`designPoint(frame: EngineeringFrame, design: ArrayLike<number>): DesignPoint`.**
  - **`class RigidPlacement`.** It is rigid placement of design coordinates at one anchor, as an iModel's `ecefLocation` does, matching `EXT_georeference`'s ENU semantics:
    - `static at(frame: EngineeringFrame, anchorDesign: ArrayLike<number>): RigidPlacement`;
    - `toBodyFixed(design, out?)` and `fromBodyFixed(position, out?)`;
    - `matrix: Mat4`: design units → body-fixed m, column-major.

    The placement is the east-north-up frame at the anchor's exact body-fixed position, rotated by the grid convergence at the anchor so that grid north maps to the CRS's grid north there, and scaled by `metersPerUnit`. It is exact at the anchor and sags away from it (spec 7.2).
  - Export everything above from `src/index.ts`.

- [ ] **Step 1: Write the failing tests.**
  - **Unit tests** (`test/engineeringFrame.test.ts`, with a stub `ProjApi` whose operation is an identity on degrees, or a pinned `+proj=noop`): the site transform's forward and inverse round trip to 1e-12, and the convention holds. Point (1, 0, 0) with θ = 90° and s = 2 lands at `origin + (0, 2, 0)` (Review Focus 4).
  - **Data tests** (`test/data/engineeringFrame.test.ts`, real PROJ):
    - **Earth round trip.** A frame on NAD83(2011) / California zone 3 ftUS + NAVD88 ftUS with site `{ origin: [6,000,000, 2,100,000, 0], rotation: 12.5°, scale: 1.0000375 }`. 21 design points along a 164,042 ft (50 km) line, and one at 100 km from the central meridian, round trip `fromBodyFixed(toBodyFixed(p))` within 1e-4 m (Review Focus 3, 4).
    - **2 ppm.** The same numeric coordinates in EPSG:2227 and EPSG:2223 frames, both with no site, give positions 1 km from the origin that differ by 2.0e-6 × that distance within 1e-7 relative (Review Focus 2).
    - **Moon.** A frame on the Moon south-polar CRS round trips within 1e-4 m, and its `toBodyFixed` lies on the Moon's sphere at the design height.
    - **`RigidPlacement`:**
      - At the anchor it equals `toBodyFixed` within 1e-6 m.
      - Its inverse of its own forward is exact to 1e-9 m.
      - At 10 km from the anchor along grid east, it differs from `toBodyFixed` by 7.8 m ± 1.5 m (the spec's sag figure, section 4).
- [ ] **Step 2: Run** `npx vitest run test/engineeringFrame.test.ts` and `npm run test:data`, and confirm both fail.
- [ ] **Step 3: Implement** `EngineeringFrame.ts`. The operation's target is EPSG:4979, or `moonGeographic3d` for the Moon. Geodetic ↔ body-fixed uses `body.ellipsoid`.
- [ ] **Step 4: Run** the tests and `npm test`, and confirm they pass.
- [ ] **Step 5: Commit** with "engineering: EngineeringFrame, design points and rigid placement".

### Task 4: Scale factor and grid convergence

**Files:**

- Create: `packages/next/src/engineering/factors.ts`
- Modify:
  - `packages/next/scripts/frameFixtures.py` (extend `proj` with `get_factors` rows)
  - `packages/next/test/fixtures/frames/proj.json`
- Test: `packages/next/test/data/factors.test.ts`

**Interfaces:**

- Consumes: Task 3's `EngineeringFrame` (`toGeodetic`, `definition.crs`) and `ProjApi.proj_factors`.
- Produces:
  - **`interface GridFactors`:**
    - `pointScale: number` (k);
    - `elevationFactor: number`, R/(R + h);
    - `combinedFactor: number`, k × elevationFactor;
    - `convergence: number`, radians: the angle from true north to grid north, positive east, as PROJ's `meridian_convergence`.
  - **`gridFactors(frame: EngineeringFrame, design: ArrayLike<number>): GridFactors`.**
    - It evaluates `proj_factors` on the projected CRS's base conversion (the projection, not the datum operation) at the point's geodetic longitude and latitude, on the CRS's own ellipsoid.
    - R is that ellipsoid's geometric-mean radius `sqrt(M·N)` at the latitude (R7).
    - A site scale doesn't enter here; the design result reports it separately.

- [ ] **Step 1: Extend the fixture.** For the Earth CRSs of Task 2, at the same points, record pyproj `Proj(crs).get_factors(lon, lat)` values: `meridional_scale`, `parallel_scale`, `meridian_convergence`, and the areal scale.
- [ ] **Step 2: Write the failing data test:**
  - `pointScale` matches pyproj's (the conformal scale) within 1e-12.
  - `convergence` matches within 1e-12 rad (degrees → radians).
  - `elevationFactor` at h = 0 is 1. At h = 1,000 m it is `R/(R+1000)` for the test's computed R.
  - At 100 km off the central meridian, the scale differs from the central meridian's by more than 1e-4 (Review Focus 3).
- [ ] **Step 3: Run** `npm run test:data` and confirm it fails.
- [ ] **Step 4: Implement** `factors.ts`.
- [ ] **Step 5: Run** `npm run test:data` and `npm test`, and confirm they pass.
- [ ] **Step 6: Commit** with "engineering: point scale, elevation and combined factors, and grid convergence".

### Task 5: Alignments

**Files:**

- Create:
  - `packages/next/src/engineering/alignment.ts`
  - `packages/next/src/engineering/fresnel.ts`
- Modify: `packages/next/src/index.ts`
- Test: `packages/next/test/alignment.test.ts`

**Interfaces:**

- Produces:
  - **`type HorizontalElement`** is one of:
    - `{ kind: "line"; length: number }`;
    - `{ kind: "arc"; length: number; radius: number }`, where a positive radius curves left and a negative one right;
    - `{ kind: "spiral"; length: number; startRadius: number; endRadius: number }`, a clothoid whose curvature changes linearly with arc length, with ±Infinity for a tangent end.

    Lengths and radii are in design units.
  - **`interface VerticalProfile`:**
    - `startStation: number`, `startElevation: number`;
    - `segments: readonly ({ kind: "grade"; length: number; grade: number } | { kind: "parabola"; length: number; startGrade: number; endGrade: number })[]`.
  - **`interface AlignmentDefinition`:**
    - `name: string`;
    - `start: [number, number]`, the design E, N;
    - `startAzimuth: number`, radians clockwise from grid north;
    - `startStation: number`;
    - `horizontal: readonly HorizontalElement[]`;
    - `vertical?: VerticalProfile`.
  - **`class Alignment`:**
    - `constructor(definition: AlignmentDefinition)`;
    - `readonly length: number`, `readonly endStation: number`;
    - `pointAt(station: number, offset?: number): Float64Array`, giving E, N, and elevation if there is a profile. Offset is positive to the right of the direction of travel;
    - `stationOffset(point: ArrayLike<number>): { station: number; offset: number; elevation?: number }`, where `elevation` is the profile's at that station;
    - `azimuthAt(station: number): number`;
    - `elevationAt(station: number): number`.
  - **`fresnel(t: number): [number, number]`**, giving C(t) and S(t) with the normalization ∫₀ᵗ cos(πu²/2) du (R8).

- [ ] **Step 1: Write the failing tests** in `test/alignment.test.ts`:
  - **`fresnel`.** It matches these reference values within 1e-13:

    | t | C(t) | S(t) |
    | --- | --- | --- |
    | 0.5 | 0.4923442258714464 | 0.06473243285999929 |
    | 1 | 0.7798934003768228 | 0.4382591473903548 |
    | 3 | 0.6057207892976856 | 0.4963129989673750 |
    | 10 | 0.4998986942055157 | 0.4681699785848822 |

    It is odd in t.
  - **A line, then an arc of radius 1,000 and length 500, then a line.**
    - `pointAt` at the arc's midpoint equals the analytic circle point within 1e-9.
    - `stationOffset` of points at offsets −12 and +12 recovers station and offset within 1e-9.
  - **A line, then a spiral (∞ → 800, length 200), then an arc of 800, then a spiral (800 → ∞), then a line.**
    - The azimuth is continuous at each join within 1e-12.
    - The position is continuous within 1e-9.
    - `stationOffset(pointAt(s, o)) = (s, o)` within 1e-9 for 200 seeded random (s, o) with |o| < 40, including s exactly at each join (Review Focus 5).
  - **The vertical profile.**
    - The parabola's elevation at its midpoint equals `E0 + g1·L/2 + (g2 − g1)·L/8`.
    - The grade is continuous at the joins.
  - **Ends and the centerline.**
    - A point before the start or after the end throws `/outside the alignment/` (Review Focus 5).
    - A point on the centerline has offset 0 within 1e-12.
- [ ] **Step 2: Run** `npx vitest run test/alignment.test.ts` and confirm it fails.
- [ ] **Step 3: Implement.**
  - **Clothoid points.** Each comes from Fresnel integrals in the element's local frame: scale `a = sqrt(L·R_end)` for a spiral from a tangent, and the general form for partial spirals.
  - **`stationOffset`.** For each element, project the point by solving for the foot of the perpendicular: closed form for lines and arcs, Newton on arc length for spirals, converging to 1e-12. Take the nearest valid foot; ties take the lower station (R8).
- [ ] **Step 4: Run** the test and `npm test`, and confirm they pass.
- [ ] **Step 5: Commit** with "engineering: alignments with lines, arcs, clothoid spirals and a vertical profile".

### Task 6: Measuring in design terms

**Files:**

- Modify:
  - `packages/next/src/measure/measure.ts`
  - `packages/next/src/measure/accuracy.ts`
  - `packages/next/src/engineering/EngineeringFrame.ts` (an optional `alignments` property)
  - `packages/next/src/index.ts`
- Test: `packages/next/test/data/designMeasure.test.ts`

**Interfaces:**

- Consumes:
  - Tasks 3–5.
  - Plan 3's `measure`, `Measurement` and `accuracyOf`.
  - `framePoint` and `Frames.bodyFixed`.
- Produces:
  - **`EngineeringFrameDefinition` gains `alignments?: readonly AlignmentDefinition[]`,** and `EngineeringFrame` gains `alignments: readonly Alignment[]`.
  - **`measure(a: FramePoint | DesignPoint, b: FramePoint | DesignPoint, instant, frames, options?)`.** A design point is converted to a point in `frames.bodyFixed(frame.body)` for every existing result.
  - **`Measurement.design?`** is present when both points are design points in the same engineering frame:
    - `unitName: string`, `metersPerUnit: number`;
    - `distance: number`, the 3D distance between the design coordinates, in design units: what a CAD tool reports;
    - `horizontalDistance: number`, in design units;
    - `delta: Float64Array`, the design-coordinate difference b − a;
    - `combinedFactor: { a: number; b: number; mean: number }`;
    - `convergence: { a: number; b: number }`.
  - **`Measurement.alignment?`** is present when the frame has alignments and `options.alignment` names one (`MeasureOptions.alignment?: string`): `{ name; a: { station; offset; elevation? }; b: { station; offset; elevation? } }`. It is computed on each design point's site-grid coordinates.
  - **`AccuracyTerm.source`** gains `"projection"` (R9). For each design end its size is `frame.operation.accuracy`, or undefined.

- [ ] **Step 1: Write the failing data tests** in `test/data/designMeasure.test.ts`, with real PROJ, Task 3's California frame, and an alignment on it:
  - **Distances.** For two design points 10,000 ft apart along grid east at the same elevation:
    - `design.distance` is 10,000 within 1e-9;
    - `horizontalDistance` is 10,000;
    - `delta` is [10,000, 0, 0];
    - the plan-3 `distance` (true, meters) equals 10,000 × 0.3048006096012192 / combinedFactor.mean within 0.01 m. That relates grid to ground; the 0.01 m is the departure from a mean factor over 3 km.
  - **Alignment.** `alignment.a` and `alignment.b` give the station and offset the `Alignment` gives for the same coordinates.
  - **Accuracy.** It includes a `projection` term for each end equal to the operation's accuracy. With `allowBallpark` and no grid, `meters` is undefined.
  - **Mixed points.** A design point measured to a plain ITRF point gives no `design` result and no error.
- [ ] **Step 2: Run** `npm run test:data` and confirm it fails.
- [ ] **Step 3: Implement.** `measure` keeps assembling and doesn't reimplement any math.
- [ ] **Step 4: Run** `npm run test:data` and `npm test`, and confirm they pass.
- [ ] **Step 5: Commit** with "measure: design distances, factors, alignment stations and a projection accuracy term".

### Task 7: Docs, the plan note and the carried-forward list

**Files:**

- Modify: `packages/next/README.md`, `CESIUM2_WEBGPU_PLAN.md` §13.14

- [ ] **Step 1: README.** Document:
  - engineering frames and the CRS reference shape (R3);
  - site transforms (R6);
  - recorded operations and missing grids (R2);
  - units (R5);
  - rigid placement;
  - grid factors (R7);
  - alignments;
  - design measurements;
  - the `projection` accuracy term;
  - where PROJ comes from (R1);
  - EPSG/IOGP and NOAA credits.
- [ ] **Step 2: Plan note.** Add the measured agreements to §13.14:
  - PROJ against pyproj;
  - round trips;
  - factors;
  - the rigid-placement sag at 10 km;
  - alignment recovery.

  Also add R1–R9 in one line each, and a "Carried forward" list of real deferred work from this plan's execution ledger, without nits. Do that before the ledger is deleted.
- [ ] **Step 3: Run the gates:** `npx tsc --noEmit -p .`, `npx eslint .`, `npm test`, `npm run test:data`, `snyk_code_scan` on `src/engineering` and `src/measure`, and `snyk_sca_scan` on packages/next.
- [ ] **Step 4: Commit** with "Plan: frames 4a results".
