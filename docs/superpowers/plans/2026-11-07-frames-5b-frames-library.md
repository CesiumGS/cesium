# Frames 5b: The Frames Library Implementation Plan

**Before starting (2026-11-09):** the file split, its second pass and the sky and observer work landed after this plan was written. Check paths by symbol, and read "What other plans need" in `docs/superpowers/plans/2026-11-08-sky-and-observer.md`, which lists what changes here.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The owner chose subagent-driven execution: a fresh implementer per task, a fresh reviewer after each, and a whole-branch review at the end.

**Goal:** Give `packages/next`'s frames module what plan 5's cameras, replay and measurements stand on: two-vector reference frames with freezing, rig presets on them, piecewise reference frames that change at an instant, accuracy composed beyond first order, rays carried through the frame tree behind 5a's query interface, bulk operations that can be cancelled and report progress, and a time formatter, while closing 5b's carried-forward items.

**Architecture:**

- **New kinds of reference frame, built on `Frame`.** `TwoVectorFrame` and `PiecewiseFrame` are `Frame` subclasses in `src/frames/`. The tree's routes stay static: a piecewise reference frame hangs under a fixed *hub* (the deepest common ancestor of its pieces' parents) and reports the piece's parent through `Frame.parentAt(instant)` for display and accuracy. Velocities and angular velocities come from central differences over ±0.5 s, moved from `measure` into the frames layer.
- **Rig presets are data.** `rigPreset` builds two-vector reference frames, adds them to 5a's catalog as rig users, and returns a plain 5a `Rig`. The camera layer gains `held(view)`, so a rig that keeps its last good pose says why.
- **One accuracy composer.** `FrameAccuracy` gains confidence, shared sources, a rotation axis, a covariance, prediction and estimate flags, and further figures per edge. `pointAccuracy` composes a covariance through each edge's rotation and keeps today's root-sum-square exactly for today's inputs. `separationAccuracy` composes the two legs of a route. `measure`'s `accuracyOf` and the frames explorer's walk are rebuilt on them, and the built-in edges state every term.
- **Rays through the tree, in the core.** 5a's `RayQuery` gains a reference frame, new targets (a body's ellipsoid, an impostor, a tileset's retained geometry) and light-time correction. The core carries rays into each target's anchor through the view's `FrameResolver`, which gains an optional `accuracy` method the frames module fills in.
- **Bulk work in one shape.** `src/core/bulk.ts` (a neutral module) runs any bulk operation in slices with `signal` and `onProgress`. The engine supplies a scheduler that slices under the per-tick budget.
- **Time shown in the time library.** `src/time/format.ts` turns an `Instant` into the parts a UI shows, in UTC (leap second included), a civil zone, solar or nominal time, or the computer's zone. The time controls use it.

**Tech Stack:** TypeScript (float64 on the CPU), Vitest, spiceypy run offline through `uv` for fixtures, Intl for civil zones, Playwright (`bench/run.mjs`) for the two browser checks. No new npm dependencies.

**Spec:** `docs/superpowers/specs/2026-11-07-frames-5-earth-to-moon-design.md`, section 9 (sub-plan 5b) and its done-when list, with sections 5 to 8 for terms and 5a's seams, and sections 10 to 14 for what later sub-plans expect. **Builds on:** `docs/superpowers/plans/2026-11-07-frames-5a-core-and-camera-chain.md`; every 5a name below is that plan's Interfaces blocks'.

**Base:** the commit that closes 5a (its Task 22, "Plan: frames 5a results"). If an executed 5a name differs from its plan, follow `api/surface.txt` and the code, and say so in the task's commit message. Other agents share this checkout: each task starts with `git status` for the files it will change and waits for the owner of any uncommitted edit.

## Calls made by this plan

Each is marked "(plan's call)" where it is used. One line each, then what undoing it costs.

