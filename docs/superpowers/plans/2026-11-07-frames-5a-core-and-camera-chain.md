# Frames 5a: The Core, the Camera Chain and the Frames Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The owner chose subagent-driven execution: a fresh implementer per task, a fresh reviewer after each, and a whole-branch review at the end.

**Goal:** Make `packages/next` draw in one flat render space whose meaning is the view's rig's position reference frame, with anchors per body, a camera layer of rigs, an optional frames module behind a frame resolver, and the seams later sub-plans stand on, while every Earth-only scene renders the same pixels.

**Architecture:**

- **Anchors.** The transform table (`World.addTransform`) gains anchors: top-level transforms whose placement in render space is set per view. Children compose relative to their anchor, in float64, as today.
- **An eye per anchor.** Per view, the engine computes in float64 the eye's position in each anchor and the rotation from that anchor's axes to the view's *shading axes*, which are the axes of the view's body anchor (the Earth's). The cull kernel's camera-relative matrix (`cullTables.slang` `relativeMatrix`) is the one place that uses them. Everything that shades, culls, clamps or clips the Earth works with the camera expressed in the Earth's anchor, so a rig on GCRF draws the same Earth as a rig on ITRF.
- **The camera chain.** A core `FrameResolver` interface answers "where is reference frame A in B at this scene time". The core ships a resolver over its own transform table. A core `CameraLayer` holds one `Rig` per view, picks each view's render root, re-expresses the camera when the root changes, and places the anchors each tick. A core `SceneClock` interface carries scene time; the time library's `Clock` implements it.
- **The frames module** (`@cesium/next/frames`) implements the resolver over a catalog of reference frames built on demand. Analytic stand-ins cost nothing. Precise providers load through dynamic `import()` only when asked for. It binds the Earth's anchor to ITRF and hands the engine its sky inputs.
- **Entry points.** `@cesium/next`, `/time`, `/frames`, `/proj`, `/measure`, with a dependency rule an import-graph test enforces, and a generated surface map that every later sub-plan's review reads as a diff.
- **Seams.** Picks tagged with their reference frame through a pick interpreter. A coordinate service under engineering frames. A third placement mode, `hosted`. Per-vertex placements (dual position, fitted operation, blend) evaluated in Slang with float64 CPU twins. One query interface for rays. One seam each for per-draw constants, draw arguments and acceleration-structure lifetime, each with a bypass test.

**Tech Stack:** TypeScript (float64 on the CPU), Slang compiled to checked-in WGSL (`npm run shaders`), WebGPU, Vitest, the TypeScript compiler API (surface map), Vite (library build, dev server), Playwright (`bench/run.mjs`). No new npm dependencies.

**Spec:** `docs/superpowers/specs/2026-11-07-frames-5-earth-to-moon-design.md`. This plan builds sections 7 and 8 (sub-plan 5a and its continuation, the tessellation seam), section 15.2's surface-map tool, and the 5a rows of section 16. Sections 9 to 16 say what later sub-plans expect from 5a's seams; the Interfaces blocks below are shaped for them.

**Base:** `be3faf437a` (2026-11-07). Other agents had uncommitted edits in the checkout when this plan was written (the frames explorer's fingerprints and stress groups, `src/engineering/EngineeringFrame.ts`). Each task starts by checking `git status` for files it is about to change and waits for the owner of an uncommitted edit.

## Calls made by this plan

Each is marked "(plan's call)" where it is used. One line each, then what undoing it costs.

1. **The surface map is `packages/next/api/surface.txt`,** tab-separated (`entry`, `name`, `kind`, `tier`), one export a line, sorted. Namespace members are listed with dotted names (`vec3.add`). An export without a tier tag reads `-` until 5i tiers it. `widgets/index.ts` is mapped as the entry `widgets`. *Undo:* the script's output format.
2. **No file moves in 5a.** Layers are assigned by a table in the import-graph test, so the ERFA series and the EOP parser stay in `src/time/` but count as the frames layer. 5i decides the layout. *Undo:* none needed; moving files later only edits the table.
3. **Neutral modules:** `src/math/**`, `src/core/**` and `src/io/readWithProgress.ts` may be imported by every layer. *Undo:* the table.
4. **The import test counts `import type`,** because published declarations carry type imports. *Undo:* one flag.
5. **Physical constants move to `src/math/constants.ts`;** `src/measure/constants.ts` re-exports them. *Undo:* one module.
6. **The Moon's appearance constants** (`MOON_ALBEDO`, `moonPhaseBrightness`, `lommelSeeliger`) move to `src/atmosphere/moonLight.ts` in the core. `MOON_RADIUS` stays in `src/time/moon.ts`, read from `Ellipsoid.MOON`. *Undo:* one module.
7. **`Tileset3D` stops parsing the engineering-frame declaration.** It keeps `extensions`; the proj entry's `tilesetGeoreference(tileset)` reads and memoizes the declaration, adding any warning to `tileset.warnings` on first read. *Undo:* restores one dynamic import in the core, which the dependency rule forbids.
8. **The core owns `DesignPlacement`,** the part of 4b's `TilesetPlacement` a tileset and a pick need (mode, frame name, `displayed`, `designOf`, `displayError`). The proj entry's `TilesetPlacement` extends it. *Undo:* type-only.
9. **A route's revision is the sum of the revisions along it.** A drifting accuracy publishes when it moves by more than 1% or 1 mm; for an angular figure, 1 mm at the Earth's equatorial radius (about 0.16 nrad). *Undo:* two functions.
10. **Frame data loads by role** (`loadFrameRoles`). The Earth orientation provider loads the EOP table and leap seconds; the ephemeris provider loads the planets and Moon packs together, since `Ephemeris.fromPacks` takes both. *Undo:* `loadFrameData` is kept as the all-roles wrapper.
11. **Precision names:** `"analytic"` and `"precise"`. *Undo:* a type.
12. **The analytic stand-ins reproduce today's analytic sky.** The Sun's analytic edge puts it at the barycentre, stating the offset as its accuracy, and the Earth's places it from Meeus's Sun, so the Sun's direction from the Earth is exactly today's. MOON_ME's analytic accuracy is the largest difference from the lunar PCK over 2000 to 2050 that a data test measures, rounded up. *Undo:* stand-in definitions only.
13. **The catalog's precise edges share code with `createFrames`** (`src/frames/edges.ts`), so both trees agree to the bit. *Undo:* duplicate code.
14. **`FrameUnavailableError` is defined in the core** (`src/camera/frameResolver.ts`), so the camera layer can recognise "not ready" from any resolver. *Undo:* a class move.
15. **Scene seconds are UTC seconds since 1970** (`Clock.time / 1000`). `Clock.instant()` maps them through the leap-second table. Inside a leap second the mapping repeats a second, as UTC milliseconds do today. *Undo:* the mapping function.
16. **`SceneClock.change` is `"steady" | "jump" | "reverse"`.** *Undo:* a type.
17. **The anchor table has 32 slots per view.** Slot 0 is "no anchor", so a world holds 31 anchors. A transform's anchor slot rides in `Transform.flags` bits 8 to 15. *Undo:* a constant and a bit field.
18. **Shading axes are the view's body anchor's axes.** The per-anchor rotation goes to those axes, not to the eye's, and `View.viewProj` keeps the eye's rotation. With every anchor at the identity, every float the GPU reads is today's. *Undo:* multiply the eye rotation in, which changes every Earth pixel's rounding.
19. **Body anchors are made on first ask** (`World.bodyAnchor(body)`). `World.addDraw` and `World.addTransform` default to no anchor (render space, as today). Content classes (tilesets, the globe, vector layers, point sources, models, height captures) default to the Earth's anchor. *Undo:* defaults.
20. **`World.castRays` takes one anchor per cast** (`CastOptions.anchor`, default none). Clamping and `sampleHeightMostDetailed` pass the Earth's. *Undo:* one option.
21. **Tile selection gets one camera per anchor that has tilesets.** *Undo:* none; 5c needs it per body.
22. **`ViewLink` and the Viewer's camera operations work through the Earth's anchor.** *Undo:* local.
23. **`Engine.cameras` always exists.** The default rig is the transform table's root with a free orientation, and costs nothing per tick. *Undo:* make it opt-in.
24. **The camera layer runs inside the engine loop,** after the tick listeners and before change detection, and at the start of `renderFrame()` called outside the loop. It keeps the loop awake while the clock runs and a placement moved. *Undo:* one call site.
25. **Render space's origin is the rig's position reference frame's own origin.** *Undo:* one function.
26. **5a's `Rig` has no damping field;** 5d adds it. *Undo:* additive.
27. **The globe controls ignore input while the view's root isn't the Earth's anchor at the identity,** and warn once. 5d makes them per body. *Undo:* one guard.
28. **A resolver that throws or returns a non-finite matrix** leaves the view's last good placements in place and reports once per view and reference frame. *Undo:* local.
29. **The frames resolver places the table root and unbound anchors at the render root's origin.** *Undo:* one rule.
30. **Sky inputs stay in the Earth's anchor axes in 5a** (`attachSky`); 5e makes them per body. *Undo:* none needed.
31. **The IAU 2006/2000A X, Y and s are sampled on a 60 s grid of TT and interpolated linearly** (see "Rulings" 2). *Undo:* one cache.
32. **The Viewer imports the analytic catalog and `attachSky` statically;** the precise providers come in by dynamic `import()`. `dtdb` (TDB − TT) stays in the time library. *Undo:* import lines.
33. **Viewer warnings:** `Viewer.warnings`, a `warning` event, and one small notice over the view, designed in context. *Undo:* UI only.
34. **The re-rooting checks are one page,** `spikes/rerooting.html`. *Undo:* a page.
35. **`View.pickPosition` keeps returning the body anchor's coordinates** (Earth-fixed, as documented). The new `View.pickPoint` returns the render-space position with its anchor. *Undo:* none; both exist.
36. **`EngineeringFrame` stays in the proj entry,** built on the frames module's `CoordinateService` interface; the CRS data types it names move to `src/frames/coordinates.ts` and are re-exported from `src/engineering/crs.ts`. *Undo:* type moves.
37. **The per-draw constants seam is `src/render/drawConstants.ts`** (the only writer of draw records) and `drawRecord(index)` in Slang (the only reader). **The draw-arguments seam is `src/render/drawArguments.ts`;** a record's batch's argument slot is its pointer to indirect arguments, so no record word is added. *Undo:* module boundaries only.
38. **The query interface's 5a backends take rays in one anchor's coordinates.** Carrying rays through the frame tree is 5b's (section 9.5). *Undo:* additive.
39. **`terrainLineOfSight` becomes asynchronous,** answered through the query interface. *Undo:* a wrapper.
40. **A per-vertex placement's Slang function returns a model-space position,** applied before the custom vertex stage, so the draw's transform carries the large offset. *Undo:* where one call sits.
41. **The fitted operation is a polynomial of total order 3 or less in tile-local coordinates normalized by the tile's radius** (20 terms per axis). Its error bound is stated with its coefficients; its second-derivative bound is computed from them. The fitter is 5f's. *Undo:* a constant.
42. **Placement parameters are shared slots** (`World.createPlacementParameter`), so a morph writes one float a tick. Placements live in one new world storage buffer, bound in group 1 for the vertex stage only. *Undo:* layout.
43. **A blend is over `identity` and `fitted` only;** dual position is a blend in itself. *Undo:* additive.
44. **The design globe keeps fragment-only custom shaders** (tints, the ghost's alpha). Its vertex morph becomes the dual-position placement with `t = 1 − k(1 − t₀)` for exaggeration `k` and morph `t₀`. *Undo:* the example.
45. **The frames explorer and the design globe get their `Frames` from the Viewer's catalog** (`viewer.frames.tree()`). *Undo:* the examples.
46. **The gates:** "the parity pages" are the `parity`, `models`, `tileset`, `customShader`, `translucency`, `tracks` and `imagery` suites, plus `globe`, `heights` and `lod` when an ion token is set; "the bench gate" is the `alloc` suite. *Undo:* a list.

## Rulings on the spec

Places where the spec, read against the code, is contradictory or can't be built as written, and what this plan does.

1. **Which provider owns GCRF.** Section 7.7's table lists GCRF under Earth orientation, but in the tree (`src/frames/frames.ts`) GCRF's edge to ICRF is the ephemeris (IERS eq. 11.19), and the Earth orientation edge is ITRF's, from GCRF. *Ruling:* the Earth orientation provider owns ITRF's edge; the ephemeris provider owns GCRF, EARTH_ICRF, HCRS and MOON_ICRF; EME2000 and MOON_PA are constant and built in. "The sky asks for GCRF at analytic" is read as the GCRF–ITRF route at analytic.
2. **"60 s of TT, where the series change by far less than their stated accuracy"** (section 7.11). Held constant for 60 s, X and Y can move by about 0.1 mas (the fortnightly nutation terms), which is about the series' stated accuracy, not far less. *Ruling:* sample on a 60 s grid and interpolate linearly between the two samples around the instant; the error is under 1 µas. A test checks it.
3. **The dependency rule against today's imports.** `Tileset3D` imports the engineering-frame declaration reader; the core imports `src/time/moon.ts`; `src/frames/frames.ts` imports `src/measure/constants.ts`; `src/time/celestial.ts` imports the IAU 2006/2000A series; `Clock` imports `src/core/Emitter.ts`; `loadFrameData` imports `src/io/readWithProgress.ts`. *Ruling:* calls 3 and 5 to 8 above, and `icrfToFixed` keeps only its analytic model (its data branch already lives in `skyState`).
4. **Section 8.2 asks that a placement can be evaluated "at sample points the content never had".** A dual position exists only at the content's vertices. *Ruling:* the dual-position kind states `resamplable: false`; a later tessellator uses fitted operations. The placement query says so.
5. **Section 7.4's rotation "from the anchor's axes to the eye's".** Taken literally, every Earth pixel's float32 rounding changes. The section lets the builder choose another mechanism within the precision and cost rules. *Ruling:* call 18.
6. **"A globe-only Viewer bundle measures smaller by the ERFA tables."** `Instant` imports ERFA's TDB − TT series (about 34 KB), which is a time scale. *Ruling:* the measured saving is the X, Y and s series (about 83 KB), the pack readers and the EOP parser; `dtdb` stays (call 32).
7. **The animation core.** Section 7.7 places it in the core entry point; section 6 builds it in 5d. *Ruling:* 5d builds it; 5a ships only the clock interface it needs.

## Global Constraints

- **Precision** (spec section 4): "Float64 on the CPU throughout. The GPU sees only camera-relative values (hi/lo and camera-relative, §13.15). Hi/lo is valid to ±2³¹ m (about 2.1 million km), which covers Earth to Moon." Nothing large is ever rotated in float32.
- **Earth-only scenes are unchanged:** "The parity pages, the bench gate and every test keep passing. A globe-only scene renders the same pixels before and after 5a, within the gate's existing tolerances." This holds after every task, not only at the end.
- **Cost rule:** per-view work grows with the number of anchors, not the number of draws or tiles.
- **Pay for what you use:** a globe-only Viewer downloads nothing new, fetches no frames data and no Moon content, and does no new work per tick.
- **The dependency rule** (spec section 7.7): the core imports nothing from `frames`, `proj` or `measure`, and nothing from `time`. `time` imports nothing but the math module and the clock interface. `frames` imports `time` and core types only. `measure` imports `frames`. The Viewer and the widgets may import `time` without `frames`.
- **Browser only.** No server-side computation. Data lives outside the repo (`~/.cesium-bench/…`, `FRAMES_DATA_DIR`), fetched by `npm run setup`. Nothing new is committed or shipped.
- **No ion tokens** in the repo, builds, URLs, logs, storage or the DOM. The library never adds ion content on its own.
- **Examples are documentation:** public API only; where an example reaches past it, record it for 5i in the task's commit message.
- **Repository practice:**
  - Commands run in `packages/next`.
  - Commit locally and never push. End each message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  - Other agents share this checkout. Commit only your task's files, by path (`git add -- <paths>` then `git commit -m "…" -- <paths>`). Never `git add -A`, `git stash`, `git checkout`, `git reset` or `git push`. While `.git/index.lock` exists, wait and retry.
  - Slang for engine shaders (`src/**/*.slang`), compiled by `npm run shaders` into `src/shaders/generated/` (and `src/render/generated/`). Never edit generated output; `npm run shaders:check` must pass.
  - Node 24 (`engines`).
- **Testing cadence per task:** the task's focused tests (`npx vitest run <files>`; data tests `FRAMES_DATA=1 npx vitest run test/data/<file>`), `npx tsc --noEmit -p .`, and `npx eslint` and `npx prettier --check` on the changed files. A task that changes `World`, `View`, `Engine` or `Tileset3D` also runs `npm test` once. A task that changes `src/frames`, `src/time`, `src/ephemeris` or `src/engineering` also runs `npm run test:data`.
- **The surface map:** every task that changes an entry point's exports runs `npm run surface` and commits `api/surface.txt` with its code. The reviewer reads `git diff -- api/surface.txt` as the task's surface diff.
- **GPU safety:**
  - Prefer Node tests (`test/fakeGpu.ts`'s `fakeEngine`). A task says when it needs a browser check.
  - A browser check uses one small page at a time, on the port its task names (5191 to 5197), with the task's own server: `npx vite --port <port> --strictPort`, started in the background and stopped afterwards, or `BENCH_URL=http://127.0.0.1:<port> node bench/run.mjs <one suite>`. **Never** use, restart or stop the server on 127.0.0.1:5190.
  - Every shader loop is bounded by a constant (`for (uint i = 0u; i < CONSTANT; i++)` with an early `break`), and its Metal output is read with `node scripts/dumpMsl.mjs <module.wgsl> <entry>` before the first browser run.
- **Snyk:** each task runs `snyk_code_scan` on the first-party files it adds or changes before it commits, fixes what the scan finds in its own code, and rescans until clean. Task 22 scans the whole of 5a's code once more. Findings that predate 5a are reported, not fixed.
- **Wording:**
  - "Frame" is never used alone: a *reference frame*, a *tick* ("per tick", never "per frame"), *render space*, *render root*, *a draw's placement*, *coordinate operation*. Code names (`Frame`, `FrameData`) keep their names.
  - House style for docs, comments and UI text: plain, short sentences, units and datums named, no e-notation in prose.
  - Describe the purpose in generic words ("an embeddable rendering core", "a host application's own services").

## Review Focus

1. **A reference frame that isn't ready**, used as a rig's position reference frame or an anchor's binding: asked for at `"precise"` before its data arrives, a failed load, or an instant outside the data. Rendering falls back: a reference frame with a stand-in draws on it and states its wider accuracy; one without keeps the view's last good placement. The tick never throws, and one warning names the reference frame. Tests: Tasks 11 and 12.
2. **A clock that jumps or runs backward** while a rig sits on a moving reference frame (scrubbing years back, a negative rate). The next tick evaluates at the new time, with no placement left over from the old one, and a paused clock lets on-demand rendering settle. Test: Task 11.
3. **A pick read while the root moves** (a rig on GCRF with the clock at 3,600×). The pick's render-space position, anchor position and camera are all from the tick whose image was read, never mixed with a later tick's placements. Test: Task 15.
4. **Values past what the core holds:** a 32nd anchor, an eye more than 2³¹ m from an anchor, a non-finite matrix from a resolver, and a placement parameter or coefficient that is NaN or infinite. Each is refused with an error that names it, never drawn in the wrong place. Tests: Tasks 8, 9, 11 and 19.
5. **A host's own resolver or coordinate service that misbehaves:** it throws, returns NaN, or answers slowly and is aborted. The camera layer keeps the last good pose and reports once; `EngineeringFrame.load` rejects naming the engineering frame and caches nothing. Tests: Tasks 11 and 16.

---

## File structure

New files, by responsibility (modified files are listed in each task):

- **The surface map:** `scripts/surfaceMap.mjs` (+ `.d.mts`), `api/surface.txt`.
- **Entry points:** `src/time/index.ts`, `src/frames/index.ts`, `src/proj/index.ts` (re-exports `src/engineering`), `src/measure/index.ts`; `src/math/constants.ts`; `src/atmosphere/moonLight.ts`; `src/streaming/designPlacement.ts`.
- **The clock interface:** `src/core/sceneClock.ts`.
- **The camera layer (core):** `src/camera/frameResolver.ts` (interfaces, `FrameUnavailableError`), `src/camera/tableResolver.ts`, `src/camera/rig.ts`, `src/camera/CameraLayer.ts`.
- **Anchors (core):** in `src/scene/World.ts` and `src/scene/View.ts`; `src/scene/anchorEyes.ts` (per view and anchor, float64); the `AnchorEye` struct in `src/shaders/common.slang`.
- **The frames module:** `src/frames/catalog.ts`, `src/frames/edges.ts`, `src/frames/analytic.ts`, `src/frames/lunarConstants.ts`, `src/frames/providers/earthOrientation.ts`, `src/frames/providers/ephemeris.ts`, `src/frames/resolver.ts`, `src/frames/attachSky.ts`, `src/frames/pickInterpreter.ts`, `src/frames/coordinates.ts`, `src/frames/placementQuery.ts`.
- **Picks (core):** `src/scene/pick.ts`.
- **The PROJ coordinate service:** `src/engineering/projCoordinates.ts`.
- **WebGPU seams:** `src/render/drawConstants.ts`, `src/render/drawArguments.ts`, `src/streaming/acceleration.ts`, `src/query/queries.ts`, `src/query/terrainBackend.ts`, `src/query/drawBackend.ts`.
- **Placements:** `src/scene/placement.ts` (kinds, CPU twins, bounds), `src/shaders/placement.slang`.
- **Checks:** `scripts/checkBundle.mjs`, `spikes/rerooting.html`, `spikes/rerooting.ts`, `spikes/placement.html`, `spikes/placement.ts`.

---

### Task 1: The surface map for 5i

**Files:**

- Create: `scripts/surfaceMap.mjs`, `scripts/surfaceMap.d.mts`, `api/surface.txt`, `test/surfaceMap.test.ts`, `test/fixtures/surface/entry.ts`
- Modify: `package.json` (script `surface`)

**Interfaces:**

- Produces:
  - `surfaceLines(options?: { root?: string; entries?: Record<string, string> }): string[]`, exported from `scripts/surfaceMap.mjs`. Without `entries`, it reads `package.json` `exports` (key `.` is entry `.`, `./time` is `time`, and so on) plus `widgets: "widgets/index.ts"` (plan's call 1). The first line is the header `entry\tname\tkind\ttier`; the rest are sorted by entry, then name.
  - Kinds: `class`, `interface`, `type`, `function`, `const`, `enum`, `namespace`; a namespace's members follow as `ns.member` with their own kinds.
  - Tiers: `stable`, `experimental` or `internal`, from the declaration's TSDoc tags (`@stable`, `@experimental`, `@internal`); `-` without one.
  - `node scripts/surfaceMap.mjs --write` writes `api/surface.txt`; `npm run surface` runs it.

- [ ] **Step 1: Write the failing test** (`test/surfaceMap.test.ts`):

```ts
import { readFileSync } from "node:fs";
import { surfaceLines } from "../scripts/surfaceMap.mjs";

it("the checked-in surface map matches the entry points (run `npm run surface`)", () => {
  expect(`${surfaceLines().join("\n")}\n`).toBe(
    readFileSync("api/surface.txt", "utf8"),
  );
});
it("lists each export with its entry, kind and tier", () => {
  const lines = surfaceLines();
  expect(lines[0]).toBe("entry\tname\tkind\ttier");
  expect(lines).toContain(".\tEngine\tclass\t-");
  expect(lines).toContain(".\tvec3.add\tfunction\t-");
  expect(lines).toContain("widgets\tViewer\tclass\t-");
});
it("reads tiers from TSDoc tags", () => {
  const lines = surfaceLines({ entries: { fixture: "test/fixtures/surface/entry.ts" } });
  expect(lines).toEqual([
    "entry\tname\tkind\ttier",
    "fixture\tExperimental\tinterface\texperimental",
    "fixture\tHidden\tconst\tinternal",
    "fixture\tStable\tfunction\tstable",
    "fixture\tUntiered\ttype\t-",
  ]);
});
```

The fixture declares those four exports with the matching tags.

- [ ] **Step 2: Run** `npx vitest run test/surfaceMap.test.ts` and confirm it fails (no script).
- [ ] **Step 3: Implement** `scripts/surfaceMap.mjs` with `ts.createProgram` over the entries (the repo's `tsconfig.json` options, `noEmit`), `checker.getExportsOfModule`, aliases resolved, kind from symbol flags, tier from `ts.getJSDocTags` on the first declaration. Generate `api/surface.txt`.
- [ ] **Step 4: Run** the test and confirm it passes; then `npx tsc --noEmit -p .`, eslint and prettier on the new files.
- [ ] **Step 5: Commit** `scripts/surfaceMap.mjs scripts/surfaceMap.d.mts api/surface.txt test/surfaceMap.test.ts test/fixtures/surface/entry.ts package.json` with "api: a generated surface map, checked in CI (for the API review)".

### Task 2: Entry points and the dependency rule

**Files:**

- Create: `src/time/index.ts`, `src/frames/index.ts`, `src/proj/index.ts`, `src/measure/index.ts`, `src/math/constants.ts`, `src/atmosphere/moonLight.ts`, `src/streaming/designPlacement.ts`, `test/importBoundary.test.ts`
- Modify:
  - `src/index.ts` (keeps only core exports);
  - `package.json` (`exports`, `build:lib`), `vite.lib.config.ts` (five inputs), `scripts/checkDeclarations.mjs` (several index files);
  - `src/measure/constants.ts` (re-exports), `src/frames/frames.ts`, `src/time/moon.ts`, `src/time/celestial.ts`, `src/scene/Engine.ts`, `src/atmosphere/Sky.ts`;
  - `src/streaming/Tileset3D.ts`, `src/engineering/placement.ts`, `src/engineering/georeferenceTileset.ts`;
  - every importer of a moved name from `src/index.ts` (`widgets/*.ts`, `demo/`, `bench/`, `parity/`, `spikes/`, `examples/`, `test/engineeringExports.test.ts`);
  - `test/tilesetPlacement.test.ts`, `test/data/georeferenceTileset.test.ts`, `api/surface.txt`.

**Interfaces:**

- Consumes: Task 1's `surfaceLines`.
- Produces:
  - `package.json` `exports`: `"."`, `"./time"`, `"./frames"`, `"./proj"`, `"./measure"`, each to its `index.ts`.
  - **The layers** (plan's calls 2 to 4), as a table in `test/importBoundary.test.ts`:
    - neutral: `src/math/**`, `src/core/**`, `src/io/readWithProgress.ts`;
    - time: `src/time/{Instant,leapSeconds,leapTable,Clock,sun,moon,celestial,index}.ts`, `src/time/erfa/{dtdb,dtdbTable}.ts`;
    - frames: `src/frames/**`, the rest of `src/time/**`, `src/ephemeris/**`, `src/trajectory/**`;
    - proj: `src/engineering/**`, `src/proj/**`;
    - measure: `src/measure/**`;
    - widgets: `widgets/**`;
    - core: the rest of `src/**`.
  - **The rules:** core → core, neutral. time → time, neutral. frames → frames, time, neutral, core `import type` of anything, and core values only from `src/scene/Body.ts` and `src/camera/frameResolver.ts`. proj → proj, frames, time, core, neutral. measure → measure, proj, frames, time, core, neutral. widgets → anything, except that `widgets/timeControls.ts`'s transitive closure contains no frames file. Each entry index re-exports only its own layer and neutral modules.
  - `src/math/constants.ts`: `C`, `GM_SUN`, `GM_EARTH`, `GM_MOON`, `L_C`, `EARTH_ROTATION_RATE` (plan's call 5).
  - `src/atmosphere/moonLight.ts`: `MOON_ALBEDO`, `moonPhaseBrightness`, `lommelSeeliger` (plan's call 6); `src/time/moon.ts` keeps `MOON_RADIUS = Ellipsoid.MOON.maximumRadius`, `moonPosition`, `moonAxes`.
  - `icrfToFixed(ms: number, out?: Float64Array): Float64Array`: the analytic model only (ruling 3).
  - `src/streaming/designPlacement.ts`: `type PlacementMode = "rigid" | "reprojected"`; `interface DesignPlacement { readonly mode: PlacementMode; readonly frameName: string; displayed(design, out?): Float64Array; designOf(position, out?): Float64Array; displayError(design): number }`. `Tileset3D.placement?: DesignPlacement`, `TilesetOptions.placement?: DesignPlacement`. The proj entry's `TilesetPlacement extends DesignPlacement` with `frame: EngineeringFrame` and `rigid?: RigidPlacement` (plan's call 8).
  - `tilesetGeoreference(tileset: Tileset3D): TilesetGeoreference | undefined` in `src/engineering/georeferenceTileset.ts`, memoized per tileset; `Tileset3D.georeference` is removed (plan's call 7).
  - The time entry exports `Instant`, `LeapSeconds`, `Clock`, `ClockMode`, `tdbMinusTt`, `icrfToFixed`, `sunDirection`, `sunElevation`, `sunTimes`, `SunTimes`, `julianDate`, `greenwichSiderealTime`, `moonPosition`, `moonAxes`, `MOON_RADIUS`. The frames entry exports everything about reference frames, ephemerides, Earth orientation, trajectories and the sky that `src/index.ts` exports today. The proj entry exports everything from `src/engineering`. The measure entry exports `src/measure`'s names, the constants included.

- [ ] **Step 1: Write the failing test** (`test/importBoundary.test.ts`). It reads every `.ts` file under `src/` and `widgets/`, collects static `import`/`export … from` specifiers (type-only included) and dynamic `import("…")` strings, resolves relative paths, classifies both ends, and lists each broken rule as `"<from> → <to>"`:

```ts
it("the core imports nothing from time, frames, proj or measure", () => {
  expect(violations("core")).toEqual([]);
});
it("time imports only time and neutral modules", () => expect(violations("time")).toEqual([]));
it("frames imports time, neutral modules, core types, Body and the resolver", () =>
  expect(violations("frames")).toEqual([]));
it("proj and measure follow their rules", () => {
  expect(violations("proj")).toEqual([]);
  expect(violations("measure")).toEqual([]);
});
it("the time controls reach time without frames", () =>
  expect(closure("widgets/timeControls.ts").filter((f) => layerOf(f) === "frames")).toEqual([]));
it("each entry re-exports only its own layer", () => expect(entryLeaks()).toEqual([]));
it("package.json exports the five entry points", () =>
  expect(Object.keys(pkg.exports)).toEqual([".", "./time", "./frames", "./proj", "./measure"]));
```

- [ ] **Step 2: Run** it and confirm it fails, listing today's violations (among them `src/frames/frames.ts → src/measure/constants.ts`, `src/streaming/Tileset3D.ts → src/engineering/georeference.ts`, `src/scene/Engine.ts → src/time/moon.ts`, `src/time/celestial.ts → src/time/earthOrientation.ts`).
- [ ] **Step 3: Fix each violation** as the Interfaces block says. Move `skyState`'s callers that passed `data` to `icrfToFixed` onto `skyState` (grep `icrfToFixed(` for a third argument). Update `test/tilesetPlacement.test.ts`'s declaration tests to read `tilesetGeoreference(tileset)`; a malformed declaration now warns on that first read, and the load still succeeds.
- [ ] **Step 4: Split the exports.** Write the four entry indexes; cut their names from `src/index.ts`; repoint each importer of a moved name (grep for the moved names in the files listed above). Add the inputs `cesium-next`, `cesium-next-time`, `cesium-next-frames`, `cesium-next-proj`, `cesium-next-measure` to `vite.lib.config.ts`. Make `build:lib` run `checkDeclarations.mjs --only engineering,measure` on `dist-lib/types/proj/index.d.ts` and `dist-lib/types/measure/index.d.ts`, the scope 4b audited.
- [ ] **Step 5: Run** the boundary test and confirm it passes; then `npm test`, `npm run test:data`, `npx tsc --noEmit -p .`, `npm run build:lib`, eslint and prettier on the changed files.
- [ ] **Step 6: Surface and commit.** `npm run surface`; commit the files above with "next: entry points (core, time, frames, proj, measure) and an import-graph test for the dependency rule".

### Task 3: Revisions of reference frames

**Files:**

- Modify: `src/frames/Frame.ts`, `src/frames/index.ts`, `api/surface.txt`
- Test: `test/frameRevision.test.ts`

**Interfaces:**

- Produces (on `Frame`):
  - `readonly revision: number`, starting at 0;
  - `invalidate(): void`, which bumps `revision` and drops the cached matrix. A cached reference frame's entry is keyed by `(instant.tt, revision)`. `cache: false` stays for compatibility.
  - `publishedAccuracy(instant: Instant): Readonly<FrameAccuracy>`: the last published figure, replaced (and `revision` bumped) only when the new one differs by more than 1% of the figure or 1 mm, whichever is larger; for `radians`, 1 mm at 6,378,137 m (plan's call 9). A change of kind (metres to radians, stated to not stated) always publishes.
  - `routeRevision(from: Frame, to: Frame): number` in `Frame.ts`: the sum of `revision` over every reference frame on the route through the lowest common ancestor (plan's call 9).

- [ ] **Step 1: Write the failing test:**

```ts
it("revision goes up on invalidate, not with time", () => {
  const f = new Frame("F", root, (_i, out) => identity(out));
  f.toParent(Instant.fromTt(0)); f.toParent(Instant.fromTt(60));
  expect(f.revision).toBe(0);
  f.invalidate();
  expect(f.revision).toBe(1);
});
it("a cached reference frame recomputes after invalidate at the same instant", () => {
  let calls = 0;
  const f = new Frame("F", root, (_i, out) => { calls++; identity(out); });
  const at = Instant.fromTt(0);
  f.toParent(at); f.toParent(at); f.invalidate(); f.toParent(at);
  expect(calls).toBe(2);
});
it("a route's revision sums the revisions along it", () => {
  a.invalidate(); b.invalidate(); b.invalidate();
  expect(routeRevision(a, b)).toBe(3); // a and b are siblings under root
});
it("publishes a drifting accuracy only past 1% or 1 mm", () => {
  // metres: 0.100 → 0.1009 keeps 0.100; → 0.1011 publishes
  // radians: 1e-9 → 1.1e-9 publishes (1 mm at the equator is 1.57e-10 rad)
});
```

- [ ] **Step 2: Run** `npx vitest run test/frameRevision.test.ts` and confirm it fails.
- [ ] **Step 3: Implement** in `Frame.ts`.
- [ ] **Step 4: Run** the test, `npm run test:data` (the tree's numbers must not move), tsc, eslint, prettier.
- [ ] **Step 5: Surface and commit** with "frames: a revision per reference frame, invalidate(), route revisions and published accuracy".

### Task 4: One ENU convention, and the stress context's frames getter

**Files:**

- Modify: `src/frames/local.ts`, `examples/frames-explorer/stress/runner.ts`, `examples/frames-explorer/fingerprints.json` (only if a value moves)
- Test: `test/frames.test.ts`, `test/framesExplorerRunner.test.ts`

**Interfaces:**

- Produces: `eastNorthUpFrame` takes "up" along the ellipsoid's geodetic normal at the position's foot (the normal through its cartographic latitude), as body-fixed frames do. Its doc comment says so and gives the change: about 0.13 µrad at 250 m (spec section 7.11).
- Produces: the stress runner's `ctx.frames` getter is enumerable. Reading it in a case that didn't declare the `frames` need still throws its named error.

- [ ] **Step 1: Write the failing tests:**
  - `eastNorthUpFrame` at a point 250 m above 40° N: its up axis equals `ellipsoid.geodeticSurfaceNormalCartographic(cartographic)` within `1e-15` per component, and differs from `geodeticSurfaceNormal(position)` by 0.13 ± 0.05 µrad.
  - `Object.keys(ctx)` includes `"frames"` for a case with the need; spreading the context of a case without it throws the named error.
- [ ] **Step 2: Run** them and confirm they fail.
- [ ] **Step 3: Implement.** Then run `npm run test:data`; if an explorer fingerprint moves, update `fingerprints.json` and list each moved value in the commit message.
- [ ] **Step 4: Run** the tests, tsc, eslint, prettier.
- [ ] **Step 5: Commit** with "frames: one ENU convention (up at the foot); the stress context's frames getter is enumerable".

### Task 5: Frame data by role, cancellable, with a capped buffer

**Files:**

- Modify: `src/ephemeris/loadFrameData.ts`, `src/io/readWithProgress.ts`, `src/frames/index.ts`, `api/surface.txt`
- Test: `test/loadFrameData.test.ts`, `test/readWithProgress.test.ts`

**Interfaces:**

- Produces:
  - `type FrameDataRole = "planets" | "moon" | "eop" | "leapSeconds"`.
  - `loadFrameRoles(baseUrl: string, roles: readonly FrameDataRole[], options?: { signal?: AbortSignal; onProgress?: LoadProgress }): Promise<Partial<Record<FrameDataRole, ArrayBuffer>>>`: one manifest fetch, then only the asked roles' files, each checked against its SHA-256 as today (plan's call 10).
  - `loadFrameData(baseUrl?: string, options?: { signal?: AbortSignal; onProgress?: LoadProgress } | LoadProgress): Promise<FrameData>`: every role, through `loadFrameRoles`. A bare `LoadProgress` second argument still works.
  - Abort rejects with the signal's reason (a `DOMException` named `AbortError` by default) and starts no further fetch.
  - `readWithProgress` trusts a `Content-Length` up to 64 MB (`READ_PREALLOCATE_LIMIT = 64 * 1024 * 1024`) and grows its buffer beyond that.

- [ ] **Step 1: Write the failing tests** (stubbed `fetch`):
  - `loadFrameRoles(base, ["eop"])` fetches the manifest and the EOP file only;
  - aborting during the planets fetch rejects with `AbortError`, and no later fetch starts;
  - a response that claims a `Content-Length` of 1 TB with 10 bytes of body preallocates no more than 64 MB and returns the 10 bytes; one that claims 1,000 bytes and sends 1,000 reads into one buffer, as today.
- [ ] **Step 2: Run** them and confirm they fail.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the tests, `npm run test:data`, tsc, eslint, prettier.
- [ ] **Step 5: Surface and commit** with "ephemeris: frame data by role, cancellable; readWithProgress caps its preallocation at 64 MB".

### Task 6: The catalog, providers on demand and stand-ins

**Files:**

- Create: `src/frames/catalog.ts`, `src/frames/edges.ts`, `src/frames/analytic.ts`, `src/frames/lunarConstants.ts`, `src/frames/providers/earthOrientation.ts`, `src/frames/providers/ephemeris.ts`, `src/camera/frameResolver.ts` (only `FrameUnavailableError` and `FrameKey` here; Task 11 adds the rest)
- Modify: `src/frames/frames.ts` (built on `edges.ts`), `src/ephemeris/Ephemeris.ts` (re-exports `MOON_PA_TO_ME` from `lunarConstants.ts`), `src/time/sun.ts` (adds `sunPosition`), `src/frames/index.ts`, `api/surface.txt`
- Test: `test/frameCatalog.test.ts`, `test/data/frameCatalog.test.ts`

**Interfaces:**

- Consumes: Task 3 (`revision`, `invalidate`), Task 5 (`loadFrameRoles`).
- Produces:
  - In `src/camera/frameResolver.ts` (core): `interface FrameKey { readonly name: string }` (a `Frame` satisfies it); `class FrameUnavailableError extends Error { readonly frame: string; readonly reason: "loading" | "failed" | "outsideData" }` (plan's call 14).
  - `sunPosition(ms: number, out: Vec3): Vec3` in `src/time/sun.ts`: Meeus's Sun from the Earth's centre, metres, in ICRF axes (`sunDirection`'s direction turned back by `icrfToFixed(ms)ᵀ`, times Meeus's distance).
  - `src/frames/edges.ts`: the precise edge functions `createFrames` uses today, one per reference frame (`gcrfEdge(data)`, `itrfEdge(data)`, `bodyEdge(name, data)`, `moonMeEdge(data)`), each `(instant: Instant, out: Mat4) => void` (plan's call 13). `createFrames` builds its tree from them, with unchanged numbers.
  - `src/frames/analytic.ts`: the stand-in edge for each reference frame that has one, with its stated accuracy (plan's call 12):
    - ITRF from GCRF: `icrfToFixed`'s rotation; 0.0023° (about 8″) from the IAU 2006/2000A model, as plan 1 measured;
    - HCRS at the barycentre (identity to ICRF), stating the Sun–barycentre offset (about 2.2 million km at most) as its accuracy;
    - GCRF and EARTH_ICRF translated by `−sunPosition` from HCRS (the Earth from Meeus's Sun), so the Sun's direction from the Earth is exactly `sunDirection`'s;
    - MOON_ICRF translated by `moonPosition` from GCRF, about 10″ (some 20 km at the Moon);
    - MOON_ME rotated by `moonAxes`, at the accuracy Step 1's data test measures, rounded up;
    - EME2000 and MOON_PA: constant, built in (`frameBias`, `MOON_PA_TO_ME`).
  - `src/frames/catalog.ts`:
    - `type CatalogFrameName = "ICRF" | "HCRS" | "GCRF" | "EARTH_ICRF" | "EME2000" | "MOON_ICRF" | "ITRF" | "MOON_ME" | "MOON_PA"`;
    - `type Precision = "analytic" | "precise"` (plan's call 11);
    - `type FrameUser = "application" | "sky" | "rig" | "measurement"`;
    - `interface FrameCatalogOptions { data?: string | FrameData; signal?: AbortSignal; onProgress?: LoadProgress }` (a URL is a frames store; default `"/frames-data/"`);
    - `createFrameCatalog(options?: FrameCatalogOptions): FrameCatalog`;
    - `interface FrameCatalog`:
      - `readonly names: readonly CatalogFrameName[]` (no loading);
      - `get(name: CatalogFrameName, options?: { precision?: Precision; user?: FrameUser }): Frame`: the reference frame, built on first ask. It runs at the highest precision anyone has asked for. Asking `"precise"` starts its provider's load; while it loads, a reference frame with a stand-in runs on it, stating the stand-in's accuracy, and its `revision` goes up when the data arrives. A reference frame without one throws `FrameUnavailableError` (`reason: "loading"`) until then;
      - `precisionOf(name): Precision`: what it runs at now;
      - `ready(name, precision, options?: { signal?: AbortSignal }): Promise<void>`;
      - `add(frame: Frame, user?: FrameUser): void` (an application's reference frame, such as an engineering frame or a trajectory's), and `use(frame: Frame, user: FrameUser): void`;
      - `treeInUse(): readonly { frame: Frame; users: readonly FrameUser[]; precision: Precision; standIn: boolean }[]`: the frames used and their ancestors, root first; the root stays ICRF;
      - `bodyFixed(body: Body): Frame`, `bodyOf(frame: Frame): Body | undefined`;
      - `tree(): Promise<Frames>`: every built-in reference frame at `"precise"`, as the `Frames` shape `createFrames` returns;
      - `readonly leapSeconds: LeapSeconds` (the store's once loaded, else the built-in table);
      - `readonly warnings: readonly FrameDataWarning[]`, and `readonly events: Emitter<{ change: FrameCatalog; warning: FrameDataWarning }>`.
    - A failed load keeps the stand-in (or the reference frame unavailable, with `reason: "failed"`) and emits one warning naming the reference frame and the cause.
  - The providers' modules are reached only by dynamic `import("./providers/…")` from `catalog.ts`.

- [ ] **Step 1: Write the failing tests:**
  - Node (`test/frameCatalog.test.ts`, stubbed `fetch`):

```ts
it("names every built-in reference frame without loading anything", () => {
  const catalog = createFrameCatalog({ data: BASE });
  expect(catalog.names).toContain("MOON_ME");
  expect(fetchCalls()).toEqual([]);
});
it("an analytic ask loads nothing and reproduces today's analytic sky", () => {
  // for 100 instants 2000–2050: ITRF→ICRF rotation, the Sun's direction and
  // the Moon's position and axes in ITRF equal skyState(ms, undefined)'s within 1e-12 (relative)
  expect(fetchCalls()).toEqual([]);
});
it("a precise ask runs on the stand-in while loading, then bumps the revision", async () => {
  const itrf = catalog.get("ITRF", { precision: "precise" });
  expect(catalog.precisionOf("ITRF")).toBe("analytic");
  expect(itrf.accuracy(at).radians).toBeCloseTo((0.0023 * Math.PI) / 180, 6);
  const before = itrf.revision;
  await catalog.ready("ITRF", "precise");
  expect(itrf.revision).toBeGreaterThan(before);
});
it("a reference frame with no stand-in throws FrameUnavailableError until its data loads", ...); // an added trajectory's
it("runs at the highest precision anyone asked for", ...);
it("lists the tree in use with its users and ancestors", ...);
it("a failed load keeps the stand-in and warns once, naming the reference frame", ...);
it("the Earth orientation provider fetches only the EOP and leap-second files", ...);
```

  Data (`test/data/frameCatalog.test.ts`): at 20 instants inside the store's span, every catalog reference frame at `"precise"` equals `createFrames(data)`'s `frameTransform` to ICRF exactly (`toEqual` on the Float64Arrays); MOON_ME's analytic orientation differs from the PCK's by no more than its stated accuracy over 2000 to 2050 (sampled daily).

- [ ] **Step 2: Run** them and confirm they fail.
- [ ] **Step 3: Implement** `lunarConstants.ts`, `edges.ts` (and rebuild `createFrames` on it), `analytic.ts`, the providers, then the catalog.
- [ ] **Step 4: Run** the tests, `npm run test:data` (the explorer's numbers must not move), the boundary test, tsc, eslint, prettier.
- [ ] **Step 5: Surface and commit** with "frames: a catalog of reference frames built on demand, with analytic stand-ins and lazy precise providers".

### Task 7: The scene clock interface

**Files:**

- Create: `src/core/sceneClock.ts`
- Modify: `src/time/Clock.ts`, `src/index.ts`, `src/time/index.ts`, `api/surface.txt`
- Test: `test/sceneClock.test.ts`

**Interfaces:**

- Produces:
  - `interface SceneClock { readonly seconds: number; readonly rate: number; readonly paused: boolean; readonly change: ClockChange; watch(listener: () => void): () => void }` and `type ClockChange = "steady" | "jump" | "reverse"` (plan's call 16), exported from the core entry.
  - `Clock implements SceneClock`: `seconds = time / 1000` (plan's call 15); `paused` is `mode === "paused"`; `change` is `"jump"` after a `time` set or a mode change to live, `"reverse"` after a tick with a negative rate, `"steady"` otherwise.
  - `Clock.leapSeconds: LeapSeconds` (default `LeapSeconds.builtIn()`, settable) and `Clock.instant(seconds = this.seconds): Instant`.

- [ ] **Step 1: Write the failing test:**

```ts
it("Clock is a SceneClock", () => {
  const clock: SceneClock = new Clock({ time: Date.UTC(2026, 3, 2), rate: 60 });
  expect(clock.seconds).toBe(Date.UTC(2026, 3, 2) / 1000);
  expect(clock.paused).toBe(true);
});
it("says how time last changed", () => {
  clock.mode = "playing"; clock.tick(0); clock.tick(16);
  expect(clock.change).toBe("steady");
  clock.time = 0; expect(clock.change).toBe("jump");
  clock.rate = -60; clock.tick(32); clock.tick(48); expect(clock.change).toBe("reverse");
});
it("turns scene seconds into an Instant through its leap table", () =>
  expect(clock.instant(s).tt).toBe(Instant.fromUtc(s * 1000, LeapSeconds.builtIn()).tt));
it("watch calls once per change and its remover stops it", ...);
```

- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the test, the boundary test (time imports only `src/core/`), tsc, eslint, prettier.
- [ ] **Step 5: Surface and commit** with "core: the scene clock interface; the time library's Clock implements it".

### Task 8: Anchors in the transform table

**Files:**

- Modify: `src/scene/World.ts`, `src/scene/View.ts`, `src/render/layout.ts` (`MAX_ANCHORS`), `src/index.ts`, `api/surface.txt`
- Test: `test/anchors.test.ts`

**Interfaces:**

- Consumes: Task 6's `FrameKey`.
- Produces:
  - `MAX_ANCHORS = 32` in `src/render/layout.ts`: slots per view, slot 0 being "no anchor", so a world holds 31 anchors (plan's call 17).
  - `interface AnchorHandle extends TransformHandle, FrameKey { readonly slot: number; readonly body?: Body }`.
  - On `World`:
    - `readonly root: FrameKey` (`{ name: "transform table" }`): the table's own top level, where draws under no anchor sit;
    - `addAnchor(name: string, options?: { body?: Body }): AnchorHandle`: a top-level transform whose local matrix is the identity, forever. A 32nd throws `CapacityError("anchor table")`;
    - `bodyAnchor(body: Body): AnchorHandle`: one anchor per body (by `name` and `naifId`), made on first ask (plan's call 19);
    - `readonly anchors: readonly AnchorHandle[]`;
    - `anchorOf(handle: TransformHandle): AnchorHandle | undefined`;
    - `placeAnchor(anchor: AnchorHandle, matrix: ArrayLike<number>): void` and `anchorMatrix(anchor, out?): Float64Array`: the anchor's place in the table root, for the core's own resolver (default identity);
    - `frameOf(handle: TransformHandle, name: string): FrameKey`: a transform node as a reference frame a rig can name; the same key for the same handle (memoized), carrying its world and handle;
    - `removeAnchor(anchor)`: throws, naming the anchor, while any transform hangs under it;
    - `DrawOptions.parent?: TransformHandle`: a draw that owns its transform (`origin`, `model`) hangs it under `parent`;
    - `worldMatrix` and `drawMatrix` are documented as relative to the transform's anchor (or the table root). With every anchor at the identity they return today's numbers.
  - On `View`:
    - `anchorPlacement(anchor: AnchorHandle | undefined, out?): Float64Array`: render space ← anchor for this view (identity until set; `undefined` is no anchor);
    - `setAnchorPlacement(anchor: AnchorHandle | undefined, matrix: ArrayLike<number>): void`: refuses a non-finite or non-rigid matrix (a rotation's columns orthonormal within `1e-9`) with an error naming the anchor; bumps `anchorRevision` only when a value changes, and wakes the engine;
    - `readonly anchorRevision: number`;
    - `readonly bodyAnchor: AnchorHandle | undefined`: `world.bodyAnchor(body)` if the world has made it;
    - `anchorCamera(anchor: AnchorHandle | undefined, out?: Camera): Camera`: the camera re-expressed in the anchor;
    - `setCameraFromAnchor(anchor: AnchorHandle | undefined, pose: CameraPose): void`: the inverse, written into `view.camera`;
    - `toPixel(position: ArrayLike<number>, anchor = this.bodyAnchor): Float64Array | undefined`.
  - Placements set here are stored, but not drawn until Task 9.

- [ ] **Step 1: Write the failing test** (`fakeEngine`):

```ts
it("a transform under an anchor composes relative to it", () => {
  const earth = world.bodyAnchor(EARTH);
  const t = world.addTransform(translation(1, 2, 3), earth);
  expect(world.worldMatrix(t)).toEqual(translation(1, 2, 3));
  expect(world.anchorOf(t)).toBe(earth);
});
it("a draw's parent hangs its own transform under an anchor", ...);
it("bodyAnchor makes one anchor per body, on first ask", ...);
it("view placements default to identity; a change bumps anchorRevision once", ...);
it("anchorCamera and setCameraFromAnchor invert each other to 1e-9 m at 400,000 km", ...);
it("refuses a 32nd anchor, a non-rigid placement, and removing an anchor with content", () => {
  for (let i = 0; i < 31; i++) world.addAnchor(`a${i}`);
  expect(() => world.addAnchor("one too many")).toThrow(/anchor table/);   // Review Focus 4
});
it("toPixel takes an anchor", ...);
```

- [ ] **Step 2: Run** `npx vitest run test/anchors.test.ts` and confirm it fails.
- [ ] **Step 3: Implement.** The anchor's slot is stored per transform (`transformAnchor: Uint8Array`, inherited from the parent when composed) so `anchorOf` and Task 9's GPU flag read it in O(1).
- [ ] **Step 4: Run** the test, `npm test`, tsc, eslint, prettier.
- [ ] **Step 5: Surface and commit** with "scene: anchors in the transform table, and per-view anchor placements".

### Task 9: An eye per anchor on the GPU, and the view's body camera

A browser check (port 5191).

**Files:**

- Create: `src/scene/anchorEyes.ts`
- Modify:
  - `src/shaders/common.slang` (`AnchorEye`, `View.anchors`), `src/shaders/cullTables.slang` (`relativeMatrix`), `src/shaders/raycast.slang`, `src/shaders/layouts.slang` (reflects `AnchorEye`); regenerate `src/shaders/generated/` and `src/render/generated/` with `npm run shaders`;
  - `src/render/layout.ts` (`writeTransform` writes the anchor slot into `flags` bits 8 to 15; `writeViewBlock` writes the table);
  - `src/scene/World.ts` (`castRays`' `CastOptions.anchor`), `src/scene/Engine.ts`, `src/scene/lights.ts`, `src/scene/shadows.ts`, `src/scene/PointCuller.ts`
- Test: `test/anchorEyes.test.ts`

**Interfaces:**

- Consumes: Task 8.
- Produces:
  - Slang: `struct AnchorEye { float4 eyeHi; float4 eyeLo; float4 axes[3]; }` and `AnchorEye anchors[MAX_ANCHORS]` at the end of `View`. `relativeMatrix(t)` reads `anchors[min((t.flags >> 8u) & 0xffu, MAX_ANCHORS - 1u)]`: `rel = SplitPosition(t.originHi, t.originLo).difference(SplitPosition(eyeHi, eyeLo))`, then `axes · [t.linear | rel]`. No loop is added.
  - `writeAnchorEyes(out: Float32Array, offsetFloats: number, camera: CameraPose, view: View): void` in `src/scene/anchorEyes.ts`, used by every writer of a view block (views, shadow cascades, height captures). Per slot, in float64: the eye in the anchor's coordinates and the rotation from the anchor's axes to the shading axes (plan's call 18). For the view's body anchor that rotation is set to the identity directly, never computed through a product.
  - The engine's internal `bodyCamera(view): Camera` (`view.anchorCamera(view.bodyAnchor)`), recomputed when `view.camera.version` or `view.anchorRevision` changes. Every Earth-specific use of `view.camera` in `Engine.ts` reads it instead: the view block (`cameraPosition`, `viewProj`, planes, `iblFrame`), the environment and sky (`updateEnvironment`, `encodeEnvironment`), city lights, shadows, translucency's near range, height captures, overlays, picks' camera, `cameraAhead`, `motionOf` and `selectionViews`.
  - Point and spot lights (`writeLights`, `packViewLights`) are made camera-relative through their transform's anchor slot: `axes · (light − eye)` per anchor, in float64 before the float32 pack.
  - `viewChanged`'s fingerprint includes `view.anchorRevision`.
  - An eye more than 2³¹ m from an anchor hides that anchor's draws for the view (its slot flagged hidden) and reports once through `EngineErrors`, naming the anchor (Review Focus 4).
  - `CastOptions.anchor?: AnchorHandle` (plan's call 20): rays are in that anchor's coordinates, and only draws under it are tested.

- [ ] **Step 1: Write the failing test** (`fakeEngine`, reading the view staging data):

```ts
it("with every anchor at identity the view block's camera floats are today's", () => {
  // cameraHi/Lo, viewProj, viewRotation, planes equal those written from view.camera directly
});
it("the body camera is the camera in the body anchor", () => {
  view.setAnchorPlacement(earth, rotationZ(0.3));
  view.setCameraFromAnchor(earth, pose);
  // the view block's cameraHi/Lo and viewProj equal the identity case's for the same pose, within one float32 ulp
});
it("each slot holds the eye in its anchor and the rotation into the shading axes", ...);
it("an eye beyond 2^31 m of an anchor hides its draws and reports once", ...);  // Review Focus 4
it("castRays tests only draws under the cast's anchor", ...);
```

- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement** the Slang, then `npm run shaders` and `npm run shaders:check`; read the cull kernel's Metal with `node scripts/dumpMsl.mjs src/shaders/generated/cull.wgsl main`. Then the TypeScript.
- [ ] **Step 4: Run** the test, `npm test`, tsc, eslint, prettier.
- [ ] **Step 5: Browser check (port 5191).** `BENCH_COMMIT=be3faf437a node bench/run.mjs parity`, then, with `npx vite --port 5191 --strictPort` running, `BENCH_URL=http://127.0.0.1:5191 node bench/run.mjs parity`, then the same for `models`, `tracks` and `alloc`, one suite at a time. Each scene's metrics agree with the base commit's within the gate's tolerances; record them in the commit message. Stop the server.
- [ ] **Step 6: Commit** with "render: an eye per anchor; the engine draws with the camera in the view's body anchor".

### Task 10: The Earth's content under its anchor

A browser check (port 5192).

**Files:**

- Modify: `src/streaming/Tileset3D.ts`, `src/scene/Engine.ts` (`addTileset`, `addTerrain`, `addEllipsoid`, `loadModel`, `uploadModel`, `addHeightCapture`, `sampleHeightMostDetailed`, `selectionViews`), `src/scene/HeightClamping.ts`, `src/scene/gltfModel.ts`, `src/vector/PointSource.ts`, `src/vector/VectorLayer.ts`, `src/vector/ModelPool.ts`, `src/globe/terrainClip.ts` (doc), `src/scene/ViewLink.ts`, `widgets/Viewer.ts`, `widgets/orbitFocus.ts`, `api/surface.txt`
- Test: `test/earthAnchor.test.ts`

**Interfaces:**

- Consumes: Tasks 8 and 9.
- Produces:
  - `anchor?: AnchorHandle` on `TilesetOptions`, `GlobeOptions`, `PointSourceOptions`, `VectorLayerOptions`, `PlacementOptions` and `addHeightCapture`'s options, each defaulting to `world.bodyAnchor(EARTH)` (plan's call 19). `Tileset3D.anchor`, `PointSource.anchor` read it back.
  - Terrain clip regions are geodetic on the Earth and evaluated in the globe's anchor; with the view's body anchor being the Earth's, the shader's inputs are unchanged. Documented on `addTerrainClip`.
  - Selection views per anchor that has tilesets (plan's call 21): `selectionViews(world, anchor)` reads `view.anchorCamera(anchor)`.
  - `HeightClamping` and `sampleHeightMostDetailed` cast with `anchor: world.bodyAnchor(EARTH)`.
  - `ViewLink` copies `source.anchorCamera(earth)` into the target with `target.setCameraFromAnchor(earth, …)` (plan's call 22); its footprint overlay is in the Earth's anchor.
  - The Viewer's `zoomTo`, `flyTo`, framing, `place()` and the orbit helpers read and write the camera through the Earth's anchor.

- [ ] **Step 1: Write the failing test** (`fakeEngine`, a stubbed tileset as in `test/tilesetPlacement.test.ts`):
  - every content kind above hangs under `world.bodyAnchor(EARTH)` by default, and under a given anchor when asked;
  - with the Earth's anchor turned by 0.3 rad in a view and the camera re-expressed (`setCameraFromAnchor`), the tileset's selection view (position, direction, planes, cartographic) equals the identity case's within `1e-9` m and `1e-12` rad;
  - clamping's rays are cast with the Earth's anchor;
  - a `ViewLink` between a view whose Earth anchor is turned and one where it isn't gives the target the source's Earth-anchor pose within `1e-9` m;
  - an anchor placement change wakes the engine and renders the view (on demand).
- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the test, `npm test`, tsc, eslint, prettier.
- [ ] **Step 5: Browser check (port 5192):** `parity`, `tileset`, `heights` (with a token) and `tracks`, one at a time, against the base commit's results as in Task 9. Stop the server.
- [ ] **Step 6: Surface and commit** with "scene: the Earth's content hangs under the Earth's anchor; selection, clamping, links and the Viewer use the camera there".

### Task 11: The frame resolver, rigs and the camera layer

**Files:**

- Create: `src/camera/tableResolver.ts`, `src/camera/rig.ts`, `src/camera/CameraLayer.ts`
- Modify: `src/camera/frameResolver.ts`, `src/scene/Engine.ts` (`cameras`, the loop), `src/scene/GlobeController.ts` (the guard), `src/index.ts`, `api/surface.txt`
- Test: `test/cameraLayer.test.ts`

**Interfaces:**

- Consumes: Tasks 7, 8 and 9.
- Produces:
  - `interface FrameResolver`:
    - `resolve(frame: FrameKey, base: FrameKey, seconds: number, out: Float64Array): Float64Array`: `p_base = out · p_frame` (column-major float64, metres). Throws `FrameUnavailableError` when it can't answer yet;
    - `motion?(frame: FrameKey, base: FrameKey, seconds: number, out: FrameMotion): FrameMotion`, with `interface FrameMotion { readonly velocity: Float64Array; readonly angularVelocity: Float64Array }` (m/s and rad/s, in `base`'s axes);
    - `routeRevision(frame: FrameKey, base: FrameKey): number`: goes up when the route's inputs change, never with time alone.
  - `tableResolver(world: World): FrameResolver`: the transform table as the only reference frames (`world.root`, anchors at `world.anchorMatrix`, nodes from `world.frameOf`). Its `routeRevision` is the world's transform version.
  - `src/camera/rig.ts`:
    - `interface Rig { readonly position: RigPosition; readonly orientation: RigOrientation }` (no damping in 5a, plan's call 26);
    - `interface RigPosition { readonly frame: FrameKey; readonly anchor?: FrameKey; readonly offset?: ArrayLike<number> }`: `frame` is the position reference frame and the view's render root; with `offset`, the camera sits at `anchor`'s origin (default `frame`'s) plus `offset`, in `frame`'s axes; without it, the camera's position is the controller's (`view.camera.position`, in `frame`). Render space's origin is `frame`'s own origin (plan's call 25);
    - `type RigOrientation = { readonly kind: "free" } | { readonly kind: "axes"; readonly frame: FrameKey; readonly forward: ArrayLike<number>; readonly up: ArrayLike<number> } | { readonly kind: "aim"; readonly target: FrameKey; readonly upFrame: FrameKey; readonly up: ArrayLike<number> }`;
    - `defaultRig(world: World): Rig`: `{ position: { frame: world.root }, orientation: { kind: "free" } }`.
  - `class CameraLayer` (`Engine.cameras`, plan's call 23):
    - per world, because several viewers may share one engine: `resolver(world: World): FrameResolver` and `setResolver(world: World, resolver: FrameResolver): void` (default `tableResolver(world)`); `clock(world: World): SceneClock | undefined` and `setClock(world: World, clock: SceneClock | undefined): void` (without one, `seconds` is 0);
    - `rig(view: View): Rig`, `root(view: View): FrameKey`;
    - `setRig(view: View, rig: Rig): void`: re-roots when the position reference frame changes, re-expressing `view.camera` from the old root into the new one at the clock's time, so nothing placed rigidly moves on screen;
    - `update(): boolean`: per view, per tick (plan's call 24): picks the root, evaluates the rig, and places every anchor of the view's world with its world's `resolver.resolve(anchor, root, seconds)`, skipping the work when the time, the root and every route revision are as last tick. It returns true (keep the loop awake) while the clock isn't paused and a placement moved;
    - errors: a `FrameUnavailableError`, any other throw, or a non-finite matrix leaves the view's last good placements and pose, and reports once per (view, reference frame) through `EngineErrors` (plan's call 28; Review Focus 1 and 5).
  - `GlobeController` ignores input, and warns once, while its view's Earth anchor isn't at the identity (plan's call 27).

- [ ] **Step 1: Write the failing test** (`fakeEngine`, a fake `SceneClock`):

```ts
it("the default rig does no work per tick", () => {
  // resolve() is never called over 10 ticks; every placement stays identity
});
it("a rig follows a moving node of the transform table without the frames module", () => {
  const node = world.addTransform(translation(0, 0, 0));
  engine.cameras.setRig(view, { position: { frame: world.root, anchor: world.frameOf(node, "car"), offset: [0, -10, 2] }, orientation: { kind: "aim", target: world.frameOf(node, "car"), upFrame: world.root, up: [0, 0, 1] } });
  world.setTransform(node, translation(100, 0, 0)); engine.cameras.update();
  expect(Array.from(view.camera.position)).toEqual([100, -10, 2]);
});
it("re-rooting re-expresses the camera: the camera in each anchor is unchanged", ...);
it("evaluates at the clock's seconds, stays awake while it runs and settles when paused", ...);
it("a clock that jumps back years re-evaluates there, with no stale placement", ...);   // Review Focus 2
it("a resolver that throws or returns NaN keeps the last good placements and reports once", ...); // Review Focus 1, 5
it("axes and aim orientations follow their reference frames", ...);
it("globe controls ignore input while the Earth's anchor isn't at identity, and warn once", ...);
```

- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement,** and call `cameras.update()` in `Engine.loop` after the tick listeners (its result joins `busy`) and at the start of `renderFrame()` when called outside the loop.
- [ ] **Step 4: Run** the test, `npm test`, `test/onDemandIdle.test.ts` and `test/frameLoopSleep.test.ts` in particular, tsc, eslint, prettier.
- [ ] **Step 5: Surface and commit** with "camera: the frame resolver, rigs in their generic form, and the camera layer that picks each view's render root".

### Task 12: The frames resolver, anchor bindings and the sky through the seam

**Files:**

- Create: `src/frames/resolver.ts`, `src/frames/attachSky.ts`
- Modify: `src/time/earthOrientation.ts` (the X, Y, s cache), `src/frames/sky.ts`, `src/frames/index.ts`, `api/surface.txt`
- Test: `test/framesResolver.test.ts`, `test/attachSky.test.ts`, `test/earthOrientation.test.ts`, `test/data/attachSky.test.ts`

**Interfaces:**

- Consumes: Tasks 3, 6, 7 and 11.
- Produces:
  - `createFramesResolver(catalog: FrameCatalog): FramesResolver`, where `interface FramesResolver extends FrameResolver`:
    - resolves `Frame`s with `frameTransform` at `instant(seconds)`;
    - `instant(seconds: number): Instant`: through `catalog.leapSeconds`, as `Clock.instant` does;
    - `bindAnchor(anchor: AnchorHandle, frame: Frame): void`; an anchor made by `world.bodyAnchor(body)` binds itself to `catalog.bodyFixed(body)` on first use;
    - the table root and unbound anchors sit at the render root's origin (plan's call 29); a transform node's key (from `world.frameOf`, which carries its world) resolves as its anchor's reference frame times its anchor-relative matrix;
    - `routeRevision` is `Frame.routeRevision` over bound frames;
    - `motion` by central differences over ±0.5 s;
    - a rig's position and orientation frames are marked `"rig"` users in the catalog.
  - `attachSky(engine: Engine, options: { catalog: FrameCatalog; clock: SceneClock; precision?: Precision }): () => void` (plan's call 30): each tick, sets `engine.icrfToFixed`, `engine.sunDirection`, `engine.moonPosition` and `engine.moonAxes` in the Earth's anchor axes from GCRF, ITRF, HCRS, MOON_ICRF and MOON_ME at the asked precision (default `"analytic"`), marking them `"sky"` users. At `"precise"`, an instant outside the data falls back to the analytic stand-ins for drawing, as `skyState` does. Returns the detacher.
  - `celestialToTerrestrial`'s X, Y and s are sampled on a 60 s TT grid and interpolated linearly between the two samples around the instant (ruling 2, plan's call 31). The two samples are cached.

- [ ] **Step 1: Write the failing tests:**
  - `test/framesResolver.test.ts` (the catalog on stubbed data, as Task 6):
    - catalog frames resolve through the tree at the clock's instant (GCRF → ITRF at a known instant equals `icrfToFixed` analytic within `1e-15`);
    - the Earth's body anchor binds to ITRF, so a rig on ITRF places it at the identity exactly;
    - `routeRevision` goes up when the catalog's data arrives;
    - a rig on a reference frame that has no stand-in and is loading: the camera layer keeps the last good placement and warns once naming it; when its data arrives, the next tick places it (Review Focus 1).
  - `test/attachSky.test.ts`: at `"analytic"`, the engine's four sky inputs equal `skyState(ms, undefined)`'s within `1e-12` for 100 instants, with no fetch.
  - `test/earthOrientation.test.ts`: the interpolated X, Y and s agree with the direct series within `1e-11` rad at 1,000 random instants from 2000 to 2050.
  - `test/data/attachSky.test.ts`: at `"precise"`, inside the span, the inputs equal `skyState(ms, data)`'s within `1e-11`; outside it, the analytic ones.
- [ ] **Step 2: Run** and confirm they fail.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the tests, `npm run test:data` (the explorer's numbers stay within their tolerances), tsc, eslint, prettier.
- [ ] **Step 5: Surface and commit** with "frames: the resolver over the tree, anchor bindings, and the sky's inputs through the same seam".

### Task 13: The Viewer on the frames module

A browser check (port 5193).

**Files:**

- Create: `scripts/checkBundle.mjs`, `test/viewerFrameData.test.ts`
- Modify: `widgets/Viewer.ts`, `widgets/index.ts`, `bench/suite/views/viewerHost.ts`, `bench/suite/views/Viewer.tsx`, `test/importBoundary.test.ts`, `package.json` (script `check:bundle`), `api/surface.txt`

**Interfaces:**

- Consumes: Tasks 6, 11 and 12.
- Produces:
  - The Viewer makes a `FrameCatalog` (`viewer.frames`, from `ViewerOptions.frameData`), calls `engine.cameras.setResolver(viewer.world, createFramesResolver(viewer.frames))` and `engine.cameras.setClock(viewer.world, viewer.clock)`, sets its view's rig on ITRF (spec section 7.2's default), and calls `attachSky` with `"precise"` when `frameData` is given and `"analytic"` otherwise (R10's default holds). `FrameSky` is no longer used.
  - `setFrameData(data: FrameData | undefined)` keeps its meaning.
  - The Viewer imports `src/frames/catalog.ts`, `src/frames/resolver.ts` and `src/frames/attachSky.ts` directly; the precise providers load by dynamic `import()` (plan's call 32).
  - `Viewer.warnings: readonly ViewerWarning[]`, `interface ViewerWarning { readonly kind: FrameDataWarning["kind"] | "frameDataFailed"; readonly message: string }`, and `Viewer.events` emits `warning`. A small notice over the view lists them (plan's call 33), designed in context against Dyno's design guide, at desktop and phone width, light and dark.
  - Dyno's Viewer host lists `FrameData.warnings` with its other load warnings.
  - `scripts/checkBundle.mjs`: builds a globe-only Viewer fixture entry (`Viewer.create` with defaults) with Vite into a temporary directory, prints its main chunk's size, and exits 1 when the chunk contains `xy06Table`'s or `s06Table`'s first coefficients or the DAF reader's magic string. `npm run check:bundle` runs it.

- [ ] **Step 1: Write the failing tests:**
  - `test/viewerFrameData.test.ts` (`fakeEngine`, stubbed `fetch`): `frameData` as a URL gives the analytic sky until the data loads and the precise one after; as an object, the precise one at once; data set late with `setFrameData`; a failed load gives exactly one `frameDataFailed` warning and the analytic sky; a store whose EOP ends before now gives one `eopEnded` warning in `viewer.warnings`.
  - `test/importBoundary.test.ts`, new case: the static closure of `widgets/Viewer.ts`, following value imports only (type imports aren't bundled; dynamic imports are where loading stops), contains none of `src/time/erfa/xy06Table.ts`, `src/time/erfa/s06Table.ts`, `src/time/earthOrientation.ts`, `src/time/eop.ts` or any file of `src/ephemeris/`.
- [ ] **Step 2: Run** and confirm they fail.
- [ ] **Step 3: Implement,** including the notice's design pass; save review screenshots in the git-ignored `design-screenshots/`.
- [ ] **Step 4: Run** the tests, `npm test`, `npm run check:bundle` (record the main chunk's size before and after in the commit message: smaller by about the series' size), tsc, eslint, prettier.
- [ ] **Step 5: Browser check (port 5193):** Dyno's Viewer (`/#/viewer`) with and without the store; the stars, Sun and Moon match the base commit's to the eye, and `parity` passes against the base commit's results. Stop the server.
- [ ] **Step 6: Surface and commit** with "widgets: the Viewer on the frames module: the precise sky loads lazily, warnings show".

### Task 14: A rig on GCRF, and re-rooting without a pixel's change

A browser check (port 5194).

**Files:**

- Create: `spikes/rerooting.html`, `spikes/rerooting.ts`, `test/rerooting.test.ts`

**Interfaces:**

- Consumes: Tasks 9 to 13.
- Produces: a check page (plan's call 34) with `runRerooting(): Promise<RerootingResult>` on `globalThis`, reporting each check's measured value and pass or fail.

- [ ] **Step 1: Write the failing Node test** (`fakeEngine`, the catalog at `"analytic"`, a globe and one tileset):
  - with the clock at three instants a day apart, a view with a rig on GCRF and one with a rig on ITRF, given the same pose in the Earth's anchor: their view blocks (camera, planes, `iblFrame`, sky inputs, the Earth's anchor slot) agree within one float32 ulp; their selection views, clamping rays and terrain-clip inputs agree within `1e-6` m;
  - re-rooting a view from ITRF to GCRF and back at a paused instant leaves every float of its view block within one ulp.
- [ ] **Step 2: Run** it. Tasks 9 to 13 should already make it pass; if a value disagrees, find which input differs, fix it here in the module that computes it, name the earlier task whose code it is in the commit message, and rerun.
- [ ] **Step 3: Write the page.** It renders a globe-only scene to an `OffscreenTarget`, with the gate's comparison (`parity/flip.ts`):
  1. ITRF and GCRF at the same instants: the images agree within the gate's tolerance;
  2. GCRF with the clock playing at 3,600×: the sky alone (globe hidden) is the same image at two instants (a still star field), and the globe's pixels differ (the Earth turns);
  3. re-rooting at a paused instant: no pixel beyond the tolerance;
  4. a core-only scene (the page imports nothing from `/frames`): a box on a node moved each tick, followed by a rig, stays at the view's centre within one pixel.
- [ ] **Step 4: Browser check (port 5194):** open `/spikes/rerooting.html?bench` and run `runRerooting()`; every check passes. Record the measured values in the commit message. Stop the server.
- [ ] **Step 5: Commit** with "spikes: a rig on GCRF draws the turning Earth; re-rooting changes no pixel".

### Task 15: Core picks and the pick interpreter

**Files:**

- Create: `src/scene/pick.ts`, `src/frames/pickInterpreter.ts`
- Modify: `src/scene/View.ts`, `src/scene/Engine.ts` (`encodePick`, `resolvePicks`), `src/engineering/pick.ts` (`pickDesign`, `pickInFrame` on the interpreter), `src/engineering/snap.ts`, `src/index.ts`, `src/frames/index.ts`, `api/surface.txt`
- Test: `test/corePick.test.ts`, `test/framesPick.test.ts`, `test/pickDesign.test.ts`

**Interfaces:**

- Consumes: Tasks 8, 9, 11 and 12; Task 2's `DesignPlacement`.
- Produces:
  - `interface CorePick { readonly view: View; readonly position: Float64Array; readonly root: FrameKey; readonly anchor: AnchorHandle | undefined; readonly anchorPosition: Float64Array; readonly draw: DrawHandle | undefined; readonly feature: PickResult | undefined; readonly seconds: number; readonly camera: PickCamera }`: `position` in render space (the rig's position reference frame), `anchorPosition` in the hit draw's anchor (the body anchor's over the sky's edge), all from the tick the pick read (Review Focus 3).
  - `View.pickPoint(x: number, y: number): Promise<CorePick | undefined>`. The engine keeps, per pending pick, that tick's anchor placements and camera.
  - `View.pickPosition` returns the body anchor's coordinates, as documented today (plan's call 35).
  - `interface PickInterpreter<T> { interpret(pick: CorePick): T | undefined }`.
  - `createFramesPickInterpreter(resolver: FramesResolver, catalog: FrameCatalog, options?: { placements?(draw: DrawHandle): DesignPlacement | undefined }): PickInterpreter<FramedPoint>`, where `interface FramedPoint { readonly frame: Frame; readonly body?: Body; readonly bodyFixed?: Float64Array; readonly design?: { readonly placement: DesignPlacement; readonly coordinates: Float64Array }; readonly accuracy: PointAccuracy; in(frame: Frame): Float64Array }`. This closes plan 3's R8.
  - `pickDesign` and `pickInFrame` keep their signatures and answers, built on `pickPoint` and the interpreter.

- [ ] **Step 1: Write the failing tests:**
  - `test/corePick.test.ts` (`fakeEngine`, answering the pick readback as `test/onDemandIdle.test.ts` does): `pickPoint` gives the render-space position, the anchor, the draw and the feature; with a GCRF rig and the clock playing, a pick read at tick n reports tick n's camera and placements even when it resolves at tick n + 3 (Review Focus 3); `pickPosition` gives body-anchor coordinates.
  - `test/framesPick.test.ts`: a pick on content under the Earth's anchor reports ITRF, the Earth, its body-fixed position and its composed accuracy; `in(catalog.get("GCRF"))` equals `frameTransform` of the body-fixed point; a hit on a tileset with a placement carries design coordinates; one without carries none.
  - `test/pickDesign.test.ts`'s existing cases pass unchanged.
- [ ] **Step 2: Run** and confirm they fail.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the tests, `npm test`, `npm run test:data`, tsc, eslint, prettier.
- [ ] **Step 5: Surface and commit** with "picks: render-space picks with their anchor, and a pick interpreter the frames module fills in".

### Task 16: The coordinate service and the hosted placement mode

**Files:**

- Create: `src/frames/coordinates.ts`, `src/engineering/projCoordinates.ts`
- Modify: `src/engineering/EngineeringFrame.ts`, `src/engineering/crs.ts` (re-exports the moved types), `src/engineering/placement.ts` (`placeHosted`), `src/streaming/designPlacement.ts` (`"hosted"`), `src/frames/pickInterpreter.ts`, `src/frames/index.ts`, `src/proj/index.ts`, `api/surface.txt`
- Test: `test/coordinateService.test.ts`, `test/data/projCoordinates.test.ts`

**Interfaces:**

- Consumes: Tasks 2 and 15.
- Produces (plan's call 36):
  - In `src/frames/coordinates.ts`: the data types `CrsRef`, `CrsUnits`, `AreaOfInterest` and `GridFactors` (moved; `crs.ts` and `factors.ts` re-export them), and:
    - `interface CoordinateOperation { forward(xyz: ArrayLike<number>, out?: Float64Array): Float64Array; inverse(xyz: ArrayLike<number>, out?: Float64Array): Float64Array; readonly accuracy: number | undefined; readonly description: string }` (the CRS's own units to longitude and latitude in degrees and height in metres; PROJ's `RecordedOperation` satisfies it, `description` being its pipeline);
    - `interface CoordinateService { resolve(request: CoordinateRequest, options?: { signal?: AbortSignal }): Promise<ResolvedCoordinates> }`;
    - `interface CoordinateRequest { readonly crs: CrsRef; readonly body: Body; readonly areaOfInterest?: AreaOfInterest; readonly pinned?: unknown }` (`pinned` is the service's own; PROJ's takes a `Pipeline` or a string);
    - `interface ResolvedCoordinates { readonly operation: CoordinateOperation; readonly units: CrsUnits; gridFactors(projected: ArrayLike<number>): GridFactors; readonly credits: readonly string[] }`.
  - `projCoordinateService(options: { proj: ProjApi; grids?: GridSource }): CoordinateService` in `src/engineering/projCoordinates.ts`: today's resolution path (grids, fallbacks, better candidates) behind the interface.
  - `EngineeringFrame.load(definition, options: EngineeringFrameLoadOptions)`, where the options take `coordinates?: CoordinateService` beside today's `proj` and `grids` (which build a `projCoordinateService`). One of the two is required.
  - `type PlacementMode = "rigid" | "reprojected" | "hosted"`. `placeHosted(frameName: string, coordinates?: ResolvedCoordinates): DesignPlacement`: content drawn as delivered (`displayed` is the identity on body-fixed metres); `designOf` uses the host's coordinates when given and otherwise throws `DESIGN_NOT_INVERTED`, so a pick reports true values only.

- [ ] **Step 1: Write the failing tests:**
  - `test/coordinateService.test.ts`: a fake service (a plain scale and offset) builds an `EngineeringFrame` with no PROJ loaded, and `toBodyFixed` / `fromBodyFixed` round-trip within `1e-9` m; a service that rejects makes `load` reject naming the engineering frame; an aborted `signal` rejects with `AbortError`; neither caches anything (Review Focus 5); a hosted tileset's pick gives true values and no design coordinates without a service, and design coordinates with one.
  - `test/data/projCoordinates.test.ts`: for the corridor's and the portfolio's frames, `EngineeringFrame.load` through `projCoordinateService` and through today's `proj` option give identical `toBodyFixed` results (`toEqual`) at 21 points.
- [ ] **Step 2: Run** and confirm they fail.
- [ ] **Step 3: Implement.** Check `git status` for `src/engineering/EngineeringFrame.ts` first; if another agent's edit is uncommitted, wait for it.
- [ ] **Step 4: Run** the tests, `npm run test:data`, the boundary test, tsc, eslint, prettier.
- [ ] **Step 5: Surface and commit** with "frames: a coordinate service interface; PROJ is its implementation; the hosted placement mode".

### Task 17: Seams for per-draw constants, draw arguments and geometry submission

A browser check (port 5195).

**Files:**

- Create: `src/render/drawConstants.ts`, `src/render/drawArguments.ts`, `test/seams.test.ts`
- Modify: `src/scene/World.ts`, `src/shaders/cull.slang`, `src/shaders/cullTables.slang`, `src/shaders/pointCull.slang`, `src/shaders/raycast.slang`, `src/shaders/surface.slang` (reads through `drawRecord`), generated shaders

**Interfaces:**

- Produces (plan's call 37):
  - `class DrawConstants`: owns the draw-record arrays and their GPU table; every write of a record (`write(index, data)`, `setColor`, `setFlags`, `setViewMask`, `setPlaceholder`, `setTerrainClip`, `setImagery`, `setLights`, `setPlacement` from Task 19) goes through it.
  - Slang: `DrawRecord drawRecord(uint index)` in `cullTables.slang` and `surface.slang`, the only readers of `records[…]`.
  - `class DrawArguments`: owns the indirect-arguments buffer and `drawBatch(pass, batch, direct)`; `slotOf(record: number): number` (the byte offset of the record's batch's arguments), which is the record's pointer to indirect arguments.
  - Bypass tests, as `test/bindless.test.ts` is built:
    - no source outside `src/render/drawConstants.ts` assigns into the record arrays;
    - no `.slang` file indexes `records[` outside `drawRecord`;
    - no call of `drawIndexed`, `drawIndirect` or `drawIndexedIndirect` outside `src/render/drawArguments.ts` (full-screen `draw(3)` passes are not content);
    - `setVertexBuffer` and `setIndexBuffer` appear only in the submission path (`World.recordBundle`, `World.bindSlab`, `DrawArguments`) and `Engine.drawOverlays`.

- [ ] **Step 1: Write the failing test** (`test/seams.test.ts`) with the four bypass checks and `slotOf`'s mapping on a `fakeEngine` world with three batches.
- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement.** No behaviour changes: the records' bytes are the same. Then `npm run shaders` and `npm run shaders:check`.
- [ ] **Step 4: Run** the test, `npm test`, tsc, eslint, prettier.
- [ ] **Step 5: Browser check (port 5195):** `parity`, `customShader` and `alloc`, one at a time, against the base commit's results. Stop the server.
- [ ] **Step 6: Commit** with "render: one seam each for per-draw constants and draw arguments, with bypass tests".

### Task 18: The acceleration-structure hook and the query interface for rays

**Files:**

- Create: `src/streaming/acceleration.ts`, `src/query/queries.ts`, `src/query/terrainBackend.ts`, `src/query/drawBackend.ts`, `test/queries.test.ts`, `test/acceleration.test.ts`
- Modify: `src/streaming/Tileset3D.ts`, `src/scene/World.ts`, `src/scene/Engine.ts` (`queries`), `src/measure/terrainLineOfSight.ts`, `test/seams.test.ts`, `test/lineOfSight.test.ts` and the other `terrainLineOfSight` tests, `examples/frames-explorer/sightLines.ts`, `examples/frames-explorer/lighthouseWindow.ts`, `examples/frames-explorer/stress/groups/body-frames.ts`, `src/index.ts`, `src/measure/index.ts`, `api/surface.txt`

**Interfaces:**

- Consumes: Tasks 8, 10 and 17.
- Produces:
  - `interface AccelerationStructures { tilePlaced(tileset: Tileset3D, tile: Tile, draws: readonly DrawHandle[]): void; tileUnloaded(tileset: Tileset3D, tile: Tile): void; drawAdded(draw: DrawHandle): void; drawRemoved(draw: DrawHandle): void }`, and `World.acceleration: AccelerationStructures` (a no-op by default). Tile placement and unload in `Tileset3D`, and `World.addDraw` and `removeDraw`, each call it at one point.
  - In `src/query/queries.ts` (plan's call 38):
    - `interface RayQuery { readonly anchor: AnchorHandle | undefined; readonly seconds: number; readonly rays: readonly QueryRay[]; readonly targets: readonly ("terrain" | "draws")[] }`, `interface QueryRay { readonly from: ArrayLike<number>; readonly to: ArrayLike<number> }` (metres in `anchor`'s coordinates);
    - `type RayVerdict = "clear" | "blocked" | "unknown"`;
    - `interface RayAnswer { readonly verdict: RayVerdict; readonly hit?: { readonly t: number; readonly position: Float64Array }; readonly unknown: readonly { readonly from: number; readonly to: number; readonly reason: "notLoaded" | "notRefined" | "withinError" | "outsideData" | "unsupported" }[]; readonly accuracy: { readonly meters?: number; readonly note: string } }`;
    - `interface QueryAnswer { readonly rays: readonly RayAnswer[]; readonly revision: number; readonly final: boolean }` (`final: false` when more tiles are loading);
    - `interface SpatialQueries { castRays(query: RayQuery, options?: { signal?: AbortSignal }): Promise<QueryAnswer>; standing(query: () => RayQuery, listener: (answer: QueryAnswer) => void, options?: { everyTick?: boolean }): { dispose(): void } }`;
    - every answer is asynchronous, even when the CPU knows it at once.
  - `Engine.queries: SpatialQueries`, with the terrain backend (`castTerrainRay` over the world's globe's `terrainRayTarget`) and the draw backend (`World.castRays`). A ray under an anchor that has no globe answers `unknown` with `"unsupported"` for terrain.
  - `terrainLineOfSight(from, to, queries: SpatialQueries, options?: TerrainLineOfSightOptions & { anchor?: AnchorHandle }): Promise<TerrainLineOfSight>` (plan's call 39), with today's answers.
  - A bypass test in `test/seams.test.ts`: no file under `examples/` or `src/measure/` imports `castTerrainRay` or reads a tileset's retained geometry for rays.

- [ ] **Step 1: Write the failing tests:**
  - `test/acceleration.test.ts`: a recording hook sees every tile placed and unloaded, and every draw added and removed, on the stubbed tileset harness.
  - `test/queries.test.ts`: clear, blocked and unknown answers with their reasons and accuracy on `test/terrainRayFixtures.ts`'s targets; a query's promise is still pending right after the call; one call carries 64 rays; a standing query is re-answered when its revision goes up, and each tick with `everyTick`; an answer made while tiles load says `final: false`, and the next is `final: true` with a higher revision.
  - The existing `terrainLineOfSight` tests, awaited, keep their expected values.
  - The bypass case.
- [ ] **Step 2: Run** and confirm they fail.
- [ ] **Step 3: Implement,** and move the explorer's three callers onto `await terrainLineOfSight(…, viewer.engine.queries)`, keeping a stale answer from replacing a newer one (each caller's existing generation counter).
- [ ] **Step 4: Run** the tests, `npm test`, `npm run test:data`, tsc, eslint, prettier.
- [ ] **Step 5: Surface and commit** with "query: one asynchronous, batched interface for rays, with standing queries and three-way answers; an acceleration-structure hook".

### Task 19: A draw's placement: dual position, fitted operation and blend

A browser check (port 5196).

**Files:**

- Create: `src/scene/placement.ts`, `src/shaders/placement.slang`, `src/frames/placementQuery.ts`, `spikes/placement.html`, `spikes/placement.ts`, `test/placement.test.ts`
- Modify: `src/shaders/surface.slang` (calls the placement before the custom vertex stage), `src/shaders/common.slang` (`DrawRecord.placement`), `src/shaders/layouts.slang`, generated shaders, `src/render/layout.ts`, `src/render/drawConstants.ts`, `src/scene/World.ts`, `src/scene/RenderContext.ts` (group 1 binding 7), `src/frames/index.ts`, `src/index.ts`, `api/surface.txt`

**Interfaces:**

- Consumes: Task 17's `DrawConstants`; Task 12's resolver.
- Produces:
  - In `src/scene/placement.ts`:
    - `type Placement = { readonly kind: "affine" } | DualPosition | FittedOperation | PlacementBlend`;
    - `interface DualPosition { readonly kind: "dual"; readonly semantic: string; readonly t: PlacementParameter; readonly maxDistance: number }`: `mix(position, attribute(semantic), t)` in model space; `t` any finite number (past 1 extrapolates); `resamplable: false` (ruling 4);
    - `interface FittedOperation { readonly kind: "fitted"; readonly center: ArrayLike<number>; readonly scale: number; readonly coefficients: Float64Array; readonly errorBound: number }`: 60 coefficients (20 monomials of total order 3 or less in `(p − center) / scale`, per axis), a model-space displacement added to the position (plan's call 41);
    - `interface PlacementBlend { readonly kind: "blend"; readonly from: "identity" | FittedOperation; readonly to: "identity" | FittedOperation; readonly t: PlacementParameter }` (plan's call 43);
    - `placePosition(placement: Placement, position: ArrayLike<number>, attribute: ArrayLike<number> | undefined, out: Float64Array): Float64Array`: the float64 CPU twin;
    - `maxDisplacement(placement: Placement): number`: `max(1, |t|) · maxDistance` for dual; the sum of the coefficients' magnitudes for fitted; the larger end's for a blend;
    - `secondDerivativeBound(placement: Placement): number`: from the coefficients (section 8.2), `0` for affine, `NaN` for dual;
    - refuses a non-finite `t`, coefficient, `center`, `scale` or bound with a `RangeError` naming the field (Review Focus 4).
  - On `World`: `createPlacementParameter(value: number): PlacementParameter` (`{ value: number }`, one float in the placements buffer, plan's call 42) and `setPlacement(handle: DrawHandle, placement: Placement | undefined): void`. The draw's bounding radius grows by `maxDisplacement`. Vertex buffers are never written (spec section 7.6).
  - Slang (`placement.slang`): `float3 placePosition(uint placement, float3 positionMC, uint vertexIndex, uint directory, uint feature)`, reading the placements buffer (`StructuredBuffer<float4> placements`, group 1 binding 7, vertex stage only) and the dual attribute through `readNamed`. The polynomial's loop runs to `PLACEMENT_TERMS = 20u`.
  - `placementOf(world: World, draw: DrawHandle, view: View, resolver: FramesResolver): { readonly kind: Placement["kind"]; readonly root: FrameKey; readonly operation?: string; readonly errorBound?: number; readonly resamplable: boolean } | undefined` in `src/frames/placementQuery.ts`: which placement applies to a draw in a view, the root it was computed for, and why (section 8.2's query).

- [ ] **Step 1: Write the failing test** (`test/placement.test.ts`):

```ts
it("dual position mixes by t and extrapolates past 1", () => {
  const out = placePosition(dual(t(1.5)), [0, 0, 0], [2, 0, 0], new Float64Array(3));
  expect(Array.from(out)).toEqual([3, 0, 0]);
});
it("refuses a non-finite parameter or coefficient, naming it", () => {
  expect(() => world.createPlacementParameter(Number.NaN)).toThrow(/value/);   // Review Focus 4
});
it("the fitted twin evaluates the polynomial; its bounds come from the coefficients", ...);
it("a blend of identity and a fitted operation moves by t", ...);
it("a placement grows the draw's bounding radius by its largest displacement", ...);
it("one parameter moves every draw that names it, with one 4-byte write", ...);
it("never writes a vertex buffer", ...);  // the fake device records no writeBuffer into the slab after setPlacement
it("placementOf answers which placement applies, for which root, and why", ...);
```

- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement,** then `npm run shaders`, `npm run shaders:check`, and read the surface vertex stage's Metal (`node scripts/dumpMsl.mjs src/shaders/generated/surface.wgsl vs`) for the bounded loop. Check that the vertex stage's storage-buffer count stays within `BASE_BINDING_LIMITS` (`test/limits.test.ts`).
- [ ] **Step 4: Run** the test, `npm test`, tsc, eslint, prettier.
- [ ] **Step 5: Browser check (port 5196):** `/spikes/placement.html?bench` draws a quad with each kind; each vertex lands within half a pixel of the CPU twin's projection. Then `parity` and `customShader` against the base commit's results. Stop the server.
- [ ] **Step 6: Surface and commit** with "scene: per-vertex placements (dual position, fitted operation, blend) in Slang with float64 twins".

### Task 20: The design globe on the new seam

> **Revised again 2026-11-08 (owner):** "presentations" below became scene items: `world.add(tileset, { placement, opacity, tint, viewMask })`, tilesets only. See the overall plan's §13.25.
>
> **Revised 2026-11-08 (owner):** this task's design changed; the original text below is superseded where they differ. The example loaded the rigid and reprojected copies as two tilesets and paired their tiles itself (`PlacementPair`), so the morph and the ghost depended on two independent tile selections agreeing. They didn't, and a ghost tile was cut off where the selections differed. The engine shouldn't know what a ghost is; that's app logic. The general design:
>
> - **Presentations of a tileset (engine, generic).** A tileset can be drawn more than once. Each *presentation* draws the same loaded tiles with its own placement parameter, appearance (tint, opacity) and view mask. There is one selection, one tile cache and one set of bounds covering every presentation (Task 19's `maxDisplacement`). Not two loaded copies of the tileset.
> - **One tileset with both placements.** The generator writes a single tileset per site whose vertices carry both positions (Task 19's dual position). Later, 5f's fitted operations let the frames module compute the reprojection per tile, so only design-space positions are needed.
> - **The app defines what presentations mean.** The design globe makes a solid presentation at the morph's parameter and a translucent, tinted presentation at the other end (what it calls the ghost). The morph animates the first presentation's parameter. `PlacementPair` and the pairing of two tilesets are removed.
> - Picks and snaps on a presentation report which presentation they hit; content coordinates still only at `t = 0` or `1` (Task 19).
> - The other parts of this task stand: no custom vertex stage, frames from `viewer.frames.tree()`, overlays under the Earth's anchor.

A browser check (port 5197).

**Files:**

- Modify: `examples/design-globe/placementPair.ts`, `examples/design-globe/morphDriver.ts`, `examples/design-globe/measureFrames.ts`, `examples/design-globe/main.ts`, `examples/design-globe/siteLoader.ts`, `test/designGlobe*.test.ts` as needed

**Interfaces:**

- Consumes: Tasks 10, 13, 15 and 19.
- Produces:
  - Each pair's surface, ghost and line meshes carry the reprojected partner as their dual position (`PARTNER_SEMANTIC`); the morph driver writes one `PlacementParameter` per site, `t = 1 − k(1 − t₀)` for exaggeration `k` and morph `t₀` (plan's call 44). No custom shader in `placementPair.ts` has a vertex stage; the tints and the ghost's alpha stay as fragment stages.
  - The design globe's frames come from `viewer.frames.tree()` (plan's call 45). Its overlays hang under the Earth's anchor (`parent`). Its pairing of the two tilesets stays in the example.

- [ ] **Step 1: Write the failing tests:** in `test/designGlobe*.test.ts`, a pair's draws carry a dual-position placement whose parameter follows `t = 1 − k(1 − t₀)` (at `k = 1`, `t₀ = 0.25`: 0.25; at `k = 10`, `t₀ = 0`: −9), and `placementPair.ts` contains no `fn vertexMain`.
- [ ] **Step 2: Run** and confirm they fail.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the design globe's tests, `npm test`, `npm run test:data`, tsc, eslint, prettier.
- [ ] **Step 5: Browser check (port 5197):** the design globe page: the morph, the exaggeration and the ghost look as before; picks at both ends agree with 4b's answers (its checks panel passes). Stop the server.
- [ ] **Step 6: Commit** with "examples: design globe: the morph is the core's dual-position placement; its frames come from the Viewer's catalog". List anything the example still reaches past the public API for, for 5i.

### Task 21: The frames explorer and the realtime-tracks example on the new seam

A browser check (port 5197, after Task 20's server is stopped).

**Files:**

- Modify: `examples/frames-explorer/frameData.ts`, `examples/frames-explorer/host.ts`, `examples/frames-explorer/globe.ts`, `examples/frames-explorer/pointDrag.ts`, `examples/frames-explorer/selection.ts`, `examples/realtime-tracks/main.ts`, `test/framesExplorer*.test.ts` as needed

**Interfaces:**

- Consumes: Tasks 10, 12, 13, 15 and 18.
- Produces:
  - The explorer's `Frames` come from `viewer.frames.tree()`; its progress reads the catalog's `onProgress` (plan's call 45). `viewer.setFrameData` is no longer needed for the sky.
  - Its overlays and markers hang under the Earth's anchor (`parent: world.bodyAnchor(EARTH)`).
  - Its picks go through `pickPoint` and the frames interpreter where it converts a pick to a reference frame.
  - Its line of sight goes through `engine.queries` (Task 18).
  - The realtime-tracks example names the Earth's anchor for its point source and sets its view's rig explicitly (`engine.cameras.setRig(view, { position: { frame: viewer.frames.get("ITRF") }, orientation: { kind: "free" } })`).

- [ ] **Step 1: Check** that no other agent has uncommitted edits in `examples/frames-explorer/`. Wait if one does.
- [ ] **Step 2: Write the failing tests** where behaviour is testable in Node: the explorer's `frameData.ts` resolves its `Frames` from a catalog (stubbed store) and reports progress; the explorer's numbers (`npm run test:data`) don't move.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the explorer's tests, `npm test`, `npm run test:data`, tsc, eslint, prettier.
- [ ] **Step 5: Browser check (port 5197):** the explorer's scenarios list, one GCRF-heavy scene and the lunar scene; then the realtime-tracks page at 100,000 vehicles. Each looks and runs as before. Stop the server.
- [ ] **Step 6: Commit** with "examples: the frames explorer and realtime tracks on the camera chain and the frames module". List any reach past the public API, for 5i.

### Task 22: Docs, the plan note, the final gates and Snyk

**Files:**

- Modify: `packages/next/README.md`, `CESIUM2_WEBGPU_PLAN.md` §13.14

- [ ] **Step 1: README.** Document the entry points and the dependency rule; render space, anchors and the eye per anchor; rigs, the camera layer and the frame resolver; the catalog, precision and stand-ins; `attachSky`; picks and the pick interpreter; the coordinate service and `hosted`; per-vertex placements; the query interface; the seams and their bypass tests; the surface map.
- [ ] **Step 2: Plan note** in §13.14, "Frames 5a results": the measured values (the parity metrics against the base commit, the re-rooting page's checks, the bundle sizes), the plan's calls and rulings, one line each, and a "Carried forward" list of real deferred work from this plan's ledger, without nits, written before the ledger is deleted. Mark the section 16 rows 5a closed, naming the task.
- [ ] **Step 3: Gates:**
  - `npx tsc --noEmit -p .`, `npx eslint .`, `npx prettier --check .`;
  - `npm test`, `npm run test:data`;
  - `npm run build`, `npm run build:lib`, `npm run check:bundle`, `npm run shaders:check`;
  - the parity pages and the bench gate against the base commit, one suite at a time, on port 5191;
  - `snyk_code_scan` on `src/camera`, `src/core`, `src/frames`, `src/query`, `src/render`, `src/scene`, `src/streaming`, `src/engineering/projCoordinates.ts`, `widgets/Viewer.ts`, `scripts/surfaceMap.mjs`, `scripts/checkBundle.mjs` and the spikes. Fix new findings and rescan until clean; record the findings that predate this plan.
- [ ] **Step 4: Commit** `README.md` and `CESIUM2_WEBGPU_PLAN.md` with "Plan: frames 5a results".

---

## Self-review

- **Spec coverage.** 7.2 layers: Tasks 7, 11, 12. 7.3 decisions: Tasks 6, 11 to 13, 16. 7.4 anchors: Tasks 8 to 10 (horizon culling and tile volumes through selection views; clamping; clipping; links and the Viewer; picks in 15; the atmosphere's camera in 9; on-demand and labels in 9 and 8). 7.5 rig and root: Task 11 (re-rooting, scene time, awake while moving), picks in 15. 7.6 placements: Task 19. 7.7 module, packaging, providers, sky, catalog and tree in use: Tasks 2, 6, 12, 13. 7.8 revisions: Tasks 3, 11, 12. 7.9 picks, coordinate service, `hosted`: Tasks 15, 16. 7.10 seams: Tasks 17, 18 (queries, acceleration hook, per-draw constants, draw arguments, submission), 19 (placements through the per-draw seam). 7.11 carried-forward items: dynamic import and build test (13), warnings (13), the `frameData` unit test (13), the X, Y, s cache (12), `AbortSignal` (5), `readWithProgress` (5), ENU (4), the stress getter (4), the constants move (2), terrain clipping under the anchor (10), revisions (3). 7.12 done-when: Tasks 9 to 14, 2 and 13, 20 and 21, 17 and 18, 1. Section 8: Task 19 (data plus a Slang function, error and second-derivative bounds, the per-draw query, indirect arguments through Task 17's slot). Section 15.2's map tool: Task 1.
- **Not in 5a, by the spec:** the animation core, presets, damping, controllers beyond today's, transitions (5b, 5d); per-body culling and the Moon (5c); the physical sky per body (5e); the fitter and design view (5f).
- **Type consistency:** `FrameKey`, `FrameResolver`, `FrameUnavailableError` (Tasks 6, 11); `AnchorHandle`, `MAX_ANCHORS` (8, 9); `SceneClock`, `Clock.instant` (7, 12); `FrameCatalog`, `Precision`, `FrameUser` (6, 12, 13, 15); `DesignPlacement`, `PlacementMode` (2, 15, 16); `CorePick`, `PickInterpreter` (15); `DrawConstants`, `DrawArguments.slotOf` (17, 19); `SpatialQueries` (18, 21); `Placement`, `PlacementParameter` (19, 20) are named the same wherever they recur.
- **Review Focus:** each line's test sits in its owning task's Step 1 and is marked there.
