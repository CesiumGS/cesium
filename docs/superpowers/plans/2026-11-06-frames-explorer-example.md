# Frames and Projections Example (Stress Test) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a gallery example, "Frames and projections", that shows the frame tree and the engineering frames working. It has three parts:

- **A live tree:** each edge labelled with its kind.
- **Viewer overlays:** these draw the transforms on the globe.
- **A stress-test suite:** it runs in the page, with each result checked against its tolerance and shown with its accuracy statement.

The same suite runs headless as a regression data test.

**Architecture:**

- **Files.** The example is a module under `packages/next/examples/frames-explorer/`. `tests.ts` is a pure stress-test catalog, shared by the page and a Vitest data test. `tree.ts` is the tree model. `overlays.ts` builds pure geometry. `worker.ts` and `protocol.ts` run the suite and the PROJ-dependent geometry off the main thread (R13). `main.ts`, `selection.ts` and `report.ts` hold the page, its linked selection and its report export (R14, R15).
- **Drawing.** Overlays are unlit `line-list` meshes in the engine's world, which is Earth-fixed: each frame is drawn at its ITRF placement at the clock's time. Labels are HTML.
- **Data.** Frame data, PROJ and the Artemis trajectory load from the setup store lazily, and only when a feature needs them.

**Tech Stack:** TypeScript, the engine's `Viewer`, `World.addMesh` (`topology: "line-list"`) and `World.addDraw`, StrataKit for the panel (`@stratakit/mui`, `@stratakit/structures`, `@stratakit/icons` and `@stratakit/foundations`, already dependencies of `packages/next`, rendered with React into `context.panel`), a module Web Worker, and Vitest. No new dependencies.

**Spec:**

- The owner's request, recorded in `CESIUM2_WEBGPU_PLAN.md` §13.14 under Carried forward: "a gallery example for frames and projections", with its viewer addition of 2026-11-06.
- `docs/superpowers/specs/2026-11-05-frames-bodies-measurement-design.md` for the frames and measurements it shows.
- The owner skipped further questions: iterate on the design once it's built.

**Builds on:**

- Plans 1–3: `loadFrameData`, `createFrames`, `Trajectory`, `measure`, accuracy statements.
- Plan 4a: `loadProj`, `resolveOperation`, `EngineeringFrame`, `RigidPlacement`, `gridFactors`, `Alignment`, design measurement.

Plan 4b later adds three things here:

