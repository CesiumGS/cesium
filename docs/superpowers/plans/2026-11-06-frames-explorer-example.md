# Frames and Projections Example (Stress Test) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a gallery example, "Frames and projections", that shows the frame tree and the engineering frames working. It has three parts:

- **A live tree:** each edge labelled with its kind.
- **Viewer overlays:** these draw the transforms on the globe.
- **A stress-test suite:** it runs in the page, with each result checked against its tolerance and shown with its accuracy statement.

The same suite runs headless as a regression data test.

**Architecture:**

- **Files.** The example is a module under `packages/next/examples/frames-explorer/`. `tests.ts` is a pure stress-test catalog, shared by the page and a Vitest data test. `tree.ts` is the tree model. `overlays.ts` builds pure geometry. `main.ts` holds the page and its DOM panel.
- **Drawing.** Overlays are unlit `line-list` meshes in the engine's world, which is Earth-fixed: each frame is drawn at its ITRF placement at the clock's time. Labels are HTML.
- **Data.** Frame data, PROJ and the Artemis trajectory load from the setup store lazily, and only when a feature needs them.

**Tech Stack:** TypeScript, the engine's `Viewer`, `World.addMesh` (`topology: "line-list"`) and `World.addDraw`, plain DOM for the panel (as the gallery's other examples do), and Vitest. No new dependencies.

**Spec:**

- The owner's request, recorded in `CESIUM2_WEBGPU_PLAN.md` §13.14 under Carried forward: "a gallery example for frames and projections", with its viewer addition of 2026-11-06.
- `docs/superpowers/specs/2026-11-05-frames-bodies-measurement-design.md` for the frames and measurements it shows.
- The owner skipped further questions: iterate on the design once it's built.

**Builds on:**

- Plans 1–3: `loadFrameData`, `createFrames`, `Trajectory`, `measure`, accuracy statements.
- Plan 4a: `loadProj`, `resolveOperation`, `EngineeringFrame`, `RigidPlacement`, `gridFactors`, `Alignment`, design measurement.

Plan 4b later adds two things here:

- tilesets placed rigidly versus reprojected;
- the global-geoid stress tests.

## Rulings this plan makes

- **R1. A gallery example.** It's id `frames-explorer`, layout `"side"` (the tree and the tests need the room), globe `"ellipsoid"` with the gallery's default imagery. It's listed after the existing examples, with labels "Frames", "Projections" and "Measurement".
- **R2. One stress-test catalog, used twice.** `tests.ts` exports pure test cases that take `{ frames, proj, orion? }` and return results. The page runs them. `test/data/framesExplorer.test.ts` runs the same catalog in Node and asserts that every case passes. The example therefore becomes a regression test of plans 1–4a, and the page can never show a pass the data test doesn't see.
- **R3. Overlays are drawn geometry.** They are line-list meshes with per-vertex colors, not tilesets or terrain. 4b adds the tileset comparisons.
- **R4. Everything is drawn in the engine's Earth-fixed world.**
  - A frame's placement is `frameTransform(frame, frames.itrf, t)` at the clock's time. Rendering stays Earth-fixed until plan 5.
  - Triads are scaled for visibility: a fixed fraction of the camera's distance to the frame's origin, clamped. The scale is documented on screen.
  - The EME2000/ICRF frame bias, 23 mas, is drawn exaggerated, using a control from 1× to 10⁷× labelled with its factor.
- **R5. Missing data degrades the page, never breaks it.** Without the frames store or PROJ, the panel says what's missing and to run `npm run setup`. Every feature that doesn't need that data still works.
- **R6. Load lazily.**
  - Frame data loads at start.
  - PROJ loads when the first engineering-frame feature or test needs it.
  - GEOID18 loads only when a geoid test or overlay runs.
  - The Artemis OEM (6 MB) loads only when Orion's path is turned on or its tests run.