1. **Two-vector frames are geometric only** (SPICE's `ABCORR = 'NONE'`). *Undo:* a vector option later.
2. **A two-vector frame's origin is its parent's origin;** it adds a rotation only. `axesAt(name, origin, axes)` makes a parent with another reference frame's axes at an object's origin. *Undo:* one helper.
3. **Vector kinds:** `position`, `velocity`, `constant`, `nearPoint`, after SPICE's `OBSERVER_TARGET_POSITION`, `OBSERVER_TARGET_VELOCITY`, `CONSTANT` and `TARGET_NEAR_POINT`. *Undo:* a union.
4. **A frozen two-vector frame re-freezes when its inputs' revisions go up** (data arriving), never with time. *Undo:* one comparison.
5. **A two-vector frame is exact by definition** unless the application states its accuracy: its vectors' data errors are on the route's other edges. *Undo:* a default.
6. **Fixture tolerances:** axes within 1 × 10⁻⁸ rad; the near-point two-vector frame within 1 × 10⁻⁷ rad (Earth orientation models differ); angular velocity within 1 × 10⁻⁶ of its size plus 1 × 10⁻¹² rad/s. A worst value past these stops the task for a report; it is never loosened silently. *Undo:* constants.
7. **Presets:** `orbital` is primary +Z up from the central body and secondary +X along the velocity; `inertial` is `orbital` frozen at a given instant; `level` is primary +X the target's forward axis and secondary +Z up; `cockpit` is the target's body-fixed frame. Forward is +X and up +Z unless the options say otherwise. *Undo:* preset data.
8. **A preset's central body defaults to the Earth:** vectors from EARTH_ICRF (TDB-compatible, as SPICE's), axes from GCRF's rotation part. The Moon uses MOON_ICRF for both. *Undo:* a table.
9. **Presets ask the catalog for `"precise"`** by default; the stand-ins state their accuracy while data loads. *Undo:* an option default.
10. **Presets are memoized** per catalog, preset, target, body and central body, except `inertial`, which freezes anew on each call. *Undo:* a map.
11. **`CameraLayer.held(view)`** returns the reference frame and the reason while the layer keeps a view's last good pose. *Undo:* additive.
12. **A figure's confidence** is `"1σ"` (the default), `"95%"` or `"max"`, with an optional distribution, `"normal"` or `"uniform"`. *Undo:* a type.
13. **Conversions to 1σ:** metres at 95% (normal) are a 3D radius: × √3 / 2.7955. Metres at a maximum (uniform) are a ball: × √(3/5). Radians at 95% (normal): ÷ 1.95996. Radians at a maximum (uniform): ÷ √3. Any other non-1σ figure is refused, naming the edge. *Undo:* a table.
14. **A composed total is √(trace C)** of the composed 1σ covariance C. For independent terms that is today's root-sum-square exactly. *Undo:* one line.
15. **Covariances per figure:** metres m give (m²/3)·I; an angle σ about axis a gives σ²(a × r)(a × r)ᵀ; an angle with no axis gives σ²|r|²(I − r̂r̂ᵀ)/2; a stated covariance is used as given. Each is rotated into the target's axes by the route's rotation part. *Undo:* four formulas.
16. **Shared sources** are `{ id, rule }`. `"linear"` (the spec's): same-id figures on one leg add their signed square-root factors, and on opposite legs subtract. `"difference"`: the figure bounds a difference between two edges; a route that crosses such edges on both legs counts the largest once, and one that crosses them on one leg only is not stated, saying why. *Undo:* one rule.
17. **The ephemeris edges** (GCRF, EARTH_ICRF, MOON_ICRF) share the source `DE440 Earth–Moon` with the `"difference"` rule. *Undo:* three declarations.
18. **The "95%" output** is 2.7955 × the 1σ ellipsoid's longest semi-axis (χ² with 3 degrees of freedom), a bound in every direction. *Undo:* a constant.
19. **The ITRF edge states two figures:** UT1 (`σ_t · ω` rad about +Z of ITRF) and polar motion (`σ_p` rad, no axis), each flagged when predicted. *Undo:* restate one figure.
20. **MOON_ME states 3 × 10⁻⁷ rad, estimated,** with the explorer's note (`MOON_ME_ORIENTATION_RADIANS`, exported from `/frames`). *Undo:* one entry.
21. **A trajectory's frame states its accuracy** from `positionCovariance` (else `positionSigma`), with the coordinate-scale figure as a second figure. A zero sigma is exact by definition. *Undo:* one accuracy function.
22. **Light time and relativity are route terms,** owned by `measure`; relativity applies when the route crosses MOON_ICRF's edge. *Undo:* move one onto an edge.
23. **`AccuracyTerm.edge`** names the reference frame whose edge a term is on, so the explorer ties terms to edges without guessing from `source`. *Undo:* an optional field.
24. **`publishedAccuracy` compares every figure,** and publishes when any moves past 1% or 1 mm (5a's rule), or when the figures' count or kinds change. *Undo:* one loop.
25. **A piecewise frame's pieces are half-open:** piece *i* is valid from its `from` to the next piece's `from`; the last until `until`, or forever. Outside, it throws `FrameUnavailableError` with `reason: "outsideData"`. *Undo:* one comparison.
26. **Continuity tolerance:** 0.01 m and 0.01 m/s by default (above the ±0.5 s difference's quantization noise of about 1 mm/s). Only the origin's position and velocity are checked; axes may change at a change. *Undo:* defaults.
27. **A piecewise frame is built only when every change can be evaluated;** otherwise building throws the `FrameUnavailableError` it met. *Undo:* deferred checks.
28. **`treeInUse(at?)`** gives each entry its `parent` at `at` (`parentAt`), and includes that parent's ancestors. *Undo:* additive.
29. **A query's `from` is the receiver** under light-time correction: each target is placed at `seconds − τ`, with τ the light time to the ray's closest point to the target's anchor origin, iterated twice. *Undo:* one function.
30. **Terrain bands** (`Body.terrainBand`): the Earth −11,000 m to 9,000 m, the Moon −9,200 m to 10,800 m, both above their ellipsoids. A span above the band is clear and one below it is blocked, without tiles. *Undo:* two constants.
31. **An impostor target answers from its body's ellipsoid** with relief `max(|min|, max)` of the band: blocked inside the ellipsoid shrunk by the relief, clear outside the one grown by it, and `withinError` between. *Undo:* one rule.
32. **A tileset's retained geometry is known where a tile is drawn** this tick (`viewMask ≠ 0`) with geometry; `standInMask ≠ 0` there is `notRefined`; a span inside the root's volume with no drawn tile is `notLoaded`. A miss closer than the tile's geometric error to a triangle is `withinError`. *Undo:* the backend.
33. **A resolver without `accuracy`** (the core's table resolver) gives an exact route, "the transform table states no error". *Undo:* one default.
34. **Every plan-5 bulk operation runs in slices.** None has inputs that transfer cheaply (they close over the frame tree, PROJ's heap or an engineering frame), so no worker executor is built in 5b. *Undo:* a later executor.
35. **Slice budgets:** 8 ms per slice from `timeSlices()`, 4 ms per tick from `Engine.bulk`. Progress is reported after each slice and at the end. *Undo:* constants.
36. **`measureSpan` becomes asynchronous** with the bulk shape; only tests call it. *Undo:* keep a synchronous twin.
37. **PROJ batches** are `EngineeringFrame.toBodyFixedBatch` and `fromBodyFixedBatch`, on flat xyz arrays. *Undo:* two methods.
38. **The formatter's zone kinds** are `utc`, `civil`, `solar`, `nominal` and `local`, with longitudes in radians, east positive. The solar offset is fractional minutes; its label rounds to the minute. *Undo:* a type.
39. **`placeZone`** gives a civil zone when the lookup answers with a name Intl knows, and solar time otherwise, labelled so. *Undo:* one function.
40. **The time controls keep "nominal" as their default** unless the application gives a `zoneLookup`; then the new `"place"` choice is the default. *Undo:* one default.
41. **`ianaOffsetMinutes` and `ianaAbbreviation` move to `src/time/format.ts`;** `widgets/timeControls.ts` re-exports them. *Undo:* a move.
42. **Explicit timeouts on the three slow data tests are 30 s.** *Undo:* constants.
43. **Ports:** Task 9 checks on 5192, Task 12 on 5191, Task 13 on 5193. *Undo:* none.

## Rulings on the spec

Places where the spec, read against the code and 5a's plan, is contradictory or can't be built as written, and what this plan does.

1. **"Terms with the same id add linearly"** (section 9.4) against DE440's figure and "numbers may move only where a bound tightens". DE440's 0.01 m is the Earth–Moon fit, a difference, which today's `accuracyOf` claims only when a route joins the Earth's and the Moon's subtrees. Added linearly over two edges it gives 0.02 m; root-sum-square gives 0.014 m; either loosens today's figure, and keeping 0.01 m on one edge alone claims it for the Earth's barycentric position. *Ruling:* calls 16 and 17, which reproduce `accuracyOf`'s ephemeris term on every route.
2. **"The explorer's catalog numbers may move only where a bound tightens"** against the anti-goal of claiming more than the inputs. Stating MOON_ME's orientation in the library makes `measure`'s statements across MOON_ME larger (the term was missing). *Ruling:* such moves are listed separately as corrections, each with its reason. The explorer's own walk already carried MOON_ME's term, so its shown numbers do not move for it; the moves test (Task 5) proves which do.
3. **Relativity's home.** The carried-forward note puts the Moon's relativity term "on its edge"; section 9.4 lists relativity among terms on no edge. *Ruling:* the spec: a route term (call 22).
4. **"Runs in a worker when its inputs can be transferred"** (section 9.6). None of plan 5's four bulk operations has such inputs. *Ruling:* call 34.
5. **Central differences live in `measure`** (`src/measure/motion.ts`), which the frames layer may not import (5a's dependency rule). *Ruling:* `positionIn`, `derivative` and `velocityIn` move to `src/frames/motion.ts`, and `measure` re-exports them unchanged.
6. **"Its parent is the current piece's"** (section 9.3) against `Frame.parent`, which is fixed and which `frameTransform`, 5a's `routeRevision` and the catalog read without an instant. *Ruling:* a static hub parent for routes, `Frame.parentAt(instant)` for display and accuracy (calls 25 to 28). Matrices are exact either way.
7. **"Keeps its last good orientation and says why"** (section 9.1). 5a's camera layer keeps the pose and reports once through `EngineErrors`, which an application can't read back. *Ruling:* call 11.
8. **The impostor is 5c's** (section 10.4), and 5c may land after 5b. *Ruling:* the `impostor` ray target needs only its `Body` (call 31), so 5c adds nothing for rays.
9. **Rays need route accuracy in the core,** which may not import the frames module. *Ruling:* `FrameResolver.accuracy?` (an optional method on 5a's core interface), filled in by `createFramesResolver` (call 33).
10. **`Frame.revision`.** 5a declares `readonly revision: number`. A two-vector or piecewise frame's revision must include its inputs' (section 7.8: a consumer redoes work only when something moved). *Ruling:* Task 2 makes `revision` an overridable getter over a private counter, if 5a made it a field, and 5a's cache keeps reading `this.revision`.
11. **"Without a lookup, a place's time is its solar time"** (section 9.7) against the time controls' shipped default, "nominal". *Ruling:* the formatter follows the spec (`placeZone`); the controls change only when an application gives a lookup (call 40), so no page's clock moves.
12. **A two-vector frame "frozen in GCRF"** (section 9.2). GCRF's matrix carries eq. 11.19's scale and shear, about 2.5 × 10⁻⁸, which would tilt a direction by about 10⁻⁸ rad. *Ruling:* axes from GCRF's rotation part, vectors from EARTH_ICRF (call 8).

## Global Constraints

Copied from 5a's plan where they apply, with 5b's additions.

- **Precision** (spec section 4): "Float64 on the CPU throughout. The GPU sees only camera-relative values (hi/lo and camera-relative, §13.15)." Rays and hits stay float64 on the CPU.
- **Earth-only scenes are unchanged:** "The parity pages, the bench gate and every test keep passing." This holds after every task.
- **Pay for what you use:** a globe-only Viewer downloads nothing new, fetches no frames data and no Moon content, and does no new work per tick. An idle `Engine.bulk` registers no tick listener.
- **The dependency rule** (spec section 7.7): the core imports nothing from `frames`, `proj` or `measure`, and nothing from `time`. `time` imports nothing but the math module and the clock interface. `frames` imports `time` and core types only (values only from `src/scene/Body.ts` and `src/camera/frameResolver.ts`). `measure` imports `frames`. The Viewer and the widgets may import `time` without `frames`. 5a's `test/importBoundary.test.ts` enforces it; a new time file joins its time-layer list.
- **Browser only.** No server-side computation. Data lives outside the repo (`~/.cesium-bench/…`, `FRAMES_DATA_DIR`), fetched by `npm run setup`. **Fixtures** are generated offline by `scripts/frameFixtures.py` with spiceypy through `uv`, as its docstring says; only their small JSON is committed.
- **No ion tokens** in the repo, builds, URLs, logs, storage or the DOM. The library never adds ion content on its own.
- **Examples are documentation:** public API only; where an example reaches past it, record it for 5i in the task's commit message.
- **Repository practice:**
  - Commands run in `packages/next`.
  - Commit locally and never push. End each message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  - Other agents share this checkout. Commit only your task's files, by path (`git add -- <paths>` then `git commit -m "…" -- <paths>`). Check `git diff --cached --name-only` first. Never `git add -A`, `git stash`, `git checkout`, `git reset` or `git push`. While `.git/index.lock` exists, wait and retry.
  - Node 24 (`engines`). No shader changes in 5b.
- **Testing cadence per task:** the task's focused tests (`npx vitest run <files>`; data tests `FRAMES_DATA=1 npx vitest run test/data/<file>`), `npx tsc --noEmit -p .`, and `npx eslint` and `npx prettier --check` on the changed files. A task that changes `src/frames`, `src/time`, `src/ephemeris`, `src/trajectory`, `src/measure` or `src/engineering` also runs `npm run test:data`. A task that changes `World`, `View`, `Engine`, `CameraLayer` or `Tileset3D` also runs `npm test`.
- **The surface map:** every task that changes an entry point's exports runs `npm run surface` and commits `api/surface.txt` with its code. The reviewer reads `git diff -- api/surface.txt` as the task's surface diff.
- **GPU safety:** Node tests first (`test/fakeGpu.ts`'s `fakeEngine`). A browser check uses one small page at a time, on the port its task names (5191 to 5197), with the task's own server: `npx vite --port <port> --strictPort`, started in the background and stopped afterwards, or `BENCH_URL=http://127.0.0.1:<port> node bench/run.mjs <one suite>`. **Never** use, restart or stop the server on 127.0.0.1:5190.
- **Snyk:** each task runs `snyk_code_scan` on the first-party files it adds or changes before it commits, fixes what the scan finds in its own code, and rescans until clean. Findings that predate 5b are reported, not fixed.
- **Wording:**
  - "Frame" is never used alone: a *reference frame*, a *tick* ("per tick", never "per frame"), *render space*, *render root*. Compounds that can't be misread keep their names: the frame tree, the frames module, a two-vector frame, a body-fixed frame, an engineering frame, a piecewise reference frame. Code names (`Frame`, `TwoVectorFrame`) keep their names.
  - House style for docs, comments and UI text: plain, short sentences, units and datums named, no e-notation in prose.
  - Describe the purpose in generic words ("an embeddable rendering core", "a host application's own services").

## Review Focus

1. **A two-vector frame whose inputs can't answer:** the target's trajectory has ended, its data is still loading, or a frozen two-vector frame's freeze instant is outside the data. It throws the input's own error (a `FrameUnavailableError` passed through as it is, or the trajectory's error naming its covered span), never a matrix of NaNs, so a rig on it holds its last good pose, `held(view)` names the reference frame and the reason, and the next good tick resumes. Tests: Tasks 2 and 3.
2. **A clock scrubbed backwards across a piecewise change, or landing exactly on it:** the later piece is chosen at the change instant, `parentAt` and `toParent` agree at every instant, and a cached matrix from the other side never leaks. Test: Task 6.
3. **Mixed confidences on one route:** a 95% figure with no distribution, or a hard maximum, beside 1σ edges. The total is refused with the edge named, never summed as if all were 1σ; a converted figure says what it was. Test: Task 4.
4. **A leap second in a civil zone:** 2016-12-31 23:59:60 UTC shown in Asia/Tokyo reads 08:59:60 on 1 January 2017, though Intl can't show second 60. Test: Task 11.
5. **A ray whose route can't be resolved:** an instant outside a trajectory's data, a reference frame still loading, or a target whose anchor the resolver doesn't know. That ray answers `unknown` with a reason; the query never rejects for it, and the other rays still answer. Test: Task 7.

---

## File structure

New files, by responsibility (modified files are listed in each task):

- **Motion in the frames layer:** `src/frames/motion.ts` (`positionIn`, `derivative`, `velocityIn`, `frameVelocity`, `angularVelocity`).
- **Two-vector frames:** `src/frames/twoVector.ts`.
- **Presets:** `src/frames/presets.ts`.
- **Piecewise reference frames:** `src/frames/piecewise.ts`.
- **Accuracy:** `src/frames/frameAccuracy.ts` and `src/frames/pointAccuracy.ts` (modified), `src/frames/covariance.ts` (3×3 symmetric helpers and the eigen-decomposition).
- **Rays through the tree (core):** `src/query/frameRays.ts`, `src/query/ellipsoidBackend.ts`, `src/query/geometryBackend.ts`.
- **Bulk work:** `src/core/bulk.ts` (neutral), `src/frames/bulk.ts` (`samplePath`, `accuracySpan`).
- **Showing time:** `src/time/format.ts`.
- **Tests and fixtures:** `test/fixtures/frames/twoVector.json`, `test/fixtures/frames/accuracyBaseline.json`, `test/fixtures/frames/accuracyMoves.json`, `test/data/explorerPages.ts` (shared page helpers), and the test files each task names.

---

### Task 1: Test groundwork: the accuracy baseline and explicit timeouts

**Files:**

- Create: `test/data/explorerPages.ts`, `test/data/accuracyBaseline.test.ts`, `test/fixtures/frames/accuracyBaseline.json`
- Modify: `test/data/framesExplorerStated.test.ts` (imports the moved helpers), `test/data/trajectory.test.ts`, `test/data/sky.test.ts`

**Interfaces:**

- Produces:
  - `test/data/explorerPages.ts`: the page helpers `test/data/framesExplorerStated.test.ts` builds today, moved unchanged: `frames`, `orion`, `context()`, `connect()`, `pageFrames(id, knobs, e)`, `pageTree(id, knobs, e, instant)`, `checkedTdb(id)`, `spec(id)`.
  - `accuracyRows(): Promise<AccuracyRow[]>`, also in `test/data/explorerPages.ts` (Task 5's moves test reads it), with `interface AccuracyRow { readonly key: string; readonly meters: number | null }`:
    - for every scenario in `SCENARIOS` at its checked setup, on `pageTree`, each `composedAccuracy(tree, frames, instant)` view: key `scenario/<id>/<reference>/<node>`;
    - `measure(a, b, instant, frames).accuracy.meters` for six cases at 2026-04-06T12:00:00 UTC: DSS-43 to Orion, Orion to the Moon's centre, a lunar site at 89.5° S to the Earth's centre, two Earth sites 1 km apart, the barycentre to the Earth's centre, and Orion to DSS-14: key `measure/<case>`.
  - The baseline file: `{ "commit": "<base>", "rows": AccuracyRow[] }`, sorted by key.

- [ ] **Step 1: Move the helpers.** Cut them from `test/data/framesExplorerStated.test.ts` into `test/data/explorerPages.ts` and import them back. Run `FRAMES_DATA=1 npx vitest run test/data/framesExplorerStated.test.ts`; it passes as before.
- [ ] **Step 2: Write the baseline test.** With `WRITE_ACCURACY_BASELINE=1` it writes the file; without it, it checks the code against the file:

```ts
it("today's composed accuracies equal the baseline (regenerate only at a commit that changes no accuracy)", async () => {
  const rows = await accuracyRows();
  const baseline = JSON.parse(readFileSync(BASELINE, "utf8")) as { rows: AccuracyRow[] };
  expect(rows.map((r) => r.key)).toEqual(baseline.rows.map((r) => r.key));
  rows.forEach((r, i) => expect(r.meters).toBe(baseline.rows[i]!.meters));
});
```

- [ ] **Step 3: Write the baseline** before any other change: `WRITE_ACCURACY_BASELINE=1 FRAMES_DATA=1 npx vitest run test/data/accuracyBaseline.test.ts`, then run it again without the flag and confirm it passes. Record the row count in the commit message.
- [ ] **Step 4: Explicit timeouts** (plan's call 42): `{ timeout: 30_000 }` on "agree within 0.5 m inside the OEM's segments when both are read as EME2000" and "gives Artemis's first position sigma, read as m^2 (R7)" (`test/data/trajectory.test.ts`), and on "prints its per-call cost" (`test/data/sky.test.ts`).
- [ ] **Step 5: Run** `npm run test:data`, tsc, eslint, prettier.
- [ ] **Step 6: Commit** the files above with "test: an accuracy baseline before 5b's composer; explicit timeouts on three slow data tests".

### Task 2: Two-vector frames

**Files:**

- Create: `src/frames/motion.ts`, `src/frames/twoVector.ts`, `test/twoVector.test.ts`, `test/data/twoVector.test.ts`, `test/fixtures/frames/twoVector.json`
- Modify: `src/measure/motion.ts` (re-exports), `src/frames/Frame.ts` (`revision` getter, `parentAt`), `src/frames/resolver.ts` (`motion` delegates), `src/frames/index.ts`, `scripts/frameFixtures.py` (section `twoVector`), `api/surface.txt`

**Interfaces:**

- Consumes: 5a's `Frame.revision`, `invalidate()`, `routeRevision(from, to)`; `FrameUnavailableError`; `createFramesResolver(catalog).motion`.
- Produces:
  - `src/frames/motion.ts` (ruling 5): `positionIn`, `derivative`, `velocityIn` and `type Sampler`, moved from `src/measure/motion.ts` with their behaviour and doc comments unchanged; `src/measure/motion.ts` re-exports them. New:
    - `frameVelocity(frame: Frame, base: Frame, instant: Instant, out?: Float64Array): Float64Array`: the velocity (m/s, `base`'s axes) of `frame`'s origin, by `derivative`;
    - `angularVelocity(frame: Frame, base: Frame, instant: Instant, out?: Float64Array): Float64Array`: rad/s in `base`'s axes, from the skew part of `Ṙ Rᵀ`, with `R` the rotation part of `frameTransform(frame, base, ·)` differenced over ±0.5 s TDB (one-sided at a data edge, as `derivative`).
  - `createFramesResolver(…).motion` returns `frameVelocity` and `angularVelocity` at `instant(seconds)`.
  - On `Frame` (ruling 10): `get revision(): number` over a private counter; `parentAt(instant: Instant): Frame | undefined`, `this.parent` by default.
  - `src/frames/twoVector.ts`:
    - `type Axis = "+X" | "-X" | "+Y" | "-Y" | "+Z" | "-Z"`;
    - `type VectorDefinition` (plan's call 3), every vector geometric (plan's call 1):
      - `{ kind: "position"; target: Frame; observer: Frame }`: `target`'s origin from `observer`'s origin;
      - `{ kind: "velocity"; target: Frame; observer: Frame; frame: Frame }`: the derivative, taken in `frame`, of that position;
      - `{ kind: "constant"; vector: ArrayLike<number>; frame: Frame }`;
      - `{ kind: "nearPoint"; observer: Frame; bodyFixed: Frame; ellipsoid: Ellipsoid }`: from `observer`'s origin to the nearest point of `ellipsoid` in `bodyFixed` (`scaleToGeodeticSurface`);
    - `interface TwoVectorDefinition { readonly primary: { readonly axis: Axis; readonly vector: VectorDefinition }; readonly secondary: { readonly axis: Axis; readonly vector: VectorDefinition }; readonly freeze?: Instant; readonly minimumAngle?: number }` (`minimumAngle` in radians, default 0.001, SPICE's);
    - `class TwoVectorFrame<N extends string = string> extends Frame<N> { readonly definition: TwoVectorDefinition }`: its revision is its own plus the route revisions of every reference frame its vectors name, to its parent (so 5a's cache recomputes when data arrives);
    - `twoVectorFrame<N extends string>(name: N, parent: Frame, definition: TwoVectorDefinition, options?: Pick<FrameOptions, "accuracy">): TwoVectorFrame<N>`: the primary axis along the primary vector; the secondary axis in the plane of the two vectors, on the secondary's side; the third completing a right-handed set. The origin is `parent`'s (plan's call 2). Each vector is evaluated as a vector in `parent`'s axes through the rotation part of the route. Accuracy exact by definition unless given (plan's call 5). With `freeze`, the matrix is the one at `freeze`, recomputed only when the revision changes (plan's call 4);
    - `axesAt<N extends string>(name: N, origin: Frame, axes: Frame): Frame<N>`: a child of `origin` with `axes`' axes (the rotation part of `frameTransform(axes, origin, ·)`, no translation), exact by definition;
    - `class TwoVectorDegenerateError extends Error { readonly frame: string; readonly angle: number; readonly minimum: number; readonly at: Instant }`, thrown when the two vectors are closer than `minimumAngle` to parallel or antiparallel, or either is zero;
    - building throws a `RangeError` naming the reference frame when the two axes are the same or opposite, or `minimumAngle` isn't finite and positive.
  - `twoVector.json` (written by `frameFixtures.py twoVector <store> <frame kernel> <earth pck>`, the kernels the `signal` section takes): SPICE reference frames defined in the pool with `sp.lmpool`:
    - `ORION_LVLH` (center −24, relative J2000): primary +Z `OBSERVER_TARGET_POSITION` Earth → −24; secondary +X `OBSERVER_TARGET_VELOCITY` Earth → −24 in J2000;
    - `ORION_INERTIAL`: `ORION_LVLH`'s definition with `FREEZE_EPOCH` 2026-04-04T00:00:00 TDB;
    - `EARTH_MOON_ROT` (center Earth): primary +X position Earth → Moon; secondary +Y velocity Moon from Earth in J2000;
    - `ORION_NADIR`: primary −Z `TARGET_NEAR_POINT` from −24 to the Earth (`BODY399_RADII` WGS84, `OBJECT_EARTH_FRAME = 'ITRF93'`); secondary +X velocity as `ORION_LVLH`;
    - `ORION_BODY`: a fixed-offset (TK) reference frame on −24, angles (30°, 20°, 10°) about axes (3, 2, 1) from J2000;
    - `ORION_LEVEL`: primary +X `CONSTANT` (1, 0, 0) in `ORION_BODY`; secondary +Z position Earth → −24.
    - Rows at 12 TDB instants (10 evenly spread from 60 s after the Artemis data's start to 60 s before its end, plus the closest approach to the Moon and one hour after it): per reference frame, `toJ2000` (`pxform(frame, "J2000")`, row-major) and `angularVelocity` (rad/s in J2000, from `sxform`). Also `freezeTdb` and `orionBodyToJ2000`.

- [ ] **Step 1: Generate the fixture** with `uv run --with spiceypy --with numpy python scripts/frameFixtures.py twoVector <store> <frame kernel> <earth pck>`, and commit only the JSON it writes with the script change.
- [ ] **Step 2: Write the failing Node tests** (`test/twoVector.test.ts`, on a root and constant or moving `Frame`s):

```ts
it("puts the primary axis along the primary vector and the secondary in their plane", () => {
  const f = twoVectorFrame("F", root, {
    primary: { axis: "+Z", vector: { kind: "constant", vector: [0, 0, 2], frame: root } },
    secondary: { axis: "+X", vector: { kind: "constant", vector: [1, 1, 0], frame: root } },
  });
  const m = f.toParent(at);
  expectColumns(m, [[1 / Math.SQRT2, 1 / Math.SQRT2, 0], [-1 / Math.SQRT2, 1 / Math.SQRT2, 0], [0, 0, 1]], 1e-15);
});
it("gives a right-handed set for every legal pair of axes", ...);  // 24 pairs; det = +1, primary column · primary vector > 0
it("refuses the same or opposite axes, naming the reference frame", () =>
  expect(() => twoVectorFrame("F", root, { primary: { axis: "+X", … }, secondary: { axis: "-X", … } })).toThrow(/"F"/));
it("throws TwoVectorDegenerateError below 1 mrad, and not above it", () => {
  // vectors 0.5 mrad apart throw (angle 0.0005, minimum 0.001); 1.5 mrad apart give a frame
});
it("a frozen frame keeps its freeze instant's matrix, and re-freezes when an input's revision goes up", ...);
it("takes a velocity vector's derivative in its stated reference frame", ...);  // a target on a 1,000 km circle at 1 rad per 1,000 s
it("passes an input's own error through when a vector's reference frame can't answer", ...);  // Review Focus 1: FrameUnavailableError as it is; a trajectory's error past its data; no NaN matrix
it("its revision includes its inputs' route revisions", ...);
it("the resolver's motion reports the two-vector frame's angular velocity", ...);  // 0.001 rad/s about Z within 1e-12
```

- [ ] **Step 3: Write the failing data test** (`test/data/twoVector.test.ts`): build Orion with `Trajectory.fromSpk([main, gapfill], -24, frames, { name: "ORION", accuracy: "precise", j2000: "icrf" })` and ITRF from the store's EOP, as `test/data/trajectory.test.ts` does; build the six reference frames with `axesAt` parents; at each row, the angle between `rotationPart(frameTransform(ours, frames.icrf, at))` and `toJ2000` is under the tolerances of plan's call 6, and `angularVelocity(ours, frames.icrf, at)` agrees with the row's. Print each reference frame's worst angle and rate error.
- [ ] **Step 4: Run** both and confirm they fail.
- [ ] **Step 5: Implement** `motion.ts` (the move first, then `frameVelocity` and `angularVelocity`), the `Frame` changes, then `twoVector.ts`, then the resolver's `motion`.
- [ ] **Step 6: Run** the tests, `npm run test:data` (the explorer's numbers must not move; Task 1's baseline test passes), the boundary test, tsc, eslint, prettier. A worst value past plan's call 6 stops the task for a report.
- [ ] **Step 7: Surface and commit** with "frames: two-vector frames (SPICE's, geometric), freezing, and angular velocity by central differences". Record the worst values.

### Task 3: Rig presets, and a held rig that says why

**Files:**

- Create: `src/frames/presets.ts`, `test/presets.test.ts`, `test/data/presets.test.ts`, `test/cameraHeld.test.ts`
- Modify: `src/camera/CameraLayer.ts`, `src/frames/index.ts`, `src/index.ts`, `api/surface.txt`

**Interfaces:**

- Consumes: Task 2's `twoVectorFrame`, `axesAt`; 5a's `Rig`, `RigPosition`, `RigOrientation`, `CameraLayer.setRig`, `FrameCatalog.get` and `add`, `Precision`, `createFramesResolver`.
- Produces:
  - `type RigPresetName = "cockpit" | "orbital" | "inertial" | "level"`;
  - `interface RigPresetOptions { readonly catalog: FrameCatalog; readonly target: Frame; readonly body?: Frame; readonly central?: Body; readonly at?: Instant; readonly forward?: Axis; readonly up?: Axis; readonly precision?: Precision }`: `target` is the followed object's reference frame (its origin is the object); `body` its body-fixed frame (required by `cockpit` and `level`, a `RangeError` naming the preset otherwise); `at` the freeze instant (required by `inertial`); `central` default `EARTH` (plan's call 8); `precision` default `"precise"` (plan's call 9); `forward` and `up` default `"+X"` and `"+Z"`, in `body` (plan's call 7);
  - `interface RigPreset { readonly name: RigPresetName; readonly rig: Rig; readonly frames: readonly Frame[] }`;
  - `rigPreset(name: RigPresetName, options: RigPresetOptions): RigPreset` (plan's calls 7 and 10). Each preset's `rig.position.frame` is the preset's reference frame, with no `offset` (the controller places the camera), and `rig.orientation` is `{ kind: "axes", frame, forward, up }` on it:
    - `cockpit`: `body` for both;
    - `orbital`: `"<target> orbital"`, a two-vector frame under `axesAt("<target> axes", target, centralAxes)`: primary +Z `position` of `target` from the central observer; secondary +X `velocity` of `target` from it, in `centralAxes`;
    - `inertial`: `"<target> inertial <ISO at>"`, `orbital`'s definition with `freeze: at`;
    - `level`: `"<target> level"`: primary +X `constant` `forward` in `body`; secondary +Z `position` of `target` from the central observer.
    - Every frame it builds is added to the catalog with user `"rig"`. The rig is plain data: an application can read it, change one part and set the result.
  - `CameraLayer.held(view: View): { readonly frame: string; readonly reason: string } | undefined` (plan's call 11): set while the layer keeps a view's last good pose because a reference frame threw or gave a non-finite matrix (`reason` is the error's message), and cleared on the next good tick.

- [ ] **Step 1: Write the failing tests:**
  - `test/presets.test.ts` (the catalog on 5a's stubbed data, a synthetic target):
    - each preset names the frames above and its rig's position reference frame is its own;
    - `orbital`'s third axis completes the set, and its +Z column points away from the Earth's centre;
    - `inertial` at two instants is the same matrix; two calls give two frames;
    - `cockpit` without `body` throws naming "cockpit";
    - the rig is data: `engine.cameras.setRig(view, { ...p.rig, orientation: { ...p.rig.orientation, up: [0, 1, 0] } })` is accepted and read back;
    - memoized: two `orbital` calls for one target return the same reference frame.
  - `test/cameraHeld.test.ts` (`fakeEngine`, a stub resolver that throws for a span of ticks): `held(view)` names the reference frame and the message while the throw lasts and is `undefined` after; the camera's pose is the last good one throughout. Then on the frames module: a rig on a two-vector frame whose vectors turn parallel holds, with a reason naming "degenerate" and the angle (Review Focus 1); a rig on `orbital` past Orion's data holds, its reason the trajectory's message naming the covered span; a frozen `inertial` whose freeze instant is outside the data holds the same way.
  - `test/data/presets.test.ts` (the store, as Task 2's data test): `orbital` matches `ORION_LVLH`, `inertial` at `freezeTdb` matches `ORION_INERTIAL` at every row, `level` on `ORION_BODY` matches `ORION_LEVEL`, and `cockpit`'s axes match `ORION_BODY`, all within plan's call 6.
- [ ] **Step 2: Run** and confirm they fail.
- [ ] **Step 3: Implement** `presets.ts`, then `held` in `CameraLayer`.
- [ ] **Step 4: Run** the tests, `npm test`, `npm run test:data`, tsc, eslint, prettier.
- [ ] **Step 5: Surface and commit** with "frames: rig presets (cockpit, orbital, inertial, level) as data; the camera layer says why a rig holds".

### Task 4: The accuracy composer beyond first order

**Files:**

- Create: `src/frames/covariance.ts`, `test/accuracyComposer.test.ts`
- Modify: `src/frames/frameAccuracy.ts`, `src/frames/pointAccuracy.ts`, `src/frames/Frame.ts` (`publishedAccuracy` over every figure), `src/frames/index.ts`, `test/frameAccuracy.test.ts`, `api/surface.txt`

**Interfaces:**

- Consumes: 5a's `Frame.publishedAccuracy`; `rotationPart` (`src/frames/matrix.ts`).
- Produces:
  - In `frameAccuracy.ts`:
    - `type Confidence = "1σ" | "95%" | "max"` (plan's call 12);
    - `interface SharedSource { readonly id: string; readonly rule: "linear" | "difference" }` (plan's call 16);
    - `interface AccuracyFigure { meters?: number; radians?: number; confidence?: Confidence; distribution?: "normal" | "uniform"; axis?: readonly [number, number, number]; covariance?: ArrayLike<number>; source?: SharedSource; term?: string; predicted?: boolean; estimated?: boolean; note?: string }`: `axis` is a unit vector in the reference frame's own axes, for `radians`; `covariance` is a row-major 3×3 in m² at 1σ in the reference frame's own axes, and `meters`, if also given, equals √(trace); `term` is a short name for the figure ("UT1", "polar motion");
    - `FrameAccuracy` extends `AccuracyFigure` (today's `meters`, `radians`, `byDefinition`, `note` unchanged) with `parts?: readonly AccuracyFigure[]` (further figures on the same edge) and `simulated?: true` (no claim: a simulated span);
    - `checkedAccuracy` also refuses, naming the frame: an axis that isn't unit within 1 × 10⁻⁹; a covariance that isn't symmetric, positive semi-definite or finite; a covariance whose `meters` disagrees with √(trace) by more than 1 × 10⁻⁹ of it; a covariance not at 1σ; `simulated` with any figure.
  - In `pointAccuracy.ts`:
    - `PointAccuracyTerm` keeps its three kinds, each with optional `confidence`, `converted` (what it was, in words: "95% (normal) read as 1σ: × 0.6196"), `source`, `term`, `predicted`, `estimated`, and `axis` on `angular` (whose `lever` is the distance from the axis, or from the origin without one); new kinds `"simulated"` and `"route"` (a term on no edge), and `"refused"` (a figure that can't be converted, with the reason);
    - `PointAccuracy` adds `confidence: "1σ" | "95%"`, `covariance?: Float64Array` (row-major 3×3, m², 1σ, in `to`'s axes; absent when unbounded), `ellipsoid?: { semiAxes: Float64Array; axes: Float64Array }` (1σ semi-axes, longest first, and their unit directions as columns), `refusedBy?: string`, `simulatedBy?: string`;
    - `interface RouteTerm { readonly source: string; readonly meters: number | undefined; readonly note: string; readonly confidence?: Confidence; readonly distribution?: "normal" | "uniform"; readonly covariance?: ArrayLike<number> }` (a covariance in the result's axes);
    - `interface PointAccuracyOptions { readonly confidence?: "1σ" | "95%"; readonly routeTerms?: readonly RouteTerm[] }`;
    - `pointAccuracy(point: FramePoint, to: Frame, instant?: Instant, options?: PointAccuracyOptions): PointAccuracy`;
    - `separationAccuracy(a: FramePoint, b: FramePoint, instant?: Instant, options?: PointAccuracyOptions & { readonly axes?: Frame }): PointAccuracy`: the accuracy of `b − a`, composed over both legs of the route through their lowest common ancestor, each leg's levers at its own end, in `axes`' axes (default that ancestor's);
    - `routeLegs(from: Frame, to: Frame, instant: Instant): { readonly up: readonly Frame[]; readonly down: readonly Frame[] }`: each edge named by its child reference frame, nearest the ends first (Task 6 expands piecewise edges here).
  - The rules (plan's calls 13 to 18): each figure becomes a 1σ covariance at the point (call 15), converted by call 13 or refused; same-source figures combine by call 16; the total is √(trace C) (call 14) and, at `"95%"`, call 18's bound. A refused or simulated term makes `meters` undefined, as an unstated one does, and names itself in `refusedBy` or `simulatedBy`.
  - `src/frames/covariance.ts`: `rotateCovariance(c, r, out)` (`R C Rᵀ`), `symmetricSqrt(c, out)`, `eigenSymmetric(c): { values: Float64Array; vectors: Float64Array }` (Jacobi, at most 50 sweeps).
  - `publishedAccuracy` compares every figure, top level and parts (plan's call 24).

- [ ] **Step 1: Write the failing tests** (`test/accuracyComposer.test.ts`, synthetic frames):

```ts
it("today's inputs give today's numbers", () => {
  // every case in test/frameAccuracy.test.ts: meters equal to 1e-15 relative, the same terms in the same order
});
it("an angle about a stated axis has the distance to the axis as its lever", () => {
  // σ = 1e-6 rad about +Z, point (3000, 4000, 12000) m: lever 5,000 m, 0.005 m
});
it("two figures with one linear source add linearly; others root-sum-square", () => {
  // two 1e-6 rad encoders on one shaft (same id), point 1 km out on the same leg: 0.002 m; different ids: 0.001414 m
});
it("a difference source counts once across both legs, and is not stated on one leg", ...);
it("converts a 95% normal figure and a uniform maximum, saying so", () => {
  // 1 m at 95% (normal) → 0.6196 m at 1σ, with converted set; 1 m maximum (uniform) → 0.7746 m
});
it("refuses a 95% figure with no distribution, naming the edge", () => {   // Review Focus 3
  const p = pointAccuracy(at(child95), root);
  expect(p.meters).toBeUndefined();
  expect(p.refusedBy).toBe("CHILD");
  expect(p.terms.at(-1)!.kind).toBe("refused");
});
it("refuses a hard maximum with no distribution beside 1σ edges", ...);  // Review Focus 3
it("composes a covariance through each edge's rotation into an error ellipsoid", () => {
  // a stated covariance diag(9, 4, 1) m² in a child turned 90° about Z: in the parent, diag(4, 9, 1); semi-axes 3, 2, 1 m
});
it("gives a 95% bound as 2.7955 times the longest 1σ semi-axis", ...);
it("says when a term is a prediction, and when it is estimated", ...);
it("adds route terms beside the edges' terms", ...);
it("a simulated edge makes no claim and names itself", ...);
it("separationAccuracy takes each leg's lever at its own end", ...);
it("publishedAccuracy publishes when any part moves past 1% or 1 mm", ...);
```

- [ ] **Step 2: Run** and confirm they fail.
- [ ] **Step 3: Implement** `covariance.ts`, then the figure checks, then the composer. Keep `COMBINATION`'s words for a route whose figures are all 1σ, independent and axis-free, and name what else applies when it does.
- [ ] **Step 4: Run** the tests, `test/frameAccuracy.test.ts` unchanged, `npm run test:data` (Task 1's baseline test passes: no number moves in this task), tsc, eslint, prettier.
- [ ] **Step 5: Surface and commit** with "frames: accuracy beyond first order: confidence, shared sources, a rotation axis, covariance and an error ellipsoid".

### Task 5: Every term stated, and `accuracyOf` and the explorer's walk on the composer

**Files:**

- Create: `test/data/accuracyMoves.test.ts` (replaces `test/data/accuracyBaseline.test.ts`'s check), `test/fixtures/frames/accuracyMoves.json`
- Modify:
  - `src/frames/frames.ts` (`BUILT_IN_ACCURACY`, `itrfAccuracy`, `MOON_ME_ORIENTATION_RADIANS`; or `src/frames/edges.ts` where 5a moved them), `src/trajectory/Trajectory.ts` (`positionCovariance`, its reference frame's accuracy);
  - `src/measure/accuracy.ts` (`accuracyOf` on `separationAccuracy`, `AccuracyTerm.edge`), `src/measure/measure.ts` (route terms);
  - `examples/frames-explorer/composed.ts`, `examples/frames-explorer/scenarios/stated.ts`;
  - `test/measure.test.ts`, `test/data/measure.test.ts`, `test/data/framesExplorer*.test.ts` where a term list changes; `test/data/accuracyBaseline.test.ts` (removed with `git rm --`; the moves test replaces it); `src/frames/index.ts`, `src/measure/index.ts`, `api/surface.txt`
- Test: `test/trajectoryAccuracy.test.ts`

**Interfaces:**

- Consumes: Task 4's figures, `pointAccuracy`, `separationAccuracy`, `routeLegs`; Task 1's `accuracyRows` and baseline.
- Produces:
  - **The built-in edges state every term:**
    - GCRF, EARTH_ICRF and MOON_ICRF: 0.01 m with `source: { id: "DE440 Earth–Moon", rule: "difference" }` (plan's call 17);
    - ITRF: two figures, UT1 (`σ_t · ω` rad, `axis: [0, 0, 1]`, `term: "UT1"`) and polar motion (`σ_p` rad, `term: "polar motion"`), each `predicted` as `earthOrientationSigma` says (plan's call 19); outside the EOP table, not known, as today;
    - MOON_ME: `MOON_ME_ORIENTATION_RADIANS = 3e-7` rad, `estimated: true`, with the note of today's `MOON_ME_ACCURACY` in `scenarios/stated.ts` (plan's call 20).
  - `Trajectory.positionCovariance(instant: Instant): Float64Array | undefined`: the 3×3 position block (m², reference axes) at the covariance epoch `positionSigma` uses (the larger trace of the two around the instant); never throws.
  - A trajectory's `frame` states (plan's call 21): the covariance (or `positionSigma` as metres, or exact by definition at 0, or not stated, with today's notes), `term: "trajectory"`, plus a `coordinateScale` figure of 2.5 × 10⁻⁸ of the geocentric distance where `coordinateScale` is `"unknown"` and the reference is under EARTH_ICRF.
  - `accuracyOf(a, b, instant, frames, options)` keeps its signature and `AccuracyStatement`. It is `separationAccuracy(a, b, instant, { routeTerms })` mapped to terms: the ITRF figures of one leg → one `earthOrientation` term per end (root-sum-square of the two, today's note); the ephemeris source → `ephemeris` (today's notes for both outcomes); a trajectory's figures → `trajectory` and `coordinateScale`; any other edge → the new source `"frame"`. Route terms (plan's call 22): `lightTime` with a signal, `relativity` (0.03 m) when `routeLegs` crosses MOON_ICRF's edge, and each design end's `projection`, `geoidFallback` and `pick`. Every term carries `edge` (plan's call 23) where it has one. Warnings unchanged.
  - The explorer's `separationView` ties terms to edges by `edge`, and its own turned-rotation patch for edges "the statement has no term for" (`leverAt`) is removed. `scenarios/stated.ts`'s `MOON_ME_RADIANS` is the library's `MOON_ME_ORIENTATION_RADIANS`.
  - `accuracyMoves.json`: `{ moves: { key, before, after, kind: "tightened" | "correction", why }[] }`, one entry per row of Task 1's baseline whose `meters` changed by more than 1 × 10⁻⁹ of itself (ruling 2).

- [ ] **Step 1: Write the failing tests:**
  - `test/trajectoryAccuracy.test.ts`: a synthetic OEM with a covariance gives its reference frame's covariance and `meters` = `positionSigma`; without one and without `positionSigma`, not stated with today's note; an `"unknown"` scale adds the coordinate-scale figure.
  - `test/data/accuracyMoves.test.ts`: every row of the baseline either keeps its value within 1 × 10⁻⁹ of it, or is in `accuracyMoves.json` with its new value; a `"tightened"` move is smaller; a `"correction"` names its reason; no listed move is missing; no row appears or disappears.
  - `test/data/measure.test.ts`, new cases: DSS-43 to Orion gives today's `earthOrientation` metres exactly from the ITRF edge's two figures; two Earth sites carry no `earthOrientation` term (the route doesn't cross ITRF's edge); a lunar site to the Earth carries `ephemeris` 0.01 m once, `relativity` 0.03 m and MOON_ME's estimated term.
- [ ] **Step 2: Run** and confirm they fail.
- [ ] **Step 3: Implement** the edges and the trajectory first; then `accuracyOf`; then the explorer. Run the moves test, read each move, and write `accuracyMoves.json` only for moves explained by this task's rules, each with its kind and why. Any other move is a bug to fix here.
- [ ] **Step 4: Run** the tests, `npm test`, `npm run test:data`, tsc, eslint, prettier.
- [ ] **Step 5: Surface and commit** with "measure, frames: every term stated on its edge; accuracyOf and the explorer's walk on the composer". List every move, its kind and why, in the commit message.

### Task 6: Piecewise reference frames

**Files:**

- Create: `src/frames/piecewise.ts`, `test/piecewise.test.ts`
- Modify: `src/frames/pointAccuracy.ts` (`routeLegs` expands piecewise edges), `src/frames/catalog.ts` (`treeInUse(at?)`), `src/frames/index.ts`, `api/surface.txt`

**Interfaces:**

- Consumes: Task 2's `frameVelocity`, `Frame.parentAt`, the `revision` getter; Task 4's `routeLegs` and `"simulated"` term; 5a's `FrameUnavailableError`, `FrameCatalog.treeInUse`.
- Produces:
  - `interface FramePiece { readonly frame: Frame; readonly from: Instant; readonly jump?: true; readonly simulated?: true; readonly note?: string }`: `frame` is the piece's definition (a constant offset in a parent, a trajectory's `frame`, any `Frame`); `jump` declares the change at its `from` a cut the application wants;
  - `interface PiecewiseOptions { readonly until?: Instant; readonly tolerance?: { readonly meters: number; readonly metersPerSecond: number } }` (default 0.01 m and 0.01 m/s, plan's call 26);
  - `class PiecewiseFrame<N extends string = string> extends Frame<N>`:
    - `readonly pieces: readonly FramePiece[]`, `readonly hub: Frame` (the deepest common ancestor of the pieces' frames' parents, its `parent`), `readonly changes: readonly Instant[]`;
    - `pieceAt(instant: Instant): FramePiece | undefined` (half-open, plan's call 25);
    - `parentAt(instant)`: the parent of the piece's `frame`;
    - `toParent(instant)`: `frameTransform(piece.frame, hub, instant)`; outside every piece, `FrameUnavailableError(name, "outsideData")`;
    - `revision`: its own plus each piece's route revision to the hub, so it doesn't change at a change;
  - `piecewiseFrame<N extends string>(name: N, pieces: readonly FramePiece[], options?: PiecewiseOptions): PiecewiseFrame<N>`: throws a `RangeError` naming the reference frame for no pieces, unsorted or repeated `from`s, or pieces in different trees; at each change not declared a jump, compares the two pieces' origin position and velocity in the hub at the change instant (`frameVelocity`), and throws `PiecewiseJumpError` past the tolerance; throws the `FrameUnavailableError` it meets when a change can't be evaluated yet (plan's call 27);
  - `class PiecewiseJumpError extends Error { readonly frame: string; readonly at: Instant; readonly meters: number; readonly metersPerSecond: number; readonly tolerance: { meters: number; metersPerSecond: number } }`;
  - `routeLegs` replaces a piecewise edge by the edges of its piece's `frame` up to the hub, preceded, for a simulated piece, by a `"simulated"` term on the piecewise edge naming the piece;
  - `FrameCatalog.treeInUse(at?: Instant)` (plan's call 28): each entry gains `parent: Frame | undefined`, `parentAt(at)` when given, else `frame.parent`; with `at`, a piecewise frame's current parent and its ancestors are listed.

- [ ] **Step 1: Write the failing tests** (`test/piecewise.test.ts`, synthetic frames: a stack reference frame moving at 1 m/s along X under a root, a stage offset 10 m in it, and the stage's own path):

```ts
it("is continuous at each change within its tolerance", ...);  // the own path starts where the offset piece ends, at the same velocity
it("throws PiecewiseJumpError at an undeclared jump, with its size", () => {
  // own path starting 5 m away: meters 5; at rest: metersPerSecond 1
});
it("accepts a jump the application declares", ...);
it("draws its parent per piece", () => {
  expect(stage.parentAt(before)).toBe(stack);
  expect(stage.parentAt(after)).toBe(own.parent);
  expect(catalog.treeInUse(after).find((e) => e.frame === stage)!.parent).toBe(own.parent);
});
it("at a change instant takes the later piece, and scrubbing back takes the earlier", () => {
  // Review Focus 2: toParent at the change, then 1 s before, then at the change again: each matches its piece; parentAt agrees
});
it("throws FrameUnavailableError outside its pieces", ...);
it("its revision doesn't change at a change, and goes up when a piece's input does", ...);
it("a route across a simulated piece makes no accuracy claim and names it", ...);
it("a route across a stated piece composes that piece's own edges", ...);
it("refuses a change it can't evaluate yet, with the reference frame's own error", ...);
```

- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement** `piecewise.ts`, then the expansion in `routeLegs`, then `treeInUse(at)`.
- [ ] **Step 4: Run** the tests, `npm run test:data` (the moves test still passes), tsc, eslint, prettier.
- [ ] **Step 5: Surface and commit** with "frames: piecewise reference frames: pieces over time, continuity checked, a parent per piece".

### Task 7: Rays through the frame tree, and body and impostor targets

**Files:**

- Create: `src/query/frameRays.ts`, `src/query/ellipsoidBackend.ts`, `test/frameRays.test.ts`, `test/framesRayAccuracy.test.ts`
- Modify: `src/query/queries.ts` (types), `src/scene/Engine.ts` (`queries` dispatch), `src/camera/frameResolver.ts` (`accuracy?`), `src/frames/resolver.ts` (implements it), `src/scene/Body.ts` (`terrainBand`), `test/seams.test.ts`, `src/index.ts`, `src/frames/index.ts`, `api/surface.txt`

**Interfaces:**

- Consumes: 5a's `SpatialQueries`, `RayQuery`, `QueryRay`, `RayAnswer`, `QueryAnswer`, `Engine.queries`, the terrain and draw backends, `CameraLayer.resolver(world)`, `FrameResolver`, `FrameKey`, `FrameUnavailableError`, `World.bodyAnchor`, `World.anchors`, `AnchorHandle.body`; `C` from `src/math/constants.ts`; Task 4's `pointAccuracy`.
- Produces:
  - `Body.terrainBand?: { readonly min: number; readonly max: number }` (m above the ellipsoid): `EARTH` −11,000 to 9,000, `MOON` −9,200 to 10,800 (plan's call 30).
  - `FrameResolver.accuracy?(point: ArrayLike<number>, frame: FrameKey, base: FrameKey, seconds: number): { readonly meters: number | undefined; readonly note: string }`: how accurately a point in `frame` is placed in `base` (1σ). `createFramesResolver` implements it with `pointAccuracy`; without it, the route is exact (plan's call 33).
  - In `src/query/queries.ts`, additive to 5a's types:
    - `type RayTarget = "terrain" | "draws" | { readonly kind: "body"; readonly body: Body } | { readonly kind: "impostor"; readonly body: Body } | { readonly kind: "tileset"; readonly tileset: Tileset3D }` (5a's strings keep their meaning; Task 8 answers `tileset`);
    - `RayQuery` gains `world?: World`, `frame?: FrameKey` (the rays' reference frame; with it, `world` is required and `anchor` is ignored), `correction?: "geometric" | "lightTime"` (default geometric) and `reportIn?: FrameKey` (default `frame`, or the anchor);
    - `RayAnswer.hit` gains `frame: FrameKey` (the `reportIn` reference frame its `position` is in), `target: RayTarget` and `seconds` (when the target was placed);
    - `RayAnswer.unknown` reasons gain `"route"`, a route the resolver couldn't answer, with the resolver's message in `note`.
  - `src/query/frameRays.ts`: `castFrameRays(query, world, resolver, backends, options): Promise<QueryAnswer>`. Per target, it finds the target's anchors (a body's `world.bodyAnchor(body)`; `"terrain"`'s globes; `"draws"`' anchors that hold draws; a tileset's `anchor`), carries the rays into each with `resolver.resolve(frame, anchor, s, ·)`, runs the target's backend, and carries the nearest hit into `reportIn`. Under `"lightTime"` each target is placed at `seconds − τ` (plan's call 29). The answer's accuracy is the root-sum-square of the route's (`resolver.accuracy`) and the target's own, with both notes. A resolver that throws for one target answers `unknown` with `"route"` for its rays (Review Focus 5).
  - `src/query/ellipsoidBackend.ts`: `castEllipsoid(rays, radii, endTolerance)` and the impostor rule (plan's call 31), in anchor coordinates. A body target is exact for its ellipsoid, noting "the body's ellipsoid, not its terrain"; an impostor's accuracy is its relief. Hits within 1 mm of either end are the observer's own ground.
  - `test/seams.test.ts`: 5a's bypass case also covers `castEllipsoid` and Task 8's `castTilesetRays`: no file under `examples/` or `src/measure/` imports them.

- [ ] **Step 1: Write the failing tests:**
  - `test/frameRays.test.ts` (`fakeEngine`, a stub `FrameResolver` placing a "station" reference frame on the Earth's anchor and the Moon's anchor 384,400 km away, moving at 1 km/s):

```ts
it("carries rays from their reference frame into each target's anchor", ...);  // a ray from the station to the Moon's centre hits the Moon's near side
it("reports the hit in the reference frame asked for, at float64 precision", ...);  // within 1e-6 m of the analytic hit
it("light-time correction places the target where it was when the light left it", () => {
  // the hit moves by about 1.28 km along the Moon's velocity against the geometric one
});
it("an impostor blocks inside its relief, clears outside it, and can't tell between", ...);
it("a target whose route the resolver can't answer is unknown, with the reason; the other targets answer", ...);  // Review Focus 5
it("5a's anchor queries answer as before", ...);
it("answers stay asynchronous", ...);
```

And `test/framesRayAccuracy.test.ts` (the frames module, stubbed data as 5a's tests): a ray from a lunar site to the Earth carries MOON_ME's estimated term in its accuracy note and metres.

- [ ] **Step 2: Run** and confirm they fail.
- [ ] **Step 3: Implement** `terrainBand`, the resolver's `accuracy`, the ellipsoid backend, `frameRays.ts`, then the dispatch in `Engine.queries`.
- [ ] **Step 4: Run** the tests, `npm test`, `npm run test:data`, the boundary test (the query files are core and import nothing from `frames`), tsc, eslint, prettier.
- [ ] **Step 5: Surface and commit** with "query: rays in any reference frame, carried to each target's anchor, with light time, body and impostor targets".

### Task 8: Rays against a tileset's retained geometry, clipped to the body's terrain band

**Files:**

- Create: `src/query/geometryBackend.ts`, `test/geometryRays.test.ts`
- Modify: `src/query/frameRays.ts` (the `tileset` target), `src/scene/Engine.ts` (registers the backend), `api/surface.txt` if an export changes

**Interfaces:**

- Consumes: Task 7's `RayTarget`, `castFrameRays`, `Body.terrainBand`; `Tile.geometry` (`TileGeometry`: model-space triangles and their float64 matrix in the tileset's anchor), `Tile.viewMask`, `Tile.standInMask`, `Tile.geometricError`, `volumeObb(tile.volume)`; `Tileset3D.retainGeometry`, `Tileset3D.anchor`.
- Produces:
  - `castTilesetRays(tileset: Tileset3D, rays: readonly QueryRay[], options: { readonly band?: Body["terrainBand"]; readonly ellipsoid?: Ellipsoid; readonly endTolerance?: number }): RayAnswer[]` (plan's call 32), in the tileset's anchor coordinates:
    - the segment is first clipped to the band (heights above `ellipsoid`): above it, clear; below it, blocked ("below the body's lowest terrain"); this is §13.16's question 4, applied for the Earth and the Moon;
    - inside the band, it walks the tiles whose oriented box the segment crosses; a drawn tile with geometry is tested triangle by triangle in float64 (each triangle's box grown by the tile's geometric error is the broad phase); a miss closer than the error is `withinError`; a stand-in tile is `notRefined`; a span with no drawn tile is `notLoaded`;
    - a tileset that doesn't retain geometry answers `unknown` with `"unsupported"` and the note "the tileset keeps no triangles (retainGeometry)";
    - the answer's accuracy is the largest geometric error among the tiles crossed, noted as the drawn tiles' error.
  - The tileset's body comes from `tileset.anchor.body`; without one there is no band, and every span the tiles don't cover is `notLoaded`.

- [ ] **Step 1: Write the failing test** (`test/geometryRays.test.ts`, the stubbed tileset harness of `test/tilesetPlacement.test.ts` with `retainGeometry: true`, under `world.bodyAnchor(MOON)`):
  - a ray into a drawn tile's triangle is blocked at the analytic hit, within 1 × 10⁻⁶ m;
  - a ray 0.5 m above a tile whose geometric error is 2 m is unknown with `withinError`; 5 m above, clear;
  - a ray across a span with no drawn tile is unknown with `notLoaded`, and across a stand-in tile with `notRefined`;
  - a ray from a site to the Earth leaves the band 11 km up: only the span below is undecided, and it is clear above (the clip);
  - a ray that dips below −9,200 m is blocked there without tiles;
  - a tileset without retained geometry answers `unsupported`;
  - through `engine.queries.castRays({ world, frame, targets: [{ kind: "tileset", tileset }], … })`, the same answers in the rays' reference frame.
- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the test, `npm test`, tsc, eslint, prettier.
- [ ] **Step 5: Surface and commit** with "query: rays against a tileset's retained geometry, clipped to the body's terrain band".

### Task 9: Bulk work: one shape, sliced under the tick budget, and paths and accuracy over spans

A browser check (port 5192).

**Files:**

- Create: `src/core/bulk.ts`, `src/frames/bulk.ts`, `test/bulk.test.ts`, `test/framesBulk.test.ts`
- Modify: `src/scene/Engine.ts` (`bulk`), `src/index.ts`, `src/frames/index.ts`, `api/surface.txt`

**Interfaces:**

- Consumes: 5a's `Engine.onTick`; Task 4's `pointAccuracy`; Task 6's `PiecewiseFrame.changes` and `pieceAt`.
- Produces:
  - In `src/core/bulk.ts` (neutral):
    - `interface BulkProgress { readonly done: number; readonly total: number }`;
    - `interface SliceScheduler { run(slice: (deadline: number) => boolean, signal?: AbortSignal): Promise<void> }`: calls `slice` until it returns true (finished); `deadline` is a `performance.now()` time the slice should stop by;
    - `interface BulkOptions { readonly signal?: AbortSignal; readonly onProgress?: (progress: BulkProgress) => void; readonly scheduler?: SliceScheduler }`;
    - `timeSlices(budgetMs = 8): SliceScheduler`: one slice per macrotask (a `MessageChannel`, or `setTimeout(0)` where none exists) (plan's call 35);
    - `runBulk<T>(total: number, step: (index: number) => T, options?: BulkOptions): Promise<T[]>`: in order, checking `signal` after every step; aborting rejects with the signal's reason (an `AbortError` by default) and calls no further `step` or `onProgress`. Progress after each slice and at the end.
  - `Engine.bulk: SliceScheduler`: slices in one `onTick` listener, 4 ms per tick (plan's call 35), keeping the loop awake while work is queued, and unregistering when the queue empties; `dispose()` rejects queued work with an `AbortError`.
  - In `src/frames/bulk.ts`:
    - `interface PathSamples { readonly tdb: Float64Array; readonly positions: Float64Array; readonly spans: readonly { readonly start: number; readonly end: number; readonly simulated: boolean }[]; readonly gaps: readonly { readonly start: number; readonly end: number; readonly reason: string }[] }` (TDB seconds; xyz metres in `inFrame`);
    - `samplePath(frame: Frame, inFrame: Frame, start: Instant, stop: Instant, step: number, options?: BulkOptions): Promise<PathSamples>`: `frame`'s origin every `step` TDB seconds, plus each piecewise change inside the span; a sample that throws is a gap with its message (a `TypeError` or `ReferenceError` propagates); at most 1,000,000 samples, as `measureSpan`;
    - `accuracySpan(point: FramePoint, to: Frame, start: Instant, stop: Instant, step: number, options?: BulkOptions & PointAccuracyOptions): Promise<{ instant: Instant; accuracy?: PointAccuracy; error?: string }[]>`.
  - Plan's call 34: every plan-5 bulk operation runs in slices.

- [ ] **Step 1: Write the failing tests:**
  - `test/bulk.test.ts`: `runBulk` returns the steps' results in order; progress is non-decreasing and ends at `total`; an abort after 10 steps rejects with `AbortError`, runs no 11th step and reports no further progress; under `fakeEngine`, `engine.bulk` runs no slice longer than its budget plus one step, keeps the loop awake while queued, and leaves no tick listener when idle; disposing the engine rejects queued work.
  - `test/framesBulk.test.ts` (synthetic frames, a piecewise frame with a simulated piece): `samplePath` includes the change instant, marks the simulated span, records a gap past the data's end with its message, and matches `frameTransform` at every sample exactly; `accuracySpan` equals `pointAccuracy` at each instant.
- [ ] **Step 2: Run** and confirm they fail.
- [ ] **Step 3: Implement** `src/core/bulk.ts`, `Engine.bulk`, then `src/frames/bulk.ts`.
- [ ] **Step 4: Run** the tests, `npm test` (`test/onDemandIdle.test.ts` and `test/frameLoopSleep.test.ts` in particular), `npm run test:data`, the boundary test, tsc, eslint, prettier.
- [ ] **Step 5: Browser check (port 5192, plan's call 43):** `parity` then `alloc`, one at a time, against the base commit's results; an idle `Engine.bulk` allocates nothing per tick. Record the metrics in the commit message. Stop the server.
- [ ] **Step 6: Surface and commit** with "core: bulk work with AbortSignal and progress, sliced under the tick budget; frames: paths and accuracy over spans".

### Task 10: `measure`'s bulk span, one light-time solve, and PROJ batches

**Files:**

- Modify: `src/measure/measure.ts`, `src/measure/doppler.ts`, `src/engineering/EngineeringFrame.ts`, `src/measure/index.ts`, `src/proj/index.ts` if an export changes, `test/measure.test.ts`, `test/data/measure.test.ts`, `test/data/designMeasure.test.ts`, `api/surface.txt`
- Test: `test/data/projBatch.test.ts`

**Interfaces:**

- Consumes: Task 9's `BulkOptions`, `runBulk`.
- Produces:
  - `measureSpan(a, b, start, stop, step, frames, options?: MeasureOptions & BulkOptions): Promise<Array<{ instant: Instant; measurement?: Measurement; error?: string }>>` (plan's call 36): the same samples and errors as today, through `runBulk`. Two design ends' grid factors are computed once per span, keyed by engineering frame and design point.
  - `measure` takes the downlink's light-time solution from the leg and passes it to `lineOfSight`, so the downlink's light time is solved once (an internal `legWithSolution` in `doppler.ts`; `downlink` and `uplink` keep their signatures).
  - `EngineeringFrame.toBodyFixedBatch(design: ArrayLike<number>, options?: BulkOptions): Promise<Float64Array>` and `fromBodyFixedBatch(bodyFixed: ArrayLike<number>, options?: BulkOptions): Promise<Float64Array>` (plan's call 37): flat xyz in, flat xyz out, equal to the per-point methods; a length that isn't a multiple of 3, or a non-finite coordinate, throws a `RangeError` naming the index.

- [ ] **Step 1: Write the failing tests:**
  - `test/measure.test.ts`: on synthetic frames, with end b a counting `Frame` (`cache: false`): the evaluations of b in `measure(a, b, at, frames)` equal those in `downlink` plus `uplink` plus `measure(…, { signal: false })` (one light-time solve fewer than today); `measureSpan` resolves the same samples as before and rejects with `AbortError` when aborted.
  - `test/data/designMeasure.test.ts`: a 100-sample `measureSpan` between two design points calls `proj_factors` twice (wrap the engineering frame's `proj.proj_factors` with a counter), not 200 times, and its results equal 100 `measure` calls.
  - `test/data/projBatch.test.ts`: 10,000 corridor points through `toBodyFixedBatch` equal `toBodyFixed` point by point (`toEqual`), and back through `fromBodyFixedBatch`; progress ends at 10,000; an abort rejects.
- [ ] **Step 2: Run** and confirm they fail.
- [ ] **Step 3: Implement.** Update `test/data/measure.test.ts`'s `measureSpan` calls to `await`.
- [ ] **Step 4: Run** the tests, `npm test`, `npm run test:data`, tsc, eslint, prettier.
- [ ] **Step 5: Surface and commit** with "measure: measureSpan is bulk work and computes grid factors once; one downlink light-time solve; proj: batches".

### Task 11: A time formatter in the time library

**Files:**

- Create: `src/time/format.ts`, `test/timeFormat.test.ts`
- Modify: `src/time/index.ts`, `test/importBoundary.test.ts` (adds `format` to the time layer's files), `widgets/timeControls.ts` (`ianaOffsetMinutes` and `ianaAbbreviation` become re-exports), `test/timeControlsZone.test.ts` (imports from the time library), `api/surface.txt`

**Interfaces:**

- Consumes: `Instant`, `LeapSeconds` (`taiMinusUtcAtTai`), `Instant.toUtc`.
- Produces (plan's calls 38, 39 and 41):
  - `type TimeZone = { readonly kind: "utc" } | { readonly kind: "civil"; readonly iana: string } | { readonly kind: "solar"; readonly longitude: number } | { readonly kind: "nominal"; readonly longitude: number } | { readonly kind: "local" }` (longitude in radians, east positive);
  - `interface TimeParts { readonly year: number; readonly month: number; readonly day: number; readonly weekday: number; readonly hour: number; readonly minute: number; readonly second: number; readonly millisecond: number; readonly leapSecond: boolean; readonly offsetMinutes: number; readonly offset: string; readonly zoneShort: string; readonly zoneLong: string; readonly date: string; readonly time: string }`: the wall clock in the zone (`month` 1 to 12, `weekday` 0 for Sunday, `second` up to 60); `offset` like "UTC+01:00", "UTC−07:00", or "UTC"; `date` and `time` from `Intl.DateTimeFormat(locale)` on the wall clock, with the second shown as 60 inside a leap second;
  - `timeParts(instant: Instant, zone: TimeZone, options?: { readonly leapSeconds?: LeapSeconds; readonly locale?: string }): TimeParts` (default leap table `LeapSeconds.builtIn()`). A leap second is the TAI second in which TAI − UTC steps; its wall clock is the zone's minute that UTC's 23:59 maps to, second 60. Zone names keep the time controls' words today: "UTC" and "Coordinated Universal Time"; "solar time" and "Local solar time: noon is when the sun is highest here"; nominal "UTC+3" and its long sentence; the civil zone's abbreviation (`ianaAbbreviation`) and its IANA name; the computer's zone by Intl;
  - `interface ZoneLookup { zoneAt(place: { readonly longitude: number; readonly latitude: number }): string | undefined }` (radians in, an IANA name out);
  - `placeZone(place: { readonly longitude: number; readonly latitude: number }, lookup?: ZoneLookup): TimeZone`: civil when the lookup answers with a name Intl knows; otherwise solar, and its `zoneLong` then says the place's civil zone isn't known;
  - `ianaOffsetMinutes(ms, iana)` and `ianaAbbreviation(ms, iana, locale?)`, moved unchanged.

- [ ] **Step 1: Write the failing test** (`test/timeFormat.test.ts`):

```ts
const leap = LeapSeconds.builtIn();
const utc = (iso: string) => Instant.fromIso(iso, "UTC", leap);
it("shows a leap second in UTC", () => {
  const p = timeParts(utc("2016-12-31T23:59:60.5"), { kind: "utc" });
  expect([p.day, p.hour, p.minute, p.second, p.millisecond, p.leapSecond]).toEqual([31, 23, 59, 60, 500, true]);
  expect(timeParts(utc("2017-01-01T00:00:00.5"), { kind: "utc" }).second).toBe(0);
});
it("shows a leap second in a civil zone", () => {   // Review Focus 4
  const p = timeParts(utc("2016-12-31T23:59:60.5"), { kind: "civil", iana: "Asia/Tokyo" });
  expect([p.year, p.month, p.day, p.hour, p.minute, p.second]).toEqual([2017, 1, 1, 8, 59, 60]);
  expect(p.time).toMatch(/60/);
});
it("follows a daylight-saving change", () => {
  // Europe/London: 2026-03-29T00:59:59Z is 00:59:59 GMT (offset 0); 01:00:00Z is 02:00:00 BST (offset 60)
  // America/New_York: 2026-11-01T05:59:59Z is 01:59:59 EDT; 06:00:00Z is 01:00:00 EST
});
it("gives solar time on both sides of the date line", () => {
  const at = utc("2026-04-02T00:00:00");
  const east = timeParts(at, { kind: "solar", longitude: (179.9 * Math.PI) / 180 });
  const west = timeParts(at, { kind: "solar", longitude: (-179.9 * Math.PI) / 180 });
  expect([east.day, east.hour, east.minute, east.second]).toEqual([2, 11, 59, 36]);
  expect([west.day, west.hour, west.minute, west.second]).toEqual([1, 12, 0, 24]);
});
it("gives nominal time in whole hours from the longitude", ...);  // the same two places: 2 April 12:00 and 1 April 12:00
it("finds a place's zone through the application's lookup, else solar time, labelled so", ...);
it("names zones as the time controls do today", ...);
```

- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement,** moving the two Intl helpers; the boundary test's time-layer list gains `src/time/format.ts`.
- [ ] **Step 4: Run** the test, `test/timeControlsZone.test.ts`, the boundary test, tsc, eslint, prettier.
- [ ] **Step 5: Surface and commit** with "time: a formatter for UTC (leap seconds included), civil, solar, nominal and local time; a zone lookup interface".

### Task 12: The time controls on the formatter

A browser check (port 5191).

**Files:**

- Modify: `widgets/timeControls.ts`, `widgets/Viewer.ts` (passes `zoneLookup` through), `widgets/index.ts`, `test/timeControlsZone.test.ts`, `api/surface.txt`
- Test: `test/timeControlsFormat.test.ts`

**Interfaces:**

- Consumes: Task 11's `timeParts`, `TimeZone`, `ZoneLookup`, `placeZone`.
- Produces:
  - `TimeZoneChoice` gains `"place"`: the place's civil zone through the lookup, else its solar time, labelled so.
  - `TimeControlsOptions.zoneLookup?: ZoneLookup` and `ViewerOptions.zoneLookup?: ZoneLookup`. With a lookup, the controls open on `"place"`; without one, on `"nominal"` as today (plan's call 40, ruling 11).
  - `zoneOf(choice: TimeZoneChoice, place: { longitude: number; latitude: number } | undefined, lookup?: ZoneLookup): TimeZone` (exported for tests): `"utc"`, `"local"` and `{ iana }` map directly; `"solar"` and `"nominal"` take the place's longitude (UTC without a place, as today); `"place"` is `placeZone`.
  - The controls take every offset, day start, clock text and zone label from `timeParts(clock.instant(), zoneOf(…))`. What a page shows is unchanged for every choice it had.
  - The design globe keeps giving each site its IANA zone (`setZone({ iana: entry.timeZone })`).

- [ ] **Step 1: Write the failing test** (`test/timeControlsFormat.test.ts`): `zoneOf` for each choice; for each of today's choices at five instants (one in a DST change, one at a leap second), the offset and short label the controls compute equal what the code before this task computed (the expected values written into the test from today's functions); `"place"` with a lookup gives the civil zone and without one gives solar time.
- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the tests, `npm test`, the boundary test (`widgets/timeControls.ts`' closure has no frames file), tsc, eslint, prettier.
- [ ] **Step 5: Browser check (port 5191, plan's call 43):** Dyno's Viewer (`/#/viewer`): the clock text and zone label for each choice in ⚙ are the base commit's; the design globe: each site's clock shows its civil time and abbreviation; the frames explorer: UTC. Light and dark, 1440 px and 380 px. Stop the server.
- [ ] **Step 6: Surface and commit** with "widgets: the time controls show time through the time library's formatter; a place zone through the application's lookup".

### Task 13: Docs, the plan note, the final gates and Snyk

**Files:**

- Modify: `packages/next/README.md`, `CESIUM2_WEBGPU_PLAN.md` §13.14

- [ ] **Step 1: README.** Document two-vector frames and freezing, `axesAt`, the presets and `held`, piecewise reference frames, the accuracy figures and how they compose (confidence, sources, axis, covariance, the ellipsoid, route terms), `separationAccuracy`, rays in a reference frame and their targets, the terrain bands, the bulk shape and `Engine.bulk`, `samplePath` and `accuracySpan`, and the time formatter with its zone lookup.
- [ ] **Step 2: Plan note** in §13.14, "Frames 5b results": the fixture worst values, the accuracy moves (from `accuracyMoves.json`), the plan's calls and rulings one line each, and a "Carried forward" list of real deferred work from this plan's ledger, without nits, written before the ledger is deleted. Mark the section 16 rows 5b closed (`measureSpan`'s factors, the downlink's light time, explicit timeouts, composed accuracy beyond 1σ, `accuracyOf` on `pointAccuracy` (both entries), the time-display API, reference frames that change at an instant), naming the task.
- [ ] **Step 3: Gates:**
  - `npx tsc --noEmit -p .`, `npx eslint .`, `npx prettier --check .`;
  - `npm test`, `npm run test:data`;
  - `npm run build`, `npm run build:lib`, `npm run check:bundle` (the globe-only main chunk is no larger than 5a's, and contains no 5b frames file);
  - `parity` and `alloc` against the base commit, one suite at a time, on port 5193 (plan's call 43);
  - `snyk_code_scan` on `src/frames`, `src/query`, `src/core/bulk.ts`, `src/time/format.ts`, `src/camera/CameraLayer.ts`, `src/measure`, `src/engineering/EngineeringFrame.ts`, `widgets/timeControls.ts` and `scripts/frameFixtures.py`. Fix new findings and rescan until clean; record the findings that predate this plan.
- [ ] **Step 4: Commit** `README.md` and `CESIUM2_WEBGPU_PLAN.md` with "Plan: frames 5b results".

---

## Self-review

- **Spec coverage.** 9.1 two-vector frames: vector kinds, axes, freezing, velocities, degenerate cases, SPICE validation for an orbital two-vector frame on Orion and the Earth–Moon rotating frame: Task 2 (the rig's held pose and its reason: Task 3). 9.2 presets, each data, checked against SPICE: Task 3. 9.3 piecewise reference frames, continuity, per-piece accuracy, revisions: Task 6 (accuracy across a simulated piece through Task 4's term). 9.4 confidence, correlated terms, per-direction error, a rotation axis, time-varying accuracy, terms on no edge: Task 4; a trajectory's covariance, MOON_ME's estimate, `accuracyOf` on `pointAccuracy` and the listed moves: Task 5. 9.5 rays in any reference frame, geometric or light-time, ellipsoids, terrain, retained geometry, the impostor, float64 hits with composed accuracy, the band clip: Tasks 7 and 8. 9.6 bulk work: Task 9 (paths, accuracy over samples), Task 10 (`measureSpan` with cached factors, PROJ batches). 9.7 the formatter and zone lookup: Task 11; the time controls and the design globe: Task 12 (the Artemis mission clock is 5g's). 9.8 the downlink's light time: Task 10; explicit timeouts: Task 1. 9.9 done-when: Tasks 2 and 3, 6, 4 and 5, 11.
- **For later sub-plans:** 5d gets presets and `held` (Task 3) and angular velocities through the resolver (Task 2); 5g gets piecewise stage frames (Task 6), `samplePath` (Task 9), the rotating reference frame's definition (Task 2's `EARTH_MOON_ROT`), standing ray queries against Cesium Moon's retained geometry (Tasks 7 and 8), and UTC parts for its mission clock (Task 11); 5c's impostor needs nothing more for rays (ruling 8).
- **Type consistency:** `TwoVectorFrame`, `Axis`, `VectorDefinition`, `axesAt` (Tasks 2, 3); `frameVelocity`, `angularVelocity` (2, 6); `FrameAccuracy`, `AccuracyFigure`, `PointAccuracyOptions`, `RouteTerm`, `routeLegs`, `separationAccuracy` (4, 5, 6, 9); `PiecewiseFrame.changes`, `pieceAt` (6, 9); `RayTarget`, `castFrameRays`, `Body.terrainBand` (7, 8); `BulkOptions`, `runBulk`, `SliceScheduler` (9, 10); `TimeZone`, `timeParts`, `ZoneLookup`, `placeZone` (11, 12) are named the same wherever they recur.
- **Review Focus:** each line's test sits in its owning task's Step 1 and is marked there.
