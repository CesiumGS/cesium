# Frames Explorer Scenarios Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the frames-explorer example around eleven scenarios. Each builds its own frame tree, answers one question on the globe, has a few knobs, and carries proof that follows them. The tree is a large live diagram beside the globe, and verification becomes secondary.

**Architecture:**

- **Scenario metadata** lives in pure, main-thread modules: id, question, knobs, checked setup and needs.
- **Scenario evaluators** run in the existing compute worker, which holds PROJ and the trajectories. Each returns its added frames, its answer, overlay geometry and live proof as plain data.
- **The main thread** draws:
  - the globe, through the existing `globe.ts` and overlay chunks;
  - terrain-dependent answers, through a new additive library function, `terrainLineOfSight`, which samples the globe's own terrain;
  - the tree diagram, a new SVG component over an extended `tree.ts` model.

`main.ts` is split into a scenario host and per-scenario globe modules. The tour is replaced.

**Tech Stack:** TypeScript, the engine's `Viewer` (`setGlobe`, `setControls`, `setFrameData`), the example's worker (`protocol.ts`, `host.ts`), StrataKit and MUI through Dyno's React panel contract, plain SVG for the diagram, and Vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-06-frames-explorer-scenarios-design.md`. It argues from, and keeps binding, `docs/superpowers/plans/2026-11-06-frames-explorer-example.md` (R1–R18) and `packages/next/examples/frames-explorer/DESIGN.md`.

## Global Constraints

- **Everything in the existing plan's rulings R1–R18 and DESIGN.md still binds** unless the spec changes it:
  - StrataKit and Dyno's design guide;
  - the gallery contract (React panel, `params`, `link`);
  - accuracy always shown (R8) and loading always visible (R9);
  - published references, never PROJ, for expected values (R10);
  - effect sizes against hand formulas (R11);
  - the worker for PROJ and runs (R13);
  - untrusted strings rendered as text;
  - the ion token never in the worker, URL, params, report, storage or console;
  - the HUD exception for canvas colours.
- **The globe stays the hero.** The tree diagram docks beside it in Dyno's side column (R17: Dyno owns the column widths).
- **Knobs, not an editor:** three or four knobs per scenario, on the frames it added. No adding or removing frames, and no typed definitions.
- **Proof:**
  - at the checked setup, the scenario's backing catalog checks against their published references;
  - off it, live re-runs, plus "reference applies at the checked setup; your setting moves the answer by …";
  - a marker for on or off the checked setup, and a "Back to the checked setup" action;
  - nothing reads as verified that isn't.