- tilesets placed rigidly versus reprojected;
- the global-geoid stress tests;
- the EGM96 (mean sea level) height beside the ellipsoid and NAVD88 heights in the "Heights and WGS84" group.

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
- **R10. Outside authorities, not only round trips (owner's addition, 2026-11-06).** A round trip proves the code agrees with itself, not that it's right. So every group that can have one gets at least one case against a value from outside this library and outside PROJ.
  - **Where the values live.** Published values go in `examples/frames-explorer/references.json`, copied verbatim from the source. Each entry carries `source`: document, edition or revision, table, page or URL, and retrieval date.
  - **Sources, in order of preference:**
    - **NGS datasheets:** public domain, from `ngs.noaa.gov/datasheets`, cited by PID.
    - **IOGP Publication 373-7-2** (EPSG Guidance Note 7-2) worked examples.
    - **Published design-manual or textbook tables.**
    - **The last resort:** a hand formula written out in the case, or an mpmath computation at 50 digits. The mpmath script goes in `examples/frames-explorer/references/` and is cited.
  - **Never generated with PROJ, pyproj or this library.** If a source can't be fetched, the case is left out and reported as a finding. It's never filled in from PROJ.
  - **Tolerance:** half a unit in the source's last printed digit, plus the library's own tolerance for that path.
- **R11. Effect sizes are shown as sizes.** Some cases exist to show how big an effect is, such as the frame bias at the Moon's distance. Their result gets `effect: { value, unit, label }`, displayed apart from pass or fail. A case passes when the size the library produces matches an independent hand formula, within 2%, never when it matches itself.
- **R12. Browser and Node agree, visibly.** Every recorded-operation case gives a `fingerprint`, built from three parts:
  - the operation's PROJ pipeline string;
  - the grid files with their pinned SHA-256 values, from `scripts/frameData.mjs`;
  - the transformed coordinates of the case's points.

  `examples/frames-explorer/fingerprints.json` holds the expected fingerprints, written by the Node data test when `FRAMES_EXPLORER_UPDATE=1` is set. The data test and the page both compare against it. The pipeline and grids must match exactly, and the coordinates within 1e-9 m. The page shows "browser = Node" or the difference. A mismatch is a failure, which also catches PROJ or grid drift after a version change.
- **R13. Run the suite and PROJ in a Web Worker (owner's choice, 2026-11-06).** A 10 s run on the main thread would freeze R9's spinners and the globe. So:
  - **One worker per page run:** `new Worker(new URL("./worker.ts", import.meta.url), { type: "module" })`.
  - **PROJ and the Orion trajectory live only in the worker:** one PROJ instance and one copy of `proj.db` in memory. The worker runs `runStress` and builds the PROJ-dependent geometry: `designGrid`, `trueNorthLines`, `rigidVsExact`, `distortion` and `trajectoryPath`. It returns geometry as transferred `ArrayBuffer`s, not copies.
  - **Frame data loads on both sides.** The main thread needs it to draw triads that follow the clock every frame. The data is a few MB, and the browser's HTTP cache serves the second fetch.
  - **Only plain data crosses** (structured clone): results, accuracy statements as plain objects, instants as TDB seconds, and errors as `{ name, message }`. Expected-throw matching (R7) happens inside the worker, before anything is serialized.
  - **Stopping is guaranteed.** `context.signal` posts `cancel` and then calls `worker.terminate()`, so no work survives leaving the example (Review Focus 9).
  - **The costs, accepted:**
    - frame data is held twice;
    - the message layer isn't covered by the Node data test, so it gets its own tests (Task 4);
    - module workers and the worker's runtime `import()` of `proj_capi.mjs` must work in the production build, not only the dev server. Task 5 checks the built gallery, which also covers §13.14's carried-forward note that `loadProj` was only checked in dev;
    - errors and logs inside the worker show in the worker's console context.
- **R14. The page's information architecture (owner's addition, 2026-11-06).**
  - **Three views, one selection.** The tree (structure), the globe (space) and the tests (evidence) share one selection state in `selection.ts`: `type Selection = { kind: "frame"; id: string } | { kind: "result"; id: string } | { kind: "none" }`.
    - Selecting a result flies the camera to its site, turns on its overlay and highlights its frames' path in the tree.
    - Selecting a frame highlights its path and filters Verify to the groups that use it.
    - The globe never shows a selection the panel doesn't.
  - **Four levels, glance to proof:**
    1. **A status strip**, always visible at the panel's top: R9's data items as pills (ready; fetching with MB; missing), plus passed / failed / waiting counts.
    2. **Question cards:** one per group, titled with the plain-language question it answers. The card's headline is the answer (usually the effect size, R11), with its pass count.
    3. **Result rows** inside a card: the value-to-tolerance bar, the accuracy total, an effect-size column and a fingerprint badge.
    4. **The inspector**, for one selected item:
       - measured against expected;
       - the accuracy terms;
       - the source citation or the hand formula written out;
       - the fingerprint, with any difference;
       - actions: "Show on globe", "Highlight frames", "Copy link".
  - **Tabs:**
    - **Explore:** the tree, overlays and clock.
    - **Verify:** lens chips, question cards, results and the inspector.
    - **Report** (R15).
  - **Lenses:** chips for All, Civil, BIM, GIS, Space, Timing, Offshore and AV filter the question cards to one audience. Each group carries its lens tags (Task 1).
  - **The globe legend:** a box in a corner of the globe lists every active overlay with its accuracy (R8). Accuracy is never shown only in the panel.
  - **One status vocabulary:**

    | State | Look |
    | --- | --- |
    | Pass | Green, check icon |
    | Fail | Red, x icon |
    | Fetching or waiting | Blue, spinner, naming the item |
    | Missing data | Gray, setup hint |
    | Not bounded | Amber, naming the unknown term |

    Never color alone: there's always an icon and text. Numbers carry units, with consistent significant figures. Keyboard navigation covers the tabs, cards, rows and inspector actions.
- **R15. Deep links and a report.**
  - **Deep links.** Use the gallery's own route format; find how `examples/index.ts` and the gallery shell parse the hash. The selection and lens round-trip through the URL, for example `#/examples/frames-explorer?select=result:space.lunar-time&lens=space`. Opening that link runs what's needed, selects the result and flies to it. If the gallery's router can't carry a query, encode the selection as an extra path segment.
  - **The report.** The Report tab copies the run to the clipboard and saves it as Markdown and JSON. It contains:
    - every result with its value, tolerance, accuracy, effect and fingerprint, failures first;
    - the environment: PROJ version, `proj.db` and grid SHA-256 values, the frame-data manifest's versions, the package version, the user agent, and the run's timestamp and duration.

    It's the artifact an engineer files as QA evidence. Saving is a `Blob` download that the user starts.
- **R16. Design quality for two audiences (owner's requirement, 2026-11-06).** The page is a visual demo and a confidence tool, and it has to be good at both. The rough mockup shown during planning is superseded. R14 fixes the structure, not the look.
  - **The audiences:**
    - **Graphics engineers exploring the proof of concept.** They need a striking, fluid demo: the globe is the hero, overlays are beautiful and legible, and camera flights and path highlights move with purpose.
    - **Subject-matter experts** (geodesists, surveyors, GIS and space people). They need confidence: every question they'd ask has visible evidence, the system is transparent about what it computed and how, and accuracies are honest.
  - **Principles:**
    - **The globe is the hero:** at least two-thirds of the width on desktop, with a collapsible panel.
    - **Progressive disclosure:** a calm first view, with detail one click away. Never a wall of rows.
    - **Hierarchy from type and spacing,** not boxes and borders. Use StrataKit's semantic type scale and tokens (`--stratakit-font-size-*`, `--stratakit-space-*`, `--stratakit-color-*`), in light and dark.
    - **Color with meaning:**
      - status colors (R14's vocabulary) are used only for status;
      - frame families get one categorical palette, used identically in the tree, the triads, the labels and the legend: Earth frames, Moon frames, inertial frames, engineering frames and trajectories;
      - axis colors stay red/green/blue.
    - **Purposeful motion:** eased camera flights, and the selected path animating along the tree's edges. Respect `prefers-reduced-motion`.
    - **Designed states:** empty, loading, error and missing-data states are designed, not defaulted.
    - **Accessible:** WCAG 2.2 AA contrast, full keyboard use and visible focus.
    - **No undefined jargon:** a glossary popover on every term (ITRF, GCRF, convergence, combined factor, epoch, ballpark).
  - **Transparency features:**
    - **Walk the tree:** selecting a frame animates the chain from the root to that frame. Each edge shows:
      - its transform kind;
      - its math in one line (for example, IERS 2010 eq. 11.19);
      - its source data with dates (DE440; Bulletin A, measured or predicted, with its age);
      - its accuracy.

      Beside it, a budget bar accumulates the composed accuracy term by term, so the expert sees where the error comes from.
    - **A computation trace per result:** the inspector shows input → each step → output, against the expected value, with intermediate values and copy buttons. The steps include the PROJ pipeline string, the site transform and each frame edge.
    - **Honest limits:** "not bounded", ballpark, predicted Earth orientation and missing grids are stated plainly, never hidden behind a pass.
  - **A guided tour for demos.** About six stops, each with a short caption, a camera move and the relevant overlays. It's skippable, and each stop is deep-linkable (R15). The stops:
    1. Earth's frames;
    2. GCRF to ITRF over a day;
    3. the California design grid with true north;
    4. rigid against exact, and the 31 m sag;
    5. Orion's figure-eight in GCRF against the far-side swing in MOON_ME;
    6. the Moon's south-pole site and lunar time.

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
  | Published reference values (R10) | Half the source's last printed digit, plus the path's own tolerance |
  | Effect sizes against their hand formula (R11) | 2% |
  | Browser against Node fingerprints (R12) | Pipeline and grids exact; coordinates 1e-9 m |

- **Matrix conventions** are unchanged. `src/frames/matrix.ts` is the only layout bridge, and meshes take positions in the world's Earth-fixed meters.
- **UI: StrataKit (owner's correction, 2026-11-06).** The panel is built with StrataKit, Bentley's design system, as Dyno and Sandcastle are. No other UI library.
  - **Follow `packages/next/bench/suite/DESIGN.md`:** its copy rules and its "Components (StrataKit)" and "Live engines" sections bind. Read `bench/suite/STRATAKIT_FEEDBACK.md` for known gaps. Log new friction there.
  - **Mounting:** the example renders a React root into `context.panel`, inside the same StrataKit theme provider Dyno uses (`bench/suite/theme.tsx`'s `ThemeRoot`, or the same `@stratakit/mui` provider with Dyno's current scheme), so it follows Dyno's light and dark. It unmounts through `context.scope`.
  - **Components:**

    | Need | Component |
    | --- | --- |
    | Frame tree | `Tree` / `TreeItem` from `@stratakit/structures` |
    | Explore / Verify / Report | `Tabs` from `@stratakit/structures`, with ARIA ids and `aria-controls` wired by the app (feedback item 22) |
    | Result rows | `Table` from `@stratakit/structures` |
    | Glossary, edge detail | `Popover` from `@stratakit/structures` |
    | Question cards | `AccordionItem` from `@stratakit/structures`; its header holds no actions (feedback item 7), so actions go in the body |
    | Status pills | MUI `Badge` with `variant="inline"` and `success` / `warning` / `error` / `info` / `secondary`, always with a word |
    | Lens filter | A non-exclusive MUI `ToggleButtonGroup` (Dyno's `Chips` pattern; StrataKit's `Chip` has no selected state) |
    | Overlay on/off | `Switch` |
    | Draw-in frame, CRS chooser | `Select` in a `FormControl` with a visible label, or an exclusive `ToggleButtonGroup` for two to four options |
    | Missing data | MUI `Alert` inline, or `Banner` from `@stratakit/structures` |
    | "Copied", "Saved" | `Snackbar` |
    | Icons | `Icon` from `@stratakit/mui`, with `@stratakit/icons` only |

  - **Styling:** props first, then classes using StrataKit tokens. Never `sx`, never hard-coded colors in the panel.
  - **The canvas is the exception.** The globe legend, the labels, the tour captions, the axis colors and the frame-family palette are the 3D viewport's HUD, which DESIGN.md exempts. Even there, use StrataKit surface and text tokens for backgrounds and type.
- **Repository practice:**
  - Commit locally and never push. End each message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  - `npx tsc --noEmit -p .`, `npx eslint` and prettier pass.
  - Run `snyk_code_scan` on new code.
  - Before deleting the SDD workspace, copy real deferred work to §13.14's "Carried forward" list, without nits.
  - Commands run in `packages/next`.
- **Performance.** Don't benchmark on this page, which loads the GPU heavily. A full test run should finish in under 10 s on this machine; print the time in the data test. During a run in the page, the main thread never blocks for more than 100 ms (R13).

## Review Focus

1. **A test that passes for the wrong reason.**
   - An expected-throw case that throws a different error passes falsely.
   - So does a round trip compared against itself.

   Every case asserts the error's message pattern or compares against an independent value. A deliberately broken case (a tolerance set to 0 in a unit test of the runner) fails. Test: Task 1.
2. **The page and the data test disagree.** Both run the same `tests.ts` cases on the same data, so a case that passes headless but fails in the browser shows as a failure in the page, never hidden. Tests: Task 1 and Task 5's browser check.
3. **Overlays drawn in the wrong place:**
   - a triad drawn with axes transposed;
   - a grid drawn from the wrong CRS;
   - the rigid line and the exact line swapped.

   The geometry builders are unit-tested against independent values. Test: Task 3.
4. **Missing data.** No `/frames-data/`, no PROJ, or no Artemis file. The page shows what's missing and still runs everything else, and nothing throws uncaught. Test: Task 5's browser check, with the dev server started against an empty store.
5. **Accuracy or loading state hidden or wrong (R8, R9).** A tree edge, overlay or result shown without its accuracy, or an undefined accuracy shown as a number or a blank. A fetch with no indicator, or an indicator stuck after an error or abort. Tests: Task 2 (every node has an accuracy field, with no NaN), Task 5 (unit tests of the loading-state model, and the browser check with network throttling).
6. **A reference value that isn't independent (R10).** A fixture copied from PROJ's own output, or an effect size checked against the library's own number, makes the comparison circular. Tests: Task 1's data test asserts every `references.json` entry has a `source` with a retrieval date, and that no source names PROJ, pyproj or this library. Each effect-size case's hand formula is written out in the case, not called from `src/`.
7. **The worker and the direct run disagree (R13).** A result changed by serialization, such as a lost accuracy term, an error renamed, or a NaN turned to null. Test: Task 4 runs a stub catalog through the protocol and directly, and asserts deep equality.
8. **The selection out of sync (R14).** The globe flown to one result while the inspector shows another, or a stale selection after a re-run or a lens change. Tests: Task 5's `selection.ts` unit tests, and the browser check.
9. **Leaving the example mid-load or mid-run.** The gallery switches away while PROJ or the OEM is loading, or while the tests run. Nothing leaks into the next example's viewer, and no work continues after `signal` aborts. Test: Task 5.

---

### Task 1: The stress-test catalog and its headless run

**Files:**

- Create:
  - `packages/next/examples/frames-explorer/tests.ts`
  - `packages/next/test/data/framesExplorer.test.ts`
  - `packages/next/test/framesExplorerRunner.test.ts`
  - `packages/next/examples/frames-explorer/references.json` (R10)
  - `packages/next/examples/frames-explorer/references/` (any mpmath scripts, cited from `references.json`)
  - `packages/next/examples/frames-explorer/fingerprints.json` (R12)
- Modify: `packages/next/src/engineering/crs.ts`, adding the export `listOperations`, with its test in `packages/next/test/data/crs.test.ts` (the "Operation candidates" group).

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
    - `detail?: string`;
    - `effect?: { value: number; unit: string; label: string }` (R11);
    - `fingerprint?: { pipeline: string; grids: readonly { name: string; sha256: string }[]; coordinates: readonly number[] }` (R12).
  - **`interface StressCase`:**
    - `id`, `group`, `title`;
    - `needs: readonly ("proj" | "geoid" | "orion")[]`;
    - `run(ctx: StressContext): Promise<StressResult[]>`.
  - **`STRESS_CASES: readonly StressCase[]`.**
  - **`type Lens = "civil" | "bim" | "gis" | "space" | "timing" | "offshore" | "av"`.**
  - **`STRESS_GROUPS: readonly StressGroup[]`** (R14):
    - `interface StressGroup`:
      - `id: string`;
      - `question: string`, the card title in plain language;
      - `lenses: readonly Lens[]`;
      - `headline(results: readonly StressResult[]): string | undefined`, the answer line;
      - `focus?: { frames: readonly string[]; overlay?: string; site?: string }`, for "Show on globe".
    - **A virtual group, "Reproducibility"** ("Does the same file land the same in browser and Node?"), collects every fingerprinted result.
    - **Lens tags:**

      | Lens | Groups |
      | --- | --- |
      | Civil | Site grids, Units, Measurement, Reference values, Vertical profile, Distortion, Rigid placement budget, Below the ellipsoid, Heights and WGS84 |
      | BIM | Site grids, IFC map conversion, Rigid placement budget, Recorded operations, Units, Reproducibility |
      | GIS | Projections, Distortion, Axes and the antimeridian, Operation candidates, Coordinate epoch, Heights and WGS84 |
      | Space | Frame tree, Time, Trajectory, Space, Lunar time |
      | Timing | Time, Time scales, Lunar time |
      | Offshore | Operation candidates, Recorded operations, Projections, Reproducibility |
      | AV | Plate motion, Coordinate epoch, Heights and WGS84 |

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
- **New groups (owner's additions, 2026-11-06):**
  - **"Reference values" (R10).**
    - **NGS datasheets.** At least three control points in different SPCS 83 zones, one of them in California zone 3. Pick each PID by these criteria:
      - an adjusted NAD83(2011) epoch 2010.00 position;
      - a published GEOID18 height;
      - published SPC northing and easting, convergence, scale factor and combined factor.

      Through an engineering frame on that zone's CRS (with 6360 and GEOID18 where heights are used), check each published quantity at its printed precision: northing and easting, convergence, scale factor, combined factor (from `gridFactors` at the datasheet's ellipsoid height), and the orthometric height from the ellipsoid height.
    - **IOGP 373-7-2 worked examples,** forward and inverse, for each projection method the catalog uses:
      - Transverse Mercator;
      - Lambert Conic Conformal (2SP);
      - Polar Stereographic (variant B);
      - Popular Visualisation Pseudo-Mercator.
    - **A clothoid worked example** from a published design manual or textbook. Check the spiral angle, X and Y at the spiral-to-curve point, the long and short tangents, and the stations of all four key points. These are the tangent-to-spiral, spiral-to-curve, curve-to-spiral and spiral-to-tangent points. The mpmath fallback applies only if no published table can be fetched.
  - **"Vertical profile."** A symmetric parabolic vertical curve with its arithmetic written in the case:
    - PVI station 1000.00 at elevation 100.000, with g1 = +3% and g2 = −2% over L = 400.
    - Check the elevations at the start and end of the curve and at four interior stations.
    - Check the high-point station, x = −g1·L/(g2 − g1) from the start, and that it's a maximum: points 0.01 either side are lower.
    - Check K = L/|g2 − g1|. Tolerance 1e-9.
    - Add one grade-to-grade case with no curve.
  - **"Distortion."**
    - **Web Mercator (EPSG:3857):** the parallel scale at latitudes 0°, 45°, 60° and 70° against the hand formula k = √(1 − e²sin²φ)/cos φ, to 1e-9.
    - **The effect size (R11):** a 100 km east–west line at 60° measured as a 3857 grid distance, against the true distance in meters.
    - **A low-distortion projection:** an Oregon (OCRS) or Wisconsin (WisCRS) zone from PROJ's database. Its published distortion target goes in `references.json`, from the agency's handbook. At a point within the zone at its design height:
      - |combined factor − 1| is within that target;
      - it's smaller than the state plane zone's at the same point.

      Show both in ppm as effect sizes.
  - **"Rigid placement budget."**
    - **The sites:** latitudes 0°, 37°, 60° and 80°, each in its UTM zone. Use the polar stereographic CRS at 80° instead of UTM.
    - **The search:** bisect for the extent from the site origin where `rigidVsExact`'s separation reaches 1 mm, 1 cm and 10 cm.
    - **The check:** each extent's separation is within 10% of its target, and each extent is within 10% of the curvature formula √(2Rε), with R the Gaussian mean radius at the site.
    - **The display:** the extents as a table of effect sizes, about 113 m, 357 m and 1.13 km at 1 mm, 1 cm and 10 cm. This answers "how big can my site be before rigid placement is off by this much?".
  - **"Coordinate epoch."**
    - **The point:** a California point in NAD83(2011), against ITRF2014, at epochs 2010.0 and 2026.0.
    - **The check:** the difference between the two epochs equals the published time-dependent Helmert transformation, hand-coded in the case with its 14 parameters copied from the EPSG dataset or NGS into `references.json`. Tolerance 1 mm.
    - **Effect sizes:** the difference in centimeters, and the difference with no epoch at all (PROJ's "no epoch", where the rates don't apply).
  - **"Axes and the antimeridian."**
    - **EPSG:4326 input:** the California datasheet point's latitude and longitude, given as EPSG:4326 in the library's documented input order, lands within 1 mm of the datasheet's published UTM easting and northing, not on the far side of the world.
    - **A northing-first CRS:** a projected CRS whose EPSG axis order is northing first, such as EPSG:31467. Its design E grows eastward and N northward, checked against a hand-placed point.
    - **UTM zones 1 and 60:** points at ±179.999° round-trip, and a design line across 180° in zone 60 has continuous E.
    - **Across 180°:** two equator points at ±179.999° have a measured straight-line distance of 2a·sin(Δλ/2) within 1e-9 m.
  - **"Space"** (needs `orion`):
    - **Light time and Doppler** from DSS-43 to Orion against plan 3's SPICE-derived fixture, `test/fixtures/frames/signal.json`, with plan 3's tolerances. Import the fixture; don't copy it.
    - **Line of sight from DSS-43**, at two instants near the flyby taken from the OEM: one where Orion is behind the Moon and one hours earlier where it's clear. Each verdict is checked by hand geometry: the angle between the directions to the Moon's centre and to Orion, against asin(1737.4 km / Moon distance), plus whether Orion is farther than the Moon.
    - **Effect sizes (R11):**
      - the frame bias at the Moon's distance, as the EME2000 against EARTH_ICRF difference of a point there, against the bias angle times r (about 43 m);
      - the GCRF scaling at the Moon's distance, against r·(GM☉/(c²·r☉) + L_C);
      - MOON_ME against MOON_PA at a lunar south-pole site, against the published DE440 rotation angles, composed by hand in the case;
      - the Earth-orientation uncertainty at the clock's instant, converted to meters at Earth's surface and to arcseconds toward Orion. This last one is display only, with no pass or fail.
- **Industry groups (owner's additions, 2026-11-06):**
  - **"Operation candidates"** (offshore energy, where the EPSG registry began):
    - **The point:** ED50 to WGS84 at a North Sea point, 56° N 3° E.
    - **The new export:** `listOperations(proj: ProjApi, source: CrsRef, target: CrsRef): readonly { name: string; pipeline: string; accuracy?: number; areaOfUse?: { west: number; south: number; east: number; north: number }; gridsNeeded: readonly string[]; ballpark: boolean }[]` in `src/engineering/crs.ts`. It's additive and reads the same `proj_create_operations` list that `resolveOperation` already walks.
    - **Checks:**
      - The candidates include at least two non-ballpark operations, and the one `resolveOperation` recorded is the one its documented rule picks from that list.
      - Two of the candidates' accuracies and areas of use match their EPSG registry entries, copied from epsg.org into `references.json` (R10).
    - **The effect size:** the largest distance between the candidates' results, in meters.
  - **"IFC map conversion"** (BIM and digital twins):
    - **The source:** a published IFC 4.3 `IfcMapConversion`, from buildingSMART's documentation or its georeferencing user guide. It gives Eastings, Northings, OrthogonalHeight, XAxisAbscissa, XAxisOrdinate and Scale.
    - **The mapping to an engineering frame's site transform:** θ from the x-axis direction, s = Scale, and the offsets. A pure helper, `siteFromIfcMapConversion`, in `tests.ts`. Take the rotation's sign from the published example's own numbers, not from an assumption.
    - **The check:** the example's model point maps to its published easting, northing and height at their printed precision, and round-trips.
  - **"Plate motion"** (autonomous vehicles, precision agriculture, HD maps):
    - **GDA94 to GDA2020:** check the ICSM GDA2020 Technical Manual's worked example of the 7-parameter transformation, hand-coded in the case, with its values in `references.json`. Show its size (about 1.8 m) as an effect size.
    - **Through the library:** run the same point through `resolveOperation`. If the library picks the conformal grid, which isn't in the store, the case expects the throw naming that grid (R7).
    - **Drift:** Australia's drift in ITRF2014, in cm per year, from the published plate-motion model's Euler-pole rates, as an effect size. "How fast does a map go stale?"
  - **"Below the ellipsoid"** (mining and tunnelling):
    - **Elevation factors:** at h = −500 m and −2000 m, against R/(R+h) with R the Gaussian mean radius, to 1e-12. They're greater than 1.
    - **A tunnel:** two portals 5 km apart at h = +300 m, with the tunnel at h = −200 m. Check the ground distance at tunnel level against the grid distance, through the combined factor, against the hand formula, to 1e-9 relative.
    - **A guard:** a station at negative ellipsoid height doesn't block its own line of sight. This is plan 3's fixed bug, guarded here.
  - **"Heights and WGS84"** (aviation and drones):
    - **NAD83(2011) against ITRF2014** at epoch 2026.0 at the California datasheet point: about 1–2 m. Effect size, checked against the "Coordinate epoch" group's hand-coded Helmert.
    - **"WGS84":** given as EPSG:4326, a datum ensemble, its operation accuracy shows at least 2 m, and the row says why.
    - **Three heights at the California datasheet point:** the ellipsoid height, and the NAVD88 height through GEOID18, against the datasheet. Plan 4b adds EGM96.
  - **"Time scales"** (timing and telecom):
    - **The offsets:** GPS time = TAI − 19 s and TT = TAI + 32.184 s exactly, from `Instant.tai()`.
    - **Across 2016-12-31T23:59:60 UTC:** GPS − UTC steps from 17 s to 18 s, and GPS time stays continuous.
  - **"Lunar time"** (space policy):
    - **The clocks:** a clock on the lunar surface at the south-pole site, against a clock at h = 0 at the California site.
    - **The method:** `properTimeRate` sampled hourly over one sidereal month (27.32 days), averaged, and given in µs/day.
    - **The check:** within 2% of Ashby & Patla (2024, *The Astronomical Journal*), about 56.02 µs/day, cited in `references.json`. The 2% covers the point-mass potential (frames 3, R4). Shown as an effect size.

- [ ] **Step 1: Write the runner's failing unit tests** (`test/framesExplorerRunner.test.ts`, with synthetic frames and stub cases):
  - A case returning a value within its tolerance passes, and one beyond it fails.
  - An expected-throw case passes only when its message matches. It fails on a different message and fails when nothing throws (Review Focus 1).
  - `runStress` honors `signal`: when aborted midway, it stops before the next case and resolves with what it has (Review Focus 9).
  - `onResult` is called once per result.
  - Every case's `group` exists in `STRESS_GROUPS`, every group has at least one lens and a question ending in "?", and every lens has at least three groups.
  - A result with `effect` displays its size apart from pass or fail. A fingerprint mismatch, whether a different pipeline, a different grid SHA or coordinates beyond 1e-9 m, fails the case, and a match passes (R11, R12).
  - Cases whose `needs` can't be met give a skipped result with `pass: false` and a `detail` saying what's missing. They don't throw (Review Focus 4).
- [ ] **Step 2: Write the data test** (`test/data/framesExplorer.test.ts`). Build the context from the store, as plan 4a's data tests do, run `runStress` over all `STRESS_CASES`, and assert every result passes. Print the failures, if any, and the run time. Also:
  - Every `references.json` entry has a `source` with a retrieval date, and none names PROJ, pyproj or this library (Review Focus 6).
  - With `FRAMES_EXPLORER_UPDATE=1`, write `fingerprints.json`; otherwise, compare against it (R12).
- [ ] **Step 2a: Gather the reference values** (R10). Fetch the datasheets, IOGP 373-7-2, the clothoid table, the Helmert parameters and the low-distortion projection's handbook target. Copy the values verbatim into `references.json` with citations. Report any source that couldn't be fetched, and leave its case out rather than substituting.
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
  - **`distortion(crs: CrsRef, extent: { min: [number, number]; max: [number, number] }, step: number, options: { height: number; contoursPpm: readonly number[]; tissotRadius: number })`.** It returns `{ tissot, contours, labels }`.
    - **Tissot's indicatrix:** a small ellipse at each grid node, with semi-axes proportional to the meridional scale h and the parallel scale k, oriented by the meridian–parallel angle.
    - **Contours:** combined-factor contours at the given ppm levels (default ±10, ±50, ±100, ±400), by marching squares over the sampled combined factor at `height`.
    - **Labels:** label positions with their ppm values.
    - **The factors it needs:** if `gridFactors` doesn't already return h, k, the angular distortion and the meridian–parallel angle, extend its result with `meridionalScale`, `angularDistortion` and `meridianParallelAngle` from `proj_factors`. That's an additive library change with its own test in `test/data/factors.test.ts`.
- **A thin adapter, `addOverlay(world: World, geometry, scope: DisposableStack): () => void`,** turns the geometry into an unlit line-list mesh plus a draw (`World.addMesh`, `World.addDraw`), using the world's usual transform for large coordinates. It returns a remover and registers that remover in `scope`.

- [ ] **Step 1: Write the failing tests:**
  - **`triad`:** for ITRF at any instant, the axes are the identity directions; for GCRF they equal the columns of `rotationPart(frameTransform(gcrf, itrf, t))`, within 1e-12 (Review Focus 3, transposition).
  - **`designGrid`:** every vertex equals `frame.toBodyFixed([E, N, 0])` for its grid E and N within 1e-9 m. The vertex count follows from `extent`, `step` and `segment`.
  - **`trueNorthLines`:** every vertex has the expected longitude to 1e-12 rad.
  - **`rigidVsExact`:** `sagAtEnd` for a 10 km line is between 6.3 and 9.3 m (plan 4a's 7.8 m ± 1.5). The two polylines coincide at `from` within 1e-6 m, and `exact[i]` equals `toBodyFixed`.
  - **`roundTripMarkers`:** the colors at 0.05, 0.5 and 2 times the tolerance are green, amber and red.
  - **`distortion`:**
    - On EPSG:3857 at 60°, the Tissot ellipse's parallel axis equals √(1 − e²sin²φ)/cos φ times the radius, within 1e-9 relative.
    - On a UTM zone (conformal), h = k within 1e-12 and the angular distortion is below 1e-12.
    - Marching squares on a synthetic linear field puts the contours at their hand-computed positions within 1e-9.
  - **`trajectoryPath`:** with a synthetic constant-velocity trajectory in a frame rotating about z, drawing in the rotating frame gives a different path from drawing in the inertial frame, and both match a hand computation at three samples. Samples in a gap are skipped and don't throw.
- [ ] **Step 2: Run** `npx vitest run test/framesExplorerOverlays.test.ts` and confirm it fails.
- [ ] **Step 3: Implement** `overlays.ts`. Check how `World.addMesh` and `addDraw` take positions far from the origin; plan 1's hi/lo scheme means the transform carries the large part. Follow an existing user of `topology: "line-list"`, for example `src/streaming/debugVolumes.ts`.
- [ ] **Step 4: Run** the test and `npm test`, and confirm they pass.
- [ ] **Step 5: Commit** with "examples: frames explorer overlay geometry".

### Task 4: The compute worker

**Files:**

- Create:
  - `packages/next/examples/frames-explorer/protocol.ts`
  - `packages/next/examples/frames-explorer/worker.ts`
- Test: `packages/next/test/framesExplorerProtocol.test.ts`

**Interfaces:**

- **Consumes:** Task 1's `runStress`, `STRESS_CASES` and `StressResult`. Task 3's builders. `loadProj` and `loadFrameData` with `onProgress` (R9).
- **Produces** (`protocol.ts`):
  - **`type DataItem = "frames" | "proj" | "geoid" | "orion"`.**
  - **`type Request`:** each request has `id: number`, and is one of:
    - `{ type: "load"; item: DataItem }`;
    - `{ type: "run"; ids?: readonly string[] }`;
    - `{ type: "cancel" }`;
    - `{ type: "overlay"; kind: "designGrid" | "trueNorthLines" | "rigidVsExact" | "distortion" | "trajectoryPath"; params: unknown }`.
  - **`type Reply`:**
    - `{ type: "progress"; item; received; total? }`;
    - `{ type: "state"; item; state: "idle" | "fetching" | "ready" | "missing" | "error"; detail? }`;
    - `{ type: "result"; id; result: StressResult }`;
    - `{ type: "done"; id; summary: { passed; failed; skipped; ms } }`;
    - `{ type: "overlay"; id; geometry }`, whose buffers are transferred;
    - `{ type: "error"; id; name; message }`.
  - **`createHost(port: { postMessage(m: Reply, transfer?: Transferable[]): void; onmessage: ((e: { data: Request }) => void) | null }, makeContext: () => Promise<StressContext>)`.** A pure dispatcher. `worker.ts` is only `createHost(self, …)`.
  - **`createClient(worker: { postMessage(m: Request): void; onmessage; terminate(): void }, signal: AbortSignal)`.** It returns:
    - `run(ids?, onResult?)`;
    - `load(item)`;
    - `overlay(kind, params)`;
    - `onProgress(cb)`.

    Each returns a promise. Aborting `signal` posts `cancel`, then terminates the worker, and rejects pending promises with an `AbortError`.

- [ ] **Step 1: Write the failing tests,** using Node's `MessageChannel` as the port pair, a stub catalog and synthetic frames:
  - `run` streams one `result` per case, then `done`. The results deep-equal `runStress` called directly on the same catalog (Review Focus 7). Include a result with an undefined accuracy total, a NaN value and an expected-throw case.
  - `cancel` mid-run stops before the next case, and `done` reports the partial counts.
  - A case that throws arrives as a failed result carrying its message.
  - An `overlay` reply transfers its buffers: the sender's `byteLength` is 0 after posting.
  - Progress for an item arrives in order and ends in `ready`, `missing` or `error`, never stuck at `fetching` (Review Focus 5).
  - Aborting the client's signal rejects pending promises and calls `terminate` once.
- [ ] **Step 2: Run** `npx vitest run test/framesExplorerProtocol.test.ts` and confirm it fails.
- [ ] **Step 3: Implement** `protocol.ts` and `worker.ts`. The host yields between cases, so a `cancel` is seen promptly.
- [ ] **Step 4: Run** the test and `npm test`, and confirm they pass.
- [ ] **Step 5: Commit** with "examples: frames explorer compute worker and its protocol".

### Task 5: The example page

**Files:**

- Create:
  - `packages/next/examples/frames-explorer/main.ts`
  - `packages/next/examples/frames-explorer/panel.tsx` (the StrataKit React panel; split into components under `examples/frames-explorer/panel/` if it passes about 400 lines)
  - `packages/next/examples/frames-explorer/selection.ts` (R14, R15: the selection state, and its URL format and parse)
  - `packages/next/examples/frames-explorer/report.ts` (R15: `buildReport(results, env): { markdown: string; json: unknown }`)
- Test:
  - `packages/next/test/framesExplorerSelection.test.ts`: the URL round trip for every `Selection` kind and lens; an unknown id parses to `none` without throwing; a re-run keeps a still-valid selection and clears a vanished one (Review Focus 8).
  - `packages/next/test/framesExplorerReport.test.ts`: the report holds every result id, failures first, units on every value, fingerprints, and every environment field; the JSON parses back to the same results.
- Modify: `packages/next/examples/index.ts` (register it, R1)

**Interfaces:**

- **Consumes:** Tasks 1–4, `ExampleContext`, `loadFrameData`, `createFrames`, `loadProj`, `EngineeringFrame`, `Trajectory.fromOem`, `parseOem`, `viewer.clock`, and the viewer's camera flights (`viewer.zoomTo` or the controller's fly-to; use what the Viewer exposes).
- **Layout (R14).** The status strip is always on top. Below it are three tabs: Explore (sections 2–4 below), Verify (section 5, as question cards with the inspector) and Report (R15). Section 1's states feed the strip. All runs, PROJ work and PROJ geometry go through Task 4's client (R13).
- **The page.** The panel's content:
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
     - distortion: Tissot ellipses and combined-factor contours in ppm, with a CRS chooser (California state plane 6420, UTM 10N, Web Mercator 3857, and the low-distortion zone, which flies to its own site) and a height control;
     - the bias-exaggeration slider (R4).
  4. **Clock.** The viewer's time controls. A preset button jumps to the Artemis II flyby (2026-04-06T23:00 UTC). Triads and Orion's path follow the clock.
  5. **Stress tests.** Effect sizes (R11) show in their own column, and fingerprint cases show "browser = Node" or the difference (R12). The rigid-placement budget shows as a small table. "Run all", or run per group. Results stream into a table: group, title, value against tolerance as a log-scale bar with numbers and unit, pass or fail, and the accuracy statement's total in the row with terms on expand (R8). A summary line gives passed / failed / skipped and the run time.
- **Accuracy and loading UI (R8, R9).** A small `loading.ts` holds the data-item states and their transitions (idle → fetching → ready | missing | error, with abort back to idle), unit-tested in `test/framesExplorerLoading.test.ts`. The panel renders from that model, so an indicator can't stick.
- **Startup.** On start, start the worker, load frame data and draw the tree, plus the ITRF and ENU triads at a California site. If the URL carries a selection (R15), apply it once its data is ready. Load PROJ in the worker when an engineering overlay or test first needs it (R6). Route every async step through `context.signal` and every drawn item through `context.scope` (Review Focus 9).

- [ ] **Step 0: Design pass (R16), before wiring the page.**
  - Load the `frontend-design:frontend-design` skill, and read `bench/suite/DESIGN.md` and `STRATAKIT_FEEDBACK.md`. StrataKit and DESIGN.md set the visual language. The design pass applies them; it doesn't invent a new one.
  - Write `examples/frames-explorer/DESIGN.md`:
    - the layout at desktop and narrow widths;
    - the type scale, color tokens (status via StrataKit's semantic colors; the frame-family HUD palette checked for contrast on StrataKit's canvas surfaces) and spacing;
    - each component and its states: question card, result row, inspector, trace, tree row, budget bar, legend, status pill, tour caption;
    - motion;
    - the glossary.
  - Build a static prototype with the real panel code and stub data, then take screenshots in light and dark, at desktop and narrow widths.
  - The controller dispatches a UX review on the most capable model. It checks against Nielsen's heuristics, WCAG 2.2 AA and R16's two audiences. Fix its findings.
  - Send the screenshots to the owner. This doesn't block: the owner may redirect, and the design iterates once built.
- [ ] **Step 1: Write** `main.ts` (and `panel.tsx`), and register the example in `examples/index.ts`. The description: "The frame tree and engineering frames, drawn on the globe and stress-tested in the page: every edge labelled, every result checked against its tolerance."
- [ ] **Step 2: Check it in the browser.**
  - Start the dev server (`preview_start` "dyno") and open `/#/examples/frames-explorer`.
  - **Tree:**
    - It shows ICRF at the root with every built-in frame.
    - Selecting MOON_PA highlights its path and flies to the Moon, with its triads drawn.
    - **Far-from-origin precision:** this answers the engine user's question "why does my model shake far from the origin?". Fly to the lunar south-pole site's triad, 384,000 km from the Earth-fixed origin, at a camera distance of about 100 m, and orbit it slowly. The triad doesn't jitter. Take two screenshots from the same camera pose and confirm the triad hasn't moved. Describe both in the report.
  - **Overlays:**
    - Turning on the design grid shows grid lines and true-north lines diverging away from the central meridian.
    - The rigid and exact lines separate visibly toward the far end, labelled about 31 m at 20 km (the spec's figure, section 4).
    - Orion's path in GCRF shows the figure-eight, and in MOON_ME the far-side swing.
  - **Accuracy (R8):** every tree row, the selected node's composed statement, every overlay legend and every test row shows an accuracy. Undefined ones read "not bounded" with their reason.
  - **Loading (R9):** with Chromium's network throttling at "Slow 4G" in the page's dev tools (or the preview's equivalent), turning on the design grid shows PROJ's fetch progressing in Status and an inline spinner on the toggle until the grid draws. Turning on Orion's path does the same for the OEM.
  - **Distortion:** on Web Mercator, the Tissot ellipses grow toward the poles, about 2× at 60°. On UTM, they stay circles that grow away from the central meridian. On the low-distortion zone, the contours show the site inside its target band.
  - **Reference values and fingerprints:** every reference case shows its source on expand. Every fingerprint case reads "browser = Node".
  - **Tests:** "Run all" ends with 0 failed. The count equals the data test's, and the round-trip markers appear (Review Focus 2).
  - **Responsiveness (R13):** during "Run all", the spinners keep animating and the globe keeps rendering. Log the longest gap between `requestAnimationFrame` callbacks during the run; it must be under 100 ms.
  - **Linked selection (R14):**
    - Selecting the rigid-placement result flies to its site, turns on its overlay and highlights its frames in the tree.
    - Selecting MOON_PA in the tree filters Verify to the groups that use it.
    - Changing the lens never leaves the inspector showing a hidden result.
  - **Deep link (R15):** copy a result's link, reload the page with it, and confirm the same result is selected and flown to.
  - **Report (R15):** copy the report and check that its counts and environment match the page. Save it, and check that the JSON parses.
  - **Production build:** build the gallery and serve the built output (the repo's preview script, or `vite preview`). Repeat the PROJ load, "Run all" and one overlay there, to prove the module worker and the worker's `proj_capi.mjs` import work outside the dev server (R13).
  - **Missing data:** restart the dev server with `FRAMES_DATA_DIR` pointing at an empty scratch directory. The page shows the missing-data status, the tree still renders from what's available or explains why not, and the console has no uncaught errors (Review Focus 4). Then restart it normally.
  - **Switching away:** go to another example during "Run all" and during PROJ's first load. The console has no errors, and no overlay or work carries into the next example (Review Focus 9).
  - **Design (R16):**
    - The guided tour runs end to end, and each stop's deep link opens that stop.
    - Walking the tree to MOON_PA animates the path, and its budget bar's terms sum to the stated total.
    - A result's trace shows every step from input to output.
    - With reduced motion set, flights cut instead of animate.
    - Spot-check the contrast of status pills and legend text in light and dark with computed colors (AA).
    - The whole page works from the keyboard.
  - Take screenshots of the tree with Moon triads, the design grid, the rigid and exact lines, and Orion's figure-eight. Describe them in the report.
  - Stop the server.
- [ ] **Step 3: Run** `npm test`, `npm run test:data`, `npx tsc --noEmit -p .`, `npx eslint` on the changed files, and prettier, and confirm they pass.
- [ ] **Step 4: Commit** with "examples: Frames and projections, the frame tree drawn and stress-tested".

### Task 6: Docs and the plan note

**Files:**

- Modify: `CESIUM2_WEBGPU_PLAN.md` §13.14, `packages/next/README.md` (one line in the frames section pointing at the example)

- [ ] **Step 1: Plan note.**
  - Mark the §13.14 "Carried forward" entry for this example as done, and state what 4b adds: tileset placement modes and the global-geoid cases.
  - Record the data test's case count and run time.
  - List the reference sources used (R10) and any that couldn't be fetched.
  - Record the rigid-placement budget table and the effect sizes.
  - Record the production-build check (R13). If it passed, remove §13.14's carried-forward item that `loadProj` was checked only in the dev server.
  - List the screenshots' findings.
  - Add the deferred items from this plan's ledger, without nits.
- [ ] **Step 2: README.** Add one line in the frames section pointing at the example.
- [ ] **Step 3: Run the gates:** tsc, eslint, `npm test`, `npm run test:data`, and `snyk_code_scan` on `examples/frames-explorer`.
- [ ] **Step 4: Commit** with "Plan: frames and projections example results".