- **R7. Tests that expect a throw pass only on the right throw.** A case expecting an error passes only if it throws with the expected message pattern. Examples are the leap second, the end of the EOP table, a trajectory gap and a missing grid. Any other outcome fails, including a silent success.
- **R8. Accuracy is always on screen (owner's addition, 2026-11-06).** Nothing shows a position, distance, transform or overlay without its accuracy beside it.
  - **Tree edges:** each edge shows its accuracy in its row, not only on expand. Built-in edges carry their stated model accuracy, from the plans' validations and section 4's budget: for example the GCRF→ITRF edge's Earth-orientation sigma at the clock's instant (measured or Bulletin A predicted, with prediction age), DE440's 0.01 m for the ephemeris edges, and 1e-15 for the frame bias. PROJ edges show the operation's accuracy, or "unknown"/"ballpark" in a warning color.
  - **Selecting a node:** shows the composed accuracy to the root: an `accuracyOf`-style statement for a point at that frame's origin against ITRF at the clock's time, with its terms.
  - **Every overlay:** has a legend line with its accuracy. Examples: "design grid: PROJ operation ±2.0 m (NAD83(2011)→WGS84); round trip ≤ 3e-9 m", and "rigid vs exact: sag 31.2 m at 20 km (geometry, exact)".
  - **Every stress-test row:** shows the measured value against its tolerance as a bar (log scale), plus the accuracy statement's total in the row itself, with terms on expand. An undefined total shows "not bounded" and names the unknown term, never a blank.
- **R9. Loading is always visible (owner's addition, 2026-11-06).** Lazy data shows that it's fetching:
  - **The Status section** lists each data item: frame data, PROJ (WebAssembly and `proj.db`), GEOID18 and the Artemis OEM. Each is in one of the states "not loaded", "fetching" (with bytes received of the total and a progress bar from the response's `Content-Length`), "ready" (size and load time) or "missing" (the setup hint).
  - **Where a feature waits for data** (an overlay toggle, a test group, Orion's path), the control shows an inline spinner and "fetching PROJ…" (or which item) until it's ready. Its test rows show "waiting for …" rather than nothing.
  - **Fetches report progress** through a small wrapper around `fetch` that streams the body and reports bytes. `loadProj` and `loadFrameData` may need an optional `onProgress(item, received, total)` callback; add it as an optional parameter, without changing existing callers.

## Global Constraints

- **Units.** Everything is float64 on the CPU. The GPU sees only the engine's usual camera-relative geometry. Meters, seconds, radians and degrees are labelled wherever shown.
- **Example contract.** The module follows `examples/types.ts`:
  - `run(context)` builds in its own viewer and returns a `Dispose`;
  - disposables go in `context.scope`;
  - work stops on `context.signal`;
  - the panel is `context.panel`.

  It reads only the frames store at `/frames-data/` and PROJ at `/frames-data/proj/`. No ion token is needed.
- **Tolerances.** These are the plans' own, stated in `tests.ts` beside each case, never loosened for the page:

  | Case | Tolerance |
  | --- | --- |
  | Design round trips | 1e-4 m |
  | Frame-tree compositions | 1 mm per 1e9 m of translation, and 1e-12 in rotation |
  | Alignment recovery | 1e-9 design units |
  | Grid-to-ground relation | 0.01 m |

- **Matrix conventions** are unchanged. `src/frames/matrix.ts` is the only layout bridge, and meshes take positions in the world's Earth-fixed meters.
- **UI.** Use plain DOM in the panel, styled like the gallery's other examples: reuse `examples/translucency/main.ts`'s control patterns and the page's existing CSS variables. No new UI library.
- **Repository practice:**
  - Commit locally and never push. End each message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  - `npx tsc --noEmit -p .`, `npx eslint` and prettier pass.
  - Run `snyk_code_scan` on new code.
  - Before deleting the SDD workspace, copy real deferred work to §13.14's "Carried forward" list, without nits.
  - Commands run in `packages/next`.
- **Performance.** Don't benchmark on this page, which loads the GPU heavily. A full test run should finish in under 10 s on this machine; print the time in the data test.

## Review Focus

1. **A test that passes for the wrong reason.**
   - An expected-throw case that throws a different error passes falsely.
   - So does a round trip compared against itself.

   Every case asserts the error's message pattern or compares against an independent value. A deliberately broken case (a tolerance set to 0 in a unit test of the runner) fails. Test: Task 1.
2. **The page and the data test disagree.** Both run the same `tests.ts` cases on the same data, so a case that passes headless but fails in the browser shows as a failure in the page, never hidden. Tests: Task 1 and Task 4's browser check.
3. **Overlays drawn in the wrong place:**
   - a triad drawn with axes transposed;
   - a grid drawn from the wrong CRS;
   - the rigid line and the exact line swapped.

   The geometry builders are unit-tested against independent values. Test: Task 3.
4. **Missing data.** No `/frames-data/`, no PROJ, or no Artemis file. The page shows what's missing and still runs everything else, and nothing throws uncaught. Test: Task 4's browser check, with the dev server started against an empty store.
5. **Accuracy or loading state hidden or wrong (R8, R9).** A tree edge, overlay or result shown without its accuracy, or an undefined accuracy shown as a number or a blank. A fetch with no indicator, or an indicator stuck after an error or abort. Tests: Task 2 (every node has an accuracy field, with no NaN), Task 4 (unit tests of the loading-state model, and the browser check with network throttling).
6. **Leaving the example mid-load or mid-run.** The gallery switches away while PROJ or the OEM is loading, or while the tests run. Nothing leaks into the next example's viewer, and no work continues after `signal` aborts. Test: Task 4.

---

### Task 1: The stress-test catalog and its headless run

**Files:**

- Create:
  - `packages/next/examples/frames-explorer/tests.ts`
  - `packages/next/test/data/framesExplorer.test.ts`
  - `packages/next/test/framesExplorerRunner.test.ts`

**Interfaces:**

- **Consumes:** the public API from `src/index.ts`. The cases use only the library's exports, so the example stays a user of the API.
- **Produces:**
  - **`interface StressContext`:**
    - `frames: Frames`;
    - `proj?: ProjApi`;
    - `orion?: Trajectory`;
    - `loadProj(): Promise<ProjApi>`;
    - `loadOrion(): Promise<Trajectory>`.
  - **`interface StressResult`:**
    - `id: string`, `group: string`, `title: string`;
    - `pass: boolean`;
    - `value?: number`, `tolerance?: number`, `unit?: string`;
    - `expectedError?: string`, `error?: string`;
    - `accuracy?: AccuracyStatement`;
    - `detail?: string`.
  - **`interface StressCase`:**
    - `id`, `group`, `title`;
    - `needs: readonly ("proj" | "geoid" | "orion")[]`;
    - `run(ctx: StressContext): Promise<StressResult[]>`.
  - **`STRESS_CASES: readonly StressCase[]`.**
  - **`runStress(ctx: StressContext, options?: { signal?: AbortSignal; onResult?: (r: StressResult) => void; ids?: readonly string[] }): Promise<StressResult[]>`.**
- **The catalog's groups:**
  - **"Projections."** Design round trips of point sets on EPSG:32610 through 32619, 32632, 32733, 6420+6360 (with GEOID18), 2223, 3413, 3031 and IAU_2015:30135. Each set has the origin, a 50 km line, a point 100 km off the central meridian and a point at the zone's edge. Tolerance 1e-4 m.
  - **"Units."** The 2 ppm check: EPSG:6420 against its international-foot WKT2 copy, as plan 4a's Task 3 does it.
  - **"Site grids."** Round trips with θ ∈ {0, 12.5°, 90°, −135°} and s ∈ {1, 1.0000375, 0.99996}.
  - **"Recorded operations."**
    - 6420+6360 records `us_noaa_g2018u0.tif`.
    - An operation needing a grid that's never loaded (`ca_nrc_CGG2013an83.tif`, through EPSG:2953+6647 or another CRS PROJ ties to it) throws, naming that grid. That's R7.
  - **"Frame tree."** Seeded random points through A → B → A and A → C against A → B → C, over pairs of ITRF, GCRF, EARTH_ICRF, EME2000, HCRS, MOON_ICRF, MOON_ME and MOON_PA, at 5 instants in 2026.
  - **"Time":**
    - `Instant.fromIso` across 2016-12-31T23:59:60.5 is monotonic, and TT advances 2 s over the one UTC second;
    - an Earth-fixed measurement past the EOP predictions throws (R7);
    - an instant past the leap-second table's expiry carries the warning.
  - **"Trajectory"** (needs `orion`):
    - Orion's state in a gap (2026-04-02T22:49:30 UTC) throws, naming the spans (R7);
    - Orion in MOON_ME at the flyby converts and round-trips.
  - **"Measurement":**
    - the grid-to-ground relation on the California frame, within 0.01 m;
    - station and offset recovery on a clothoid alignment, within 1e-9;
    - a design point measured to the same point fixed in ITRF gives the same distance, within 1e-9 m.

- [ ] **Step 1: Write the runner's failing unit tests** (`test/framesExplorerRunner.test.ts`, with synthetic frames and stub cases):
  - A case returning a value within its tolerance passes, and one beyond it fails.
  - An expected-throw case passes only when its message matches. It fails on a different message and fails when nothing throws (Review Focus 1).
  - `runStress` honors `signal`: when aborted midway, it stops before the next case and resolves with what it has (Review Focus 5).
  - `onResult` is called once per result.
  - Cases whose `needs` can't be met give a skipped result with `pass: false` and a `detail` saying what's missing. They don't throw (Review Focus 4).
- [ ] **Step 2: Write the data test** (`test/data/framesExplorer.test.ts`). Build the context from the store, as plan 4a's data tests do, run `runStress` over all `STRESS_CASES`, and assert every result passes. Print the failures, if any, and the run time.
- [ ] **Step 3: Run** `npx vitest run test/framesExplorerRunner.test.ts` and `npm run test:data`, and confirm both fail.
- [ ] **Step 4: Implement** `tests.ts`. Each case's `title` says in words what is checked and against what.
- [ ] **Step 5: Run** the tests and `npm test`, and confirm they pass. If a library case fails, report the case and values before touching tolerances: it's a finding.
- [ ] **Step 6: Commit** with "examples: frames and projections stress-test catalog, run headless as a data test".

### Task 2: The tree model

**Files:**

- Create: `packages/next/examples/frames-explorer/tree.ts`
- Test: `packages/next/test/framesExplorerTree.test.ts`

**Interfaces:**

- **Consumes:** `Frames`, `Frame` (`name`, `parent`), `EngineeringFrame`, `Trajectory`.
- **Produces:**
  - **`type EdgeKind`:**
    - `"root"`;
    - `"translation"`, a Newtonian origin shift;
    - `"rotation"`;
    - `"translation+rotation"`;
    - `"iers-affine"`, the GCRF edge's eq. 11.19;
    - `"constant"`;
    - `"trajectory"`;
    - `"proj-operation"`, an engineering frame.
  - **`interface TreeNode`:**
    - `id: string`, `label: string`;
    - `frame?: Frame`;
    - `engineering?: EngineeringFrame`;
    - `trajectory?: Trajectory`;
    - `edge: { kind: EdgeKind; detail: string; accuracy: { meters?: number; radians?: number; note: string } }`. The accuracy is the edge's stated model accuracy (R8), and it is `undefined` with a note when unknown, never 0.
    - `children: TreeNode[]`.

    `detail` names the source of the edge. Examples: "ephemeris: earth (DE440)", "IAU 2006/2000A + EOP", "frame bias (IAU 2006)", or for a PROJ operation its pipeline, grids and accuracy.
  - **`buildTree(frames: Frames, extras?: { engineering?: readonly EngineeringFrame[]; trajectories?: readonly Trajectory[]; local?: readonly Frame[] }): TreeNode`.**
    - Engineering frames hang under their body's fixed frame, with a `proj-operation` edge.
    - Trajectories hang under their `reference`.
  - **`pathToRoot(tree: TreeNode, id: string): TreeNode[]`.**

- [ ] **Step 1: Write the failing tests:**
  - The tree's root is ICRF.
  - GCRF's edge is `iers-affine`, and EARTH_ICRF's is `translation`.
  - EME2000 sits under EARTH_ICRF with a `constant` edge. ITRF sits under GCRF with `rotation`. MOON_PA sits under MOON_ME with `constant`.
  - An engineering frame on EARTH sits under ITRF with a `proj-operation` edge whose detail names its grids.
  - A trajectory sits under its reference.
  - `pathToRoot` for MOON_PA is MOON_PA → MOON_ME → MOON_ICRF → ICRF.
  - Every built-in frame in `Frames` appears exactly once.
- [ ] **Step 2: Run** `npx vitest run test/framesExplorerTree.test.ts` and confirm it fails.
- [ ] **Step 3: Implement** `tree.ts`. Edge kinds come from a table keyed by built-in frame name; anything else defaults to its construction type.
- [ ] **Step 4: Run** the test and confirm it passes.
- [ ] **Step 5: Commit** with "examples: frames explorer tree model".

### Task 3: Overlay geometry

**Files:**

- Create: `packages/next/examples/frames-explorer/overlays.ts`
- Test: `packages/next/test/framesExplorerOverlays.test.ts`

**Interfaces:**

- **Consumes:** `frameTransform`, `rotationPart`, `EngineeringFrame` (`toBodyFixed`), `RigidPlacement`, `Trajectory`, `Frames`, `MeshData` (positions, colors, `topology: "line-list"`).
- **Produces pure builders.** Each returns `{ positions: Float64Array; colors: Uint8Array }` in Earth-fixed meters, as line-list pairs:
  - **`triad(frames, frame, instant, length, options?: { biasExaggeration?: number })`.**
    - Three segments from the frame's origin along its x (red), y (green) and z (blue) axes, expressed in ITRF at `instant`.
    - `biasExaggeration` scales the angle of EME2000's frame bias about its own rotation axis, for display only (R4).
  - **`designGrid(frame: EngineeringFrame, extent: { min: [number, number]; max: [number, number] }, step: number, segment: number)`.** Lines of constant design E and N, each sampled every `segment` design units and mapped by `toBodyFixed` at height 0. Each grid line is a polyline drawn as segment pairs.
  - **`trueNorthLines(frame, extent, step, segment)`.** Meridians through the same extent, in geodetic longitude and latitude on WGS84, so that convergence shows against the grid lines.
  - **`rigidVsExact(frame: EngineeringFrame, from: [number, number], to: [number, number], samples: number)`.** Returns `{ exact, rigid, sagAtEnd: number }`: the same design line through `toBodyFixed` and through `RigidPlacement.at(frame, from)`, and their separation in meters at `to`.
  - **`roundTripMarkers(results: readonly { position: ArrayLike<number>; error: number; tolerance: number }[], size: number)`.** Small three-axis crosses colored green when error ≤ 0.1·tol, amber when ≤ tol, red otherwise.
  - **`trajectoryPath(trajectory: Trajectory, drawIn: Frame, frames: Frames, t0: Instant, t1: Instant, step: number, at: Instant)`.**
    - It samples the trajectory's origin in `drawIn` over `[t0, t1]` and maps every sample to ITRF with `drawIn`'s placement at the single instant `at`.
    - Drawing in GCRF gives Orion's figure-eight, and in MOON_ME the swing around the far side.
    - It skips samples in gaps.
- **A thin adapter, `addOverlay(world: World, geometry, scope: DisposableStack): () => void`,** turns the geometry into an unlit line-list mesh plus a draw (`World.addMesh`, `World.addDraw`), using the world's usual transform for large coordinates. It returns a remover and registers that remover in `scope`.

- [ ] **Step 1: Write the failing tests:**
  - **`triad`:** for ITRF at any instant, the axes are the identity directions; for GCRF they equal the columns of `rotationPart(frameTransform(gcrf, itrf, t))`, within 1e-12 (Review Focus 3, transposition).
  - **`designGrid`:** every vertex equals `frame.toBodyFixed([E, N, 0])` for its grid E and N within 1e-9 m. The vertex count follows from `extent`, `step` and `segment`.
  - **`trueNorthLines`:** every vertex has the expected longitude to 1e-12 rad.
  - **`rigidVsExact`:** `sagAtEnd` for a 10 km line is between 6.3 and 9.3 m (plan 4a's 7.8 m ± 1.5). The two polylines coincide at `from` within 1e-6 m, and `exact[i]` equals `toBodyFixed`.
  - **`roundTripMarkers`:** the colors at 0.05, 0.5 and 2 times the tolerance are green, amber and red.
  - **`trajectoryPath`:** with a synthetic constant-velocity trajectory in a frame rotating about z, drawing in the rotating frame gives a different path from drawing in the inertial frame, and both match a hand computation at three samples. Samples in a gap are skipped and don't throw.
- [ ] **Step 2: Run** `npx vitest run test/framesExplorerOverlays.test.ts` and confirm it fails.
- [ ] **Step 3: Implement** `overlays.ts`. Check how `World.addMesh` and `addDraw` take positions far from the origin; plan 1's hi/lo scheme means the transform carries the large part. Follow an existing user of `topology: "line-list"`, for example `src/streaming/debugVolumes.ts`.
- [ ] **Step 4: Run** the test and `npm test`, and confirm they pass.
- [ ] **Step 5: Commit** with "examples: frames explorer overlay geometry".

### Task 4: The example page

**Files:**

- Create:
  - `packages/next/examples/frames-explorer/main.ts`
  - `packages/next/examples/frames-explorer/panel.ts` (if `main.ts` would pass about 400 lines)
- Modify: `packages/next/examples/index.ts` (register it, R1)

**Interfaces:**

- **Consumes:** Tasks 1–3, `ExampleContext`, `loadFrameData`, `createFrames`, `loadProj`, `EngineeringFrame`, `Trajectory.fromOem`, `parseOem`, `viewer.clock`, and the viewer's camera flights (`viewer.zoomTo` or the controller's fly-to; use what the Viewer exposes).
- **The page.** The panel's sections, top to bottom:
  1. **Status.** Each data item's state: not loaded, fetching (with progress), ready or missing (with the setup hint) (R5, R9).
  2. **Tree.**
     - A collapsible list of `buildTree`'s nodes. Each row shows its label and an edge-kind chip, and the detail on hover or expand.
     - Selecting a node highlights its `pathToRoot` in the list, draws triads for every frame on that path, and flies the camera to the selected frame's origin, at a distance suited to it (a site: kilometers; the Moon: 20,000 km).
  3. **Overlays.** Toggles for:
     - triads;
     - the California design grid with true-north lines;
     - a site grid (θ = 12.5°, s = 1.0000375) over it;
     - the rigid and exact 20 km line, with its sag labelled at the far end;
     - round-trip markers from the last test run;
     - Orion's path, drawn in GCRF, ITRF or MOON_ME;
     - the bias-exaggeration slider (R4).
  4. **Clock.** The viewer's time controls. A preset button jumps to the Artemis II flyby (2026-04-06T23:00 UTC). Triads and Orion's path follow the clock.
  5. **Stress tests.** "Run all", or run per group. Results stream into a table: group, title, value against tolerance as a log-scale bar with numbers and unit, pass or fail, and the accuracy statement's total in the row with terms on expand (R8). A summary line gives passed / failed / skipped and the run time.
- **Accuracy and loading UI (R8, R9).** A small `loading.ts` holds the data-item states and their transitions (idle → fetching → ready | missing | error, with abort back to idle), unit-tested in `test/framesExplorerLoading.test.ts`. The panel renders from that model, so an indicator can't stick.
- **Startup.** On start, load frame data and draw the tree, plus the ITRF and ENU triads at a California site. Load PROJ when an engineering overlay or test first needs it (R6). Route every async step through `context.signal` and every drawn item through `context.scope` (Review Focus 5).

- [ ] **Step 1: Write** `main.ts` (and `panel.ts`), and register the example in `examples/index.ts`. The description: "The frame tree and engineering frames, drawn on the globe and stress-tested in the page: every edge labelled, every result checked against its tolerance."
- [ ] **Step 2: Check it in the browser.**
  - Start the dev server (`preview_start` "dyno") and open `/#/examples/frames-explorer`.
  - **Tree:**
    - It shows ICRF at the root with every built-in frame.
    - Selecting MOON_PA highlights its path and flies to the Moon, with its triads drawn.
  - **Overlays:**
    - Turning on the design grid shows grid lines and true-north lines diverging away from the central meridian.
    - The rigid and exact lines separate visibly toward the far end, labelled about 31 m at 20 km (the spec's figure, section 4).
    - Orion's path in GCRF shows the figure-eight, and in MOON_ME the far-side swing.
  - **Accuracy (R8):** every tree row, the selected node's composed statement, every overlay legend and every test row shows an accuracy. Undefined ones read "not bounded" with their reason.
  - **Loading (R9):** with Chromium's network throttling at "Slow 4G" in the page's dev tools (or the preview's equivalent), turning on the design grid shows PROJ's fetch progressing in Status and an inline spinner on the toggle until the grid draws. Turning on Orion's path does the same for the OEM.
  - **Tests:** "Run all" ends with 0 failed. The count equals the data test's, and the round-trip markers appear (Review Focus 2).
  - **Missing data:** restart the dev server with `FRAMES_DATA_DIR` pointing at an empty scratch directory. The page shows the missing-data status, the tree still renders from what's available or explains why not, and the console has no uncaught errors (Review Focus 4). Then restart it normally.
  - **Switching away:** go to another example during "Run all" and during PROJ's first load. The console has no errors, and no overlay or work carries into the next example (Review Focus 5).
  - Take screenshots of the tree with Moon triads, the design grid, the rigid and exact lines, and Orion's figure-eight. Describe them in the report.
  - Stop the server.
- [ ] **Step 3: Run** `npm test`, `npm run test:data`, `npx tsc --noEmit -p .`, `npx eslint` on the changed files, and prettier, and confirm they pass.
- [ ] **Step 4: Commit** with "examples: Frames and projections, the frame tree drawn and stress-tested".

### Task 5: Docs and the plan note

**Files:**

- Modify: `CESIUM2_WEBGPU_PLAN.md` §13.14, `packages/next/README.md` (one line in the frames section pointing at the example)

- [ ] **Step 1: Plan note.**
  - Mark the §13.14 "Carried forward" entry for this example as done, and state what 4b adds: tileset placement modes and the global-geoid cases.
  - Record the data test's case count and run time.
  - List the screenshots' findings.
  - Add the deferred items from this plan's ledger, without nits.
- [ ] **Step 2: README.** Add one line in the frames section pointing at the example.
- [ ] **Step 3: Run the gates:** tsc, eslint, `npm test`, `npm run test:data`, and `snyk_code_scan` on `examples/frames-explorer`.
- [ ] **Step 4: Commit** with "Plan: frames and projections example results".