- **Each scenario pins a default epoch** in its checked setup. Deep links carry the scenario, its knob values, the time and the selection.
- **Real terrain** for line of sight and footprints, through `terrainLineOfSight`. The terrain's resolution and accuracy are part of the answer's accuracy. Unloaded terrain is never treated as clear.
- **The stress catalog stays green:** 225 results, `npm test`, `npm run test:data`, and `fingerprints.json` unchanged.
- **Repository practice:**
  - commit locally and never push, ending each message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`;
  - `npx tsc --noEmit -p .`, eslint and prettier pass;
  - `snyk_code_scan` on new code;
  - commands run in `packages/next`;
  - the owner's dev server on port 5190 is never restarted or stopped.

## Review Focus

1. **Off the checked setup, nothing claims verification.** Changing a knob must turn proof rows that depend on published references into "reference applies at the checked setup" with a delta, never a green pass. Test: Task 3.
2. **Unloaded or coarse terrain.** Line of sight across terrain that isn't loaded must report "unknown over N% of the path", never "clear". Coarse tiles widen the stated accuracy. Test: Task 5.
3. **Switching scenarios mid-evaluation.** A late worker reply for the previous scenario must never draw, answer or prove in the new one, and overlays from the old scenario must all be removed. Test: Task 4.
4. **Hostile or stale deep links.** An unknown scenario, out-of-range knob values or a malformed time each fall back to the checked setup, without throwing. Test: Task 1.
5. **Branch paths.** The common-ancestor path between objects on different branches must be right for every pair in the capstone. Examples: a lunar site and a ship meet at ICRF; Orion (under GCRF) and a dish (under ITRF) meet at GCRF. Test: Task 2.

---

### Task 1: The scenario model, knobs, checked setup and deep links

**Files:**

- Create:
  - `examples/frames-explorer/scenarios/spec.ts`: types and the checked-setup logic.
  - `examples/frames-explorer/scenarios/specs.ts`: all the scenarios' metadata (ten from Task 1; Task 7b adds the robot arm).
- Modify: `examples/frames-explorer/selection.ts`, to add the scenario, knob and time params and the `node:`/`edge:` selections.
- Test: `test/framesExplorerScenarioSpec.test.ts` and `test/framesExplorerSelection.test.ts`.

**Interfaces:**

- **Produces** (`spec.ts`):
  - `type ScenarioId = "earth-turns" | "bim-site" | "corridor" | "dish-tracks" | "drone" | "moon-from-here" | "one-path" | "stand-on-moon" | "ship" | "everything"`
  - `type KnobValue = number | string`
  - `interface KnobSpec { id: string; label: string; kind: "range" | "choice"; min?: number; max?: number; step?: number; unit?: string; options?: readonly { value: string; label: string }[] }`
  - `type KnobState = Readonly<Record<string, KnobValue>>`
  - `interface ScenarioSpec { id: ScenarioId; title: string; question: string; knobs: readonly KnobSpec[]; checked: { epochUtc: string; knobs: KnobState }; needs: readonly ("proj" | "geoid" | "orion" | "terrain" | "ships")[]; globe: "ellipsoid" | "terrain"; proof: readonly string[] }`. `proof` holds the stress-catalog result ids.
  - `checkedState(spec: ScenarioSpec, knobs: KnobState, epochUtcMs: number): { atChecked: boolean; changed: readonly string[] }`. `changed` lists the knob ids that differ, plus `"time"`.
  - `clampKnobs(spec: ScenarioSpec, knobs: Readonly<Record<string, unknown>>): KnobState`. It keeps valid values, clamps ranges, and falls back to the checked value for anything else.
- **Produces** (`specs.ts`): `SCENARIOS: readonly ScenarioSpec[]`, in strip order. Open on "earth-turns" or "one-path" (the builder's call) and end on "everything".
- **Produces** (`selection.ts`):
  - `ViewParams` gains `scenario?: ScenarioId`, `knobs?: KnobState` (as params `k.<id>`) and `time?: number` (UTC ms, as `t`).
  - `Selection` gains `{ kind: "node"; id: string }` and `{ kind: "edge"; id: string }`, an edge being named by its child node's id.
  - The tour param and its `Known.tours` are removed in Task 4. Keep them here until then.

- [ ] **Step 1: Write the failing tests:**
  - `checkedState` is `atChecked: true` at the checked knobs and epoch.
  - Moving one knob gives `changed: [thatId]`, and moving the time gives `["time"]`.
  - `clampKnobs` clamps a range knob above its maximum, and replaces an unknown choice with the checked value.
  - Every spec's checked knobs pass `clampKnobs` unchanged.
  - Every spec's `proof` ids exist in `STRESS_CASES` results. Use the data test, or the catalog's id list if it's static.
  - **Review Focus 4:** `parseParams` with `scenario=nope`, `k.station=Mars`, `k.tilt=1e9` and `t=abc` yields the checked setup of the default scenario and doesn't throw. `formatParams(parseParams(x))` round-trips valid params.
  - `node:` and `edge:` selections round-trip.
- [ ] **Step 2: Run** `npx vitest run test/framesExplorerScenarioSpec.test.ts test/framesExplorerSelection.test.ts` and confirm they fail.
- [ ] **Step 3: Implement.**
  - Write the ten specs from the spec's table: titles, questions and knobs.
  - Choose the checked epochs and knob values so each `proof` id is a catalog result that applies at that setup. Examples: dish-tracks uses DSS-43 at a signal.json row's time; bim-site uses EPSG:6420 with the catalog's measurement site.
  - New scenarios with no catalog checks yet (corridor, drone, ship, everything) get their `proof` ids when their tasks add checks.
- [ ] **Step 4: Run** the tests and confirm they pass.
- [ ] **Step 5: Commit** with "examples: frames explorer scenario model, knobs, checked setups and deep links".

### Task 2: Scenario trees and branch paths

**Files:**

- Modify: `examples/frames-explorer/tree.ts`.
- Create: `examples/frames-explorer/panel/treeLayout.ts`.
- Test: `test/framesExplorerTree.test.ts` and `test/framesExplorerTreeLayout.test.ts`.

**Interfaces:**

- **Consumes:** `buildTree` and `TreeNode` (existing).
- **Produces** (`tree.ts`):
  - `TreeNode` gains `added?: true`, set on nodes a scenario added.
  - `interface AddedFrameSpec { id: string; label: string; parentId: string; edge: TreeNode["edge"] }`. This is plain data, so it can come from the worker.
  - `buildScenarioTree(base: TreeNode, added: readonly AddedFrameSpec[]): TreeNode` returns a new tree and doesn't mutate `base`. It throws, naming the id, on a missing parent or a duplicate id.
  - `branchPath(tree: TreeNode, a: string, b: string): { up: TreeNode[]; ancestor: TreeNode; down: TreeNode[] }`. `up` runs from `a` to just below the ancestor, and `down` from just below the ancestor to `b`.
- **Produces** (`panel/treeLayout.ts`): `layoutTree(root: TreeNode, options: { width: number; rowHeight: number; nodeWidth: number }): { nodes: readonly { id: string; x: number; y: number; depth: number }[]; edges: readonly { from: string; to: string }[]; height: number }`. A tidy tree, with no overlapping nodes at the same depth.

- [ ] **Step 1: Write the failing tests:**
  - `buildScenarioTree` adds a site grid under ITRF, marked `added`. The base tree is unchanged.
  - A duplicate id throws, naming it.
  - **`branchPath` (Review Focus 5):**
    - DSS-43 ENU (under ITRF) and Orion (under GCRF) meet at GCRF;
    - a lunar site (under MOON_ME) and a ship (under ITRF) meet at ICRF;
    - a node and its own ancestor give an empty `up` side;
    - every pair among the capstone's four objects is checked against a hand-written ancestor table.
  - **`layoutTree`:** no two nodes at the same depth closer than `nodeWidth`; parents centred over their children within a pixel; a 20-node tree fits `width`.
- [ ] **Step 2: Run** the two test files and confirm they fail.
- [ ] **Step 3: Implement.** For the layout, use a Reingold–Tilford-style tidy tree, or a simpler subtree-width pass that meets the tests.
- [ ] **Step 4: Run** the tests and confirm they pass, along with the existing tree tests.
- [ ] **Step 5: Commit** with "examples: frames explorer scenario trees, branch paths and tree layout".

### Task 3: Scenario evaluation in the worker, with proof that follows the knobs

**Files:**

- Create:
  - `examples/frames-explorer/scenarios/evaluate.ts`: the evaluation types and the registry.
  - `examples/frames-explorer/scenarios/proof.ts`: building proof rows.
- Modify: `examples/frames-explorer/protocol.ts` and `examples/frames-explorer/host.ts`.
- Test: `test/framesExplorerScenarioProof.test.ts` and `test/framesExplorerProtocol.test.ts`.

**Interfaces:**

- **Consumes:** Task 1's `ScenarioSpec`, `KnobState` and `checkedState`; Task 2's `AddedFrameSpec`; the catalog's `StressResult`, `StressContext` and `judgeResult`.
- **Produces** (`evaluate.ts`):
  - `interface ScenarioAnswer { headline: string; value?: number; unit?: string; accuracy: { meters?: number; note: string }; path?: { from: string; to: string } }`. The path names node ids for `branchPath`.
  - `interface SightLine { id: string; from: readonly number[]; to: readonly number[]; label: string }`. Positions are Earth-fixed, in metres. The main thread resolves these against terrain (Task 5).
  - `interface ScenarioEvaluation { scenario: ScenarioId; added: readonly AddedFrameSpec[]; answer: ScenarioAnswer; overlays: readonly { id: string; geometry: OverlayGeometry }[]; sightLines?: readonly SightLine[]; live: readonly StressResult[]; checkedAnswerValue?: number }`. `live` holds the judged checks at these knobs. `checkedAnswerValue` is the answer at the checked setup, for the delta.
  - `type ScenarioEvaluator = (ctx: StressContext, knobs: KnobState, epochTdb: number) => Promise<ScenarioEvaluation>`.
  - `registerScenario(id: ScenarioId, evaluator: ScenarioEvaluator): void`.
- **Produces** (`proof.ts`):
  - `type ProofRow = { kind: "checked"; result: StressResult } | { kind: "live"; result: StressResult } | { kind: "reference-only"; id: string; title: string; delta?: { value: number; unit: string } }`.
  - `proofRows(spec: ScenarioSpec, atChecked: boolean, catalog: ReadonlyMap<string, StressResult>, evaluation: ScenarioEvaluation): ProofRow[]`.
- **Produces** (`protocol.ts`):
  - the request `{ type: "scenario"; scenario: ScenarioId; knobs: KnobState; epochTdb: number }`;
  - the reply `{ type: "scenario"; id: number; evaluation: ScenarioEvaluation }`, whose overlay buffers are transferred;
  - `client.scenario(id, knobs, epochTdb): Promise<ScenarioEvaluation>`.

  Requests join the existing run queue, so they never overlap a catalog run.

- [ ] **Step 1: Write the failing tests:**
  - **`proofRows` (Review Focus 1):**
    - at the checked setup, every `spec.proof` id appears as `checked`, with its catalog result;
    - off it, ids that need a published reference become `reference-only` with a delta, from the evaluation's answer value against `checkedAnswerValue`, and live results appear as `live`;
    - no `reference-only` row has `pass`.
  - **The protocol:** a stub evaluator registered for "earth-turns" returns its evaluation through a `MessageChannel`, with overlay buffers transferred.
  - **Stale replies:** a `scenario` request queued behind a `run` doesn't start until the run ends.
  - **Errors:** an evaluator that throws gives a rejected promise naming the scenario.
- [ ] **Step 2: Run** the tests and confirm they fail.
- [ ] **Step 3: Implement.** The host dispatches through the registry. Scenario modules (Tasks 4–8) call `registerScenario` when the worker imports them; import them all from `host.ts`.
- [ ] **Step 4: Run** the tests and `npm test`, and confirm they pass.
- [ ] **Step 5: Commit** with "examples: frames explorer scenario evaluation in the worker, proof that follows the knobs".

### Task 4: The page: scenario strip, tree diagram, answer, knobs and proof, with the first three scenarios

This task replaces the tour and the Explore tab's layout. It ports three scenarios that the existing code already supports:

- **earth-turns,** from tour stops 1–2: the triads, the polar orbit and the clock;
- **one-path,** from stop 5: Orion in GCRF, ITRF and MOON_ME;
- **stand-on-moon,** from stop 6: the lunar site, lunar time, DE440 through `setFrameData`, and the backdrop caption.

**Files:**

- Create:
  - `examples/frames-explorer/scenarioHost.ts`: the main-thread scenario lifecycle: switch, evaluate, draw, follow the clock and deep links.
  - `examples/frames-explorer/scenarios/earthTurns.ts`, `oneLine.ts` and `standOnMoon.ts`, each with an evaluator and globe framing. Name the files after the ids; one-path's file is the builder's choice of name.
  - `examples/frames-explorer/panel/ScenarioStrip.tsx`, `TreeDiagram.tsx`, `ScenarioAnswer.tsx`, `Knobs.tsx` and `Proof.tsx`.
- Modify:
  - `examples/frames-explorer/main.ts`: move the tour, its stops and the scenario wiring out into `scenarioHost.ts`. What remains is the example's `run`: data loading, the worker, the engine hooks.
  - `content.ts`: remove `TOUR`, `tourScale`'s stop wiring and the tour caption.
  - `panel/Panel.tsx`.
  - `DESIGN.md`.
- Test:
  - `test/framesExplorerScenarioHost.test.ts`, with pure parts extracted: switch state, stale-reply guards, overlay ownership;
  - `test/framesExplorerTour.test.ts`: retire it, and move its still-relevant checks (daylight times, exposure, framing) into scenario tests.

**Interfaces:**

- **Consumes:** Tasks 1–3; the existing `globe.ts`, `orbit.ts`, `pivot.ts`, `addOverlayChunks`, `Hud.tsx`, the inspector and `Verify`/`Report`; `viewer.setGlobe` and `setControls`.
- **Produces:**
  - `createScenarioHost(deps): { show(id: ScenarioId, knobs?: KnobState, epochUtcMs?: number): Promise<void>; setKnob(id: string, value: KnobValue): void; backToChecked(): void; dispose(): void }`.
  - Each switch takes a generation number. Replies from an older generation are dropped, and the old scenario's overlays are removed before the new ones draw (Review Focus 3).
- **Layout (spec "How the page works"):**
  - the scenario strip at the panel's top;
  - the tree diagram (Task 2's layout, with family colours, added frames distinct, and each edge's kind and accuracy; Review Focus 5's path lit edge by edge on answer, honouring reduced motion). On a scenario switch, the tree visibly rebuilds: shared nodes move to their new places and added frames attach in place, which is the spec's "same system, different shape" moment. Reduced motion cuts straight to the new shape;
  - the headline answer, with its accuracy;
  - the knobs, with the checked-setup marker and "Back to the checked setup";
  - the proof (Task 3's rows, which open into the existing inspector).

  "Verification" (today's Verify and Report) moves to a secondary entry. The builder chooses: a tab after the scenarios, or a drawer. The headline answer also shows as a HUD callout on the globe, clear of the inspector, credits and legend.

- [ ] **Step 1: Write the failing tests** (host logic, extracted pure):
  - switching from A to B with A's evaluation still pending: A's reply is dropped and B's draws;
  - all of A's overlay ids are removed before B's draw;
  - a knob change re-evaluates once, debounced, and updates the checked marker;
  - "Back to the checked setup" restores the checked knobs and epoch;
  - the deep link round-trips scenario, knobs, time and a node selection.
- [ ] **Step 2: Run** them and confirm they fail.
- [ ] **Step 3: Implement** the host, the three scenarios and the panel. Keep the camera behaviour that landed in commit 09f98a729a and its fix round: orbit off the surface, globe controls on it, Frame content and `F`, the pivot marker. Each scenario names its rig.
- [ ] **Step 4: Run** `npm test`, `npm run test:data` and tsc, and confirm they pass.
- [ ] **Step 5: Check in the browser** on 5190:
  - switch among the three scenarios mid-load;
  - turn knobs, and watch the checked marker and the proof rows;
  - check a deep-link reload;
  - check light and dark, desktop and 380 px.
- [ ] **Step 6: Commit** with "examples: frames explorer scenarios replace the tour: strip, tree diagram, answer, knobs, proof".

### Task 4b: Split main.ts and panel.css (owner, 2026-11-06), no behaviour change

Iteration slowed because `main.ts` (about 3,700 lines, almost all of it one `run` closure) and `panel/panel.css` (about 2,800 lines) make every task read and diff most of the example. Split them before Tasks 5–8 add six scenarios.

**Files:**

- Split `examples/frames-explorer/main.ts` into focused modules beside it. The builder chooses the boundaries; candidates include:
  - the camera and rigs (orbit, globe controls, flights, pivot, Frame content and `F`);
  - overlays and their ownership;
  - scene enter and leave for each scenario (beside `scenarios/scenes.ts`);
  - the HUD and callout wiring;
  - the Verification wiring (catalog runs, the selection, the report);
  - data loading and the worker client;
  - deep links and history.
  `main.ts` keeps `run`: it builds these modules, wires them together, and owns teardown.
- Split `panel/panel.css` per component (`TreeDiagram.css`, `Proof.css` and so on), with shared tokens and utilities in one small file. Classes are namespaced by component.
- Tests: none change behaviour. Move or extract pure helpers where a module boundary makes them testable.

**Rules:**

- **No behaviour change.** The same DOM, the same CSS cascade outcome, the same camera and overlay behaviour. Before and after, `npm test` and `npm run test:data` give the same counts and the same 225 results, with fingerprints.json unchanged.
- **Small modules with explicit dependencies.** Each module exports a `create…(deps)` that returns its API and a `dispose`. No module reaches into another's state. Shared state passes as explicit objects, not module-level globals.
- **The size target:** no example file over about 800 lines, except tests, and `main.ts` under about 600.
- **Commits:** one module (or a few small ones) per commit, each green on tsc, `npm test` and lint, so a regression is bisectable.

- [ ] **Step 1:** map `run`'s state and functions to modules. Write the map into the report before moving code.
- [ ] **Step 2:** extract the modules one at a time, running `npx tsc --noEmit -p .` and `npm test` after each.
- [ ] **Step 3:** split panel.css, checking light and dark, desktop and 380 px in the browser against the Task 4 `fix2-*` screenshots.
- [ ] **Step 4:** run `npm test`, `npm run test:data`, tsc, eslint and prettier. Check every scenario in the browser on 5190: switching, knobs, scrubbing, Expand, Verification, Back and Forward, Frame content.
- [ ] **Step 5:** update DESIGN.md's file map.

### Task 4c: Owner fixes after Task 4 (2026-11-06), on the split code

Small and targeted. Run it after Task 4b, so it lands in the new modules.

1. **Say how the lunar clock rate is computed** (stand-on-moon). The owner: "not clear how we're measuring the relativistic time difference … not everyone will be familiar with relativity". Add a short plain-language "How this is worked out" section to the answer. Cover these points, and keep the wording faithful to stress/groups/lunar-time.ts:
   - **Which clocks:** one at the lunar site, and one at sea level at the California datasheet point.
   - **Each clock's position and velocity:** taken through the frame tree into ICRF every hour of a lunar month. The lunar site comes through MOON_ME → MOON_ICRF → ICRF, the Earth clock through ITRF → GCRF → ICRF, and each velocity comes from a central difference.
   - **Each clock's rate:** `properTimeRate`. A clock deeper in gravity (the Sun's, the Earth's and the Moon's, as point masses) runs slower, and a faster-moving clock runs slower.
   - **The answer:** the difference between the two rates, averaged over the month, in µs a day.
   - **Why the Moon's clock is fast:** it sits higher in the Earth's gravity well, and that outweighs its orbital speed.
   - **What the 2% covers:** the point-mass approximation, against Ashby & Patla's full model.
   Light the route steps for both clocks' paths to ICRF. Test that the section's text names the method and its tolerance.
2. **Orion's dot disappears when the clock plays** (one-path). Find the cause, which may sit in the stale or "Following the clock" path or in the marker's 150 ms re-ask. Fix it, and add a host test where the clock plays and the marker stays drawn at each tick.
3. **The "Orion's path" label is drawn over the time-settings panel** opened from the timeline. Overlay labels on the globe must sit under the HUD's popovers and panels (z-order), or be clipped to the free part of the view. Check the other HUD popovers too.
4. **Parked from Task 4's review (P5):**
   - `accuracyWarns` matches the note text: use a structured flag on the accuracy;
   - the tree's edge tips portal outside `.🥝Root`: check that the StrataKit tokens resolve there;
   - at 1280×700 the callout partly covers "Orion, 23:00 UTC";
   - the `quietResult` flag can linger when the result is already selected.

The owner confirmed that "Open in Verification" leaves the camera where it is, so no change there.

- [ ] Tests first for items 1, 2 and 4, then the fixes. Check items 2 and 3 in the browser, and take screenshots.
- [ ] Commit with "examples: frames explorer: how the lunar clock rate is worked out, Orion's dot while playing, labels under the HUD".

### Task 4d: No hitch while the clock plays (owner, 2026-11-06)

The diagnosis was made in a browser on 5190 (ledger, 2026-11-06). In one-path, with the clock playing at 1 h/s and the camera rotating slowly, about 55 of 543 frames dropped, in bursts of 3–6 almost exactly once a real second. The main thread was busy for about 60 ms each time, in tasks under 50 ms. With the clock paused, the same rotation gave 3 slow frames of 360, and earth-turns gave 0 of 571. The prime suspect is frameLoop.ts:59, `deps.rebuildTree()`, which runs once a real second while the clock has moved more than a minute: the whole tree and its diagram are rebuilt to refresh the Earth-orientation sigma on the ITRF edge. Scenario re-evaluations every ~730 ms (replaceState plus the worker reply) also contribute.

- [ ] **Step 1: Measure first.** Wrap `rebuildTree`, the scenario-reply handling and the tree diagram's render with `performance.measure` in a dev-only probe, and attribute the ~60 ms. Write the breakdown into the report before changing anything.
- [ ] **Step 2: Write a failing test.** While the clock plays, with the scenario and tree shape unchanged, the tree diagram's React subtree doesn't re-render, and no tree rebuild happens. Only the changed edge accuracy's text updates. Use a render counter or a rebuild spy.
- [ ] **Step 3: Fix it at the source.**
  - Split "the tree's shape" (built when the scenario or its added frames change) from "edge values that drift with time" (the EOP sigma).
  - Update the values in place: memoized diagram props, keyed so an unchanged edge doesn't re-render, with the accuracy text updating only when its printed value changes.
  - Make the scenario reply path cheap when nothing visible changed: skip the overlay re-upload when the mesh is unchanged, and skip proof rows when their text is unchanged.
  - Keep the route animation running across value updates.
- [ ] **Step 4: Measure again** in the browser, with the same protocol (1 h/s, slow rotation, 10 s). The target is no once-a-second bursts, and slow frames at the paused baseline (about 1%). Report before and after numbers.
- [ ] **Step 5: Run** the gates (`npm test`, `npm run test:data` with 225 results and unchanged fingerprints, tsc, lint), then commit with "examples: frames explorer: the tree's values update in place while the clock plays (no once-a-second rebuild)".

The library-level design (revisions, cheap synchronous queries and budgeted async ones) is plan 5 (CESIUM2_WEBGPU_PLAN.md §13.14). This task fixes the example only.

### Task 5: Terrain line of sight (library)

**Files:**

- Create: `src/measure/terrainLineOfSight.ts`, exported from `src/index.ts`.
- Test: `test/terrainLineOfSight.test.ts`.

**Interfaces:**

- **Produces:**
  - `terrainLineOfSight(from: ArrayLike<number>, to: ArrayLike<number>, sampleHeight: (longitude: number, latitude: number) => number | undefined, options?: { step?: number; ellipsoid?: Ellipsoid; terrainAccuracy?: number }): { clear: boolean | undefined; minClearance?: number; blockedAt?: Float64Array; unknownFraction: number; accuracy: { meters?: number; note: string } }`.
  - Positions are Earth-fixed, in metres. `clear` is `undefined` when unknown spans could hide an obstruction. `minClearance` is the ray's lowest height above the terrain, in metres.
- **Consumes, in the page:** a sampler from `viewer.globe?.surfaceHeight` (or `sampleHeight` where the globe offers it). It uses the finest loaded tile. Check `src/globe/TerrainSource.ts` and `src/streaming/Tileset3D.ts` for which is right for line of sight, and say why.

- [ ] **Step 1: Write the failing tests,** with a synthetic sampler (a Gaussian hill on the ellipsoid):
  - a ray over the hill is `clear: true`, with `minClearance` matching the hand geometry within `step`'s error;
  - a ray through it is `clear: false`, with `blockedAt` on the hill's face;
  - **Review Focus 2:** a sampler returning `undefined` over 30% of the path in the middle gives `clear: undefined` and `unknownFraction` of about 0.3, never `true`;
  - the accuracy note includes the terrain accuracy passed in;
  - a ray entirely above the terrain by kilometres is clear, with a stride-adaptive sample count.
- [ ] **Step 2: Run** and confirm they fail.
- [ ] **Step 3: Implement:**
  - geodetic sampling along the segment, every `step` metres (default: the tile level's ground spacing or 30 m), with refinement near the minimum clearance;
  - the earth's curvature through the ellipsoid;
  - a note in the doc comment that it is CPU-sampled, and that a GPU viewshed belongs to plan 5's renderer items.
- [ ] **Step 4: Run** the tests and `npm test`, and confirm they pass.
- [ ] **Step 5: Commit** with "measure: terrain line of sight over a height sampler".

### Task 6: BIM site, corridor, dish tracks and Moon from here

These four scenarios are buildable on today's library.

- **bim-site:**
  - absorbs tour stops 3–4: the design grid with true north at ×20 with its switch, the 400 km rigid against exact line, and the 20 km inset with its two gap parts;
  - adds the site grid (rotation and scale knobs) and the CRS knob (EPSG:6420, UTM 10N, and an Oregon or Wisconsin low-distortion zone from the catalog);
  - globe: terrain, with overlays lifted to the terrain's height for display and the lift noted in the legend; or the ellipsoid for the rigid-vs-exact view, using `viewer.setGlobe` per scenario. The builder rules on which, and ledgers it.
- **corridor:**
  - the catalog's clothoid alignment under the design grid;
  - knobs: station and offset, with a draggable point;
  - the answer: station and offset with the 1e-9 recovery accuracy.
- **dish-tracks:**
  - knobs: the station (DSS-14 Goldstone, DSS-43 Canberra, DSS-63 Madrid, from the setup store's NAIF station SPK; check that each is present) and the time;
  - the answer: azimuth and elevation, light time and line of sight to Orion, against the Moon and Earth through the existing `lineOfSight`, plus terrain through Task 5 for the local horizon;
  - proof: plan 3's `signal.json` checks at DSS-43.
- **moon-from-here:**
  - a California site's east-north-up frame on ITRF and the Moon;
  - the answer: the Moon's azimuth, elevation and distance;
  - knob: time;
  - proof: a new check of the Moon's topocentric direction against a published reference. Use JPL Horizons observer-table values copied with a citation (R10), or leave it out and report.

**Files:**

- Create: `examples/frames-explorer/scenarios/bimSite.ts`, `corridor.ts`, `dishTracks.ts` and `moonFromHere.ts`.
- Modify: `scenarios/specs.ts` (proof ids, checked setups), `references.json` (any new reference), and the `stress/` catalog for new checks.
- Test: `test/framesExplorerScenarios.test.ts`, with pure answer math against hand values; and data tests for evaluators that need PROJ or frames, in `test/data/framesExplorerScenarios.test.ts`.

- [ ] **Step 1: Write the failing tests,** one per scenario:
  - **bim-site:** at the checked setup, its added frames and the answer's 31.4 m figure.
  - **corridor:** a station and offset round trip through the evaluator matches the catalog's.
  - **dish-tracks:** the light time at a signal.json row within plan 3's tolerance; the azimuth and elevation of Orion from DSS-43 against a hand computation from the evaluator's own vectors (an R11 effect); line of sight blocked at a time when the Moon occults.
  - **moon-from-here:** azimuth, elevation and distance against the cited reference, or skipped with a reason if there isn't one.
- [ ] **Step 2: Run** and confirm they fail.
- [ ] **Step 3: Implement** the four evaluators and their globe modules, register them, and complete their specs' proof ids. Keep the catalog's existing numbers unchanged; new checks join the catalog with fingerprints only if they use recorded operations.
- [ ] **Step 4: Run** `npm test` and `npm run test:data`, and confirm they pass with `fingerprints.json` unchanged except for added records. List any additions.
- [ ] **Step 5: Check in the browser** on 5190: each scenario's knobs, answer, proof both on and off the checked setup, and branch-path lighting for dish-tracks (DSS ENU up to GCRF and down to Orion). Take screenshots.
- [ ] **Step 6: Commit** with "examples: frames explorer scenarios: BIM site, corridor, dish tracks, Moon from here".

### Task 7: The drone and the ship

**Files:**

- Create:
  - `examples/frames-explorer/scenarios/drone.ts` and `ship.ts`;
  - `examples/frames-explorer/scenarios/bodyFrame.ts`: a moving body frame from a track.
- Modify: `scripts/frameData.mjs`, only if an AIS extract is used (see Step 3); `references.json`; `scenarios/specs.ts`.
- Test: `test/framesExplorerBodyFrame.test.ts`, plus data tests.

**Interfaces:**

- **Produces** (`bodyFrame.ts`): `trackFrame(name: string, parent: Frame, track: { at(tdb: number): { position: ArrayLike<number>; velocity: ArrayLike<number> } }, attitude?: (tdb: number) => { pitch: number; roll: number }): Frame`.
  - Heading comes from the horizontal velocity in the local east-north-up frame. Pitch and roll come from `attitude`, or level.
  - The frame's `toParent` is position plus rotation, built with the library's public `Frame` constructor.
- **drone:**
  - a synthetic track over the BIM site, labelled as such, and a camera-mount frame (tilt knob) on the body;
  - the answer: the camera's footprint centre on the terrain, through Task 5, as design-grid E and N;
  - knobs: tilt, position along the track, and the height datum (ellipsoid or NAVD88 through GEOID18 for the drone's reported height).
  - A sampled viewshed overlay (which ground cells the camera sees, from Task 5's function over a coarse grid) is a welcome extension. Build it only if it costs under 50 ms on the main thread at the default grid; measure and say.
- **ship:**
  - a vessel entering San Francisco Bay;
  - a body frame with modelled pitch and roll (a gentle, labelled sea state), and a mast-sensor frame;
  - the port's design grid: California zone 3;
  - the answer: the ship's E and N on the port grid, and whether the mast can see a named buoy past the headland, through Task 5 over real terrain;
  - knobs: time along the track, mast height, height datum.
  - **Data:** try a public-domain AIS extract (NOAA, marinecadastre.gov) of one vessel, pinned by SHA in setup and at most 20 MB.
    - If no pinned source of that size exists (daily files are hundreds of MB), use a synthetic track along the San Francisco traffic separation scheme's inbound lane, with coordinates from 33 CFR 167 (cite the section), and label it synthetic.
    - Take the buoy's position from the USCG Light List (public), cited.
    - Ledger the choice.
  - State the chart datum (mean lower low water) plainly as plan 4b work.

- [ ] **Step 1: Write the failing tests:**
  - `trackFrame`: heading equals the hand azimuth of a track heading north-east; a level attitude keeps the body's z along the local up within 1e-12; a roll of 10° rotates y about x by 10°.
  - The drone footprint: over a synthetic flat sampler, the footprint centre matches the hand ray-plane intersection.
  - The ship's line of sight to the buoy: blocked with a hill sampler between them, and clear when the mast height rises above it (hand geometry).
- [ ] **Step 2: Run** and confirm they fail.
- [ ] **Step 3: Implement,** including the data decision. A setup change follows the existing manifest and SHA-pin pattern.
- [ ] **Step 4: Run** the tests, `npm test` and `npm run test:data`, and confirm they pass.
- [ ] **Step 5: Check in the browser** on 5190, with terrain: the drone footprint follows the tilt knob; the ship's buoy sight line turns blocked and clear across the knobs, with its accuracy stating the terrain's. Take screenshots.
- [ ] **Step 6: Commit** with "examples: frames explorer scenarios: a drone over the site and a ship entering San Francisco Bay".

### Task 7b: A robot arm at a spaceport (added by the owner, 2026-11-06)

**Files:**

- Create: `examples/frames-explorer/scenarios/robotArm.ts`, and `examples/frames-explorer/scenarios/jointChain.ts` for a kinematic chain of joint frames.
- Modify:
  - `scenarios/spec.ts`: add `"robot-arm"` to `ScenarioId`;
  - `scenarios/specs.ts`: the spec, placed before "everything";
  - `scenarios/index.ts`;
  - `references.json`, for the mark.
- Test: `test/framesExplorerJointChain.test.ts`, plus data tests.

**Interfaces:**

- **Produces** (`jointChain.ts`): `jointChain(parent: Frame, joints: readonly { name: string; axis: "x" | "y" | "z"; offset: readonly [number, number, number]; angle: () => number }[]): Frame[]`. Each joint frame rotates about its own axis by `angle()`, after a fixed link offset in its parent. The function returns the frames in order, with the tool last. It uses the library's public `Frame` constructor, and every edge is exact by definition.
- **App-defined frames (owner, 2026-11-06: "those robotics frames are supplied by the app, not by cesiumjs, to show user frames as a feature").**
  - `jointChain.ts` is the example app's code, not the library's. It lives under `examples/` and uses only the public API: `new Frame(name, parent, toParent, { cache: false })`. Joint angles are state beyond the instant, so they take `cache: false` (Frame.ts:27-31).
  - The diagram marks these frames as defined by the app, distinct from the library's built-in frames. Reuse or rename the "added by this scenario" treatment so it reads "defined by your app".
  - The answer area offers a short "How these frames are defined" disclosure. It shows the 5–10 lines of app code that create one joint frame, taken from the source and rendered as text.
  - **Accuracy is the app's to state (owner, 2026-11-06).** Each joint carries its encoder's angular accuracy and each link its length tolerance, from a synthetic spec sheet, labelled. Example values: ±0.005° per encoder and ±0.2 mm per link. The base placement carries its survey accuracy.
    - Compose them to the tool: each joint's angular error times its lever arm (the distance from that joint to the tool), plus the link and base terms. Combine them as root-sum-square, and say so.
    - The tool's stated accuracy then grows visibly as the arm extends. Show that in the answer, for example "±1.8 mm, most of it from the shoulder encoder".
    - Test it against a hand computation at two arm poses.
    - **The library composes; the app only declares (owner, 2026-11-06: "seems easy for a user to screw up").** Task 7b adds, under `src/frames/`, with tests:
      - an optional `accuracy` in `Frame`'s constructor options. It reuses the example's `EdgeAccuracy` shape, moved into the library: `{ radians?, meters?, byDefinition?, note }`, or "not stated". The built-in edges and the example's tree.ts take their accuracies from it, so there is one source of truth.
      - a first-order point composer, for example `pointAccuracy(point, from, to, instant)`. It returns `{ meters | undefined, terms: { frame, meters, note }[], unboundedBy?: frameName }`.
        - Each angular term is scaled by its lever arm: the point's distance from that edge's rotation origin.
        - Metre terms add directly.
        - Terms combine root-sum-square, and the result says so.
        - An unbounded edge makes the total unbounded and names that edge. It is never dropped.
        - This generalises the example's `accuracyOf`, which moves into it.
      - The arm, and the scenarios already on screen, use it. The answer names the dominant term. Test it against hand computations: two arm poses, plus earth-turns' existing angular case.
      - Confidence levels, correlated terms and per-direction error ellipsoids are plan 5 (CESIUM2_WEBGPU_PLAN.md §13.14). Don't build them here; mark every value as 1σ for now, as the example already does.
  - **Library gaps:** record any in the report and in CESIUM2_WEBGPU_PLAN.md §13.14 "Carried forward". Implement one only if it is small and the scenario can't be honest without it, and ledger the ruling. Candidates:
    - a revision or change signal, so a state-dependent frame can stay cached and the renderer knows to redraw;
    - velocities (plan 3).
- **robot-arm:**
  - **The tree:** pad ENU (`eastNorthUpFrame` at the pad) → arm base (a fixed placement, with a stated, labelled survey accuracy) → base yaw → shoulder → elbow → wrist → tool. Link lengths are synthetic, sized like a launch-pad service arm, and labelled synthetic.
  - **The place:** Kennedy Space Center LC-39A, unless a better-documented pad is found. Cite the pad's coordinates.
  - **The mark (data):** a nearby NGS mark or CORS station whose published coordinates give both NAD83(2011) and ITRF. Pin it as a data card in its NAD83(2011) CRS, reached through PROJ. Cite its datasheet, with its PID and date.
    - If no such station exists within a few kilometres, use the nearest published one, and say so in the answer's paragraph.
    - Ledger the choice.
  - **The answer:** "the tool is X m from the mark (its name)", as a straight-line distance, with the composed accuracy: joints exact, base survey ±, mark datasheet ±, and the PROJ operation's ±. The route steps run from the tool down the chain to the pad ENU, through ITRF, and out to NAD83(2011).
  - **Knobs:** base yaw, shoulder, elbow, wrist, each a range with limits.
  - **On the globe:** the arm drawn as link segments with a small triad at each joint, the tool marked, and a leader line from the tool to the mark labelled with the distance. Use a terrain or ellipsoid rig close to the pad.
  - **Proof:**
    - at the checked angles, forward kinematics against a hand closed-form solution (R11);
    - a round trip through the chain, tool → ITRF → tool;
    - the mark's PROJ conversion, NAD83(2011) → ITRF, against its published ITRF coordinates (R10), as a new catalog check;
    - off the checked setup, the live re-runs.

- [ ] **Step 1: Write the failing tests:**
  - App frames: after a knob changes a joint angle at the same instant, the tool's ITRF position changes (no stale cache).
  - `jointChain`: with all angles 0 the tool sits at the sum of the offsets; a 90° base yaw turns the tool's position about the pad's up axis; each joint frame's rotation stays orthonormal within 1e-12.
  - Forward kinematics at three angle sets against a hand closed-form planar solution.
  - The tool-to-mark distance equals the norm of their ITRF difference.
  - The catalog check: the mark's NAD83(2011) → ITRF conversion against its published ITRF values, within the datasheet's stated accuracy.
- [ ] **Step 2: Run** and confirm they fail.
- [ ] **Step 3: Implement,** following the owner-approved tree, data and route design (data card, "Drawing in", the animated route and route steps), and the question-and-headline rule (`ScenarioAnswer.label` is required).
- [ ] **Step 4: Run** the tests, `npm test` and `npm run test:data`. The fingerprints change only by the new check's addition; record it.
- [ ] **Step 5: Check in the browser:**
  - the joints move with the knobs;
  - the leader line and the distance follow;
  - the route lights from the tool to the mark;
  - take screenshots in light and dark and at 380 px.
- [ ] **Step 6: Commit** with "examples: frames explorer scenario: a robot arm at a spaceport".

### Task 8: Everything at once

**Files:**

- Create: `examples/frames-explorer/scenarios/everything.ts`.
- Modify: `scenarios/specs.ts` and `panel/TreeDiagram.tsx`, for picking a pair.
- Test: `test/framesExplorerScenarios.test.ts`.

**Interfaces:**

- **Consumes:** the dish, ship, Orion, lunar-site and robot-arm tool frames from Tasks 4, 6, 7 and 7b, built together in one tree.
- **Produces:**
  - knobs: object A, object B (a choice of the five), and time;
  - the answer: distance, light time and line of sight between A and B, through the existing `lightTime` and `lineOfSight`, plus Task 5 when both are on the Earth;
  - the diagram lights `branchPath(A, B)`.

- [ ] **Step 1: Write the failing tests:**
  - for every pair, the answer's distance equals the norm of their positions' difference in ICRF;
  - the light time matches `lightTime` within its tolerance;
  - the evaluation's `answer.path` gives Task 2's ancestor table (Review Focus 5).
- [ ] **Step 2: Run** and confirm they fail.
- [ ] **Step 3: Implement,** and make it the strip's last scenario.
- [ ] **Step 4: Run** the tests, `npm test` and `npm run test:data`, and confirm they pass.
- [ ] **Step 5: Check in the browser:** every pair, and the path lighting.
- [ ] **Step 6: Commit** with "examples: frames explorer capstone: everything at once".

### Task 9: UX review, browser checks and the production build

**Files:** fixes wherever the review finds them, and `DESIGN.md`.

- [ ] **Step 1: Take screenshots** of all eleven scenarios, light and dark, at desktop and 380 px, plus the proof both on and off the checked setup and the Verification entry. Use Playwright with headless Google Chrome, into `design-screenshots/` as `scenario-*.png`. That folder is git-ignored: never commit screenshots (owner, 2026-11-06); describe them in the report instead.
- [ ] **Step 2: Run the UX review.** The controller dispatches it on the most capable model, against the spec's goals and anti-goals, Nielsen's heuristics, WCAG 2.2 AA and the two audiences. Fix every Critical and Important finding, and re-check.
- [ ] **Step 3: Run the browser checks** on 5190:
  - **Review Focus 1–5,** by hand:
    1. off the checked setup, no verified row;
    2. terrain unloaded: unknown, not clear;
    3. switching mid-evaluation;
    4. hostile deep links;
    5. every capstone pair's path.
  - keyboard-only use, and reduced motion;
  - no console errors;
  - the token search (R18).
- [ ] **Step 4: Check the production build:** `npm run build` and a static serve of the built gallery, then open three scenarios, including one with terrain.
- [ ] **Step 5: Commit** with "examples: frames explorer scenarios: UX review fixes and browser checks".

### Task 10: Docs

**Files:** `CESIUM2_WEBGPU_PLAN.md` §13.14, `packages/next/README.md`.

- [ ] **Step 1: Write a "Frames explorer scenarios" results note:**
  - the eleven scenarios and their trees;
  - the proof model;
  - terrain line of sight;
  - the data sources (and whether the AIS extract or the synthetic track was used);
  - the screenshots.

  Move real deferred work from this plan's ledger into "Carried forward" (no nits). For example: a GPU viewshed (plan 5), the chart datum (4b), and the Moon as a tileset (plan 5).
- [ ] **Step 2: Update the README line** for the example: scenarios first.
- [ ] **Step 3: Run the gates** and commit with "Plan: frames explorer scenarios results".
